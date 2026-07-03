"""Tests del agente CLI (enjambre.cli_agent). Mockea el subprocess `claude`
para no depender del binario real en CI; el worktree usa git real."""

import asyncio
import shutil
import subprocess
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

    def __init__(self, cwd: str):
        self.cwd = cwd

    async def communicate(self):
        (Path(self.cwd) / "nuevo.py").write_text("print('hola')\n", encoding="utf-8")
        return (b'{"result":"ok"}', b"")

    def kill(self):
        pass

    async def wait(self):
        return 0


def _mock_claude(monkeypatch):
    monkeypatch.setattr(cli_agent.shutil, "which", lambda name: "/usr/bin/claude")

    async def fake_exec(*args, cwd=None, **kw):
        return _FakeProc(cwd)

    monkeypatch.setattr(cli_agent.asyncio, "create_subprocess_exec", fake_exec)


def test_run_cli_task_creates_worktree_and_captures_diff(tmp_path, monkeypatch):
    _git_repo(tmp_path)
    _mock_claude(monkeypatch)

    res = asyncio.run(cli_agent.run_cli_task("agrega un hola", tmp_path))

    assert res.ok
    assert res.changed_files == ["nuevo.py"]
    assert "+print('hola')" in res.diff
    assert Path(res.worktree_path).is_dir()  # NO se limpia en run_cli_task
    # El proyecto real NO fue tocado (invariante de seguridad).
    assert not (tmp_path / "nuevo.py").exists()

    # cleanup deja el proyecto sin worktrees colgando
    cli_agent.cleanup_worktree(res.worktree_path, res.branch, tmp_path)
    assert not Path(res.worktree_path).exists()


def test_run_cli_task_missing_binary(tmp_path, monkeypatch):
    _git_repo(tmp_path)
    monkeypatch.setattr(cli_agent.shutil, "which", lambda name: None)
    res = asyncio.run(cli_agent.run_cli_task("x", tmp_path))
    assert not res.ok and "PATH" in res.error


def test_run_cli_task_not_a_git_repo(tmp_path, monkeypatch):
    _mock_claude(monkeypatch)  # binario presente, pero no hay repo git
    res = asyncio.run(cli_agent.run_cli_task("x", tmp_path))
    assert not res.ok and "git" in res.error


def test_cleanup_worktree_fallback_removes_dir(tmp_path):
    """Si `git worktree remove` no aplica (dir suelto, no worktree), el fallback
    rmtree lo borra igual: nunca deja el directorio huerfano."""
    _git_repo(tmp_path)
    orphan = tmp_path / "huerfano"
    orphan.mkdir()
    (orphan / "f.txt").write_text("x", encoding="utf-8")
    cli_agent.cleanup_worktree(orphan, "rama/inexistente", tmp_path)
    assert not orphan.exists()
