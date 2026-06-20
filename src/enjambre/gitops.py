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
class Worktree:
    """Un worktree del repo: ruta en disco, rama (si la hay) y HEAD."""

    path: str
    branch: str = ""
    head: str = ""


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

    def list_worktrees(self) -> list[Worktree]:
        """Lista los worktrees del repo (incluye el principal)."""
        out = self._git("worktree", "list", "--porcelain")
        trees: list[Worktree] = []
        path = head = branch = ""
        for line in out.splitlines():
            if line.startswith("worktree "):
                path = line[len("worktree "):].strip()
            elif line.startswith("HEAD "):
                head = line[len("HEAD "):].strip()
            elif line.startswith("branch "):
                branch = line[len("branch "):].strip().removeprefix("refs/heads/")
            elif not line.strip():  # blanco = fin de bloque
                if path:
                    trees.append(Worktree(path, branch, head))
                path = head = branch = ""
        if path:  # ultimo bloque sin blanco final
            trees.append(Worktree(path, branch, head))
        return trees

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

    def create_worktree(self, path: str | Path, *, approved: bool,
                        branch: str | None = None,
                        new_branch: bool = True) -> str:
        """Crea un worktree aislado (dir separado, mismo .git).

        Primitivo preferido para correr agentes en paralelo sin tocar el working
        tree del usuario: cada candidato se aplica/prueba en su propio worktree.
        `ChangeSet.apply(<ruta del worktree>, approved=True)` escribe ahi.

        `new_branch` True (defecto) crea una rama nueva (`-b`); False usa una rama
        o commit existente. Devuelve la ruta absoluta del worktree.
        """
        _require(approved, "create_worktree")
        target = str(Path(path).resolve())
        ref = branch or Path(target).name
        if new_branch:
            self._git("worktree", "add", "-b", ref, target)
        else:
            self._git("worktree", "add", target, ref)
        return target

    def remove_worktree(self, path: str | Path, *, approved: bool,
                        force: bool = False) -> None:
        """Elimina un worktree (no borra la rama). `force` si tiene cambios."""
        _require(approved, "remove_worktree")
        args = ["worktree", "remove"]
        if force:
            args.append("--force")
        args.append(str(Path(path).resolve()))
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
