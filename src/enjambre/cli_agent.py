"""Agente CLI: lanza un coding-agent real (hoy Claude Code headless) en un
git worktree aislado y captura su diff (Fase CLI v1).

Es un TIPO de agente distinto al "API" (`providers.base.BaseProvider.chat`): un
proceso largo que EDITA archivos directo en el filesystem que se le da. Por eso
vive en su propio modulo con su propio contrato (`run_cli_task`), no como
subclase de `BaseProvider`.

Invariante de seguridad: el agente CLI NUNCA escribe al `project_root` real; solo
a su worktree. La unica escritura al proyecto sigue siendo
`changes.ChangeSet.apply(approved=True)`, que el sidecar invoca al aprobar.
"""

from __future__ import annotations

import asyncio
import os
import re
import shutil
import signal
import subprocess
import sys
import tempfile
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

# Env que el subproceso `claude` PUEDE heredar: solo variables de sistema/PATH,
# nunca claves BYOK de proveedores. El agente CLI corre con el usuario/red completos
# (el worktree solo aisla ESCRITURAS), asi que si heredara el entorno del sidecar
# podria leer OPENAI_API_KEY/GOOGLE_API_KEY/etc. y exfiltrarlas aunque su diff no se
# apruebe. Su propia auth de Anthropic la toma de su config (~/.claude via
# USERPROFILE/APPDATA), no de una API key en el entorno. Ver docs/CLI_AGENT.md.
_ENV_ALLOW = frozenset({
    "PATH", "PATHEXT", "SYSTEMROOT", "WINDIR", "COMSPEC", "SYSTEMDRIVE",
    "TEMP", "TMP", "TMPDIR",
    "USERPROFILE", "HOMEDRIVE", "HOMEPATH", "HOME", "USERNAME",
    "APPDATA", "LOCALAPPDATA", "PROGRAMDATA",
    "PROGRAMFILES", "PROGRAMFILES(X86)", "PROGRAMW6432",
    "NUMBER_OF_PROCESSORS", "PROCESSOR_ARCHITECTURE",
    "LANG", "LC_ALL", "LC_CTYPE", "TZ", "NODE_OPTIONS",
})


def _clean_env() -> dict[str, str]:
    """Entorno minimo para `claude`: solo vars de sistema, sin claves de proveedor."""
    return {k: v for k, v in os.environ.items() if k.upper() in _ENV_ALLOW}


#: kwargs para lanzar el subproceso en su PROPIO grupo, para poder matar el arbol
#: completo (claude spawnea node/subagentes; matar solo al padre deja huerfanos).
_GROUP_KW: dict = (
    {"creationflags": subprocess.CREATE_NEW_PROCESS_GROUP}  # type: ignore[attr-defined]
    if sys.platform == "win32" else {"start_new_session": True})


def _kill_tree(proc: asyncio.subprocess.Process) -> None:
    """Mata el proceso Y todos sus descendientes. En timeout, `proc.kill()` a secas
    solo mataba a `claude`, dejando vivos los procesos que el spawneo."""
    pid = proc.pid
    if pid is None:
        return
    if sys.platform == "win32":
        # taskkill /T recorre el arbol de descendientes y los termina a todos.
        subprocess.run(["taskkill", "/T", "/F", "/PID", str(pid)],
                       check=False, capture_output=True)
    else:
        try:
            os.killpg(os.getpgid(pid), signal.SIGKILL)  # todo el grupo de sesion
        except (ProcessLookupError, PermissionError):
            pass
    try:
        proc.kill()  # fallback directo al padre por si sigue vivo
    except (ProcessLookupError, OSError):
        pass


@dataclass
class CliTaskResult:
    ok: bool
    diff: str = ""                                  # diff unificado agregado
    changed_files: list[str] = field(default_factory=list)
    #: contenido capturado AL CORRER (ruta rel -> texto). El approve aplica ESTO, no
    #: re-lee el worktree vivo: cierra el TOCTOU entre revision humana y aplicacion (W2.2).
    file_contents: dict[str, str] = field(default_factory=dict)
    log: str = ""                                   # stdout/stderr o JSON del CLI
    worktree_path: str = ""
    branch: str = ""
    error: str | None = None


def _slug(prompt: str) -> str:
    words = re.findall(r"[a-z0-9]+", prompt.lower())
    return ("-".join(words)[:40]).strip("-") or "task"


def _is_git_repo(root: Path) -> bool:
    try:
        subprocess.run(["git", "-C", str(root), "rev-parse", "--git-dir"],
                       check=True, capture_output=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


def _git(root: Path, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run(["git", "-C", str(root), *args],
                          check=True, capture_output=True, text=True)


def cleanup_worktree(worktree_path: str | Path, branch: str,
                     project_root: str | Path) -> None:
    """Borra el worktree (con --force) y la rama temporal. Idempotente/best-effort.

    En Windows un handle rezagado (el proceso `claude` recien salido, un indexador
    o antivirus) puede hacer fallar `git worktree remove` de forma transitoria; por
    eso se reintenta, se `prune` los registros stale y, si el dir persiste, se borra
    con `shutil.rmtree` + `prune` para no dejar worktrees huerfanos.
    """
    root = str(Path(project_root))
    wt = str(worktree_path)

    def _run(*args: str) -> int:
        try:
            return subprocess.run(["git", "-C", root, *args],
                                  check=False, capture_output=True).returncode
        except FileNotFoundError:
            return 1

    for attempt in range(3):
        if _run("worktree", "remove", "--force", wt) == 0 or not Path(wt).exists():
            break
        time.sleep(0.3 * (attempt + 1))  # espera el release del handle
    # Fallback: si git no pudo, borra el dir a mano y limpia el registro.
    if Path(wt).exists():
        shutil.rmtree(wt, ignore_errors=True)
    _run("worktree", "prune")
    if branch:
        _run("branch", "-D", branch)


async def run_cli_task(prompt: str, project_root: str | Path, *,
                       agent_name: str = "claude-cli",
                       timeout: float = 600.0) -> CliTaskResult:
    """Lanza un agente CLI en un worktree aislado y devuelve su diff sin aplicar.

    El worktree y la rama NO se limpian aqui salvo en caso de error/timeout: se
    limpian al aprobar o descartar (`cleanup_worktree`).
    """
    root = Path(project_root).expanduser().resolve()

    # Requisito 5 / caso borde: binario ausente -> error claro, no worktree a medias.
    if shutil.which("claude") is None:
        return CliTaskResult(ok=False, error="claude CLI no encontrado en PATH")

    # Caso borde: no es repo git -> error explicito, sin worktree a medias.
    if not _is_git_repo(root):
        return CliTaskResult(
            ok=False,
            error=f"'{project_root}' no es un repositorio git (worktree requerido)")

    ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    # sufijo corto: evita colision entre runs concurrentes en el mismo segundo.
    branch = f"enjambre/cli/{ts}-{_slug(prompt)}-{uuid.uuid4().hex[:6]}"
    worktree_path = tempfile.mkdtemp(prefix="enjambre-cli-")

    try:
        _git(root, "worktree", "add", "-b", branch, worktree_path, "HEAD")
    except subprocess.CalledProcessError as exc:
        cleanup_worktree(worktree_path, "", root)
        return CliTaskResult(ok=False, branch=branch, worktree_path=worktree_path,
                             error=f"no se pudo crear el worktree: {exc.stderr or exc}")

    # Ejecutar el CLI dentro del worktree (subprocess async, con timeout).
    try:
        proc = await asyncio.create_subprocess_exec(
            "claude", "-p", prompt, "--output-format", "json",
            cwd=worktree_path, env=_clean_env(),
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
            **_GROUP_KW)
        try:
            out_b, err_b = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        except asyncio.TimeoutError:
            _kill_tree(proc)  # mata claude Y su arbol de subprocesos, no solo al padre
            await proc.wait()
            cleanup_worktree(worktree_path, branch, root)
            return CliTaskResult(ok=False, branch=branch,
                                 error=f"timeout tras {timeout:g}s")
    except (OSError, ValueError) as exc:
        cleanup_worktree(worktree_path, branch, root)
        return CliTaskResult(ok=False, branch=branch,
                             error=f"fallo al ejecutar el CLI: {exc}")

    log = (out_b.decode("utf-8", "replace") + err_b.decode("utf-8", "replace")).strip()

    # El CLI fallo: no reportar exito silencioso. Antes se devolvia ok=True sin mirar
    # el returncode, asi que un `claude` caido (sin auth, error interno) se veia como
    # una corrida vacia exitosa en la UI. El worktree se limpia porque no hay diff util.
    rc = proc.returncode
    if rc != 0:
        cleanup_worktree(worktree_path, branch, root)
        return CliTaskResult(ok=False, branch=branch, worktree_path=worktree_path,
                             log=log,
                             error=f"claude salio con codigo {rc}"
                                   + (f": {err_b.decode('utf-8', 'replace').strip()}"
                                      if err_b.strip() else ""))

    # Fuente de verdad = git, no el output del CLI. `add -A` capta nuevos/borrados.
    try:
        _git(Path(worktree_path), "add", "-A")
        diff = _git(Path(worktree_path), "diff", "--cached").stdout
        names = _git(Path(worktree_path), "diff", "--cached", "--name-only").stdout
    except subprocess.CalledProcessError as exc:
        cleanup_worktree(worktree_path, branch, root)
        return CliTaskResult(ok=False, branch=branch, log=log,
                             error=f"no se pudo capturar el diff: {exc.stderr or exc}")

    changed_files = [ln.strip() for ln in names.splitlines() if ln.strip()]
    # Capturar el contenido AHORA (lo que produce el diff que revisa el humano). El
    # approve aplicara esto, no una re-lectura del worktree que pudo cambiar despues.
    wt = Path(worktree_path)
    file_contents: dict[str, str] = {}
    for rel in changed_files:
        fp = wt / rel
        if fp.is_file():  # v1: borrados fuera de alcance (igual que el approve)
            try:
                file_contents[rel] = fp.read_text(encoding="utf-8")
            except (OSError, UnicodeDecodeError):
                pass  # binario/ilegible: no se captura -> no se aplica
    return CliTaskResult(ok=True, diff=diff, changed_files=changed_files,
                         file_contents=file_contents, log=log,
                         worktree_path=worktree_path, branch=branch)
