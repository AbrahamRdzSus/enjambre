"""Sidecar FastAPI: expone el core de ENJAMBRE por HTTP local (capa para el frontend).

Es el contrato que el dashboard React (futuro) consumira; tambien es el "sidecar"
del plan de migracion a Tauri (ver docs/MIGRATION_TAURI.md). Local-only: escucha
en 127.0.0.1; BYOK (las claves se leen del entorno y nunca se devuelven). Las
acciones destructivas siguen pasando por el gate del core (approved=True).

FastAPI es dependencia OPCIONAL (extra `[api]`), no del core:
    pip install -e ".[api]"
    uvicorn enjambre.api:app --host 127.0.0.1 --port 8000

Endpoints: /health /agents /providers /validate /run /sessions /stats /workspace/*
/changes/* /logs /logs/stream.

Seguridad (3 controles, todos opt-in para no estorbar el uso local):
- API token (env ENJAMBRE_API_TOKEN): si se define, todo salvo /health exige
  'Authorization: Bearer <token>' o 'X-API-Token'. Defense-in-depth aun en loopback.
- Allowlist de roots (env ENJAMBRE_ALLOWED_ROOTS, separado por os.pathsep): si se
  define, /workspace y /changes solo operan dentro de esos dirs (resuelto, anti
  traversal/symlink). Sin definir = sin restriccion (app local BYOK navega libre).
- Docs apagadas por defecto: /docs /redoc /openapi.json solo si ENJAMBRE_API_DEV=1
  (reduce superficie/divulgacion de esquema).
"""

from __future__ import annotations

import os
from dataclasses import asdict, replace
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

from . import config, sessions, stats, workspace
from .changes import ApprovalRequired, Change, ChangeSet
from .logs import LogBus, sse_stream
from .orchestrator import Orchestrator
from .registry import Agent, Registry


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


class AgentIn(BaseModel):
    name: str
    provider: str
    model: str = ""
    role: str = "builder"
    enabled: bool = True
    system_prompt: str = ""


class AgentPatch(BaseModel):
    provider: str | None = None
    model: str | None = None
    role: str | None = None
    enabled: bool | None = None
    system_prompt: str | None = None


class KeyIn(BaseModel):
    provider: str
    key: str


def _resolve_roots(allowed_roots: list[str] | None) -> list[Path] | None:
    raw = allowed_roots
    if raw is None:
        env = os.getenv("ENJAMBRE_ALLOWED_ROOTS", "").strip()
        raw = env.split(os.pathsep) if env else None
    if not raw:
        return None  # sin restriccion (default local)
    return [Path(r).expanduser().resolve() for r in raw if r.strip()]


def create_app(*, registry: Registry | None = None,
               keys: dict[str, str] | None = None,
               client: httpx.AsyncClient | None = None,
               bus: LogBus | None = None,
               api_token: str | None = None,
               allowed_roots: list[str] | None = None,
               dev_docs: bool | None = None) -> FastAPI:
    """Crea la app. Sin args usa el registro en disco y claves del entorno.

    `registry`/`keys`/`client`/`bus` permiten inyeccion en tests. `api_token`/
    `allowed_roots`/`dev_docs` controlan los 3 controles de seguridad (con
    fallback a env ENJAMBRE_API_TOKEN / ENJAMBRE_ALLOWED_ROOTS / ENJAMBRE_API_DEV).
    """
    token = (api_token if api_token is not None
             else os.getenv("ENJAMBRE_API_TOKEN", "").strip()) or None
    roots = _resolve_roots(allowed_roots)
    show_docs = (dev_docs if dev_docs is not None
                 else os.getenv("ENJAMBRE_API_DEV", "").strip().lower()
                 in ("1", "true", "yes"))

    docs = dict(docs_url="/docs", redoc_url="/redoc", openapi_url="/openapi.json") \
        if show_docs else dict(docs_url=None, redoc_url=None, openapi_url=None)
    app = FastAPI(title="ENJAMBRE sidecar", version="1", **docs)
    bus = bus or LogBus()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:1420", "http://127.0.0.1:1420",
                       "http://localhost:5173", "tauri://localhost",
                       # app Tauri empaquetada (Windows usa http/https tauri.localhost)
                       "http://tauri.localhost", "https://tauri.localhost"],
        allow_methods=["*"], allow_headers=["*"],
    )

    if token:
        @app.middleware("http")
        async def _auth(request: Request, call_next):
            # /health y preflight CORS quedan abiertos; el resto exige token.
            if request.url.path == "/health" or request.method == "OPTIONS":
                return await call_next(request)
            sent = (request.headers.get("x-api-token")
                    or request.headers.get("authorization", "").removeprefix("Bearer ").strip()
                    or request.query_params.get("token", ""))  # EventSource no manda headers
            if sent != token:
                return JSONResponse({"detail": "token invalido o ausente"},
                                    status_code=401)
            return await call_next(request)

    def _ensure_root(root: str) -> Path:
        """Valida que `root` es un dir permitido (allowlist + anti traversal)."""
        p = Path(root).expanduser().resolve()
        if not p.is_dir():
            raise HTTPException(status_code=400, detail=f"'{root}' no es un directorio")
        if roots is not None and not any(
                p == r or p.is_relative_to(r) for r in roots):
            raise HTTPException(status_code=403,
                                detail=f"'{root}' fuera de los roots permitidos")
        return p

    # Claves BYOK en memoria (NUNCA se persisten ni se devuelven). Solo activas si
    # no se inyectaron claves fijas (modo test). Sobrescriben al entorno.
    runtime_keys: dict[str, str] = {}

    def _registry() -> Registry:
        return registry if registry is not None else Registry.load()

    def _save_registry(reg: Registry) -> None:
        # En modo inyectado (tests) el registro es en memoria: no se persiste.
        if registry is None:
            reg.save()

    def _effective_keys() -> dict[str, str] | None:
        if keys is not None:
            return keys  # modo test: claves fijas inyectadas
        # entorno + overrides en memoria (override gana)
        merged = {p: config.get_key(p) for p in config.PROVIDER_ENV}
        merged.update({k: v for k, v in runtime_keys.items() if v})
        return merged

    def _orch(reg: Registry) -> Orchestrator:
        return Orchestrator(reg, keys=_effective_keys(), client=client)

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/agents")
    def agents() -> list[dict[str, Any]]:
        return [asdict(a) for a in _registry().agents]

    @app.get("/providers")
    def providers() -> list[dict[str, Any]]:
        eff = _effective_keys() or {}
        return [{"provider": p, "env": config.PROVIDER_ENV[p],
                 "key_present": bool(eff.get(p))}
                for p in sorted(config.PROVIDER_ENV)]

    @app.post("/agents", status_code=201)
    def add_agent(body: AgentIn) -> dict[str, Any]:
        reg = _registry()
        try:
            reg.add(Agent(**body.model_dump()))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        _save_registry(reg)
        bus.emit("agent.added", agent=body.name, message=body.provider)
        return asdict(reg.get(body.name))  # type: ignore[arg-type]

    @app.patch("/agents/{name}")
    def patch_agent(name: str, body: AgentPatch) -> dict[str, Any]:
        reg = _registry()
        current = reg.get(name)
        if current is None:
            raise HTTPException(status_code=404, detail=f"agente {name!r} no existe")
        updated = replace(current, **{k: v for k, v in body.model_dump().items()
                                      if v is not None})
        try:
            reg.replace(updated)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        _save_registry(reg)
        return asdict(updated)

    @app.delete("/agents/{name}")
    def delete_agent(name: str) -> dict[str, bool]:
        reg = _registry()
        if not reg.remove(name):
            raise HTTPException(status_code=404, detail=f"agente {name!r} no existe")
        _save_registry(reg)
        bus.emit("agent.removed", agent=name)
        return {"ok": True}

    @app.post("/keys")
    def set_key(body: KeyIn) -> dict[str, Any]:
        """Guarda una clave BYOK en memoria (no se persiste ni se devuelve)."""
        if keys is not None:
            raise HTTPException(status_code=409,
                                detail="claves fijas inyectadas; /keys deshabilitado")
        prov = body.provider.strip().lower()
        if prov not in config.PROVIDER_ENV:
            raise HTTPException(status_code=400, detail=f"proveedor {prov!r} desconocido")
        runtime_keys[prov] = body.key.strip()
        return {"provider": prov, "key_present": bool(runtime_keys[prov])}

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
        p = _ensure_root(root)
        return {"root": root, "files": workspace.iter_files(p)}

    @app.post("/workspace/context")
    def workspace_context(req: ContextRequest) -> dict[str, str]:
        p = _ensure_root(req.root)
        return {"context": workspace.build_context(p, req.paths,
                                                   redact=req.redact)}

    # --- changes (flujo de diff + aprobacion, Fase 2) ----------------------
    def _changeset(req: ChangesRequest) -> ChangeSet:
        return ChangeSet([Change(c.path, c.new_content) for c in req.changes])

    @app.post("/changes/preview")
    def changes_preview(req: ChangesRequest) -> dict[str, dict[str, str]]:
        return {"diffs": _changeset(req).preview(_ensure_root(req.root))}

    @app.post("/changes/apply")
    def changes_apply(req: ChangesRequest) -> dict[str, Any]:
        root = _ensure_root(req.root)
        bus.emit("changes.apply", message=f"{len(req.changes)} archivo(s)",
                 approved=req.approved)
        try:
            report = _changeset(req).apply(root, approved=req.approved,
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
