"""Adapters de proveedor y fabrica BYOK."""

from __future__ import annotations

import httpx

from .anthropic import AnthropicProvider
from .base import (BaseProvider, Message, ProviderResult, Usage,
                   ValidationResult)
from .google import GoogleProvider
from .openai_compat import OpenAICompatProvider, XAIProvider

#: nombre canonico -> clase adapter. Es la unica lista de proveedores soportados.
PROVIDERS: dict[str, type[BaseProvider]] = {
    "openai": OpenAICompatProvider,
    "anthropic": AnthropicProvider,
    "google": GoogleProvider,
    "xai": XAIProvider,
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


__all__ = [
    "PROVIDERS", "build_provider", "BaseProvider", "Message",
    "ProviderResult", "Usage", "ValidationResult",
    "OpenAICompatProvider", "XAIProvider", "AnthropicProvider", "GoogleProvider",
]
