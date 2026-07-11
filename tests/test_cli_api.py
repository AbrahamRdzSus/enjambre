"""Tests de contrato de los endpoints /cli/* del sidecar (activos solo con flag).
Mockea cli_agent.run_cli_task; no lanza `claude` real ni crea worktrees git."""

import pytest

pytest.importorskip("fastapi")

from fastapi.testclient import TestClient  # noqa: E402

import mock_api  # noqa: E402
from enjambre import cli_agent  # noqa: E402
from enjambre.api import create_app  # noqa: E402
from enjambre.registry import Agent, Registry  # noqa: E402

KEYS = {"openai": "ok", "anthropic": "ok", "google": "ok", "xai": "ok"}


def _app(cli_agents=True):
    reg = Registry([Agent(name="a-openai", provider="openai", model="gpt-4o-mini")])
    return create_app(registry=reg, keys=KEYS, client=mock_api.make_client(),
                      cli_agents=cli_agents)


def _project(tmp_path, monkeypatch):
    monkeypatch.setenv("ENJAMBRE_DATA_DIR", str(tmp_path))
    from enjambre import projects
    return projects.add_project("demo", str(tmp_path))


def test_cli_endpoints_absent_without_flag(tmp_path, monkeypatch):
    proj = _project(tmp_path, monkeypatch)
    c = TestClient(_app(cli_agents=False))
    r = c.post("/cli/run", json={"project_id": proj.id, "prompt": "x"})
    assert r.status_code == 404  # ruta no registrada sin el flag


def test_cli_run_status_and_approve(tmp_path, monkeypatch):
    proj = _project(tmp_path, monkeypatch)

    # worktree simulado con un archivo que la CLI "creo"
    wt = tmp_path / "wt"
    wt.mkdir()
    (wt / "nuevo.py").write_text("print('hola')\n", encoding="utf-8")

    async def fake_run(prompt, project_root, **kw):
        return cli_agent.CliTaskResult(
            ok=True, diff="+print('hola')", changed_files=["nuevo.py"],
            log='{"result":"ok"}', worktree_path=str(wt), branch="enjambre/cli/x")

    monkeypatch.setattr(cli_agent, "run_cli_task", fake_run)
    monkeypatch.setattr(cli_agent, "cleanup_worktree", lambda *a, **k: None)

    c = TestClient(_app())

    run = c.post("/cli/run", json={"project_id": proj.id, "prompt": "hola"}).json()
    assert run["ok"] and run["changed_files"] == ["nuevo.py"] and run["run_id"]

    # el panel "Actividad por modelo" recibe un agent.output tipo tool_call con el
    # run_id (para pedir el diff y aprobar desde el dock) y los archivos tocados.
    tool = [e for e in c.get("/logs").json()
            if e["event"] == "agent.output" and e["fields"].get("kind") == "tool_call"]
    assert len(tool) == 1
    assert tool[0]["fields"]["run_id"] == run["run_id"]
    assert tool[0]["fields"]["changed_files"] == ["nuevo.py"]

    st = c.get(f"/cli/{run['run_id']}").json()
    assert st["status"] == "done" and st["ok"]

    rep = c.post(f"/cli/{run['run_id']}/approve", json={"approved": True}).json()
    assert rep["ok"] and rep["written"] == ["nuevo.py"]
    # aplicado al proyecto real
    assert (tmp_path / "nuevo.py").read_text(encoding="utf-8") == "print('hola')\n"
    # run consumido: segundo poll da 404
    assert c.get(f"/cli/{run['run_id']}").status_code == 404


def test_cli_run_unknown_project(tmp_path, monkeypatch):
    _project(tmp_path, monkeypatch)
    c = TestClient(_app())
    r = c.post("/cli/run", json={"project_id": "nope", "prompt": "x"})
    assert r.status_code == 404


def test_cli_approve_false_does_not_write(tmp_path, monkeypatch):
    proj = _project(tmp_path, monkeypatch)
    wt = tmp_path / "wt2"
    wt.mkdir()
    (wt / "x.py").write_text("y = 2\n", encoding="utf-8")

    async def fake_run(prompt, project_root, **kw):
        return cli_agent.CliTaskResult(ok=True, changed_files=["x.py"],
                                       worktree_path=str(wt), branch="b")

    monkeypatch.setattr(cli_agent, "run_cli_task", fake_run)
    monkeypatch.setattr(cli_agent, "cleanup_worktree", lambda *a, **k: None)

    c = TestClient(_app())
    run = c.post("/cli/run", json={"project_id": proj.id, "prompt": "x"}).json()
    rep = c.post(f"/cli/{run['run_id']}/approve", json={"approved": False}).json()
    assert rep["ok"] and rep["written"] == []
    assert not (tmp_path / "x.py").exists()  # proyecto real intacto
