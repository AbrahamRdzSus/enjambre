"""Cambios propuestos, diff y aplicacion bajo aprobacion humana (Fase 2).

Regla dura del ecosistema Obsidia: ninguna escritura ocurre sin aprobacion
explicita. `ChangeSet.apply(approved=True)` es el unico camino que toca el disco,
y aun asi valida path traversal, archivos bloqueados y secretos antes de escribir.
"""

from __future__ import annotations

import difflib
import subprocess
from dataclasses import dataclass, field
from pathlib import Path

from . import policy


class ApprovalRequired(PermissionError):
    """Se intento aplicar cambios sin aprobacion humana explicita."""


@dataclass
class Change:
    path: str          # relativo a la raiz del proyecto
    new_content: str

    def diff(self, root: str | Path) -> str:
        label = self.path.replace("\\", "/")
        # Anti path-traversal ANTES de leer: /changes/preview exponia el contenido
        # de cualquier archivo fuera de la raiz por el diff (exfiltracion). safe_resolve
        # devuelve None si la ruta escapa; entonces no se lee nada del disco.
        fp = policy.safe_resolve(root, self.path)
        if fp is None:
            return (f"--- a/{label}\n+++ b/{label}\n"
                    "@@ ruta fuera de la raiz del proyecto: diff no disponible @@\n")
        old = fp.read_text(encoding="utf-8").splitlines(keepends=True) \
            if fp.is_file() else []
        new = self.new_content.splitlines(keepends=True)
        return "".join(difflib.unified_diff(
            old, new, fromfile=f"a/{label}", tofile=f"b/{label}"))


@dataclass
class ApplyReport:
    written: list[str] = field(default_factory=list)
    rejected: list[tuple[str, str]] = field(default_factory=list)  # (path, motivo)
    temp_branch: str | None = None

    @property
    def ok(self) -> bool:
        return not self.rejected


@dataclass
class ChangeSet:
    changes: list[Change] = field(default_factory=list)

    def preview(self, root: str | Path) -> dict[str, str]:
        """path -> unified diff, para revision humana."""
        return {c.path: c.diff(root) for c in self.changes}

    def apply(self, root: str | Path, *, approved: bool,
              git_branch: str | None = None) -> ApplyReport:
        """Escribe los cambios SOLO si `approved` es True.

        `git_branch`: si se da, crea esa branch temporal antes de escribir.
        """
        if not approved:
            raise ApprovalRequired(
                "apply() requiere approved=True (aprobacion humana explicita).")

        root = Path(root).resolve()
        report = ApplyReport()

        # 1. Validar todo el set ANTES de escribir nada (atomicidad de decision).
        for c in self.changes:
            motivo = _reject_reason(root, c)
            if motivo:
                report.rejected.append((c.path, motivo))
        if report.rejected:
            return report  # no se escribe nada si algo es invalido

        # 2. Branch temporal opcional (aislamiento del trabajo).
        if git_branch:
            report.temp_branch = _create_temp_branch(root, git_branch)

        # 3. Escribir.
        for c in self.changes:
            fp = (root / c.path).resolve()
            fp.parent.mkdir(parents=True, exist_ok=True)
            fp.write_text(c.new_content, encoding="utf-8")
            report.written.append(c.path)
        return report


def _reject_reason(root: Path, change: Change) -> str | None:
    rel = change.path.replace("\\", "/")
    # path traversal / ruta absoluta fuera de la raiz
    target = (root / rel).resolve()
    try:
        target.relative_to(root)
    except ValueError:
        return "ruta fuera de la raiz del proyecto"
    if policy.is_blocked_file(rel):
        return "archivo sensible bloqueado por politica"
    scan = policy.scan_secrets(change.new_content)
    if not scan.clean:
        kinds = ", ".join(sorted({f.kind for f in scan.findings}))
        return f"el contenido nuevo contiene secretos ({kinds})"
    return None


def _create_temp_branch(root: Path, name: str) -> str | None:
    """Crea una branch git temporal. Devuelve el nombre o None si no hay git."""
    try:
        subprocess.run(["git", "-C", str(root), "rev-parse", "--git-dir"],
                       check=True, capture_output=True)
        subprocess.run(["git", "-C", str(root), "checkout", "-b", name],
                       check=True, capture_output=True)
        return name
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None
