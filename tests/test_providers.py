"""Tests de adapters de proveedor (parsing + validacion) sin red real."""

import asyncio

import mock_api
from enjambre.providers import Message, build_provider


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
