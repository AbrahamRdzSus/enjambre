"""Sidecar FastAPI: expone el core de ENJAMBRE por HTTP local (capa para el frontend).

Es el contrato que el dashboard React (futuro) consumira; tambien es el "sidecar"
del plan de migracion a Tauri (ver docs/MIGRATION_TAURI.md). Local-only: escucha
en 127.0.0.1; BYOK (las claves se leen del entorno y nunca se devuelven). Las
acciones destructivas siguen pasando por el gate del core (approved=True).

FastAPI es dependencia OPCIONAL (extra `[api]`), no del core:
    pip install -e ".[api]"
    uvicorn enjambre.api:app --host 127.0.0.1 --port 8000

Endpoints (v1): /health /agents /providers /validate /run /sessions /sessions/{id} /stats.
Workspace y aplicacion de cambios (Fase 2) quedan para una iteracion posterior.
"""

from __future__ import annotations

from dataclasses import asdict
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import config, sessions, stats
from .orchestrator import Orchestrator
from .registry import Registry


class RunRequest(BaseModel):
    prompt: str
    agents: list[str] | None = None
    max_tokens: int = 1024
    redact: bool = True
    save: bool = False


def create_app(*, registry: Registry | None = None,
               keys: dict[str, str] | None = None,
               client: httpx.AsyncClient | None = None) -> FastAPI:
    """Crea la app. Sin args usa el registro en disco y claves del entorno.

    `registry`/`keys`/`client` permiten inyeccion en tests (transporte mock).
    """
    app = FastAPI(title="ENJAMBRE sidecar", version="1")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:1420", "http://127.0.0.1:1420",
                       "http://localhost:5173", "tauri://localhost"],
        allow_methods=["*"], allow_headers=["*"],
    )

    def _registry() -> Registry:
        return registry if registry is not None else Registry.load()

    def _orch(reg: Registry) -> Orchestrator:
        return Orchestrator(reg, keys=keys, client=client)

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/agents")
    def agents() -> list[dict[str, Any]]:
        return [asdict(a) for a in _registry().agents]

    @app.get("/providers")
    def providers() -> list[dict[str, Any]]:
        have = set(config.available_providers())
        return [{"provider": p, "env": config.PROVIDER_ENV[p],
                 "key_present": p in have}
                for p in sorted(config.PROVIDER_ENV)]

    @app.post("/validate")
    async def validate() -> dict[str, dict[str, Any]]:
        results = await _orch(_registry()).validate_keys()
        return {p: {"ok": r.ok, "detail": r.detail} for p, r in results.items()}

    @app.post("/run")
    async def run(req: RunRequest) -> dict[str, Any]:
        report = await _orch(_registry()).run(
            req.prompt, agents=req.agents, max_tokens=req.max_tokens,
            redact=req.redact)
        out: dict[str, Any] = asdict(report)
        out["total_cost_usd"] = report.total_cost_usd
        if req.save and report.runs:
            out["session_id"] = sessions.save(report)
        return out

    @app.get("/sessions")
    def list_sessions() -> list[dict[str, Any]]:
        return [{"id": s.id, "kind": s.kind, "created_at": s.created_at,
                 "prompt": s.prompt} for s in sessions.list_sessions()]

    @app.get("/sessions/{session_id}")
    def get_session(session_id: str) -> dict[str, Any]:
        try:
            s = sessions.load(session_id)
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        return {"id": s.id, "kind": s.kind, "created_at": s.created_at,
                "prompt": s.prompt, "data": s.data}

    @app.get("/stats")
    def usage_stats() -> dict[str, Any]:
        st = stats.from_store()
        return {
            "sessions": st.sessions,
            "total_tokens": st.total_tokens,
            "total_cost_usd": st.total_cost_usd,
            "by_provider": {k: asdict(v) for k, v in st.by_provider.items()},
            "by_agent": {k: asdict(v) for k, v in st.by_agent.items()},
            "by_day": st.by_day,
        }

    return app


#: app por defecto para `uvicorn enjambre.api:app` (registro en disco, env keys).
app = create_app()
