"""Directorio de datos del usuario (escribible) para el sidecar empaquetado.

Instalado en Program Files (read-only) no se puede escribir en el CWD. Aqui se
resuelve un dir de datos por-usuario donde viven registered.json, sesiones y
proyectos. Override con ENJAMBRE_DATA_DIR (dev/tests). Sin dependencias nuevas.
"""

from __future__ import annotations

import os
from pathlib import Path


def data_dir() -> Path:
    """Dir de datos por-usuario (lo crea si no existe)."""
    override = os.environ.get("ENJAMBRE_DATA_DIR", "").strip()
    if override:
        base = Path(override)
    elif os.name == "nt" and os.environ.get("APPDATA"):
        base = Path(os.environ["APPDATA"]) / "enjambre"
    else:
        xdg = os.environ.get("XDG_DATA_HOME")
        root = Path(xdg) if xdg else Path.home() / ".local" / "share"
        base = root / "enjambre"
    base.mkdir(parents=True, exist_ok=True)
    return base
