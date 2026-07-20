"""Tests del registro de tools (enjambre.tools). Cada tool respeta su gate."""

from pathlib import Path

from enjambre import tools


def _project(root: Path) -> None:
    (root / "main.py").write_text("print('hola')\n", encoding="utf-8")
    (root / ".env").write_text("SECRET=abc\n", encoding="utf-8")
    (root / "cfg.py").write_text(
        "KEY = 'sk-proj-ABCDEFGHIJKLMNOPQRSTUVWX1234'\n", encoding="utf-8")


# --- lectura (auto, sin aprobacion) ----------------------------------------
def test_list_files(tmp_path):
    _project(tmp_path)
    res = tools.dispatch("list_files", {}, tmp_path)
    assert res.ok
    assert "main.py" in res.content
    assert ".env" not in res.content  # bloqueado por politica


def test_read_file_redacts_secrets(tmp_path):
    _project(tmp_path)
    res = tools.dispatch("read_file", {"path": "cfg.py"}, tmp_path)
    assert res.ok
    assert "sk-proj-ABCDEFGHIJKLMNOPQRSTUVWX1234" not in res.content
    assert "[REDACTED:openai_key]" in res.content


def test_read_file_blocks_env(tmp_path):
    _project(tmp_path)
    res = tools.dispatch("read_file", {"path": ".env"}, tmp_path)
    assert not res.ok  # .env nunca se expone como contexto


def test_read_file_blocks_traversal(tmp_path):
    proj = tmp_path / "proj"
    proj.mkdir()
    (tmp_path / "afuera.txt").write_text("SECRETO", encoding="utf-8")
    res = tools.dispatch("read_file", {"path": "../afuera.txt"}, proj)
    assert not res.ok
    assert "SECRETO" not in res.content


# --- escritura (gateada) ----------------------------------------------------
def test_write_file_pending_without_approval(tmp_path):
    res = tools.dispatch("write_file", {"path": "nuevo.py", "content": "x = 1\n"},
                         tmp_path)
    assert not res.ok
    assert res.error == "pendiente de aprobacion"
    assert "+x = 1" in res.preview          # el preview muestra el diff
    assert not (tmp_path / "nuevo.py").exists()  # NO escribio


def test_write_file_applies_when_approved(tmp_path):
    res = tools.dispatch("write_file", {"path": "nuevo.py", "content": "x = 1\n"},
                         tmp_path, approved=True)
    assert res.ok
    assert (tmp_path / "nuevo.py").read_text(encoding="utf-8") == "x = 1\n"


def test_write_file_rejects_secret(tmp_path):
    res = tools.dispatch(
        "write_file",
        {"path": "leak.py", "content": "K='sk-proj-ABCDEFGHIJKLMNOPQRSTUVWX1234'"},
        tmp_path, approved=True)
    assert not res.ok
    assert "rechazado" in res.error
    assert not (tmp_path / "leak.py").exists()


def test_write_file_rejects_traversal(tmp_path):
    proj = tmp_path / "proj"
    proj.mkdir()
    res = tools.dispatch("write_file", {"path": "../escape.py", "content": "x"},
                         proj, approved=True)
    assert not res.ok
    assert not (tmp_path / "escape.py").exists()


# --- shell (gateada + docker) ----------------------------------------------
def test_run_command_blocks_dangerous(tmp_path):
    res = tools.dispatch("run_command", {"argv": ["sudo", "rm", "-rf", "/"]},
                         tmp_path)
    assert not res.ok
    assert "bloqueado" in res.error  # commands.check_command, antes de aprobar


def test_run_command_pending_without_approval(tmp_path):
    res = tools.dispatch("run_command", {"argv": ["pytest", "-q"]}, tmp_path)
    assert not res.ok
    assert res.error == "pendiente de aprobacion"
    assert "docker --network none" in res.preview


def test_run_command_fail_closed_without_docker(tmp_path, monkeypatch):
    # aprobado pero sin docker -> BLOQUEA (no cae a host)
    import enjambre.sandbox as sandbox_mod
    monkeypatch.setattr(sandbox_mod.shutil, "which", lambda name: None)
    res = tools.dispatch("run_command", {"argv": ["echo", "hola"]}, tmp_path,
                         approved=True)
    assert not res.ok
    assert "docker" in res.error


# --- registro ---------------------------------------------------------------
def test_tool_schemas_filter_by_danger():
    read_only = tools.tool_schemas({"read"})
    names = {s["function"]["name"] for s in read_only}
    assert names == {"list_files", "read_file"}
    all_tools = tools.tool_schemas()
    assert len(all_tools) == 4


def test_needs_approval():
    assert tools.needs_approval("read_file") is False
    assert tools.needs_approval("write_file") is True
    assert tools.needs_approval("run_command") is True
    assert tools.needs_approval("desconocida") is False


def test_dispatch_unknown_tool(tmp_path):
    res = tools.dispatch("noexiste", {}, tmp_path)
    assert not res.ok
    assert "desconocida" in res.error
