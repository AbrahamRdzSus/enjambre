"""Adapters de proveedores GRATIS compatibles con OpenAI (BYOK).

Todos exponen el mismo esquema `/chat/completions` que OpenAI, asi que heredan
de `OpenAICompatProvider` y solo cambian `base_url`, `default_model` y `name`.
`pricing` se deja vacio: en su free tier el costo se reporta como 0 (estimacion).

Fuente de los endpoints/modelos free: cheahjs/free-llm-api-resources.
"""

from __future__ import annotations

import httpx

from .base import ValidationResult
from .openai_compat import OpenAICompatProvider


class GroqProvider(OpenAICompatProvider):
    """Groq: free tier muy rapido (Llama/Qwen). https://console.groq.com"""

    name = "groq"
    base_url = "https://api.groq.com/openai/v1"
    default_model = "llama-3.3-70b-versatile"
    pricing = {}


class OpenRouterProvider(OpenAICompatProvider):
    """OpenRouter: un key, muchos modelos; varios con sufijo ':free'."""

    name = "openrouter"
    base_url = "https://openrouter.ai/api/v1"
    default_model = "meta-llama/llama-3.3-70b-instruct:free"
    pricing = {}


class CerebrasProvider(OpenAICompatProvider):
    """Cerebras: free tier, inferencia muy rapida. https://cloud.cerebras.ai"""

    name = "cerebras"
    base_url = "https://api.cerebras.ai/v1"
    default_model = "llama-3.3-70b"
    pricing = {}


class GitHubModelsProvider(OpenAICompatProvider):
    """GitHub Models: gratis (rate-limited) con un PAT de GitHub (scope models:read).

    El chat es OpenAI-compatible bajo `/inference`, pero el catalogo de modelos
    vive en otra ruta (`/catalog/models`), por eso se sobreescribe validate_key.
    """

    name = "github_models"
    base_url = "https://models.github.ai/inference"
    default_model = "openai/gpt-4o-mini"
    pricing = {}
    catalog_url = "https://models.github.ai/catalog/models"

    async def validate_key(self) -> ValidationResult:
        missing = self._has_key()
        if missing:
            return missing
        try:
            async with self._http() as client:
                resp = await client.get(self.catalog_url, headers=self._headers())
        except httpx.HTTPError as exc:
            return ValidationResult(False, f"Error de red: {exc}")
        if resp.status_code == 200:
            return ValidationResult(True, "Key valida")
        if resp.status_code in (401, 403):
            return ValidationResult(False, "Key invalida o sin permisos (models:read)")
        return ValidationResult(False, f"HTTP {resp.status_code}")
