"""Registro local de agentes (contrato de docs/architecture.md).

Un Agent ata un rol y un system prompt a un (proveedor, modelo). El registro se
persiste en `agents/registered.json` en UTF-8. La lectura tolera el archivo
heredado en UTF-16 (bug de versiones previas) y lo normaliza al guardar.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from pathlib import Path

from .providers import PROVIDERS

DEFAULT_PATH = Path("agents/registered.json")


@dataclass
class Agent:
    name: str
    provider: str
    model: str = ""
    role: str = "builder"
    enabled: bool = True
    system_prompt: str = ""

    def validate(self) -> None:
        if not self.name:
            raise ValueError("El agente necesita 'name'")
        if self.provider not in PROVIDERS:
            raise ValueError(
                f"Proveedor desconocido {self.provider!r}; "
                f"soportados: {', '.join(sorted(PROVIDERS))}"
            )


@dataclass
class Registry:
    agents: list[Agent] = field(default_factory=list)

    # --- persistencia -----------------------------------------------------
    @classmethod
    def load(cls, path: str | Path = DEFAULT_PATH) -> "Registry":
        p = Path(path)
        if not p.exists():
            return cls()
        raw = _read_text_tolerant(p)
        raw = raw.strip()
        if not raw:
            return cls()
        data = json.loads(raw)
        items = data.get("agents", []) if isinstance(data, dict) else data
        agents = []
        for item in items or []:
            if not item.get("name") or not item.get("provider"):
                continue  # descarta entradas vacias del archivo heredado
            agents.append(Agent(
                name=item["name"],
                provider=item["provider"],
                model=item.get("model", ""),
                role=item.get("role", "builder"),
                enabled=item.get("enabled", True),
                system_prompt=item.get("system_prompt", ""),
            ))
        return cls(agents=agents)

    def save(self, path: str | Path = DEFAULT_PATH) -> None:
        p = Path(path)
        p.parent.mkdir(parents=True, exist_ok=True)
        payload = {"agents": [asdict(a) for a in self.agents]}
        p.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
                     encoding="utf-8")

    # --- operaciones ------------------------------------------------------
    def add(self, agent: Agent) -> None:
        agent.validate()
        if any(a.name == agent.name for a in self.agents):
            raise ValueError(f"Ya existe un agente llamado {agent.name!r}")
        self.agents.append(agent)

    def enabled(self) -> list[Agent]:
        return [a for a in self.agents if a.enabled]


def _read_text_tolerant(p: Path) -> str:
    """Lee texto recuperando del UTF-16 heredado (con o sin BOM)."""
    data = p.read_bytes()
    if data[:2] in (b"\xff\xfe", b"\xfe\xff"):
        return data.decode("utf-16")
    # UTF-16 sin BOM (bug heredado en Windows): aparecen bytes nulos.
    if b"\x00" in data[:64]:
        enc = "utf-16-le" if data[1:2] == b"\x00" else "utf-16-be"
        return data.decode(enc)
    return data.decode("utf-8-sig")
