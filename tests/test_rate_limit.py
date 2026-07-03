"""Tests del rate limit (token-bucket) del sidecar."""

import pytest

pytest.importorskip("fastapi")

from fastapi.testclient import TestClient  # noqa: E402

from enjambre.api import create_app  # noqa: E402
from enjambre.registry import Registry  # noqa: E402


def _client(rate_limit):
    return TestClient(create_app(registry=Registry([]), keys={}, rate_limit=rate_limit))


def test_burst_over_capacity_returns_429():
    # capacidad 2, refill despreciable -> la 3a peticion inmediata cae en 429
    c = _client((2.0, 0.001))
    assert c.get("/agents").status_code == 200
    assert c.get("/agents").status_code == 200
    assert c.get("/agents").status_code == 429


def test_health_exempt_from_rate_limit():
    c = _client((1.0, 0.001))
    c.get("/agents")  # consume el unico token
    # /health nunca se limita (liveness)
    assert c.get("/health").status_code == 200
    assert c.get("/health").status_code == 200


def test_refill_restores_capacity():
    import time
    c = _client((1.0, 2.0))  # recarga lenta y determinista: 2 tokens/s
    assert c.get("/agents").status_code == 200
    assert c.get("/agents").status_code == 429  # agotado (la latencia no repone 1)
    time.sleep(0.7)  # 0.7s * 2/s = 1.4 tokens repuestos
    assert c.get("/agents").status_code == 200


def test_generous_default_does_not_block_normal_use():
    # default (240/8): un uso normal de decenas de requests no se limita
    c = TestClient(create_app(registry=Registry([]), keys={}))
    assert all(c.get("/health").status_code == 200 for _ in range(50))
    assert c.get("/agents").status_code == 200


def test_env_zero_disables(monkeypatch):
    monkeypatch.setenv("ENJAMBRE_RATE_LIMIT", "0")  # desactivado por env
    c = TestClient(create_app(registry=Registry([]), keys={}))
    assert all(c.get("/agents").status_code == 200 for _ in range(300))
