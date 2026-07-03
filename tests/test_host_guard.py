"""Tests del guard anti DNS-rebinding (validacion del header Host)."""

import pytest

pytest.importorskip("fastapi")

from fastapi.testclient import TestClient  # noqa: E402

from enjambre.api import create_app  # noqa: E402
from enjambre.registry import Registry  # noqa: E402


def _client(**kw):
    return TestClient(create_app(registry=Registry([]), keys={}, **kw))


def test_loopback_host_allowed():
    # TestClient manda Host "testserver" (loopback-equivalente en pruebas).
    assert _client().get("/health").status_code == 200


def test_explicit_127_host_allowed():
    r = _client().get("/health", headers={"host": "127.0.0.1:8000"})
    assert r.status_code == 200


def test_spoofed_host_rejected():
    r = _client().get("/health", headers={"host": "evil.com"})
    assert r.status_code == 403
    assert "rebinding" in r.json()["detail"]


def test_rebind_domain_resolving_to_loopback_rejected():
    # El ataque real: dominio del atacante que resuelve a 127.0.0.1; el Host delata.
    r = _client().post("/cli/run", headers={"host": "attacker.example"},
                       json={"project_id": "x", "prompt": "y"})
    assert r.status_code == 403


def test_extra_trusted_host_allowed():
    r = _client(trusted_hosts=["miapp.local"]).get(
        "/health", headers={"host": "miapp.local:8000"})
    assert r.status_code == 200


def test_wildcard_disables_guard():
    r = _client(trusted_hosts=["*"]).get("/health", headers={"host": "anything.com"})
    assert r.status_code == 200


def test_ipv6_loopback_allowed():
    r = _client().get("/health", headers={"host": "[::1]:8000"})
    assert r.status_code == 200
