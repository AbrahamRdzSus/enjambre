"""Config declarativa `enjambre.yaml` con parser PROPIO (sin pyyaml).

Por que parser propio: el core es minimal-dep (solo httpx + dotenv). En vez de
arrastrar pyyaml se parsea un SUBCONJUNTO ESTRICTO de YAML, suficiente para
declarar agentes y defaults, y se rechaza lo que salga del subconjunto con un
error que cita la linea. NO es un parser YAML general.

Subconjunto soportado (2 niveles, indent de 2 espacios):

    # comentarios de linea completa y en linea (en valores no entrecomillados)
    defaults:
      max_tokens: 1024
      mode: parallel

    agents:
      - name: claude-builder
        provider: anthropic
        model: claude-sonnet-4-6
        role: builder
        enabled: true
        system_prompt: "Eres un dev backend conciso."
      - name: gpt-arch
        provider: openai
        role: architect

Escalares: string (bare o "..."/ '...'), bool (true/false), int. Nada anidado
mas alla de esto (ni listas dentro de listas, ni mappings dentro de agentes).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

from .registry import Agent, Registry

DEFAULT_CONFIG = Path("enjambre.yaml")

#: campos validos de un agente (alineados al dataclass Agent).
_AGENT_FIELDS = {"name", "provider", "model", "role", "enabled", "system_prompt"}


class ConfigError(ValueError):
    """El enjambre.yaml viola el subconjunto soportado."""


@dataclass
class EnjambreConfig:
    agents: list[Agent] = field(default_factory=list)
    defaults: dict[str, object] = field(default_factory=dict)

    def to_registry(self) -> Registry:
        return Registry(agents=list(self.agents))


def parse(text: str) -> EnjambreConfig:
    """Parsea el texto de un enjambre.yaml. Lanza ConfigError con n.o de linea."""
    cfg = EnjambreConfig()
    section: str | None = None                    # "defaults" | "agents" | None
    current: dict[str, object] | None = None      # agente en construccion
    agent_dicts: list[tuple[dict[str, object], int]] = []

    for n, raw in enumerate(text.splitlines(), start=1):
        line = _strip_comment(raw)
        if not line.strip():
            continue
        indent = len(line) - len(line.lstrip(" "))
        body = line.strip()

        # --- encabezado de seccion top-level (col 0, "clave:") ---
        if indent == 0:
            section = _section_key(body, n)
            current = None
            if section == "defaults":
                cfg.defaults = {}
            continue

        if section is None:
            raise ConfigError(f"linea {n}: contenido fuera de una seccion "
                              f"('defaults:' o 'agents:')")

        if section == "defaults":
            k, v = _split_kv(body, n)
            cfg.defaults[k] = _scalar(v)
            continue

        # --- section == "agents" ---
        if body.startswith("- "):
            current = {}
            agent_dicts.append((current, n))
            k, v = _split_kv(body[2:].strip(), n)
            _put_agent_field(current, k, v, n)
            continue
        if current is None:
            raise ConfigError(f"linea {n}: clave de agente sin un '- ' que abra el item")
        k, v = _split_kv(body, n)
        _put_agent_field(current, k, v, n)

    cfg.agents = [_finalize_agent(d, ln) for d, ln in agent_dicts]
    return cfg


def load_config(path: str | Path = DEFAULT_CONFIG) -> EnjambreConfig:
    """Carga y parsea enjambre.yaml (UTF-8)."""
    return parse(Path(path).read_text(encoding="utf-8"))


# --- internos --------------------------------------------------------------
def _section_key(body: str, n: int) -> str:
    if not body.endswith(":"):
        raise ConfigError(f"linea {n}: se esperaba 'defaults:' o 'agents:'")
    key = body[:-1].strip()
    if key not in ("defaults", "agents"):
        raise ConfigError(f"linea {n}: seccion desconocida {key!r} "
                          f"(solo 'defaults' o 'agents')")
    return key


def _split_kv(body: str, n: int) -> tuple[str, str]:
    if ":" not in body:
        raise ConfigError(f"linea {n}: se esperaba 'clave: valor'")
    k, _, v = body.partition(":")
    return k.strip(), v.strip()


def _put_agent_field(d: dict[str, object], key: str, raw: str, n: int) -> None:
    if key not in _AGENT_FIELDS:
        raise ConfigError(f"linea {n}: campo de agente desconocido {key!r}; "
                          f"validos: {', '.join(sorted(_AGENT_FIELDS))}")
    d[key] = _scalar(raw)


def _finalize_agent(d: dict[str, object], n: int) -> Agent:
    if "name" not in d or "provider" not in d:
        raise ConfigError(f"linea {n}: el agente necesita al menos 'name' y 'provider'")
    try:
        agent = Agent(**d)  # type: ignore[arg-type]
        agent.validate()
    except (ValueError, TypeError) as exc:  # provider/campos invalidos -> ConfigError
        raise ConfigError(f"linea {n}: {exc}") from exc
    return agent


def _strip_comment(raw: str) -> str:
    """Quita comentarios de linea. Respeta '#' dentro de valores entrecomillados."""
    out = []
    quote: str | None = None
    for ch in raw:
        if quote:
            out.append(ch)
            if ch == quote:
                quote = None
        elif ch in ("'", '"'):
            quote = ch
            out.append(ch)
        elif ch == "#":
            break
        else:
            out.append(ch)
    return "".join(out).rstrip()


def _scalar(raw: str) -> object:
    raw = raw.strip()
    if len(raw) >= 2 and raw[0] == raw[-1] and raw[0] in ("'", '"'):
        return raw[1:-1]
    low = raw.lower()
    if low == "true":
        return True
    if low == "false":
        return False
    if raw.lstrip("-").isdigit():
        return int(raw)
    return raw
