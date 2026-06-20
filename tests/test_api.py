"""Tests del sidecar FastAPI (enjambre.api). Se saltan si fastapi no esta."""

import pytest

pytest.importorskip("fastapi")

from fastapi.testclient import TestClient  # noqa: E402

import mock_api  # noqa: E402
from enjambre.api import create_app  # noqa: E402
from enjambre.registry import Agent, Registry  # noqa: E402

KEYS = {"openai": "ok", "anthropic": "ok", "google": "ok", "xai": "ok"}


def _client():
    reg = Registry([
        Agent(name="a-openai", provider="openai", model="gpt-4o-mini"),
        Agent(name="a-anthropic", provider="anthropic", model="claude-sonnet-4-6"),
    ])
    app = create_app(registry=reg, keys=KEYS, client=mock_api.make_client())
    return TestClient(app)


def test_health():
    assert _client().get("/health").json() == {"status": "ok"}


def test_agents():
    data = _client().get("/agents").json()
    assert {a["name"] for a in data} == {"a-openai", "a-anthropic"}


def test_providers():
    data = _client().get("/providers").json()
    names = {p["provider"] for p in data}
    assert {"openai", "anthropic", "google", "xai"} <= names
    assert all("key_present" in p for p in data)


def test_validate():
    data = _client().post("/validate").json()
    assert data["openai"]["ok"] and data["anthropic"]["ok"]


def test_run_side_by_side():
    r = _client().post("/run", json={"prompt": "refactor"})
    body = r.json()
    assert r.status_code == 200
    assert {run["agent"] for run in body["runs"]} == {"a-openai", "a-anthropic"}
    assert body["total_cost_usd"] > 0


def test_run_save_and_sessions_and_stats(tmp_path, monkeypatch):
    # aisla el store de sesiones al tmp_path (DEFAULT_STORE es relativo al cwd)
    monkeypatch.chdir(tmp_path)
    c = _client()
    body = c.post("/run", json={"prompt": "tarea", "save": True}).json()
    sid = body["session_id"]
    assert sid

    sessions = c.get("/sessions").json()
    assert any(s["id"] == sid for s in sessions)

    one = c.get(f"/sessions/{sid}")
    assert one.status_code == 200 and one.json()["kind"] == "orchestration"

    st = c.get("/stats").json()
    assert st["sessions"] == 1 and st["total_cost_usd"] > 0
    assert set(st["by_provider"]) == {"openai", "anthropic"}


def test_session_not_found():
    assert _client().get("/sessions/no-existe").status_code == 404
