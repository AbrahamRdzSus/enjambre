"""Ejecucion segura de comandos (Fase 5).

Enjambre puede correr los tests de un cambio sin arriesgar la maquina del usuario:
- `mode="dry"` (defecto): no ejecuta, solo describe el plan. No requiere aprobacion.
- ejecucion real (`docker`/`host`) exige `approved=True` (regla dura del ecosistema).
- la politica de `commands.check_command` se aplica SIEMPRE antes de ejecutar; un
  comando peligroso nunca se corre, aunque haya aprobacion.
- `docker` aisla con `--network none`; si Docker no esta, BLOQUEA (no cae a host).
- cada intento (ejecutado o bloqueado) queda en el log de auditoria.
"""

from __future__ import annotations

import shutil
import subprocess
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal

from . import commands
from .changes import ApprovalRequired

Mode = Literal["dry", "docker", "host"]
DEFAULT_IMAGE = "python:3.12-slim"


@dataclass
class RunResult:
    argv: list[str]
    mode: Mode
    exit_code: int | None = None      # None si dry-run o bloqueado
    stdout: str = ""
    stderr: str = ""
    duration_ms: int = 0
    blocked: str | None = None        # motivo si la politica lo bloqueo
    timed_out: bool = False

    @property
    def ok(self) -> bool:
        return self.blocked is None and not self.timed_out and self.exit_code == 0


@dataclass
class AuditEntry:
    ts: float
    argv: list[str]
    mode: Mode
    outcome: str  # "dry" | "blocked:<motivo>" | "exit:<n>" | "timeout"


@dataclass
class Sandbox:
    """Runner anclado a la raiz de un proyecto, con log de auditoria."""

    root: str | Path
    default_timeout: float = 120.0
    image: str = DEFAULT_IMAGE
    audit: list[AuditEntry] = field(default_factory=list)

    def __post_init__(self) -> None:
        self.root = str(Path(self.root).resolve())

    def run(self, argv: list[str], *, approved: bool = False,
            mode: Mode = "dry", timeout: float | None = None) -> RunResult:
        result = RunResult(argv=list(argv), mode=mode)

        # 1. Politica de comandos: SIEMPRE, antes de cualquier ejecucion.
        reason = commands.check_command(argv)
        if reason:
            result.blocked = reason
            self._log(argv, mode, f"blocked:{reason}")
            return result

        # 2. Dry-run: preview sin ejecutar, sin aprobacion.
        if mode == "dry":
            self._log(argv, mode, "dry")
            return result

        # 3. Ejecucion real -> requiere aprobacion humana explicita.
        if not approved:
            raise ApprovalRequired(
                "La ejecucion real requiere approved=True (aprobacion humana). "
                "Usa mode='dry' para previsualizar.")

        if mode == "docker":
            if shutil.which("docker") is None:
                result.blocked = ("docker no esta disponible; usa mode='host' "
                                  "explicito para ejecutar sin aislamiento")
                self._log(argv, mode, f"blocked:{result.blocked}")
                return result
            real_argv = self._docker_wrap(argv)
        else:  # host
            real_argv = list(argv)

        self._exec(real_argv, result, timeout or self.default_timeout)
        outcome = ("timeout" if result.timed_out else f"exit:{result.exit_code}")
        self._log(argv, mode, outcome)
        return result

    def run_tests(self, cmd: list[str] | None = None, *, approved: bool = False,
                  mode: Mode = "dry", timeout: float | None = None) -> RunResult:
        """Corre el comando de tests del repo (default: pytest -q). Reportable."""
        return self.run(cmd or ["pytest", "-q"], approved=approved, mode=mode,
                        timeout=timeout)

    # --- interno ----------------------------------------------------------
    def _docker_wrap(self, argv: list[str]) -> list[str]:
        return [
            "docker", "run", "--rm", "--network", "none",
            "--workdir", "/work", "-v", f"{self.root}:/work",
            self.image, *argv,
        ]

    def _exec(self, argv: list[str], result: RunResult, timeout: float) -> None:
        start = time.monotonic()
        try:
            proc = subprocess.run(argv, cwd=str(self.root), capture_output=True,
                                  text=True, timeout=timeout)
            result.exit_code = proc.returncode
            result.stdout = proc.stdout
            result.stderr = proc.stderr
        except subprocess.TimeoutExpired as exc:
            result.timed_out = True
            result.stdout = exc.stdout or "" if isinstance(exc.stdout, str) else ""
            result.stderr = "timeout"
        except FileNotFoundError as exc:
            result.exit_code = 127
            result.stderr = str(exc)
        result.duration_ms = int((time.monotonic() - start) * 1000)

    def _log(self, argv: list[str], mode: Mode, outcome: str) -> None:
        self.audit.append(AuditEntry(time.time(), list(argv), mode, outcome))
