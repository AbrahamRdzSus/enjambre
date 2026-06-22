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


def test_workspace_files(tmp_path):
    (tmp_path / "a.txt").write_text("hola", encoding="utf-8")
    (tmp_path / "sub").mkdir()
    (tmp_path / "sub" / "b.py").write_text("x=1", encoding="utf-8")
    r = _client().get("/workspace/files", params={"root": str(tmp_path)})
    files = r.json()["files"]
    assert "a.txt" in files and "sub/b.py" in files


def test_workspace_files_bad_root():
    assert _client().get("/workspace/files",
                         params={"root": "/no/existe/xyz"}).status_code == 400


def test_changes_preview_and_apply_gate(tmp_path):
    c = _client()
    payload = {"root": str(tmp_path),
               "changes": [{"path": "nuevo.txt", "new_content": "hola\n"}]}

    # preview no escribe
    diffs = c.post("/changes/preview", json=payload).json()["diffs"]
    assert "nuevo.txt" in diffs
    assert not (tmp_path / "nuevo.txt").exists()

    # apply sin approved -> 403 (gate del core)
    assert c.post("/changes/apply", json=payload).status_code == 403
    assert not (tmp_path / "nuevo.txt").exists()

    # apply con approved -> escribe
    payload["approved"] = True
    body = c.post("/changes/apply", json=payload).json()
    assert body["ok"] and "nuevo.txt" in body["written"]
    assert (tmp_path / "nuevo.txt").read_text() == "hola\n"


def test_run_emits_logs():
    c = _client()
    assert c.get("/logs").json() == []
    c.post("/run", json={"prompt": "refactor"})
    events = [e["event"] for e in c.get("/logs").json()]
    assert "run.start" in events and "run.done" in events
    assert "agent.done" in events


def test_logs_filter_by_agent():
    c = _client()
    c.post("/run", json={"prompt": "x"})
    only = c.get("/logs", params={"agent": "a-openai"}).json()
    assert only and all(e["agent"] == "a-openai" for e in only)


# --- seguridad: token, allowlist de roots, docs apagadas -------------------
def _reg():
    return Registry([Agent(name="a-openai", provider="openai", model="gpt-4o-mini")])


def test_api_token_required():
    app = create_app(registry=_reg(), keys=KEYS, client=mock_api.make_client(),
                     api_token="secreto")
    c = TestClient(app)
    assert c.get("/health").status_code == 200          # /health abierto
    assert c.get("/agents").status_code == 401          # sin token
    assert c.get("/agents", headers={"X-API-Token": "secreto"}).status_code == 200
    assert c.get("/agents",
                 headers={"Authorization": "Bearer secreto"}).status_code == 200
    assert c.get("/agents", headers={"X-API-Token": "malo"}).status_code == 401


def test_workspace_allowlist(tmp_path):
    allowed = tmp_path / "ok"
    allowed.mkdir()
    (allowed / "f.txt").write_text("x", encoding="utf-8")
    outside = tmp_path / "fuera"
    outside.mkdir()
    app = create_app(registry=_reg(), allowed_roots=[str(allowed)])
    c = TestClient(app)
    assert c.get("/workspace/files", params={"root": str(allowed)}).status_code == 200
    assert c.get("/workspace/files", params={"root": str(outside)}).status_code == 403


def test_changes_apply_respects_allowlist(tmp_path):
    allowed = tmp_path / "ok"
    allowed.mkdir()
    outside = tmp_path / "fuera"
    outside.mkdir()
    app = create_app(registry=_reg(), allowed_roots=[str(allowed)])
    c = TestClient(app)
    payload = {"root": str(outside), "approved": True,
               "changes": [{"path": "x.txt", "new_content": "y"}]}
    assert c.post("/changes/apply", json=payload).status_code == 403
    assert not (outside / "x.txt").exists()


def test_docs_off_by_default():
    c = TestClient(create_app(registry=_reg()))
    assert c.get("/openapi.json").status_code == 404
    assert c.get("/docs").status_code == 404


def test_docs_on_with_dev_flag():
    c = TestClient(create_app(registry=_reg(), dev_docs=True))
    assert c.get("/openapi.json").status_code == 200


# --- gestion de agentes (CRUD) + keys --------------------------------------
def test_agent_crud():
    c = TestClient(create_app(registry=Registry()))
    # add
    r = c.post("/agents", json={"name": "x", "provider": "openai", "model": "gpt-4o-mini"})
    assert r.status_code == 201 and r.json()["name"] == "x"
    assert [a["name"] for a in c.get("/agents").json()] == ["x"]
    # add duplicado -> 400
    assert c.post("/agents", json={"name": "x", "provider": "openai"}).status_code == 400
    # patch (toggle enabled)
    p = c.patch("/agents/x", json={"enabled": False})
    assert p.status_code == 200 and p.json()["enabled"] is False
    # delete
    assert c.delete("/agents/x").status_code == 200
    assert c.get("/agents").json() == []
    assert c.delete("/agents/x").status_code == 404


def test_add_agent_unknown_provider():
    c = TestClient(create_app(registry=Registry()))
    assert c.post("/agents", json={"name": "y", "provider": "nope"}).status_code == 400


def test_set_key_in_memory_reflects_in_providers():
    # sin claves inyectadas: modo runtime
    c = TestClient(create_app(registry=_reg(), client=mock_api.make_client()))
    before = {p["provider"]: p["key_present"] for p in c.get("/providers").json()}
    assert before["openai"] in (True, False)  # depende del entorno
    c.post("/keys", json={"provider": "openai", "key": "sk-runtime"})
    after = {p["provider"]: p["key_present"] for p in c.get("/providers").json()}
    assert after["openai"] is True


def test_set_key_disabled_when_keys_injected():
    c = TestClient(create_app(registry=_reg(), keys=KEYS, client=mock_api.make_client()))
    assert c.post("/keys", json={"provider": "openai", "key": "x"}).status_code == 409


def test_set_key_unknown_provider():
    c = TestClient(create_app(registry=_reg()))
    assert c.post("/keys", json={"provider": "nope", "key": "x"}).status_code == 400


# --- modos multiagente (sequential/debate via MultiAgent) ------------------
def _reg2():
    return Registry([
        Agent(name="a-openai", provider="openai", model="gpt-4o-mini"),
        Agent(name="a-anthropic", provider="anthropic", model="claude-sonnet-4-6"),
    ])


def test_run_sequential_mode():
    c = TestClient(create_app(registry=_reg2(), keys=KEYS, client=mock_api.make_client()))
    r = c.post("/run", json={"prompt": "refactor", "mode": "sequential"})
    body = r.json()
    assert r.status_code == 200 and body["mode"] == "sequential"
    assert len(body["runs"]) == 2 and body["total_cost_usd"] > 0


def test_run_debate_mode():
    c = TestClient(create_app(registry=_reg2(), keys=KEYS, client=mock_api.make_client()))
    body = c.post("/run", json={"prompt": "disena", "mode": "debate"}).json()
    assert body["mode"] == "debate" and len(body["runs"]) == 2


def test_run_invalid_mode():
    c = TestClient(create_app(registry=_reg2(), keys=KEYS, client=mock_api.make_client()))
    assert c.post("/run", json={"prompt": "x", "mode": "nope"}).status_code == 400
