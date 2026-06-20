"""Adapter para la API de Anthropic (Claude)."""

from __future__ import annotations

import time

import httpx

from .base import BaseProvider, Message, ProviderResult, Usage, ValidationResult

ANTHROPIC_VERSION = "2023-06-01"


class AnthropicProvider(BaseProvider):
    name = "anthropic"
    base_url = "https://api.anthropic.com/v1"
    default_model = "claude-sonnet-4-6"
    pricing = {
        "claude-opus-4-8": (15.0, 75.0),
        "claude-sonnet-4-6": (3.0, 15.0),
        "claude-haiku-4-5-20251001": (1.0, 5.0),
    }

    def _headers(self) -> dict[str, str]:
        return {
            "x-api-key": self.api_key,
            "anthropic-version": ANTHROPIC_VERSION,
            "Content-Type": "application/json",
        }

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

        # Anthropic separa el system prompt del array de mensajes.
        system = "\n".join(m.content for m in messages if m.role == "system")
        convo = [{"role": m.role, "content": m.content}
                 for m in messages if m.role in ("user", "assistant")]
        payload: dict = {"model": model, "max_tokens": max_tokens, "messages": convo}
        if system:
            payload["system"] = system

        start = time.monotonic()
        try:
            async with self._http() as client:
                resp = await client.post(f"{self.base_url}/messages",
                                         headers=self._headers(), json=payload)
        except httpx.HTTPError as exc:
            return ProviderResult(self.name, model, error=f"Error de red: {exc}")
        latency = int((time.monotonic() - start) * 1000)

        if resp.status_code != 200:
            return ProviderResult(self.name, model, latency_ms=latency,
                                  error=_http_error(resp))

        data = resp.json()
        text = "".join(block.get("text", "")
                       for block in data.get("content", [])
                       if block.get("type") == "text")
        u = data.get("usage", {}) or {}
        usage = Usage(u.get("input_tokens", 0), u.get("output_tokens", 0))
        return ProviderResult(
            provider=self.name, model=model, text=text, usage=usage,
            cost_usd=self.estimate_cost(usage, model), latency_ms=latency,
        )


def _http_error(resp: httpx.Response) -> str:
    try:
        err = resp.json().get("error", {})
        return f"HTTP {resp.status_code}: {err.get('message', '')}".strip()
    except Exception:
        return f"HTTP {resp.status_code}"
