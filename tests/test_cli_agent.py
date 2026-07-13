"""Tests del agente CLI (enjambre.cli_agent). Mockea el subprocess `claude`
para no depender del binario real en CI; el worktree usa git real."""

import asyncio
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

import pytest

from enjambre import cli_agent

pytestmark = pytest.mark.skipif(shutil.which("git") is None, reason="git no disponible")


def _git_repo(root: Path) -> None:
    subprocess.run(["git", "init", "-q"], cwd=root, check=True)
    subprocess.run(["git", "config", "user.email", "t@t"], cwd=root, check=True)
    subprocess.run(["git", "config", "user.name", "t"], cwd=root, check=True)
    (root / "base.py").write_text("x = 1\n", encoding="utf-8")
    subprocess.run(["git", "add", "-A"], cwd=root, check=True)
    subprocess.run(["git", "commit", "-qm", "init"], cwd=root, check=True)


class _FakeProc:
    """Simula `claude -p ...`: escribe un archivo nuevo dentro del cwd (worktree)."""

    def __init__(self, cwd: str, returncode: int = 0, write: bool = True):
        self.cwd = cwd
        self.returncode = returncode
        self._write = write

    async def communicate(self):
        if self._write:
            (Path(self.cwd) / "nuevo.py").write_text("print('hola')\n", encoding="utf-8")
        err = b"" if self.returncode == 0 else b"claude fallo\n"
        return (b'{"result":"ok"}', err)

    def kill(self):
        pass

    async def wait(self):
        return 0


def _mock_claude(monkeypatch, returncode: int = 0, write: bool = True):
    monkeypatch.setattr(cli_agent.shutil, "which", lambda name: "/usr/bin/claude")
    captured: dict = {}

    async def fake_exec(*args, cwd=None, env=None, **kw):
        captured["env"] = env
        return _FakeProc(cwd, returncode=returncode, write=write)

    monkeypatch.setattr(cli_agent.asyncio, "create_subprocess_exec", fake_exec)
    return captured


def test_run_cli_task_creates_worktree_and_captures_diff(tmp_path, monkeypatch):
    _git_repo(tmp_path)
    _mock_claude(monkeypatch)

    res = asyncio.run(cli_agent.run_cli_task("agrega un hola", tmp_path))

    assert res.ok
    assert res.changed_files == ["nuevo.py"]
    assert "+print('hola')" in res.diff
    assert res.file_contents == {"nuevo.py": "print('hola')\n"}  # capturado al correr
    assert Path(res.worktree_path).is_dir()  # NO se limpia en run_cli_task
    # El proyecto real NO fue tocado (invariante de seguridad).
    assert not (tmp_path / "nuevo.py").exists()

    # cleanup deja el proyecto sin worktrees colgando
    cli_agent.cleanup_worktree(res.worktree_path, res.branch, tmp_path)
    assert not Path(res.worktree_path).exists()


def test_run_cli_task_nonzero_exit_is_failure(tmp_path, monkeypatch):
    """P1-5: se devolvia ok=True sin mirar el returncode; un `claude` caido (sin
    auth, error interno) se veia como una corrida vacia exitosa."""
    _git_repo(tmp_path)
    _mock_claude(monkeypatch, returncode=2, write=False)
    res = asyncio.run(cli_agent.run_cli_task("x", tmp_path))
    assert not res.ok
    assert "codigo 2" in res.error
    assert not Path(res.worktree_path).exists()  # se limpia, no queda huerfano


def test_run_cli_task_passes_clean_env(tmp_path, monkeypatch):
    """P1-1: el subproceso `claude` heredaba TODO el env, incluidas las claves BYOK,
    que podia leer y exfiltrar. Ahora se le pasa un env sin claves de proveedor."""
    _git_repo(tmp_path)
    monkeypatch.setenv("OPENAI_API_KEY", "sk-secret")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-secret")
    monkeypatch.setenv("XAI_API_KEY", "xai-secret")
    captured = _mock_claude(monkeypatch)
    asyncio.run(cli_agent.run_cli_task("x", tmp_path))
    env = captured["env"]
    assert env is not None
    assert not any(k.upper().endswith("_API_KEY") for k in env)
    assert not any("TOKEN" in k.upper() for k in env)


def test_clean_env_keeps_system_vars(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-secret")
    env = cli_agent._clean_env()
    assert "OPENAI_API_KEY" not in env
    assert "PATH" in env  # lo minimo para que claude arranque


def test_run_cli_task_missing_binary(tmp_path, monkeypatch):
    _git_repo(tmp_path)
    monkeypatch.setattr(cli_agent.shutil, "which", lambda name: None)
    res = asyncio.run(cli_agent.run_cli_task("x", tmp_path))
    assert not res.ok and "PATH" in res.error


def test_run_cli_task_not_a_git_repo(tmp_path, monkeypatch):
    _mock_claude(monkeypatch)  # binario presente, pero no hay repo git
    res = asyncio.run(cli_agent.run_cli_task("x", tmp_path))
    assert not res.ok and "git" in res.error


def test_approve_applies_captured_content_not_live_worktree(tmp_path, monkeypatch):
    """W2.2 (TOCTOU): si el worktree cambia entre la revision y el approve, se aplica
    el contenido CAPTURADO (lo revisado), nunca el manipulado."""
    from enjambre.changes import Change, ChangeSet

    _git_repo(tmp_path)
    _mock_claude(monkeypatch)
    res = asyncio.run(cli_agent.run_cli_task("x", tmp_path))
    assert res.file_contents == {"nuevo.py": "print('hola')\n"}

    # manipulacion del worktree DESPUES de que el humano vio el diff
    (Path(res.worktree_path) / "nuevo.py").write_text(
        "import os; os.system('rm -rf /')\n", encoding="utf-8")

    # el approve (mismo codigo que api.cli_approve) aplica lo CAPTURADO
    changes = [Change(rel, c) for rel, c in res.file_contents.items()]
    report = ChangeSet(changes).apply(tmp_path, approved=True)
    assert report.ok
    assert (tmp_path / "nuevo.py").read_text(encoding="utf-8") == "print('hola')\n"
    cli_agent.cleanup_worktree(res.worktree_path, res.branch, tmp_path)


def test_run_cli_task_launches_in_own_process_group(tmp_path, monkeypatch):
    """W2.1: el subproceso se lanza en su propio grupo para poder matar el arbol."""
    _git_repo(tmp_path)
    monkeypatch.setattr(cli_agent.shutil, "which", lambda name: "/usr/bin/claude")
    captured: dict = {}

    async def fake_exec(*args, cwd=None, env=None, **kw):
        captured.update(kw)
        return _FakeProc(cwd)

    monkeypatch.setattr(cli_agent.asyncio, "create_subprocess_exec", fake_exec)
    asyncio.run(cli_agent.run_cli_task("x", tmp_path))
    if sys.platform == "win32":
        assert "creationflags" in captured
    else:
        assert captured.get("start_new_session") is True


@pytest.mark.skipif(sys.platform == "win32",
                    reason="verificacion de pid viva es POSIX; en Windows lo cubre taskkill /T")
def test_kill_tree_kills_child_processes():
    """W2.1: _kill_tree mata al padre Y a los hijos que spawnee, no solo al padre."""
    code = ("import subprocess,sys,time;"
            "c=subprocess.Popen([sys.executable,'-c','import time;time.sleep(30)']);"
            "print(c.pid,flush=True);"
            "time.sleep(30)")

    async def go():
        proc = await asyncio.create_subprocess_exec(
            sys.executable, "-c", code,
            stdout=asyncio.subprocess.PIPE, **cli_agent._GROUP_KW)
        line = await proc.stdout.readline()
        child_pid = int(line.decode().strip())
        cli_agent._kill_tree(proc)
        await proc.wait()
        return child_pid

    child_pid = asyncio.run(go())
    # el hijo (nieto del test) debe morir; init lo cosecha -> poll corto
    for _ in range(20):
        try:
            os.kill(child_pid, 0)
        except ProcessLookupError:
            break
        time.sleep(0.1)
    else:
        raise AssertionError(f"el proceso hijo {child_pid} sigue vivo tras _kill_tree")


def test_cleanup_worktree_fallback_removes_dir(tmp_path):
    """Si `git worktree remove` no aplica (dir suelto, no worktree), el fallback
    rmtree lo borra igual: nunca deja el directorio huerfano."""
    _git_repo(tmp_path)
    orphan = tmp_path / "huerfano"
    orphan.mkdir()
    (orphan / "f.txt").write_text("x", encoding="utf-8")
    cli_agent.cleanup_worktree(orphan, "rama/inexistente", tmp_path)
    assert not orphan.exists()
