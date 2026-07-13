"""Tests de adapters de proveedor (parsing + validacion) sin red real."""

import asyncio
import json

import httpx

import mock_api
from enjambre.providers import Message, build_provider
from enjambre.providers.base import ToolCall


def _run(coro):
    return asyncio.run(coro)


async def _chat(name, key="ok"):
    async with mock_api.make_client() as client:
        prov = build_provider(name, key, client=client)
        return await prov.chat([Message("user", "hola")])


def test_openai_chat_parsing():
    res = _run(_chat("openai"))
    assert res.ok
    assert res.text.startswith("openai-respuesta:gpt-4o-mini")
    assert res.usage.input_tokens == 10 and res.usage.output_tokens == 5
    assert res.cost_usd > 0


def test_anthropic_chat_parsing():
    res = _run(_chat("anthropic"))
    assert res.ok
    assert "anthropic-respuesta" in res.text
    assert res.usage.input_tokens == 12


def test_google_chat_parsing():
    res = _run(_chat("google"))
    assert res.ok
    assert res.text == "google-respuesta"
    assert res.usage.output_tokens == 4


def test_xai_uses_compat():
    res = _run(_chat("xai"))
    assert res.ok
    assert res.model == "grok-2-latest"


def test_missing_key_returns_error_not_call():
    res = _run(_chat("openai", key=""))
    assert not res.ok
    assert "API key" in res.error


def test_invalid_key_validation():
    async def go():
        async with mock_api.make_client() as client:
            prov = build_provider("openai", "BAD", client=client)
            return await prov.validate_key()
    res = _run(go())
    assert not res.ok


def test_valid_key_validation():
    async def go():
        async with mock_api.make_client() as client:
            prov = build_provider("anthropic", "ok", client=client)
            return await prov.validate_key()
    res = _run(go())
    assert res.ok


def test_unknown_provider_raises():
    try:
        build_provider("noexiste", "x")
    except ValueError as exc:
        assert "desconocido" in str(exc)
    else:
        raise AssertionError("debio lanzar ValueError")


def test_free_providers_chat_parsing():
    # Proveedores free OpenAI-compatible: mismo parsing, costo 0 (free tier).
    for name, model in [
        ("groq", "llama-3.3-70b-versatile"),
        ("openrouter", "meta-llama/llama-3.3-70b-instruct:free"),
        ("cerebras", "llama-3.3-70b"),
        ("github_models", "openai/gpt-4o-mini"),
    ]:
        res = _run(_chat(name))
        assert res.ok, name
        assert res.model == model
        assert res.cost_usd == 0.0  # free tier: pricing vacio


def test_github_models_validate_via_catalog():
    async def go():
        async with mock_api.make_client() as client:
            prov = build_provider("github_models", "ok", client=client)
            return await prov.validate_key()
    res = _run(go())
    assert res.ok


def test_free_provider_missing_key():
    res = _run(_chat("groq", key=""))
    assert not res.ok
    assert "API key" in res.error


# --- tool calling (T0) ------------------------------------------------------
def _tool_client(captured: dict) -> httpx.AsyncClient:
    """Transporte falso: captura el request y devuelve una respuesta con tool_calls."""
    def handler(request: httpx.Request) -> httpx.Response:
        captured["body"] = json.loads(request.content)
        return httpx.Response(200, json={
            "choices": [{
                "message": {
                    "content": None,
                    "tool_calls": [{
                        "id": "call_1", "type": "function",
                        "function": {"name": "read_file",
                                     "arguments": '{"path": "main.py"}'},
                    }],
                },
                "finish_reason": "tool_calls",
            }],
            "usage": {"prompt_tokens": 3, "completion_tokens": 2},
        })
    return httpx.AsyncClient(transport=httpx.MockTransport(handler))


def test_openai_compat_parses_tool_calls():
    captured: dict = {}

    async def go():
        async with _tool_client(captured) as client:
            prov = build_provider("groq", "ok", client=client)
            return await prov.chat(
                [Message("user", "lee main.py")],
                tools=[{"type": "function", "function": {"name": "read_file"}}],
            )
    res = _run(go())
    assert res.ok
    assert res.stop_reason == "tool_calls"
    assert len(res.tool_calls) == 1
    tc = res.tool_calls[0]
    assert tc.id == "call_1" and tc.name == "read_file"
    assert tc.arguments == {"path": "main.py"}  # argumentos ya decodificados
    # el payload llevo el array `tools`
    assert "tools" in captured["body"]


def test_openai_compat_serializes_tool_turns():
    """Un turno assistant con tool_calls y un turno `tool` se serializan al esquema
    de OpenAI (content null + tool_calls; role tool + tool_call_id)."""
    captured: dict = {}

    async def go():
        async with _tool_client(captured) as client:
            prov = build_provider("groq", "ok", client=client)
            msgs = [
                Message("user", "lee main.py"),
                Message("assistant", "", tool_calls=[
                    ToolCall(id="call_1", name="read_file",
                             arguments={"path": "main.py"})]),
                Message("tool", "print('hola')", tool_call_id="call_1",
                        name="read_file"),
            ]
            return await prov.chat(msgs, tools=[{"type": "function"}])
    _run(go())
    body = captured["body"]["messages"]
    assistant = body[1]
    assert assistant["content"] is None
    assert assistant["tool_calls"][0]["id"] == "call_1"
    assert assistant["tool_calls"][0]["function"]["name"] == "read_file"
    # los argumentos viajan como string JSON
    assert json.loads(assistant["tool_calls"][0]["function"]["arguments"]) == \
        {"path": "main.py"}
    tool_turn = body[2]
    assert tool_turn["role"] == "tool" and tool_turn["tool_call_id"] == "call_1"


def test_tools_none_is_backward_compatible():
    # sin tools, la respuesta de solo texto no trae tool_calls y stop_reason viene
    # del mock (mock_api no lo pone -> None). Regresion del camino existente.
    res = _run(_chat("openai"))
    assert res.tool_calls == []
    assert res.text.startswith("openai-respuesta")
