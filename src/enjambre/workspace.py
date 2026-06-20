"""Workspace: recorrido de archivos y construccion de contexto (Fase 2).

Respeta `.enjambreignore` (patrones estilo gitignore, simplificado) y los
patrones sensibles de `policy.BLOCKED_FILES`. El contexto que se arma para los
agentes pasa por redaccion de secretos.
"""

from __future__ import annotations

import fnmatch
from dataclasses import dataclass
from pathlib import Path

from . import policy

IGNORE_FILE = ".enjambreignore"

# Patrones siempre ignorados aunque no esten en .enjambreignore.
DEFAULT_IGNORES = [
    ".git/", "__pycache__/", ".venv/", "venv/", "node_modules/",
    "dist/", "build/", ".pytest_cache/", "*.pyc",
]

# Limite por archivo para no inflar el contexto (bytes).
MAX_FILE_BYTES = 200_000


@dataclass
class IgnoreRules:
    patterns: list[str]

    def matches(self, rel_path: str) -> bool:
        rel = rel_path.replace("\\", "/")
        name = rel.rsplit("/", 1)[-1]
        for pat in self.patterns:
            p = pat.strip()
            if not p or p.startswith("#"):
                continue
            if p.endswith("/"):  # patron de directorio
                d = p.rstrip("/")
                if rel == d or rel.startswith(d + "/") or f"/{d}/" in f"/{rel}":
                    return True
            elif fnmatch.fnmatch(rel, p) or fnmatch.fnmatch(name, p):
                return True
        return False


def load_ignore(root: str | Path) -> IgnoreRules:
    """Carga `.enjambreignore` del proyecto + defaults."""
    root = Path(root)
    patterns = list(DEFAULT_IGNORES)
    f = root / IGNORE_FILE
    if f.exists():
        patterns += f.read_text(encoding="utf-8").splitlines()
    return IgnoreRules(patterns)


def iter_files(root: str | Path, ignore: IgnoreRules | None = None) -> list[str]:
    """Rutas relativas (POSIX) de archivos no ignorados ni sensibles."""
    root = Path(root)
    rules = ignore or load_ignore(root)
    out: list[str] = []
    for p in sorted(root.rglob("*")):
        if not p.is_file():
            continue
        rel = p.relative_to(root).as_posix()
        if rules.matches(rel) or policy.is_blocked_file(rel):
            continue
        out.append(rel)
    return out


def build_context(root: str | Path, paths: list[str], *,
                  redact: bool = True) -> str:
    """Concatena el contenido de `paths` en un bloque de contexto seguro."""
    root = Path(root)
    chunks: list[str] = []
    for rel in paths:
        rel_norm = rel.replace("\\", "/")
        if policy.is_blocked_file(rel_norm):
            continue  # nunca exponer archivos sensibles como contexto
        fp = root / rel_norm
        if not fp.is_file():
            continue
        try:
            raw = fp.read_bytes()
        except OSError:
            continue
        if len(raw) > MAX_FILE_BYTES:
            text = raw[:MAX_FILE_BYTES].decode("utf-8", "replace")
            text += "\n... [truncado]"
        else:
            text = raw.decode("utf-8", "replace")
        if redact:
            text = policy.redact_secrets(text)
        chunks.append(f"### {rel_norm}\n```\n{text}\n```")
    return "\n\n".join(chunks)
