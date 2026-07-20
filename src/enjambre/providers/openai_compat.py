"""Adapter para APIs compatibles con OpenAI (OpenAI y xAI/Grok).

Ambas exponen `GET /v1/models` y `POST /v1/chat/completions` con el mismo
esquema, asi que comparten implementacion y solo cambian base_url y precios.
"""

from __future__ import annotations

import json
import time

import httpx

from . import pricing as pricing_tables
from .base import (
    BaseProvider,
    Message,
    ProviderResult,
    ToolCall,
    Usage,
    ValidationResult,
    http_error,
)


def _serialize_message(m: Message) -> dict:
    """Mensaje interno -> forma OpenAI (incluye tool_calls y el rol `tool`)."""
    if m.role == "tool":
        return {"role": "tool", "tool_call_id": m.tool_call_id, "content": m.content}
    if m.tool_calls:
        return {
            "role": m.role,
            "content": m.content or None,
            "tool_calls": [
                {"id": tc.id, "type": "function",
                 "function": {"name": tc.name,
                              "arguments": json.dumps(tc.arguments)}}
                for tc in m.tool_calls
            ],
        }
    return {"role": m.role, "content": m.content}


def _parse_tool_calls(raw: list[dict] | None) -> list[ToolCall]:
    """`message.tool_calls` de OpenAI -> ToolCall (argumentos ya decodificados)."""
    out: list[ToolCall] = []
    for tc in raw or []:
        fn = tc.get("function", {}) or {}
        try:
            args = json.loads(fn.get("arguments") or "{}")
        except (json.JSONDecodeError, TypeError):
            args = {}
        if not isinstance(args, dict):
            args = {}
        out.append(ToolCall(id=tc.get("id", ""), name=fn.get("name", ""),
                            arguments=args))
    return out


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
                   max_tokens: int = 1024,
                   tools: list[dict] | None = None,
                   tool_choice: str | None = None) -> ProviderResult:
        model = model or self.default_model
        missing = self._has_key()
        if missing:
            return ProviderResult(self.name, model, error=missing.detail)

        payload: dict = {
            "model": model,
            "messages": [_serialize_message(m) for m in messages],
            "max_tokens": max_tokens,
        }
        if tools:
            payload["tools"] = tools
            if tool_choice:
                payload["tool_choice"] = tool_choice
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
        choice = (data.get("choices") or [{}])[0]
        msg = choice.get("message", {}) or {}
        text = msg.get("content", "")
        u = data.get("usage", {}) or {}
        usage = Usage(u.get("prompt_tokens", 0), u.get("completion_tokens", 0))
        return ProviderResult(
            provider=self.name, model=model, text=text or "", usage=usage,
            cost_usd=self.estimate_cost(usage, model), latency_ms=latency,
            tool_calls=_parse_tool_calls(msg.get("tool_calls")),
            stop_reason=choice.get("finish_reason"),
        )


class XAIProvider(OpenAICompatProvider):
    name = "xai"
    base_url = "https://api.x.ai/v1"
    default_model = "grok-2-latest"
    pricing = pricing_tables.XAI

