"""Adapter para la API de Google (Gemini, generativelanguage)."""

from __future__ import annotations

import time

import httpx

from . import pricing as pricing_tables
from .base import BaseProvider, Message, ProviderResult, Usage, ValidationResult, http_error


class GoogleProvider(BaseProvider):
    name = "google"
    base_url = "https://generativelanguage.googleapis.com/v1beta"
    default_model = "gemini-1.5-flash"
    pricing = pricing_tables.GOOGLE

    async def validate_key(self) -> ValidationResult:
        missing = self._has_key()
        if missing:
            return missing
        try:
            async with self._http() as client:
                resp = await client.get(f"{self.base_url}/models",
                                        params={"key": self.api_key})
        except httpx.HTTPError as exc:
            return ValidationResult(False, f"Error de red: {exc}")
        if resp.status_code == 200:
            return ValidationResult(True, "Key valida")
        if resp.status_code in (400, 401, 403):
            return ValidationResult(False, "Key invalida o sin permisos")
        return ValidationResult(False, f"HTTP {resp.status_code}")

    async def chat(self, messages: list[Message], *,
                   model: str | None = None,
                   max_tokens: int = 1024,
                   tools: list[dict] | None = None,
                   tool_choice: str | None = None) -> ProviderResult:
        # `tools` se acepta por uniformidad del contrato pero aun NO se implementa
        # aqui (functionDeclarations de Google = slice T5); se ignora sin fallar.
        model = model or self.default_model
        missing = self._has_key()
        if missing:
            return ProviderResult(self.name, model, error=missing.detail)

        system = "\n".join(m.content for m in messages if m.role == "system")
        contents = []
        for m in messages:
            if m.role == "system":
                continue
            role = "model" if m.role == "assistant" else "user"
            contents.append({"role": role, "parts": [{"text": m.content}]})

        payload: dict = {
            "contents": contents,
            "generationConfig": {"maxOutputTokens": max_tokens},
        }
        if system:
            payload["systemInstruction"] = {"parts": [{"text": system}]}

        url = f"{self.base_url}/models/{model}:generateContent"
        start = time.monotonic()
        try:
            async with self._http() as client:
                resp = await client.post(url, params={"key": self.api_key},
                                         json=payload)
        except httpx.HTTPError as exc:
            return ProviderResult(self.name, model, error=f"Error de red: {exc}")
        latency = int((time.monotonic() - start) * 1000)

        if resp.status_code != 200:
            return ProviderResult(self.name, model, latency_ms=latency,
                                  error=http_error(resp))

        data = resp.json()
        candidates = data.get("candidates") or [{}]
        parts = candidates[0].get("content", {}).get("parts", [])
        text = "".join(p.get("text", "") for p in parts)
        um = data.get("usageMetadata", {}) or {}
        usage = Usage(um.get("promptTokenCount", 0),
                      um.get("candidatesTokenCount", 0))
        return ProviderResult(
            provider=self.name, model=model, text=text, usage=usage,
            cost_usd=self.estimate_cost(usage, model), latency_ms=latency,
        )

