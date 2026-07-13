"""Tests del workspace (arbol, ignore, contexto)."""

from pathlib import Path

from enjambre import workspace


def _scaffold(root: Path):
    (root / "src").mkdir()
    (root / "src" / "main.py").write_text("print('hola')", encoding="utf-8")
    (root / "README.md").write_text("# proyecto", encoding="utf-8")
    (root / ".env").write_text("SECRET=1", encoding="utf-8")
    (root / "node_modules").mkdir()
    (root / "node_modules" / "lib.js").write_text("x", encoding="utf-8")
    (root / ".enjambreignore").write_text("*.md\nnode_modules/\n", encoding="utf-8")


def test_iter_files_respects_ignore_and_blocked(tmp_path: Path):
    _scaffold(tmp_path)
    files = workspace.iter_files(tmp_path)
    assert "src/main.py" in files
    assert "README.md" not in files          # ignorado por *.md
    assert ".env" not in files               # bloqueado por policy
    assert all("node_modules" not in f for f in files)  # dir ignorado


def test_build_context_includes_selected(tmp_path: Path):
    _scaffold(tmp_path)
    ctx = workspace.build_context(tmp_path, ["src/main.py"])
    assert "src/main.py" in ctx
    assert "print('hola')" in ctx


def test_build_context_excludes_blocked(tmp_path: Path):
    _scaffold(tmp_path)
    ctx = workspace.build_context(tmp_path, [".env"])
    assert "SECRET" not in ctx               # nunca expone .env


def test_build_context_redacts_secrets(tmp_path: Path):
    (tmp_path / "cfg.py").write_text(
        "KEY = 'sk-proj-ABCDEFGHIJKLMNOPQRSTUVWX1234'", encoding="utf-8")
    ctx = workspace.build_context(tmp_path, ["cfg.py"])
    assert "sk-proj-ABCDEFGHIJKLMNOPQRSTUVWX1234" not in ctx
    assert "[REDACTED:openai_key]" in ctx


def test_build_context_blocks_path_traversal(tmp_path: Path):
    """P1-2: build_context componia root/rel sin resolver; `../x` o una ruta
    absoluta leian archivos FUERA de la raiz y los exponian como contexto."""
    root = tmp_path / "proj"
    root.mkdir()
    (root / "ok.py").write_text("dentro", encoding="utf-8")
    secret = tmp_path / "afuera.txt"
    secret.write_text("CONTENIDO_SECRETO", encoding="utf-8")

    # ruta relativa que escapa de la raiz
    ctx = workspace.build_context(root, ["../afuera.txt", "ok.py"])
    assert "CONTENIDO_SECRETO" not in ctx  # bloqueado, no se leyo
    assert "dentro" in ctx                 # el archivo legitimo si

    # ruta absoluta fuera de la raiz
    ctx2 = workspace.build_context(root, [str(secret)])
    assert "CONTENIDO_SECRETO" not in ctx2


def test_default_ignores_git(tmp_path: Path):
    (tmp_path / ".git").mkdir()
    (tmp_path / ".git" / "config").write_text("x", encoding="utf-8")
    (tmp_path / "a.py").write_text("x", encoding="utf-8")
    files = workspace.iter_files(tmp_path)
    assert files == ["a.py"]
