"""Tests del token del sidecar: DEFAULT-ON en produccion pura, opt-in en modo
inyectado (tests/embebido)."""

import pytest

pytest.importorskip("fastapi")

from fastapi.testclient import TestClient  # noqa: E402

from enjambre import api  # noqa: E402
from enjambre.registry import Registry  # noqa: E402


def test_injected_mode_stays_open(monkeypatch, tmp_path):
    # modo inyectado (registry+keys) -> sin token forzado (tests actuales siguen ok)
    monkeypatch.setenv("ENJAMBRE_DATA_DIR", str(tmp_path))
    c = TestClient(api.create_app(registry=Registry([]), keys={}))
    assert c.get("/agents").status_code == 200


def test_production_path_default_on(monkeypatch, tmp_path):
    # produccion pura (sin inyeccion) -> token autogenerado y exigido
    monkeypatch.setenv("ENJAMBRE_DATA_DIR", str(tmp_path))
    monkeypatch.delenv("ENJAMBRE_API_TOKEN", raising=False)
    app = api.create_app()
    c = TestClient(app)
    assert c.get("/health").status_code == 200          # /health abierto
    assert c.get("/agents").status_code == 401          # el resto exige token
    tok = (tmp_path / "api-token").read_text(encoding="utf-8").strip()
    assert tok
    assert c.get("/agents", headers={"X-API-Token": tok}).status_code == 200


def test_token_persisted_across_apps(monkeypatch, tmp_path):
    monkeypatch.setenv("ENJAMBRE_DATA_DIR", str(tmp_path))
    monkeypatch.delenv("ENJAMBRE_API_TOKEN", raising=False)
    api.create_app()
    tok1 = (tmp_path / "api-token").read_text(encoding="utf-8").strip()
    api.create_app()  # segundo arranque: mismo token (no rota, Tauri/dev estables)
    tok2 = (tmp_path / "api-token").read_text(encoding="utf-8").strip()
    assert tok1 == tok2


def test_explicit_empty_opts_out(monkeypatch, tmp_path):
    monkeypatch.setenv("ENJAMBRE_DATA_DIR", str(tmp_path))
    monkeypatch.delenv("ENJAMBRE_API_TOKEN", raising=False)
    c = TestClient(api.create_app(api_token=""))  # opt-out consciente
    assert c.get("/agents").status_code == 200
    assert not (tmp_path / "api-token").exists()  # ni siquiera se genera


def test_env_token_wins(monkeypatch, tmp_path):
    monkeypatch.setenv("ENJAMBRE_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("ENJAMBRE_API_TOKEN", "envtok")
    c = TestClient(api.create_app())
    assert c.get("/agents", headers={"X-API-Token": "envtok"}).status_code == 200
    assert c.get("/agents", headers={"X-API-Token": "otro"}).status_code == 401
