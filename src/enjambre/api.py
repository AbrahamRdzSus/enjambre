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
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from . import config, sessions, stats, workspace
from .changes import ApprovalRequired, Change, ChangeSet
from .logs import LogBus, sse_stream
from .orchestrator import Orchestrator
from .registry import Registry


class RunRequest(BaseModel):
    prompt: str
    agents: list[str] | None = None
    max_tokens: int = 1024
    redact: bool = True
    save: bool = False


class ContextRequest(BaseModel):
    root: str = "."
    paths: list[str]
    redact: bool = True


class ChangeIn(BaseModel):
    path: str
    new_content: str


class ChangesRequest(BaseModel):
    root: str = "."
    changes: list[ChangeIn]
    approved: bool = False
    git_branch: str | None = None


def create_app(*, registry: Registry | None = None,
               keys: dict[str, str] | None = None,
               client: httpx.AsyncClient | None = None,
               bus: LogBus | None = None) -> FastAPI:
    """Crea la app. Sin args usa el registro en disco y claves del entorno.

    `registry`/`keys`/`client`/`bus` permiten inyeccion en tests (transporte mock).
    """
    app = FastAPI(title="ENJAMBRE sidecar", version="1")
    bus = bus or LogBus()
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
        bus.emit("run.start", message=f"prompt ({len(req.prompt)} chars)",
                 agents=req.agents)
        report = await _orch(_registry()).run(
            req.prompt, agents=req.agents, max_tokens=req.max_tokens,
            redact=req.redact)
        for w in report.warnings:
            bus.emit("run.warning", level="warn", message=w)
        for r in report.runs:
            ok = r.result.ok
            bus.emit("agent.done", level="info" if ok else "error", agent=r.agent,
                     message="ok" if ok else (r.result.error or "error"),
                     provider=r.provider, cost_usd=r.result.cost_usd)
        bus.emit("run.done", message=f"{len(report.ok_runs)}/{len(report.runs)} ok",
                 cost_usd=report.total_cost_usd)
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

    # --- workspace (tab Proyectos & Archivos) ------------------------------
    @app.get("/workspace/files")
    def workspace_files(root: str = ".") -> dict[str, Any]:
        if not Path(root).is_dir():
            raise HTTPException(status_code=400, detail=f"'{root}' no es un directorio")
        return {"root": root, "files": workspace.iter_files(root)}

    @app.post("/workspace/context")
    def workspace_context(req: ContextRequest) -> dict[str, str]:
        if not Path(req.root).is_dir():
            raise HTTPException(status_code=400, detail=f"'{req.root}' no es un directorio")
        return {"context": workspace.build_context(req.root, req.paths,
                                                   redact=req.redact)}

    # --- changes (flujo de diff + aprobacion, Fase 2) ----------------------
    def _changeset(req: ChangesRequest) -> ChangeSet:
        return ChangeSet([Change(c.path, c.new_content) for c in req.changes])

    @app.post("/changes/preview")
    def changes_preview(req: ChangesRequest) -> dict[str, dict[str, str]]:
        return {"diffs": _changeset(req).preview(req.root)}

    @app.post("/changes/apply")
    def changes_apply(req: ChangesRequest) -> dict[str, Any]:
        bus.emit("changes.apply", message=f"{len(req.changes)} archivo(s)",
                 approved=req.approved)
        try:
            report = _changeset(req).apply(req.root, approved=req.approved,
                                           git_branch=req.git_branch)
        except ApprovalRequired as exc:
            raise HTTPException(status_code=403, detail=str(exc)) from exc
        if not report.ok:
            bus.emit("changes.rejected", level="warn",
                     message="; ".join(f"{p}: {m}" for p, m in report.rejected))
        return {"ok": report.ok, "written": report.written,
                "rejected": report.rejected, "temp_branch": report.temp_branch}

    # --- logs (tab Logs en Vivo) -------------------------------------------
    @app.get("/logs")
    def logs_recent(limit: int = 100, agent: str | None = None) -> list[dict[str, Any]]:
        return [asdict(e) for e in bus.recent(limit, agent=agent)]

    @app.get("/logs/stream")
    async def logs_stream(replay: int = 20) -> StreamingResponse:
        return StreamingResponse(sse_stream(bus, replay=replay),
                                 media_type="text/event-stream")

    return app


#: app por defecto para `uvicorn enjambre.api:app` (registro en disco, env keys).
app = create_app()
