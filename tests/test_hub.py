"""F1: HubClient (proxy read-only al hub de CD). Hub simulado con MockTransport."""

import asyncio

import httpx
import pytest

from enjambre.hub import HubClient, HubError


def _run(coro):
    return asyncio.run(coro)


def test_login_once_then_status_cached():
    calls = {"auth": 0, "status": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if path == "/api/auth":
            calls["auth"] += 1
            assert request.method == "POST"
            return httpx.Response(200, json={"token": "jwt-123", "role": "admin"})
        if path == "/api/status":
            calls["status"] += 1
            assert request.headers.get("authorization") == "Bearer jwt-123"
            return httpx.Response(200, json={"silix": {"pm2": {"status": "online"}}})
        return httpx.Response(404)

    async def scenario():
        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as client:
            hub = HubClient("http://hub", "1234")
            first = await hub.status(client)
            assert "silix" in first
            await hub.status(client)  # token cacheado: NO re-login

    _run(scenario())
    assert calls["auth"] == 1
    assert calls["status"] == 2


def test_relogin_on_401():
    tokens = iter(["viejo", "nuevo"])
    calls = {"auth": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if path == "/api/auth":
            calls["auth"] += 1
            return httpx.Response(200, json={"token": next(tokens)})
        if path == "/api/status":
            if request.headers.get("authorization") == "Bearer viejo":
                return httpx.Response(401)  # token caduco
            return httpx.Response(200, json={"ok": True})
        return httpx.Response(404)

    async def scenario():
        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as client:
            hub = HubClient("http://hub", "1234")
            return await hub.status(client)

    result = _run(scenario())
    assert result == {"ok": True}
    assert calls["auth"] == 2  # login inicial + re-login tras 401


def test_login_failure_raises():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(401)  # PIN malo

    async def scenario():
        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as client:
            hub = HubClient("http://hub", "malo")
            await hub.status(client)

    with pytest.raises(HubError):
        _run(scenario())


def test_empty_base_url_raises():
    with pytest.raises(HubError):
        HubClient("", "1234")
