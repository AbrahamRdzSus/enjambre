"""Orquestacion multiagente con roles y modos de colaboracion (Fase 3).

Sobre el `Orchestrator` de Fase 1 (despacho paralelo, solo lectura). Anade:
- Roles: `builder` ejecuta; `architect` planea y REVISA (no se auto-aprueba).
- Modos: parallel | sequential | debate | vote.
- Pase de revision del arquitecto que puntua candidatos contra un `Gate` congelado.

Regla dura del ecosistema Obsidia (ver ARCHITECT_LOOP_BLUEPRINT.md): autor y
revisor en lanes distintos, y la integracion final es human-in-the-loop via la
Fase 2 (`ChangeSet.apply`). Esta capa NUNCA escribe en disco: produce candidatos
y recomendaciones para que un humano decida.
"""

from __future__ import annotations

import asyncio
import re
from dataclasses import dataclass, field
from typing import Literal

import httpx

from .gates import Gate
from .orchestrator import Orchestrator
from .providers import ProviderResult, Usage
from .registry import Agent, Registry

Mode = Literal["parallel", "sequential", "debate", "vote"]
MODES: tuple[Mode, ...] = ("parallel", "sequential", "debate", "vote")

ARCHITECT = "architect"
BUILDER = "builder"

#: Extrae un score 0-100 de la respuesta del arquitecto ("SCORE: 87", "87/100").
_SCORE = re.compile(r"\bscore\s*[:=]?\s*(\d{1,3})\b|\b(\d{1,3})\s*/\s*100\b",
                    re.IGNORECASE)


@dataclass
class Candidate:
    """Una propuesta de un builder (texto), sin aplicar.

    `usage` y `latency_ms` se arrastran del ProviderResult: sin ellos, /stats
    agregaba CERO tokens para todo run que no fuera modo `parallel` (el unico que
    no pasa por aqui), y el cockpit mostraba costos incompletos al usuario.
    """

    agent: str
    provider: str
    model: str
    text: str = ""
    cost_usd: float = 0.0
    error: str | None = None
    usage: Usage = field(default_factory=Usage)
    latency_ms: int = 0

    @property
    def ok(self) -> bool:
        return self.error is None

    @classmethod
    def from_result(cls, agent: str, result: ProviderResult) -> Candidate:
        return cls(agent, result.provider, result.model, result.text,
                   result.cost_usd, result.error, result.usage, result.latency_ms)


@dataclass
class Verdict:
    """Juicio del arquitecto sobre un candidato contra el gate.

    `agent` es el builder JUZGADO (para ordenar/mostrar). El pase de revision tiene
    su propio costo (una corrida del arquitecto por candidato) que antes no se
    contabilizaba: `provider`/`cost_usd`/`usage`/`latency_ms` lo arrastran y `reviewer`
    nombra al arquitecto para el desglose de /stats.
    """

    agent: str
    score: int | None  # None si el arquitecto no emitio score parseable
    rationale: str
    error: str | None = None
    reviewer: str = ""       # nombre del agente arquitecto que emitio el veredicto
    provider: str = ""
    model: str = ""
    cost_usd: float = 0.0
    usage: Usage = field(default_factory=Usage)
    latency_ms: int = 0


@dataclass
class MultiAgentReport:
    mode: Mode
    rounds: list[list[Candidate]] = field(default_factory=list)
    verdicts: list[Verdict] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    @property
    def final(self) -> list[Candidate]:
        """Candidatos de la ultima ronda (la vista que importa al humano)."""
        return self.rounds[-1] if self.rounds else []

    @property
    def total_cost_usd(self) -> float:
        return (sum(c.cost_usd for r in self.rounds for c in r)
                + sum(v.cost_usd for v in self.verdicts))

    @property
    def ranked(self) -> list[Candidate]:
        """Candidatos finales ordenados por score del arquitecto (desc)."""
        by_agent = {v.agent: v.score for v in self.verdicts}
        return sorted(
            self.final,
            key=lambda c: (by_agent.get(c.agent) is None, -(by_agent.get(c.agent) or 0)),
        )


class MultiAgent:
    """Coordina builders y un arquitecto sobre el `Orchestrator` de Fase 1."""

    def __init__(self, registry: Registry, *,
                 keys: dict[str, str] | None = None,
                 client: httpx.AsyncClient | None = None,
                 max_tokens: int = 1024) -> None:
        self.registry = registry
        self._orch = Orchestrator(registry, keys=keys, client=client)
        self._max_tokens = max_tokens

    # --- seleccion por rol -------------------------------------------------
    def builders(self) -> list[Agent]:
        return [a for a in self.registry.enabled() if a.role != ARCHITECT]

    def architect(self) -> Agent | None:
        return next((a for a in self.registry.enabled() if a.role == ARCHITECT),
                    None)

    # --- punto de entrada --------------------------------------------------
    async def run(self, mode: Mode, prompt: str, *,
                  gate: Gate | None = None, rounds: int = 2,
                  review: bool = True) -> MultiAgentReport:
        """Ejecuta el `mode` elegido y (si hay arquitecto) puntua los candidatos."""
        report = MultiAgentReport(mode=mode)
        if not self.builders():
            report.warnings.append("No hay builders habilitados.")
            return report

        if mode == "parallel" or mode == "vote":
            report.rounds = [await self._parallel(prompt)]
        elif mode == "sequential":
            report.rounds = [await self._sequential(prompt)]
        elif mode == "debate":
            report.rounds = await self._debate(prompt, rounds=rounds)
        else:  # pragma: no cover - Literal lo impide
            raise ValueError(f"Modo desconocido: {mode}")

        if review or mode == "vote":
            await self._apply_review(report, gate)
        return report

    # --- modos -------------------------------------------------------------
    async def _parallel(self, prompt: str) -> list[Candidate]:
        names = [b.name for b in self.builders()]
        rep = await self._orch.run(prompt, agents=names,
                                   max_tokens=self._max_tokens)
        return [Candidate.from_result(r.agent, r.result) for r in rep.runs]

    async def _sequential(self, prompt: str) -> list[Candidate]:
        """Cada builder refina el output del anterior (cadena)."""
        chain: list[Candidate] = []
        carried = prompt
        for b in self.builders():
            rep = await self._orch.run(carried, agents=[b.name],
                                       max_tokens=self._max_tokens)
            cand = (Candidate.from_result(rep.runs[0].agent, rep.runs[0].result)
                    if rep.runs else
                    Candidate(b.name, b.provider, b.model,
                              error="sin respuesta (revisar clave/agente)"))
            chain.append(cand)
            if cand.ok and cand.text:
                carried = (f"{prompt}\n\n--- Propuesta previa de {cand.agent} ---\n"
                           f"{cand.text}\n--- Mejorala o corrigela. ---")
        return chain

    async def _debate(self, prompt: str, *, rounds: int) -> list[list[Candidate]]:
        """N rondas; en cada ronda los builders ven las respuestas previas."""
        history: list[list[Candidate]] = []
        for n in range(max(1, rounds)):
            turn_prompt = prompt if n == 0 else _debate_prompt(prompt, history[-1])
            history.append(await self._parallel(turn_prompt))
        return history

    # --- pase de revision del arquitecto ----------------------------------
    async def _apply_review(self, report: MultiAgentReport,
                            gate: Gate | None) -> None:
        arch = self.architect()
        if arch is None:
            report.warnings.append(
                "Sin agente 'architect' habilitado: no hay pase de revision "
                "(autor y revisor deben ir en lanes distintos).")
            return
        candidates = report.final
        reviewable = [c for c in candidates if c.ok and c.agent != arch.name]
        if not reviewable:
            report.warnings.append("No hay candidatos revisables para el arquitecto.")
            return

        async def _judge(cand: Candidate) -> Verdict:
            prompt = _review_prompt(gate, cand)
            rep = await self._orch.run(prompt, agents=[arch.name],
                                       max_tokens=self._max_tokens)
            res = rep.runs[0].result if rep.runs else None
            common = dict(
                reviewer=arch.name, provider=arch.provider, model=arch.model,
                cost_usd=(res.cost_usd if res else 0.0),
                usage=(res.usage if res else Usage()),
                latency_ms=(res.latency_ms if res else 0),
            )
            if res is None or not res.ok:
                err = res.error if res else "sin respuesta"
                return Verdict(cand.agent, None, "", error=err, **common)
            text = res.text
            return Verdict(cand.agent, _extract_score(text), text.strip(), **common)

        report.verdicts = list(await asyncio.gather(*(_judge(c) for c in reviewable)))


# --- helpers de prompt -----------------------------------------------------
def _debate_prompt(prompt: str, previous: list[Candidate]) -> str:
    blocks = [f"### {c.agent}\n{c.text}" for c in previous if c.ok and c.text]
    others = "\n\n".join(blocks) if blocks else "(sin respuestas previas)"
    return (f"{prompt}\n\n=== Respuestas de los otros agentes en la ronda previa "
            f"===\n{others}\n\n=== Critica, mejora tu respuesta y justifica los "
            f"cambios. ===")


def _review_prompt(gate: Gate | None, cand: Candidate) -> str:
    contract = gate.as_prompt() if gate else "(sin gate: juzga por correctitud y claridad)"
    return (
        "Eres el ARQUITECTO revisor. Juzga la propuesta del builder contra el "
        "contrato del gate. NO la reescribas; emite un veredicto.\n"
        "Responde con una linea 'SCORE: <0-100>' y luego un breve racional "
        "(que cumple, que falta, riesgos).\n\n"
        f"--- CONTRATO ---\n{contract}\n\n"
        f"--- PROPUESTA DE {cand.agent} ---\n{cand.text}\n"
    )


def _extract_score(text: str) -> int | None:
    m = _SCORE.search(text or "")
    if not m:
        return None
    raw = m.group(1) or m.group(2)
    try:
        val = int(raw)
    except (TypeError, ValueError):
        return None
    return max(0, min(100, val))
