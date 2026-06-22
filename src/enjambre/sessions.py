"""Persistencia de sesiones: guarda/reanuda orquestaciones a disco (JSON).

Una "sesion" es el resultado completo de una corrida (OrchestrationReport de
Fase 1 o MultiAgentReport de Fase 3) persistido para auditar, comparar o
retomar la decision humana mas tarde, sin perder el trabajo (ni el costo) ya
gastado en los proveedores.

Sin dependencias nuevas: usa `json` + `dataclasses.asdict` (todos los reports son
dataclasses). El store vive por defecto en `.enjambre/sessions/` (gitignoreable).
No persiste claves ni secretos: solo prompts, salidas, costo y metadatos.
"""

from __future__ import annotations

import json
import time
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from . import paths
from .multiagent import Candidate, MultiAgentReport, Verdict
from .orchestrator import AgentRun, OrchestrationReport
from .providers import ProviderResult, Usage


def _store_dir(store: str | Path | None) -> Path:
    return Path(store) if store is not None else paths.data_dir() / "sessions"


@dataclass
class Session:
    """Una corrida persistida. `data` es el report serializado (dict)."""

    id: str
    kind: str  # "orchestration" | "multiagent"
    created_at: str  # ISO 8601 UTC
    prompt: str
    data: dict = field(default_factory=dict)


def _new_id() -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    return f"{stamp}-{uuid.uuid4().hex[:6]}"


def _kind_of(report: object) -> str:
    if isinstance(report, OrchestrationReport):
        return "orchestration"
    if isinstance(report, MultiAgentReport):
        return "multiagent"
    raise TypeError(f"No se puede persistir un report de tipo {type(report).__name__}")


def save(report: OrchestrationReport | MultiAgentReport, *,
         store: str | Path | None = None,
         session_id: str | None = None) -> str:
    """Persiste un report como sesion. Devuelve el id de sesion.

    Idempotente por `session_id`: pasar el mismo id sobrescribe (util como
    checkpoint que se actualiza al avanzar las rondas de un debate).
    """
    kind = _kind_of(report)
    sid = session_id or _new_id()
    prompt = getattr(report, "prompt", "") or ""
    payload = {
        "id": sid,
        "kind": kind,
        "created_at": datetime.fromtimestamp(time.time(), timezone.utc).isoformat(),
        "prompt": prompt,
        "data": asdict(report),
    }
    p = _store_dir(store)
    p.mkdir(parents=True, exist_ok=True)
    (p / f"{sid}.json").write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return sid


def load(session_id: str, *, store: str | Path | None = None) -> Session:
    """Carga una sesion por id."""
    fp = _store_dir(store) / f"{session_id}.json"
    if not fp.is_file():
        raise FileNotFoundError(f"No existe la sesion {session_id!r} en {store}")
    d = json.loads(fp.read_text(encoding="utf-8"))
    return Session(id=d["id"], kind=d["kind"], created_at=d["created_at"],
                   prompt=d.get("prompt", ""), data=d.get("data", {}))


def list_sessions(*, store: str | Path | None = None) -> list[Session]:
    """Lista las sesiones del store, mas recientes primero."""
    p = _store_dir(store)
    if not p.is_dir():
        return []
    out: list[Session] = []
    for fp in p.glob("*.json"):
        try:
            d = json.loads(fp.read_text(encoding="utf-8"))
            out.append(Session(id=d["id"], kind=d["kind"],
                               created_at=d["created_at"],
                               prompt=d.get("prompt", ""), data=d.get("data", {})))
        except (json.JSONDecodeError, KeyError):
            continue  # ignora archivos corruptos/ajenos
    return sorted(out, key=lambda s: s.created_at, reverse=True)


# --- reconstruccion a dataclasses tipados (lossless) -----------------------
def rebuild_orchestration(data: dict) -> OrchestrationReport:
    """Reconstruye un OrchestrationReport desde su forma serializada."""
    runs = [
        AgentRun(agent=r["agent"], provider=r["provider"], model=r["model"],
                 result=_result(r["result"]))
        for r in data.get("runs", [])
    ]
    return OrchestrationReport(prompt=data.get("prompt", ""), runs=runs,
                              warnings=list(data.get("warnings", [])))


def rebuild_multiagent(data: dict) -> MultiAgentReport:
    """Reconstruye un MultiAgentReport desde su forma serializada."""
    rounds = [
        [Candidate(**c) for c in rnd]
        for rnd in data.get("rounds", [])
    ]
    verdicts = [Verdict(**v) for v in data.get("verdicts", [])]
    return MultiAgentReport(mode=data.get("mode", "parallel"), rounds=rounds,
                           verdicts=verdicts,
                           warnings=list(data.get("warnings", [])))


def _result(d: dict) -> ProviderResult:
    u = d.get("usage", {}) or {}
    return ProviderResult(
        provider=d["provider"], model=d["model"], text=d.get("text", ""),
        usage=Usage(u.get("input_tokens", 0), u.get("output_tokens", 0)),
        cost_usd=d.get("cost_usd", 0.0), latency_ms=d.get("latency_ms", 0),
        error=d.get("error"))
