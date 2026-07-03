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
import re
import shutil
import subprocess
import tempfile
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path


@dataclass
class CliTaskResult:
    ok: bool
    diff: str = ""                                  # diff unificado agregado
    changed_files: list[str] = field(default_factory=list)
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
            cwd=worktree_path,
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
        try:
            out_b, err_b = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()
            cleanup_worktree(worktree_path, branch, root)
            return CliTaskResult(ok=False, branch=branch,
                                 error=f"timeout tras {timeout:g}s")
    except (OSError, ValueError) as exc:
        cleanup_worktree(worktree_path, branch, root)
        return CliTaskResult(ok=False, branch=branch,
                             error=f"fallo al ejecutar el CLI: {exc}")

    log = (out_b.decode("utf-8", "replace") + err_b.decode("utf-8", "replace")).strip()

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
    return CliTaskResult(ok=True, diff=diff, changed_files=changed_files, log=log,
                         worktree_path=worktree_path, branch=branch)
