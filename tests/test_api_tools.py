"""Tests del sidecar para tool calling (/tools/*), gate ENJAMBRE_TOOLS."""

import json

import pytest

pytest.importorskip("fastapi")

import httpx  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from enjambre.api import create_app  # noqa: E402
from enjambre.registry import Agent, Registry  # noqa: E402

KEYS = {"groq": "ok"}


def _reg() -> Registry:
    return Registry([Agent("g", "groq", "llama-3.3-70b-versatile")])


def _seq_client(responses: list[dict]) -> httpx.AsyncClient:
    calls = {"i": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        i = calls["i"]
        calls["i"] = i + 1
        return httpx.Response(200, json=responses[min(i, len(responses) - 1)])

    return httpx.AsyncClient(transport=httpx.MockTransport(handler))


def _tool_call(call_id: str, name: str, arguments: dict) -> dict:
    return {"choices": [{"message": {"content": None, "tool_calls": [{
        "id": call_id, "type": "function",
        "function": {"name": name, "arguments": json.dumps(arguments)}}]},
        "finish_reason": "tool_calls"}],
        "usage": {"prompt_tokens": 5, "completion_tokens": 3}}


def _text(text: str) -> dict:
    return {"choices": [{"message": {"content": text}, "finish_reason": "stop"}],
            "usage": {"prompt_tokens": 4, "completion_tokens": 2}}


def _app(tmp_path, responses, monkeypatch):
    monkeypatch.setenv("ENJAMBRE_DATA_DIR", str(tmp_path / "data"))
    app = create_app(registry=_reg(), keys=KEYS,
                     client=_seq_client(responses), tool_calling=True)
    c = TestClient(app)
    pid = c.post("/projects", json={"name": "P", "root": str(tmp_path)}).json()["id"]
    return c, pid


def test_tools_disabled_by_default(tmp_path, monkeypatch):
    monkeypatch.setenv("ENJAMBRE_DATA_DIR", str(tmp_path / "data"))
    c = TestClient(create_app(registry=_reg(), keys=KEYS))
    assert c.post("/tools/run", json={"project_id": "x", "prompt": "hola"}).status_code == 404


def test_tools_write_pause_approve_flow(tmp_path, monkeypatch):
    responses = [
        _tool_call("c1", "write_file", {"path": "nuevo.py", "content": "x = 1\n"}),
        _text("listo, cree el archivo"),
    ]
    c, pid = _app(tmp_path, responses, monkeypatch)

    r = c.post("/tools/run", json={"project_id": pid, "prompt": "crea nuevo.py"})
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "awaiting_approval"
    assert len(data["pending"]) == 1
    pc = data["pending"][0]
    assert pc["name"] == "write_file" and pc["danger"] == "write"
    assert "+x = 1" in pc["preview"]
    assert not (tmp_path / "nuevo.py").exists()  # aun no escribe
    run_id = data["run_id"]

    # estado consultable
    assert c.get(f"/tools/{run_id}").json()["status"] == "awaiting_approval"

    r2 = c.post(f"/tools/{run_id}/approve",
                json={"decisions": [{"call_id": pc["call_id"], "approved": True}]})
    assert r2.status_code == 200
    fin = r2.json()
    assert fin["status"] == "done"
    assert fin["text"] == "listo, cree el archivo"
    assert (tmp_path / "nuevo.py").read_text(encoding="utf-8") == "x = 1\n"


def test_tools_reject_does_not_write(tmp_path, monkeypatch):
    responses = [
        _tool_call("c1", "write_file", {"path": "nuevo.py", "content": "x = 1\n"}),
        _text("ok, no lo hice"),
    ]
    c, pid = _app(tmp_path, responses, monkeypatch)
    run_id = c.post("/tools/run",
                    json={"project_id": pid, "prompt": "crea"}).json()["run_id"]
    r = c.post(f"/tools/{run_id}/approve",
               json={"decisions": [{"call_id": "c1", "approved": False}]})
    assert r.json()["status"] == "done"
    assert not (tmp_path / "nuevo.py").exists()


def test_tools_auto_read_no_pause(tmp_path, monkeypatch):
    (tmp_path / "main.py").write_text("print('hola')\n", encoding="utf-8")
    responses = [
        _tool_call("c1", "read_file", {"path": "main.py"}),
        _text("imprime hola"),
    ]
    c, pid = _app(tmp_path, responses, monkeypatch)
    data = c.post("/tools/run",
                  json={"project_id": pid, "prompt": "que hace main.py"}).json()
    assert data["status"] == "done"        # lectura auto, sin gate humano
    assert data["text"] == "imprime hola"
    assert data["pending"] == []


def test_tools_run_unknown_project(tmp_path, monkeypatch):
    c, _ = _app(tmp_path, [_text("hola")], monkeypatch)
    assert c.post("/tools/run",
                  json={"project_id": "noexiste", "prompt": "hi"}).status_code == 404
