"""Helpers para tests que necesitan un repo git real en tmp_path (Fase 4)."""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

HAS_GIT = shutil.which("git") is not None


def run(root: Path, *args: str) -> str:
    proc = subprocess.run(["git", "-C", str(root), *args],
                          check=True, capture_output=True, text=True)
    return proc.stdout


def init_repo_with_origin(tmp_path: Path) -> Path:
    """Crea un work-repo con un commit inicial en main y un bare `origin` local.

    Devuelve la ruta del work-repo. El push en los tests va al bare (sin red).
    """
    work = tmp_path / "work"
    bare = tmp_path / "origin.git"
    work.mkdir()
    subprocess.run(["git", "init", "-b", "main", str(work)],
                   check=True, capture_output=True, text=True)
    run(work, "config", "user.email", "test@enjambre.local")
    run(work, "config", "user.name", "Enjambre Test")
    (work / "README.md").write_text("base\n", encoding="utf-8")
    run(work, "add", "-A")
    run(work, "commit", "-m", "init")
    subprocess.run(["git", "init", "--bare", str(bare)],
                   check=True, capture_output=True, text=True)
    run(work, "remote", "add", "origin", str(bare))
    run(work, "push", "-u", "origin", "main")
    return work
