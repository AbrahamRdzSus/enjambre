"""Contrato comun de los adapters de proveedor.

Todo proveedor es BYOK (Bring Your Own Key). Ningun adapter persiste la clave;
la recibe en el constructor y la usa solo en memoria para las llamadas HTTP.
"""

from __future__ import annotations

import abc
import contextlib
from dataclasses import dataclass, field
from typing import AsyncIterator

import httpx


@dataclass
class Message:
    """Un turno de conversacion. role: system | user | assistant."""

    role: str
    content: str


@dataclass
class Usage:
    input_tokens: int = 0
    output_tokens: int = 0


@dataclass
class ProviderResult:
    """Resultado normalizado de una llamada a un proveedor.

    `error` es None cuando la llamada fue exitosa. La UI compara estos
    resultados lado a lado.
    """

    provider: str
    model: str
    text: str = ""
    usage: Usage = field(default_factory=Usage)
    cost_usd: float = 0.0
    latency_ms: int = 0
    error: str | None = None

    @property
    def ok(self) -> bool:
        return self.error is None


@dataclass
class ValidationResult:
    ok: bool
    detail: str = ""


# Precios aproximados en USD por 1M de tokens (input, output). Son estimaciones
# para mostrar costo; no son una fuente de verdad de facturacion.
Pricing = tuple[float, float]


class BaseProvider(abc.ABC):
    """Adapter de proveedor. Subclases implementan el transporte concreto."""

    name: str = "base"
    default_model: str = ""
    #: model -> (precio_input, precio_output) por 1M tokens
    pricing: dict[str, Pricing] = {}

    #: URL base por defecto del proveedor (sobreescribible por subclase).
    base_url: str = ""

    def __init__(self, api_key: str, *, base_url: str | None = None,
                 timeout: float = 60.0,
                 client: httpx.AsyncClient | None = None) -> None:
        self.api_key = (api_key or "").strip()
        self.base_url = (base_url or self.base_url).rstrip("/")
        self.timeout = timeout
        #: cliente inyectado (tests usan httpx.MockTransport); si es None se crea
        #: uno efimero por llamada.
        self._injected = client

    @contextlib.asynccontextmanager
    async def _http(self) -> AsyncIterator[httpx.AsyncClient]:
        if self._injected is not None:
            yield self._injected
            return
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            yield client

    # --- contrato ---------------------------------------------------------
    @abc.abstractmethod
    async def validate_key(self) -> ValidationResult:
        """Verifica que la clave funciona (llamada barata, normalmente models)."""

    @abc.abstractmethod
    async def chat(self, messages: list[Message], *,
                   model: str | None = None,
                   max_tokens: int = 1024) -> ProviderResult:
        """Envia la conversacion y devuelve un resultado normalizado."""

    def estimate_cost(self, usage: Usage, model: str) -> float:
        price = self.pricing.get(model)
        if not price:
            return 0.0
        pin, pout = price
        return (usage.input_tokens * pin + usage.output_tokens * pout) / 1_000_000

    # --- utilidades -------------------------------------------------------
    def _has_key(self) -> ValidationResult | None:
        if not self.api_key:
            return ValidationResult(False, "Falta API key")
        return None
