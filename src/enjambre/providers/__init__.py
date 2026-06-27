"""Adapters de proveedor y fabrica BYOK."""

from __future__ import annotations

import httpx

from .anthropic import AnthropicProvider
from .base import BaseProvider, Message, ProviderResult, Usage, ValidationResult
from .google import GoogleProvider
from .openai_compat import OpenAICompatProvider, XAIProvider
from .openai_free import (
    CerebrasProvider,
    GitHubModelsProvider,
    GroqProvider,
    OpenRouterProvider,
)

#: nombre canonico -> clase adapter. Es la unica lista de proveedores soportados.
PROVIDERS: dict[str, type[BaseProvider]] = {
    "openai": OpenAICompatProvider,
    "anthropic": AnthropicProvider,
    "google": GoogleProvider,
    "xai": XAIProvider,
    # Free tier (OpenAI-compatible, BYOK):
    "groq": GroqProvider,
    "openrouter": OpenRouterProvider,
    "cerebras": CerebrasProvider,
    "github_models": GitHubModelsProvider,
}


def build_provider(name: str, api_key: str, *,
                   client: httpx.AsyncClient | None = None,
                   **kwargs) -> BaseProvider:
    """Construye el adapter de un proveedor por nombre canonico."""
    key = name.strip().lower()
    if key not in PROVIDERS:
        raise ValueError(
            f"Proveedor desconocido: {name!r}. "
            f"Soportados: {', '.join(sorted(PROVIDERS))}"
        )
    return PROVIDERS[key](api_key, client=client, **kwargs)


def register_provider(name: str, cls: type[BaseProvider], *,
                      overwrite: bool = False) -> None:
    """Inscribe un adapter de proveedor de terceros (Provider SDK, Fase 6).

    Permite agregar proveedores sin editar el core. `cls` debe heredar de
    `BaseProvider`. Rechaza un nombre ya registrado salvo `overwrite=True`.
    """
    key = name.strip().lower()
    if not key:
        raise ValueError("El proveedor necesita un nombre no vacio")
    if not (isinstance(cls, type) and issubclass(cls, BaseProvider)):
        raise TypeError(f"{cls!r} no hereda de BaseProvider")
    if key in PROVIDERS and not overwrite:
        raise ValueError(
            f"Proveedor {key!r} ya registrado; usa overwrite=True para reemplazar")
    PROVIDERS[key] = cls


def unregister_provider(name: str) -> None:
    """Quita un proveedor del registro (util para limpiar tras un test)."""
    PROVIDERS.pop(name.strip().lower(), None)


__all__ = [
    "PROVIDERS", "build_provider", "register_provider", "unregister_provider",
    "BaseProvider", "Message", "ProviderResult", "Usage", "ValidationResult",
    "OpenAICompatProvider", "XAIProvider", "AnthropicProvider", "GoogleProvider",
    "GroqProvider", "OpenRouterProvider", "CerebrasProvider", "GitHubModelsProvider",
]
