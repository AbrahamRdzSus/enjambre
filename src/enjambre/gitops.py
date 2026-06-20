"""Operaciones git locales bajo aprobacion humana (Fase 4).

branch/commit/push ESCRIBEN (local o remoto): toda mutacion exige `approved=True`,
igual que `ChangeSet.apply` (Fase 2). Lectura (`current_branch`, `has_changes`)
no requiere aprobacion. Si no hay git disponible o el directorio no es un repo,
las operaciones lanzan `GitError` con un mensaje claro.
"""

from __future__ import annotations

import subprocess
from dataclasses import dataclass
from pathlib import Path

from .changes import ApprovalRequired


class GitError(RuntimeError):
    """Un comando git fallo o el entorno no es un repositorio git."""


@dataclass
class GitOps:
    """Envuelve git via subprocess, anclado a la raiz de un repo."""

    root: str | Path

    def __post_init__(self) -> None:
        self.root = str(Path(self.root).resolve())

    # --- lectura (sin aprobacion) ----------------------------------------
    def is_repo(self) -> bool:
        try:
            self._git("rev-parse", "--git-dir")
            return True
        except GitError:
            return False

    def current_branch(self) -> str:
        return self._git("rev-parse", "--abbrev-ref", "HEAD").strip()

    def has_changes(self) -> bool:
        """True si hay cambios staged o sin stage en el working tree."""
        return bool(self._git("status", "--porcelain").strip())

    # --- mutacion (requiere aprobacion) ----------------------------------
    def create_branch(self, name: str, *, approved: bool) -> str:
        _require(approved, "create_branch")
        self._git("checkout", "-b", name)
        return name

    def stage(self, paths: list[str] | None = None, *, approved: bool) -> None:
        _require(approved, "stage")
        self._git("add", *(paths or ["-A"]))

    def commit(self, message: str, *, approved: bool) -> str:
        _require(approved, "commit")
        self._git("commit", "-m", message)
        return self._git("rev-parse", "HEAD").strip()

    def push(self, remote: str = "origin", branch: str | None = None, *,
             approved: bool, set_upstream: bool = True) -> None:
        _require(approved, "push")
        target = branch or self.current_branch()
        args = ["push"]
        if set_upstream:
            args.append("--set-upstream")
        args += [remote, target]
        self._git(*args)

    # --- interno ----------------------------------------------------------
    def _git(self, *args: str) -> str:
        try:
            proc = subprocess.run(
                ["git", "-C", str(self.root), *args],
                check=True, capture_output=True, text=True)
        except FileNotFoundError as exc:
            raise GitError("git no esta instalado o no esta en PATH") from exc
        except subprocess.CalledProcessError as exc:
            detail = (exc.stderr or exc.stdout or "").strip()
            raise GitError(f"git {' '.join(args)} fallo: {detail}") from exc
        return proc.stdout


def _require(approved: bool, action: str) -> None:
    if not approved:
        raise ApprovalRequired(
            f"gitops.{action}() requiere approved=True (aprobacion humana).")
