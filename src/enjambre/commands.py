"""Politica de comandos peligrosos (Fase 5).

`check_command(argv)` devuelve un motivo (str) si el comando NO debe ejecutarse,
o None si es seguro. Es una lista-negra conservadora: ante la duda, bloquea. El
sandbox la aplica SIEMPRE antes de ejecutar, incluso con aprobacion humana: un
comando destructivo no se corre aunque el usuario apruebe la accion.
"""

from __future__ import annotations

import re

# Patrones peligrosos sobre la linea de comando completa (case-insensitive).
# Cada entrada: (regex, motivo legible).
_DANGEROUS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\brm\s+(-[a-z]*\s+)*-?[a-z]*[rf][a-z]*\b.*(\s/|\s~|\s\*|\s\./)"),
     "rm recursivo/forzado sobre raiz, home o comodin"),
    (re.compile(r"\b(mkfs|fdisk|parted)\b"), "formateo/particionado de disco"),
    (re.compile(r"\bdd\b.*\bof=/dev/"), "dd escribiendo a un dispositivo de bloque"),
    (re.compile(r">\s*/dev/(sd|nvme|hd|disk)"), "redireccion a dispositivo de bloque"),
    (re.compile(r":\s*\(\s*\)\s*\{.*\|.*&\s*\}\s*;"), "fork bomb"),
    (re.compile(r"\b(shutdown|reboot|halt|poweroff|init\s+0)\b"), "apagado/reinicio"),
    (re.compile(r"\b(chmod|chown)\b.*\s-[a-z]*r[a-z]*\b.*\s/(?:\s|$)"),
     "chmod/chown recursivo sobre raiz"),
    (re.compile(r"\b(curl|wget)\b.*\|\s*(sudo\s+)?(sh|bash|zsh)\b"),
     "descarga ejecutada por shell (curl|wget | sh)"),
    (re.compile(r"\b(sudo|su)\b"), "escalada de privilegios"),
    (re.compile(r"\bgit\b.*\bpush\b.*(--force\b|-f\b)"), "git push forzado"),
    (re.compile(r"\bgit\b.*\breset\b.*--hard\b"), "git reset --hard (destructivo)"),
    (re.compile(r"\b(nc|netcat|telnet)\b"), "herramienta de red cruda (exfiltracion)"),
]


def check_command(argv: list[str] | str) -> str | None:
    """Devuelve el motivo si el comando es peligroso; None si es seguro."""
    if isinstance(argv, str):
        line = argv
    else:
        if not argv:
            return "comando vacio"
        line = " ".join(argv)
    low = line.lower()
    for pattern, reason in _DANGEROUS:
        if pattern.search(low):
            return reason
    return None


def is_dangerous(argv: list[str] | str) -> bool:
    return check_command(argv) is not None
