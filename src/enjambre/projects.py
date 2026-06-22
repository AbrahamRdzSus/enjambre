"""Proyectos: entidad persistente que ata un nombre a una carpeta local.

El dashboard gira en torno a proyectos (mockups: "E-Commerce Nexus"). Un proyecto
= nombre + raiz (carpeta del codigo). Se persiste como una lista JSON en
`.enjambre/projects.json` (gitignoreable). Sin dependencias nuevas (json + stdlib).
"""

from __future__ import annotations

import json
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_STORE = Path(".enjambre/projects.json")


@dataclass
class Project:
    id: str
    name: str
    root: str
    created_at: str  # ISO 8601 UTC


def _read(store: Path) -> list[dict]:
    if not store.is_file():
        return []
    try:
        data = json.loads(store.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except (json.JSONDecodeError, OSError):
        return []


def _write(store: Path, items: list[dict]) -> None:
    store.parent.mkdir(parents=True, exist_ok=True)
    store.write_text(json.dumps(items, indent=2, ensure_ascii=False) + "\n",
                     encoding="utf-8")


def list_projects(*, store: str | Path = DEFAULT_STORE) -> list[Project]:
    return [Project(**d) for d in _read(Path(store))]


def add_project(name: str, root: str, *,
                store: str | Path = DEFAULT_STORE) -> Project:
    """Agrega un proyecto. `name` no vacio; `root` se guarda tal cual (string)."""
    name = name.strip()
    if not name:
        raise ValueError("el proyecto necesita un nombre")
    p = Path(store)
    items = _read(p)
    proj = Project(
        id=uuid.uuid4().hex[:8],
        name=name,
        root=root.strip() or ".",
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    items.append(asdict(proj))
    _write(p, items)
    return proj


def remove_project(project_id: str, *, store: str | Path = DEFAULT_STORE) -> bool:
    """Elimina un proyecto por id. Devuelve True si existia."""
    p = Path(store)
    items = _read(p)
    kept = [d for d in items if d.get("id") != project_id]
    if len(kept) == len(items):
        return False
    _write(p, kept)
    return True
