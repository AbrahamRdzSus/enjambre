"""Siembra sesiones de DEMO para que el dashboard luzca lleno (como los mockups).

Crea sesiones de orquestacion de ejemplo en .enjambre/sessions usando el pipeline
REAL (enjambre.sessions), asi /stats, /sessions y las metricas del header se
pueblan sin tener que correr agentes con claves.

Uso (desde la raiz del repo, donde corre el sidecar):
    python scripts/seed_demo.py
Para limpiar: borra la carpeta .enjambre/sessions.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from enjambre import sessions  # noqa: E402
from enjambre.orchestrator import AgentRun, OrchestrationReport  # noqa: E402
from enjambre.providers import ProviderResult, Usage  # noqa: E402

# (agente, proveedor, modelo, in_tok, out_tok, costo, latencia)
AGENTS = [
    ("claude-builder", "anthropic", "claude-sonnet-4-6", 1800, 950, 0.0195, 2400),
    ("gpt-builder", "openai", "gpt-4o-mini", 1600, 880, 0.0008, 1700),
    ("gemini-builder", "google", "gemini-1.5-flash", 1500, 800, 0.0004, 1500),
    ("grok-builder", "xai", "grok-2-latest", 1700, 900, 0.0120, 2100),
]

PROMPTS = [
    "Refactoriza el modulo de autenticacion para reducir acoplamiento",
    "Agrega tests al pipeline de ingestion y cubre los edge cases",
    "Disena el esquema de la tabla de auditoria y su migracion",
    "Optimiza la consulta N+1 en el listado de ordenes",
    "Implementa rate limiting por usuario en el endpoint de busqueda",
]


def _report(prompt: str, n_agents: int) -> OrchestrationReport:
    runs = []
    for agent, prov, model, itok, otok, cost, lat in AGENTS[:n_agents]:
        runs.append(AgentRun(
            agent=agent, provider=prov, model=model,
            result=ProviderResult(
                provider=prov, model=model,
                text=f"// propuesta de {agent} para: {prompt[:40]}...",
                usage=Usage(itok, otok), cost_usd=cost, latency_ms=lat),
        ))
    return OrchestrationReport(prompt=prompt, runs=runs)


def main() -> None:
    for i, prompt in enumerate(PROMPTS):
        sid = f"demo-{i:02d}"
        n = 4 if i % 2 == 0 else 3
        sessions.save(_report(prompt, n), session_id=sid)
    items = sessions.list_sessions()
    print(f"[seed] {len(items)} sesiones de demo en .enjambre/sessions "
          f"(borra esa carpeta para limpiar).")


if __name__ == "__main__":
    main()
