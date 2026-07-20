"""Registro de herramientas que un modelo puede invocar (tool calling).

Cada tool mapea un nombre que el modelo pide a una operacion del core que YA pasa
por su propio gate: leer -> `workspace` (redacta secretos, bloquea `.env`,
anti-traversal), escribir -> `changes.ChangeSet.apply` (aprobacion humana +
secretos + traversal), shell -> `sandbox.Sandbox` (docker `--network none`,
denylist de `commands`). Este modulo NO reimplementa seguridad: la delega.

Contrato de peligro (`danger`), que el loop agentico usa para decidir si pausa:
- 'read'  -> no destructivo; el loop lo auto-ejecuta sin aprobacion.
- 'write' -> destructivo; exige `approved=True` (pausa del loop + gate humano).
- 'shell' -> destructivo; exige `approved=True` + aislamiento docker.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from . import workspace
from .changes import ApprovalRequired, Change, ChangeSet
from .sandbox import Sandbox

Danger = Literal["read", "write", "shell"]

#: Corte de la salida de una tool que se le devuelve al modelo (evita inflar el
#: contexto con volcados enormes de archivos o logs).
MAX_TOOL_OUTPUT = 8_000


@dataclass
class ToolResult:
    ok: bool
    content: str            # texto que se le devuelve al modelo como tool_result
    preview: str = ""       # diff / dry-run para la UI de aprobacion
    error: str | None = None


@dataclass
class ToolSpec:
    name: str
    description: str
    danger: Danger
    parameters: dict        # JSON schema de los argumentos
    handler: Callable[[Path, dict, bool], ToolResult]

    def schema(self) -> dict:
        """Esquema en el formato `tools` de OpenAI (function calling)."""
        return {"type": "function", "function": {
            "name": self.name, "description": self.description,
            "parameters": self.parameters}}


# --- handlers ---------------------------------------------------------------
# Firma comun: (root, args, approved) -> ToolResult. Los de lectura ignoran
# `approved` (no son destructivos).

def _list_files(root: Path, args: dict, approved: bool) -> ToolResult:
    files = workspace.iter_files(root)
    return ToolResult(True, "\n".join(files) or "(sin archivos)")


def _read_file(root: Path, args: dict, approved: bool) -> ToolResult:
    path = str(args.get("path", "")).strip()
    if not path:
        return ToolResult(False, "", error="falta el argumento 'path'")
    # build_context ya redacta secretos, salta archivos bloqueados y valida traversal.
    ctx = workspace.build_context(root, [path])
    if not ctx:
        return ToolResult(
            False, "",
            error=f"no se pudo leer '{path}' (inexistente, bloqueado o fuera de la raiz)")
    return ToolResult(True, ctx[:MAX_TOOL_OUTPUT])


def _write_file(root: Path, args: dict, approved: bool) -> ToolResult:
    path = str(args.get("path", "")).strip()
    content = args.get("content", "")
    if not isinstance(content, str):
        content = str(content)
    if not path:
        return ToolResult(False, "", error="falta el argumento 'path'")
    change = Change(path, content)
    preview = change.diff(root)  # anti-traversal dentro; seguro sin aprobacion
    if not approved:
        # Pendiente de aprobacion: se devuelve el preview, NO se escribe nada.
        return ToolResult(False, "", preview=preview, error="pendiente de aprobacion")
    report = ChangeSet([change]).apply(root, approved=True)
    if not report.ok:
        motivos = "; ".join(f"{p}: {m}" for p, m in report.rejected)
        return ToolResult(False, "", preview=preview, error=f"rechazado ({motivos})")
    return ToolResult(True, f"escrito: {', '.join(report.written)}", preview=preview)


def _run_command(root: Path, args: dict, approved: bool) -> ToolResult:
    raw = args.get("argv") or args.get("command")
    if isinstance(raw, str):
        argv = raw.split()
    elif isinstance(raw, list):
        argv = [str(a) for a in raw]
    else:
        argv = []
    if not argv:
        return ToolResult(False, "", error="falta el argumento 'argv' (lista de comando)")
    sb = Sandbox(root)
    # dry-run aplica commands.check_command SIEMPRE -> un comando peligroso se
    # bloquea aqui, incluso antes de pedir aprobacion (fail-closed temprano).
    dry = sb.run(argv, mode="dry")
    if dry.blocked:
        return ToolResult(False, "", error=f"comando bloqueado por politica: {dry.blocked}")
    preview = f"$ {' '.join(argv)}   (docker --network none)"
    if not approved:
        return ToolResult(False, "", preview=preview, error="pendiente de aprobacion")
    res = sb.run(argv, approved=True, mode="docker")
    if res.blocked:  # p. ej. docker ausente -> fail-closed, no cae a host
        return ToolResult(False, "", preview=preview, error=res.blocked)
    out = (res.stdout + (f"\n{res.stderr}" if res.stderr else "")).strip()
    status = "timeout" if res.timed_out else f"exit {res.exit_code}"
    return ToolResult(res.ok, f"[{status}]\n{out}"[:MAX_TOOL_OUTPUT], preview=preview)


# --- registro ---------------------------------------------------------------
_TOOLS: dict[str, ToolSpec] = {t.name: t for t in [
    ToolSpec(
        "list_files", "Lista los archivos del proyecto (rutas relativas).",
        "read", {"type": "object", "properties": {}}, _list_files),
    ToolSpec(
        "read_file", "Lee el contenido de un archivo del proyecto.",
        "read",
        {"type": "object",
         "properties": {"path": {"type": "string",
                                 "description": "ruta relativa a la raiz"}},
         "required": ["path"]},
        _read_file),
    ToolSpec(
        "write_file",
        "Propone crear o sobrescribir un archivo. Requiere aprobacion humana.",
        "write",
        {"type": "object",
         "properties": {"path": {"type": "string"},
                        "content": {"type": "string"}},
         "required": ["path", "content"]},
        _write_file),
    ToolSpec(
        "run_command",
        "Ejecuta un comando en un sandbox docker aislado (sin red). "
        "Requiere aprobacion humana.",
        "shell",
        {"type": "object",
         "properties": {"argv": {"type": "array", "items": {"type": "string"},
                                 "description": "comando como lista, ej. [\"pytest\",\"-q\"]"}},
         "required": ["argv"]},
        _run_command),
]}


def tool_schemas(danger_allowed: set[str] | None = None) -> list[dict]:
    """Esquemas de las tools permitidas, para pasar a `provider.chat(tools=...)`."""
    allowed = danger_allowed or {"read", "write", "shell"}
    return [t.schema() for t in _TOOLS.values() if t.danger in allowed]


def get_tool(name: str) -> ToolSpec | None:
    return _TOOLS.get(name)


def needs_approval(name: str) -> bool:
    """True si la tool es destructiva (write/shell) y el loop debe pausar por ella."""
    spec = _TOOLS.get(name)
    return spec is not None and spec.danger != "read"


def dispatch(name: str, args: dict, root: str | Path, *,
             approved: bool = False) -> ToolResult:
    """Ejecuta una tool por nombre. Los `read` corren siempre; los `write`/`shell`
    sin `approved=True` devuelven un ToolResult 'pendiente' con su preview."""
    spec = _TOOLS.get(name)
    if spec is None:
        return ToolResult(False, "", error=f"herramienta desconocida: {name}")
    try:
        return spec.handler(Path(root), args or {}, approved)
    except ApprovalRequired as exc:
        return ToolResult(False, "", error=str(exc))
    except Exception as exc:  # noqa: BLE001 - defensa: una tool no debe tumbar el loop
        return ToolResult(False, "", error=f"error al ejecutar {name}: {exc}")
