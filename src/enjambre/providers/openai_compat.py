"""Adapter para APIs compatibles con OpenAI (OpenAI y xAI/Grok).

Ambas exponen `GET /v1/models` y `POST /v1/chat/completions` con el mismo
esquema, asi que comparten implementacion y solo cambian base_url y precios.
"""

from __future__ import annotations

import time

import httpx

from . import pricing as pricing_tables
from .base import BaseProvider, Message, ProviderResult, Usage, ValidationResult, http_error


class OpenAICompatProvider(BaseProvider):
    name = "openai"
    base_url = "https://api.openai.com/v1"
    default_model = "gpt-4o-mini"
    pricing = pricing_tables.OPENAI

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"}

    async def validate_key(self) -> ValidationResult:
        missing = self._has_key()
        if missing:
            return missing
        try:
            async with self._http() as client:
                resp = await client.get(f"{self.base_url}/models",
                                        headers=self._headers())
        except httpx.HTTPError as exc:
            return ValidationResult(False, f"Error de red: {exc}")
        if resp.status_code == 200:
            return ValidationResult(True, "Key valida")
        if resp.status_code in (401, 403):
            return ValidationResult(False, "Key invalida o sin permisos")
        return ValidationResult(False, f"HTTP {resp.status_code}")

    async def chat(self, messages: list[Message], *,
                   model: str | None = None,
                   max_tokens: int = 1024) -> ProviderResult:
        model = model or self.default_model
        missing = self._has_key()
        if missing:
            return ProviderResult(self.name, model, error=missing.detail)

        payload = {
            "model": model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "max_tokens": max_tokens,
        }
        start = time.monotonic()
        try:
            async with self._http() as client:
                resp = await client.post(f"{self.base_url}/chat/completions",
                                         headers=self._headers(), json=payload)
        except httpx.HTTPError as exc:
            return ProviderResult(self.name, model, error=f"Error de red: {exc}")
        latency = int((time.monotonic() - start) * 1000)

        if resp.status_code != 200:
            return ProviderResult(self.name, model, latency_ms=latency,
                                  error=http_error(resp))

        data = resp.json()
        text = (data.get("choices") or [{}])[0].get("message", {}).get("content", "")
        u = data.get("usage", {}) or {}
        usage = Usage(u.get("prompt_tokens", 0), u.get("completion_tokens", 0))
        return ProviderResult(
            provider=self.name, model=model, text=text or "", usage=usage,
            cost_usd=self.estimate_cost(usage, model), latency_ms=latency,
        )


class XAIProvider(OpenAICompatProvider):
    name = "xai"
    base_url = "https://api.x.ai/v1"
    default_model = "grok-2-latest"
    pricing = pricing_tables.XAI

