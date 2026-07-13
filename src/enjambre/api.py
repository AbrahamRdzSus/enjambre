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
- Guard anti DNS-rebinding (DEFAULT-ON): solo atiende requests cuyo Host sea loopback
  (127.0.0.1/localhost/::1). Sin esto, un sitio web abierto en el navegador podria
  disparar endpoints con side-effects (/cli/*, /changes/apply) via un dominio que
  resuelva a 127.0.0.1 (CORS bloquea leer la respuesta, no ejecutar el request).
  Anadir hosts con env ENJAMBRE_ALLOWED_HOSTS (os.pathsep) o "*" para desactivarlo.
"""

from __future__ import annotations

import os
import re
import secrets
import sys
import time
import uuid
from dataclasses import asdict, replace
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

from . import cli_agent, config, paths, projects, sessions, stats, workspace
from .changes import ApprovalRequired, Change, ChangeSet
from .logs import LogBus, sse_stream
from .multiagent import MODES, MultiAgent, MultiAgentReport
from .orchestrator import Orchestrator
from .providers import PROVIDERS
from .providers import pricing as pricing_tables
from .registry import Agent, Registry


class RunRequest(BaseModel):
    prompt: str
    agents: list[str] | None = None
    max_tokens: int = 1024
    redact: bool = True
    save: bool = False
    mode: str = "parallel"  # parallel (Orchestrator) | sequential | debate (MultiAgent)


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


class ProjectIn(BaseModel):
    name: str
    root: str = "."


class CliRunIn(BaseModel):
    project_id: str
    prompt: str


class CliApproveIn(BaseModel):
    approved: bool = False


def _multiagent_out(report: MultiAgentReport, prompt: str = "") -> dict[str, Any]:
    """Aplana un MultiAgentReport (candidatos finales) a la forma 'runs' del /run.

    `usage`, `latency_ms` y `prompt` salen de datos REALES. Antes se falseaban a
    cero/vacio, y como /stats agrega desde las sesiones guardadas, el cockpit
    reportaba 0 tokens para TODO run que no fuera modo `parallel`.
    """
    runs = [
        {
            "agent": c.agent, "provider": c.provider, "model": c.model,
            "result": {
                "provider": c.provider, "model": c.model, "text": c.text,
                "usage": {
                    "input_tokens": c.usage.input_tokens,
                    "output_tokens": c.usage.output_tokens,
                },
                "cost_usd": c.cost_usd, "latency_ms": c.latency_ms, "error": c.error,
            },
        }
        for c in report.final
    ]
    return {"prompt": prompt, "mode": report.mode, "runs": runs,
            "warnings": list(report.warnings), "total_cost_usd": report.total_cost_usd}


_CODE_FENCE_RE = re.compile(r"```(\w+)?\n(.*?)```", re.DOTALL)
_OUTPUT_PREVIEW_CHARS = 280


def _classify_output(text: str) -> dict[str, Any]:
    """Clasifica la salida (texto) de un agente tipo API para el panel de actividad.

    Devuelve {kind, lang, preview}. kind='code' si un bloque cercado domina el
    texto (>=50%), si no 'message'. NO infiere tool-calls: los agentes API son
    completado de un tiro; los tool-calls solo existen en los agentes CLI.
    """
    stripped = (text or "").strip()
    preview = stripped[:_OUTPUT_PREVIEW_CHARS]
    m = _CODE_FENCE_RE.search(stripped)
    if m and len(m.group(2) or "") >= len(stripped) * 0.5:
        return {"kind": "code", "lang": (m.group(1) or None), "preview": preview}
    return {"kind": "message", "lang": None, "preview": preview}


def _resolve_roots(allowed_roots: list[str] | None) -> list[Path] | None:
    raw = allowed_roots
    if raw is None:
        env = os.getenv("ENJAMBRE_ALLOWED_ROOTS", "").strip()
        raw = env.split(os.pathsep) if env else None
    if not raw:
        return None  # sin restriccion (default local)
    return [Path(r).expanduser().resolve() for r in raw if r.strip()]


def _token_file() -> Path:
    return paths.data_dir() / "api-token"


def _load_or_create_token() -> str:
    """Lee el token persistido o genera uno nuevo (0600). Lo imprime SIEMPRE en
    stdout como `ENJAMBRE_API_TOKEN=<tok>` para que el shell Tauri (que drena el
    stdout del sidecar) y el loader del dev lo recojan."""
    f = _token_file()
    tok = ""
    try:
        tok = f.read_text(encoding="utf-8").strip()
    except OSError:
        pass
    if not tok:
        tok = secrets.token_urlsafe(32)
        try:
            f.write_text(tok, encoding="utf-8")
            os.chmod(f, 0o600)
        except OSError as exc:
            # NO se traga en silencio: si el token no persiste, cada arranque genera
            # uno nuevo y cualquier cliente con el token viejo queda en 401 sin
            # ninguna pista de por que.
            print(
                f"ENJAMBRE_WARN: no se pudo persistir el token en {f} ({exc}). "
                "Se regenerara en cada arranque.",
                file=sys.stderr, flush=True,
            )
    print(f"ENJAMBRE_API_TOKEN={tok}", flush=True)
    return tok


def _resolve_token(api_token: str | None, *, default_on: bool) -> str | None:
    """api_token explicito gana (cadena vacia = opt-out consciente). Si no, env.
    Si tampoco y estamos en el camino de produccion puro (sin inyeccion), el token
    es DEFAULT-ON: se autogenera y persiste. En modo inyectado (embebido/tests) no
    se fuerza, para no romper a quien maneja su propia auth."""
    if api_token is not None:
        return api_token or None
    env = os.getenv("ENJAMBRE_API_TOKEN", "").strip()
    if env:
        return env
    return _load_or_create_token() if default_on else None


def create_app(*, registry: Registry | None = None,
               keys: dict[str, str] | None = None,
               client: httpx.AsyncClient | None = None,
               bus: LogBus | None = None,
               api_token: str | None = None,
               allowed_roots: list[str] | None = None,
               dev_docs: bool | None = None,
               cli_agents: bool | None = None,
               trusted_hosts: list[str] | None = None,
               rate_limit: tuple[float, float] | None = None) -> FastAPI:
    """Crea la app. Sin args usa el registro en disco y claves del entorno.

    `registry`/`keys`/`client`/`bus` permiten inyeccion en tests. `api_token`/
    `allowed_roots`/`dev_docs` controlan los 3 controles de seguridad (con
    fallback a env ENJAMBRE_API_TOKEN / ENJAMBRE_ALLOWED_ROOTS / ENJAMBRE_API_DEV).
    """
    # Token DEFAULT-ON en produccion pura (sin registry/keys inyectados). En modo
    # inyectado (tests/embebido) queda opt-in para no romper a quien trae su auth.
    token = _resolve_token(api_token, default_on=(registry is None and keys is None))
    roots = _resolve_roots(allowed_roots)
    show_docs = (dev_docs if dev_docs is not None
                 else os.getenv("ENJAMBRE_API_DEV", "").strip().lower()
                 in ("1", "true", "yes"))
    cli_on = (cli_agents if cli_agents is not None
              else os.getenv("ENJAMBRE_CLI_AGENTS", "").strip().lower()
              in ("1", "true", "yes"))
    # Anti DNS-rebinding: solo se atienden requests cuyo Host sea loopback (o los
    # que se agreguen explicitamente). "testserver" = host del TestClient de FastAPI.
    # "*" desactiva el control (para binds no-loopback conscientes, ej. LAN).
    hosts = (trusted_hosts if trusted_hosts is not None
             else [h for h in os.getenv("ENJAMBRE_ALLOWED_HOSTS", "").split(os.pathsep)
                   if h.strip()])
    allowed_hosts = {"127.0.0.1", "localhost", "::1", "testserver",
                     *(h.strip().lower() for h in hosts)}
    # Rate limit (token-bucket): acota a un proceso local abusivo que martille
    # endpoints caros (/cli/run, /run). Default generoso -> no estorba el polling de
    # la UI. Env ENJAMBRE_RATE_LIMIT="capacidad/refill_por_seg"; "0" lo desactiva.
    if rate_limit is None:
        raw = os.getenv("ENJAMBRE_RATE_LIMIT", "").strip()
        if raw == "0":
            rate_limit = None
        elif "/" in raw:
            cap_s, ref_s = raw.split("/", 1)
            rate_limit = (float(cap_s), float(ref_s))
        else:
            rate_limit = (240.0, 8.0)  # 240 en rafaga, recarga 8/s

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

    if "*" not in allowed_hosts:
        @app.middleware("http")
        async def _host_guard(request: Request, call_next):
            host = request.headers.get("host", "")
            if host.startswith("["):  # IPv6 literal, ej. [::1]:8000
                hostname = host[1:host.find("]")] if "]" in host else host[1:]
            else:
                hostname = host.rsplit(":", 1)[0]
            if hostname.lower() not in allowed_hosts:
                return JSONResponse(
                    {"detail": "host no permitido (posible DNS-rebinding)"},
                    status_code=403)
            return await call_next(request)

    if rate_limit is not None:
        capacity, refill = rate_limit
        bucket = {"tokens": capacity, "last": time.monotonic()}

        @app.middleware("http")
        async def _rate_limit(request: Request, call_next):
            # /health y preflight exentos (liveness/CORS). Sin await entre leer y
            # escribir el bucket -> atomico en el event loop, no requiere lock.
            if request.url.path == "/health" or request.method == "OPTIONS":
                return await call_next(request)
            now = time.monotonic()
            bucket["tokens"] = min(capacity,
                                   bucket["tokens"] + (now - bucket["last"]) * refill)
            bucket["last"] = now
            if bucket["tokens"] < 1:
                return JSONResponse(
                    {"detail": "demasiadas solicitudes (rate limit)"},
                    status_code=429)
            bucket["tokens"] -= 1
            return await call_next(request)

    if token:
        @app.middleware("http")
        async def _auth(request: Request, call_next):
            # /health y preflight CORS quedan abiertos; el resto exige token.
            if request.url.path == "/health" or request.method == "OPTIONS":
                return await call_next(request)
            sent = (request.headers.get("x-api-token")
                    or request.headers.get("authorization", "").removeprefix("Bearer ").strip()
                    or request.query_params.get("token", ""))  # EventSource no manda headers
            # Comparacion en tiempo constante: `!=` corta en el primer byte distinto y
            # filtra el token por temporizacion. compare_digest sobre bytes (tolera
            # tokens con no-ASCII sin lanzar).
            if not secrets.compare_digest(sent.encode("utf-8"), token.encode("utf-8")):
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
        out: list[dict[str, Any]] = []
        for p in sorted(config.PROVIDER_ENV):
            cls = PROVIDERS.get(p)
            models = sorted(cls.pricing) if cls else []
            default_model = cls.default_model if cls else ""
            # el modelo por defecto va primero para que la UI lo preseleccione
            if default_model and default_model in models:
                models = [default_model, *[m for m in models if m != default_model]]
            pricing = {m: list(price) for m, price in cls.pricing.items()} if cls else {}
            out.append({"provider": p, "env": config.PROVIDER_ENV[p],
                        "key_present": bool(eff.get(p)),
                        "default_model": default_model, "models": models,
                        # Los precios son ESTIMACIONES fechadas, no facturacion real.
                        # La UI debe decir de cuando son en vez de presentarlos como
                        # un dato duro (ver providers/pricing.py).
                        "pricing": pricing, "pricing_as_of": pricing_tables.PRICING_AS_OF,
                        "pricing_is_estimate": True})
        return out

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
        if req.mode not in MODES:
            raise HTTPException(status_code=400,
                                detail=f"modo {req.mode!r}; validos: {', '.join(MODES)}")
        bus.emit("run.start", message=f"prompt ({len(req.prompt)} chars) [{req.mode}]",
                 agents=req.agents)

        if req.mode == "parallel":
            report = await _orch(_registry()).run(
                req.prompt, agents=req.agents, max_tokens=req.max_tokens,
                redact=req.redact)
            out: dict[str, Any] = asdict(report)
            out["total_cost_usd"] = report.total_cost_usd
            runs_for_log = [(r.agent, r.provider, r.result.ok, r.result.error,
                             r.result.cost_usd) for r in report.runs]
            save_report: Any = report
        else:
            # MultiAgent (Fase 3): sequential | debate | vote. Respeta la seleccion.
            reg = _registry()
            if req.agents is not None:
                reg = Registry([a for a in reg.agents if a.name in set(req.agents)])
            ma = MultiAgent(reg, keys=_effective_keys(), client=client,
                            max_tokens=req.max_tokens)
            report = await ma.run(req.mode, req.prompt, review=False)
            out = _multiagent_out(report, req.prompt)
            runs_for_log = [(r["agent"], r["provider"], r["result"]["error"] is None,
                             r["result"]["error"], r["result"]["cost_usd"])
                            for r in out["runs"]]
            save_report = report

        for w in out.get("warnings", []):
            bus.emit("run.warning", level="warn", message=w)
        for agent, provider, ok, err, cost in runs_for_log:
            bus.emit("agent.done", level="info" if ok else "error", agent=agent,
                     message="ok" if ok else (err or "error"), provider=provider,
                     cost_usd=cost)
        # agent.output: contenido tipado por agente para el panel "Actividad por
        # modelo" (feed en vivo + step badges). El contenido COMPLETO se lee de la
        # respuesta (out["runs"]); aqui solo va el preview para no inflar el ring buffer.
        for r in out.get("runs", []):
            res = r.get("result", {})
            if res.get("error"):
                continue
            cls = _classify_output(res.get("text", ""))
            bus.emit("agent.output", agent=r.get("agent"), message=cls["preview"],
                     provider=r.get("provider"), cost_usd=res.get("cost_usd"),
                     kind=cls["kind"], lang=cls["lang"], preview=cls["preview"])
        n_ok = sum(1 for *_, ok, _, _ in runs_for_log if ok)
        bus.emit("run.done", message=f"{n_ok}/{len(runs_for_log)} ok",
                 cost_usd=out["total_cost_usd"])
        if req.save and out["runs"]:
            out["session_id"] = sessions.save(save_report)
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

    # --- proyectos (entidad header/sidebar) --------------------------------
    @app.get("/projects")
    def list_projects() -> list[dict[str, Any]]:
        return [asdict(p) for p in projects.list_projects()]

    @app.post("/projects", status_code=201)
    def add_project(body: ProjectIn) -> dict[str, Any]:
        # Exigir la allowlist YA al registrar, no solo al usar el proyecto: en el
        # paquete ENJAMBRE_ALLOWED_ROOTS se fija a la carpeta del usuario, asi que
        # registrar C:\Windows o una ruta de sistema se rechaza aqui mismo.
        _ensure_root(body.root)
        try:
            return asdict(projects.add_project(body.name, body.root))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.delete("/projects/{project_id}")
    def delete_project(project_id: str) -> dict[str, bool]:
        if not projects.remove_project(project_id):
            raise HTTPException(status_code=404, detail=f"proyecto {project_id!r} no existe")
        return {"ok": True}

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

    # --- agente CLI (tipo "CLI", opt-in con ENJAMBRE_CLI_AGENTS=1) ----------
    if cli_on:
        # Resultados en memoria por run_id (no se persisten). run_id -> dict.
        cli_runs: dict[str, dict[str, Any]] = {}

        def _cli_root(project_id: str) -> Path:
            for p in projects.list_projects():
                if p.id == project_id:
                    return _ensure_root(p.root)
            raise HTTPException(status_code=404,
                                detail=f"proyecto {project_id!r} no existe")

        def _cli_payload(run_id: str, res: cli_agent.CliTaskResult) -> dict[str, Any]:
            return {"run_id": run_id, "ok": res.ok, "diff": res.diff,
                    "changed_files": res.changed_files, "log": res.log,
                    "error": res.error}

        @app.post("/cli/run")
        async def cli_run(req: CliRunIn) -> dict[str, Any]:
            root = _cli_root(req.project_id)
            bus.emit("cli.run.start", message=f"prompt ({len(req.prompt)} chars)")
            res = await cli_agent.run_cli_task(req.prompt, root)
            run_id = uuid.uuid4().hex
            cli_runs[run_id] = {
                "status": "done" if res.ok else "error",
                "result": res, "root": str(root)}
            bus.emit("cli.run.done", level="info" if res.ok else "error",
                     message=res.error or f"{len(res.changed_files)} archivo(s)")
            if res.ok and res.changed_files:
                # agent.output tipo tool_call para el panel (los agentes CLI SI editan
                # archivos, a diferencia de los API); run_id permite al dock pedir el
                # diff (GET /cli/{run_id}) y aprobar (POST /cli/{run_id}/approve).
                # `preview` va SIEMPRE, en las dos variantes del evento: sin el, el
                # consumidor tenia que adivinar que forma le tocaba.
                summary = f"{len(res.changed_files)} archivo(s)"
                bus.emit("agent.output", agent="cli", message=summary,
                         kind="tool_call", changed_files=res.changed_files,
                         run_id=run_id, preview=summary)
            return _cli_payload(run_id, res)

        @app.get("/cli/{run_id}")
        def cli_status(run_id: str) -> dict[str, Any]:
            rec = cli_runs.get(run_id)
            if rec is None:
                raise HTTPException(status_code=404, detail=f"run {run_id!r} no existe")
            res: cli_agent.CliTaskResult = rec["result"]
            return {"status": rec["status"], **_cli_payload(run_id, res)}

        @app.post("/cli/{run_id}/approve")
        def cli_approve(run_id: str, body: CliApproveIn) -> dict[str, Any]:
            rec = cli_runs.get(run_id)
            if rec is None:
                raise HTTPException(status_code=404, detail=f"run {run_id!r} no existe")
            res: cli_agent.CliTaskResult = rec["result"]
            root = Path(rec["root"])
            report_out: dict[str, Any] = {"ok": True, "written": [],
                                          "rejected": [], "temp_branch": None}
            try:
                if body.approved and res.ok:
                    # W2.2: aplicar el contenido CAPTURADO al correr (lo que el humano
                    # reviso en el diff), NO re-leer el worktree vivo: entre la revision
                    # y este approve el worktree pudo cambiar (proceso rezagado,
                    # manipulacion) y se aplicaria algo distinto de lo aprobado.
                    changes: list[Change] = [
                        Change(rel, content)
                        for rel, content in res.file_contents.items()]
                    report = ChangeSet(changes).apply(root, approved=True)
                    if not report.ok:
                        bus.emit("cli.rejected", level="warn",
                                 message="; ".join(f"{p}: {m}"
                                                   for p, m in report.rejected))
                    report_out = {"ok": report.ok, "written": report.written,
                                  "rejected": report.rejected,
                                  "temp_branch": report.temp_branch}
            finally:
                # Cleanup del worktree/rama corra o no la aprobacion.
                if res.worktree_path:
                    cli_agent.cleanup_worktree(res.worktree_path, res.branch, root)
                cli_runs.pop(run_id, None)
            return report_out

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

# F1 (OPS HUD): proxy opcional al hub de CD. Se monta SOLO si ENJAMBRE_HUB_URL
# esta definido; el JWT del hub vive server-side (el frontend nunca lo ve). El
# middleware de auth de arriba (app-level) cubre tambien estas rutas.
if os.environ.get("ENJAMBRE_HUB_URL"):
    from .hub import router as hub_router

    app.include_router(hub_router)
