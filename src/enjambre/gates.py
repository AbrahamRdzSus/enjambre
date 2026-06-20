"""Gates congelados: el contrato escrito de un slice (Fase 3).

Un gate (`docs/gates/<slice>.md`) fija QUE entra, QUE no entra y COMO se verifica
ANTES de despachar builders, y se CONGELA (no se edita para "hacer que pase").
El pase de revision del arquitecto lo usa como vara para juzgar cada candidato.
Patron tomado de docs/ARCHITECT_LOOP_BLUEPRINT.md (gates congelados).
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

# Encabezados canonicos del formato de gate (acentos opcionales, case-insensitive).
_SECTIONS = {
    "entra": re.compile(r"^#+\s*entra\b", re.IGNORECASE),
    "no_entra": re.compile(r"^#+\s*no\s*entra\b", re.IGNORECASE),
    "verificacion": re.compile(r"^#+\s*verificaci[oó]n\b", re.IGNORECASE),
}
_TITLE = re.compile(r"^#\s*gate:\s*(?P<slice>.+?)\s*$", re.IGNORECASE)
_FROZEN = re.compile(r"^#*\s*congelado:\s*(?P<value>.+?)\s*$", re.IGNORECASE)
_BULLET = re.compile(r"^\s*[-*]\s+(?P<item>.+?)\s*$")


@dataclass
class Gate:
    """Contrato congelado de un slice. `frozen` None => aun no congelado."""

    slice: str = ""
    entra: list[str] = field(default_factory=list)
    no_entra: list[str] = field(default_factory=list)
    verificacion: list[str] = field(default_factory=list)
    frozen: str | None = None
    raw: str = ""

    @property
    def is_frozen(self) -> bool:
        return bool(self.frozen)

    def as_prompt(self) -> str:
        """Render compacto del contrato para inyectar en el pase de revision."""
        def _block(title: str, items: list[str]) -> str:
            if not items:
                return ""
            body = "\n".join(f"- {i}" for i in items)
            return f"{title}:\n{body}"

        parts = [f"GATE: {self.slice}" if self.slice else "GATE"]
        parts += [b for b in (
            _block("ENTRA", self.entra),
            _block("NO ENTRA", self.no_entra),
            _block("VERIFICACION", self.verificacion),
        ) if b]
        return "\n\n".join(parts)


def parse_gate(text: str) -> Gate:
    """Parsea el markdown de un gate a estructura. Tolerante a formato libre."""
    gate = Gate(raw=text)
    current: str | None = None
    for line in text.splitlines():
        title = _TITLE.match(line)
        if title:
            gate.slice = title.group("slice")
            current = None
            continue
        frozen = _FROZEN.match(line)
        if frozen:
            gate.frozen = frozen.group("value")
            current = None
            continue
        section = _match_section(line)
        if section is not None:
            current = section
            continue
        if line.startswith("#"):  # cualquier otro encabezado cierra la seccion
            current = None
            continue
        bullet = _BULLET.match(line)
        if bullet and current:
            getattr(gate, current).append(bullet.group("item"))
    return gate


def load_gate(path: str | Path) -> Gate:
    """Carga y parsea un gate desde disco (UTF-8)."""
    return parse_gate(Path(path).read_text(encoding="utf-8"))


def _match_section(line: str) -> str | None:
    if not line.startswith("#"):
        return None
    for name, pattern in _SECTIONS.items():
        if pattern.match(line):
            return name
    return None
