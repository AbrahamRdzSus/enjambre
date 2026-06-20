"""Carga de configuracion y mapeo proveedor -> variable de entorno (BYOK).

Las claves se leen del entorno (cargado desde `.env` por python-dotenv). El core
NUNCA persiste las claves; viven solo en memoria durante la sesion.
"""

from __future__ import annotations

import os

#: proveedor canonico -> nombre de variable de entorno (alineado a .env.example)
PROVIDER_ENV: dict[str, str] = {
    "openai": "OPENAI_API_KEY",
    "anthropic": "ANTHROPIC_API_KEY",
    "google": "GOOGLE_API_KEY",
    "xai": "XAI_API_KEY",
}


def get_key(provider: str, env: dict[str, str] | None = None) -> str:
    """Devuelve la API key del proveedor desde el entorno (o '' si falta)."""
    source = env if env is not None else os.environ
    var = PROVIDER_ENV.get(provider.strip().lower())
    if not var:
        return ""
    return (source.get(var) or "").strip()


def available_providers(env: dict[str, str] | None = None) -> list[str]:
    """Proveedores con clave presente en el entorno."""
    return [p for p in PROVIDER_ENV if get_key(p, env)]


#: variable de entorno del token de GitHub (BYOK, ya en .env.example).
GITHUB_TOKEN_ENV = "GITHUB_TOKEN"


def github_token(env: dict[str, str] | None = None) -> str:
    """Devuelve el Personal Access Token de GitHub del entorno (o '' si falta).

    BYOK: el core nunca persiste el token; se usa solo en memoria para las
    llamadas a la API de GitHub (Fase 4).
    """
    source = env if env is not None else os.environ
    return (source.get(GITHUB_TOKEN_ENV) or "").strip()
