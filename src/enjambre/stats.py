"""Agregacion de uso a partir de las sesiones persistidas (enjambre.sessions).

Alimenta las tabs Overview y Estadisticas del dashboard (ver
diseno/ENJAMBRE_Dashboard_Design.md): tokens y costo por proveedor y por agente,
mas un timeline por dia. Sin dependencias nuevas: lee el store de sesiones.

Notas de fidelidad:
- Tokens solo existen en sesiones de orquestacion (ProviderResult.usage). Las
  sesiones multiagente aportan costo pero no desglose de tokens (Candidate no
  guarda Usage); se cuentan en `cost_usd` pero no en tokens.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path

from . import sessions
from .sessions import DEFAULT_STORE, Session


@dataclass
class Tally:
    """Acumulado de uso de una entidad (proveedor o agente)."""

    runs: int = 0
    ok: int = 0
    errors: int = 0
    input_tokens: int = 0
    output_tokens: int = 0
    cost_usd: float = 0.0

    @property
    def total_tokens(self) -> int:
        return self.input_tokens + self.output_tokens


@dataclass
class UsageStats:
    by_provider: dict[str, Tally] = field(default_factory=dict)
    by_agent: dict[str, Tally] = field(default_factory=dict)
    by_day: dict[str, float] = field(default_factory=dict)  # fecha ISO -> costo
    sessions: int = 0

    @property
    def total_cost_usd(self) -> float:
        return sum(t.cost_usd for t in self.by_provider.values())

    @property
    def total_tokens(self) -> int:
        return sum(t.total_tokens for t in self.by_provider.values())


def aggregate(items: list[Session]) -> UsageStats:
    """Agrega una lista de sesiones (ya cargadas) en estadisticas de uso."""
    stats = UsageStats(sessions=len(items))
    prov: dict[str, Tally] = defaultdict(Tally)
    agent: dict[str, Tally] = defaultdict(Tally)
    day: dict[str, float] = defaultdict(float)

    for s in items:
        date = s.created_at[:10]  # YYYY-MM-DD
        if s.kind == "orchestration":
            for run in s.data.get("runs", []):
                res = run.get("result", {})
                _add(prov[run.get("provider", "?")], agent[run.get("agent", "?")],
                     res, day, date)
        elif s.kind == "multiagent":
            for rnd in s.data.get("rounds", []):
                for c in rnd:
                    _add_candidate(prov[c.get("provider", "?")],
                                   agent[c.get("agent", "?")], c, day, date)

    stats.by_provider = dict(prov)
    stats.by_agent = dict(agent)
    stats.by_day = dict(day)
    return stats


def from_store(store: str | Path = DEFAULT_STORE) -> UsageStats:
    """Carga el store de sesiones y agrega su uso."""
    return aggregate(sessions.list_sessions(store=store))


# --- internos --------------------------------------------------------------
def _add(prov: Tally, agent: Tally, result: dict, day: dict[str, float],
         date: str) -> None:
    usage = result.get("usage", {}) or {}
    cost = result.get("cost_usd", 0.0) or 0.0
    ok = result.get("error") is None
    inp = usage.get("input_tokens", 0)
    out = usage.get("output_tokens", 0)
    for t in (prov, agent):
        t.runs += 1
        t.ok += 1 if ok else 0
        t.errors += 0 if ok else 1
        t.input_tokens += inp
        t.output_tokens += out
        t.cost_usd += cost
    day[date] += cost


def _add_candidate(prov: Tally, agent: Tally, cand: dict, day: dict[str, float],
                   date: str) -> None:
    cost = cand.get("cost_usd", 0.0) or 0.0
    ok = cand.get("error") is None
    for t in (prov, agent):
        t.runs += 1
        t.ok += 1 if ok else 0
        t.errors += 0 if ok else 1
        t.cost_usd += cost
    day[date] += cost
