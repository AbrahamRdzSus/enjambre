"""Tests del token del sidecar: DEFAULT-ON en produccion pura, opt-in en modo
inyectado (tests/embebido)."""

import pytest

pytest.importorskip("fastapi")

from fastapi.testclient import TestClient  # noqa: E402

from enjambre import api  # noqa: E402
from enjambre.logs import LogBus  # noqa: E402
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


def _prod_app(monkeypatch, tmp_path):
    """App con token forzado + un bus inyectado (para emitir un evento y cerrar el
    stream de forma determinista via stop_after, sin colgar el TestClient)."""
    monkeypatch.setenv("ENJAMBRE_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("ENJAMBRE_API_TOKEN", "envtok")
    bus = LogBus()
    bus.emit("test.event", message="hola")  # 1 evento en el ring buffer
    return TestClient(api.create_app(bus=bus)), bus


# stream FINITO: replay=1 reemite el evento del buffer y stop_after=1 corta -> no cuelga.
_FIN = "replay=1&stop_after=1"


def test_sse_ticket_requires_auth(monkeypatch, tmp_path):
    """W2.3: pedir un ticket exige estar autenticado (token en header)."""
    c, _ = _prod_app(monkeypatch, tmp_path)
    assert c.post("/sse-ticket").status_code == 401
    r = c.post("/sse-ticket", headers={"X-API-Token": "envtok"})
    assert r.status_code == 200 and r.json()["ticket"]


def test_sse_stream_accepts_one_time_ticket(monkeypatch, tmp_path):
    """W2.3: el ticket abre el stream una sola vez; sin el, 401 (ya no hace falta el
    token real en la URL). Reusar el ticket consumido -> 401."""
    c, _ = _prod_app(monkeypatch, tmp_path)
    tkt = c.post("/sse-ticket", headers={"X-API-Token": "envtok"}).json()["ticket"]
    assert c.get("/logs/stream").status_code == 401          # sin credencial
    r = c.get(f"/logs/stream?ticket={tkt}&{_FIN}")           # ticket valido -> abre (consume)
    assert r.status_code == 200 and "test.event" in r.text
    assert c.get(f"/logs/stream?ticket={tkt}&{_FIN}").status_code == 401  # un solo uso


def test_sse_stream_still_accepts_real_token(monkeypatch, tmp_path):
    """Retrocompat: el token real por query sigue funcionando para el stream."""
    c, _ = _prod_app(monkeypatch, tmp_path)
    r = c.get(f"/logs/stream?token=envtok&{_FIN}")
    assert r.status_code == 200 and "test.event" in r.text


def test_sse_ticket_empty_without_token(monkeypatch, tmp_path):
    monkeypatch.setenv("ENJAMBRE_DATA_DIR", str(tmp_path))
    c = TestClient(api.create_app(api_token=""))  # sin token no hay nada que proteger
    assert c.post("/sse-ticket").json()["ticket"] == ""


def test_token_compare_handles_non_ascii(monkeypatch, tmp_path):
    """P2-6: la comparacion del token es en tiempo constante (secrets.compare_digest
    sobre bytes). Un token enviado con no-ASCII devuelve 401, no revienta con 500."""
    monkeypatch.setenv("ENJAMBRE_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("ENJAMBRE_API_TOKEN", "envtok")
    c = TestClient(api.create_app())
    # el token via query-string (lo usa EventSource) puede traer no-ASCII: compare_digest
    # sobre bytes no lanza; devuelve 401. Las cabeceras HTTP no admiten no-ASCII.
    assert c.get("/agents", params={"token": "clave-inválida"}).status_code == 401
    assert c.get("/agents", headers={"X-API-Token": "envtok"}).status_code == 200
