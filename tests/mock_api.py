"""Transporte httpx falso que imita las 4 APIs de proveedor (offline)."""

from __future__ import annotations

import json

import httpx


def handler(request: httpx.Request) -> httpx.Response:
    path = request.url.path
    auth = request.headers.get("authorization", "")
    api_key_hdr = request.headers.get("x-api-key", "")
    key_param = request.url.params.get("key", "")

    # Simula clave invalida si el valor es "BAD".
    if "BAD" in (auth + api_key_hdr + key_param):
        return httpx.Response(401, json={"error": {"message": "invalid key"}})

    # --- validacion (listar modelos) ---
    if request.method == "GET" and path.endswith("/models"):
        return httpx.Response(200, json={"data": [], "models": []})

    # --- OpenAI / xAI chat ---
    if path.endswith("/chat/completions"):
        body = json.loads(request.content)
        return httpx.Response(200, json={
            "choices": [{"message": {"content": f"openai-respuesta:{body['model']}"}}],
            "usage": {"prompt_tokens": 10, "completion_tokens": 5},
        })

    # --- Anthropic messages ---
    if path.endswith("/messages"):
        body = json.loads(request.content)
        return httpx.Response(200, json={
            "content": [{"type": "text", "text": f"anthropic-respuesta:{body['model']}"}],
            "usage": {"input_tokens": 12, "output_tokens": 7},
        })

    # --- Google generateContent ---
    if "generateContent" in path:
        return httpx.Response(200, json={
            "candidates": [{"content": {"parts": [{"text": "google-respuesta"}]}}],
            "usageMetadata": {"promptTokenCount": 8, "candidatesTokenCount": 4},
        })

    return httpx.Response(404, json={"error": {"message": f"sin ruta: {path}"}})


def make_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(transport=httpx.MockTransport(handler))
