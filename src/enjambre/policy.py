"""Capa de politica y seguridad de ENJAMBRE.

Reglas duras del proyecto: BYOK sin filtrar claves, no entrenar/distilar con
outputs de terceros, y aprobacion humana antes de cualquier accion destructiva.
Este modulo es la unica fuente de esas reglas y lo consume el orchestrator.
"""

from __future__ import annotations

import fnmatch
import re
from dataclasses import dataclass, field
from pathlib import Path

# Modos prohibidos por PROVIDER_POLICY.md (no se construyen flujos para esto).
DISALLOWED_MODES = {
    "distillation",
    "train_competing_model",
    "scrape_outputs",
    "resell_outputs",
}

# Archivos que nunca deben entrar como contexto ni salir en un diff.
BLOCKED_FILES = [
    ".env",
    ".env.*",
    "*.pem",
    "*.key",
    "id_rsa",
    "id_ed25519",
]

# Patrones de secretos para escanear texto (prompts y salidas de agentes).
_SECRET_PATTERNS: dict[str, re.Pattern[str]] = {
    "openai_key": re.compile(r"sk-(?:proj-)?[A-Za-z0-9_-]{20,}"),
    "anthropic_key": re.compile(r"sk-ant-[A-Za-z0-9_-]{20,}"),
    "google_key": re.compile(r"AIza[A-Za-z0-9_-]{30,}"),
    "google_oauth": re.compile(r"AQ\.[A-Za-z0-9_.-]{20,}"),
    "github_token": re.compile(r"gh[pousr]_[A-Za-z0-9]{30,}"),
    "xai_key": re.compile(r"xai-[A-Za-z0-9]{20,}"),
    "private_key_block": re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
}


@dataclass
class SecretFinding:
    kind: str
    redacted: str


@dataclass
class ScanResult:
    findings: list[SecretFinding] = field(default_factory=list)

    @property
    def clean(self) -> bool:
        return not self.findings


def is_blocked_file(path: str) -> bool:
    """True si la ruta coincide con un patron de archivo bloqueado."""
    name = path.replace("\\", "/").rsplit("/", 1)[-1]
    return any(fnmatch.fnmatch(name, pat) for pat in BLOCKED_FILES)


def safe_resolve(root: str | Path, rel: str) -> Path | None:
    """Resuelve `root/rel` y garantiza que cae DENTRO de `root` (anti traversal/symlink).

    Devuelve la ruta resuelta si es segura, o None si escapa de la raiz. Cubre tanto
    `../../x` como rutas absolutas (`Path('/root') / '/etc/passwd'` == `/etc/passwd`,
    que al resolver ya no es relativa a root). Fuente unica de esta regla: la usan
    `workspace.build_context` (lectura de contexto) y `changes.Change.diff` (preview),
    que antes componian `root / rel` sin validar y leian archivos fuera del proyecto.
    """
    root_p = Path(root).resolve()
    target = (root_p / rel).resolve()
    try:
        target.relative_to(root_p)
    except ValueError:
        return None
    return target


def scan_secrets(text: str) -> ScanResult:
    """Escanea texto buscando secretos conocidos. No muta el texto."""
    result = ScanResult()
    if not text:
        return result
    for kind, pattern in _SECRET_PATTERNS.items():
        for match in pattern.finditer(text):
            result.findings.append(SecretFinding(kind, _redact(match.group(0))))
    return result


def redact_secrets(text: str) -> str:
    """Devuelve el texto con los secretos reemplazados por [REDACTED:<tipo>]."""
    if not text:
        return text
    for kind, pattern in _SECRET_PATTERNS.items():
        text = pattern.sub(f"[REDACTED:{kind}]", text)
    return text


def check_mode(mode: str) -> None:
    """Lanza si se pide un modo prohibido por la politica."""
    if mode in DISALLOWED_MODES:
        raise PermissionError(f"Modo prohibido por la politica de ENJAMBRE: {mode}")


def _redact(secret: str) -> str:
    if len(secret) <= 8:
        return "****"
    return f"{secret[:4]}...{secret[-2:]}"
