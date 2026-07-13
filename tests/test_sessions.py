"""Tests de persistencia de sesiones (enjambre.sessions). Sin red."""

import asyncio

import pytest

import mock_api
from enjambre import sessions
from enjambre.multiagent import MultiAgent
from enjambre.orchestrator import Orchestrator
from enjambre.registry import Agent, Registry

KEYS = {"openai": "ok", "anthropic": "ok", "google": "ok", "xai": "ok"}


def _registry():
    return Registry([
        Agent(name="a-openai", provider="openai", model="gpt-4o-mini"),
        Agent(name="a-anthropic", provider="anthropic", model="claude-sonnet-4-6"),
    ])


def _run_orchestration():
    orch = Orchestrator(_registry(), keys=KEYS, client=mock_api.make_client())
    return asyncio.run(orch.run("refactor esto"))


def test_save_and_load_orchestration(tmp_path):
    report = _run_orchestration()
    sid = sessions.save(report, store=tmp_path)
    s = sessions.load(sid, store=tmp_path)
    assert s.kind == "orchestration"
    assert s.prompt == "refactor esto"
    assert len(s.data["runs"]) == 2


def test_rebuild_orchestration_lossless(tmp_path):
    report = _run_orchestration()
    sid = sessions.save(report, store=tmp_path)
    rebuilt = sessions.rebuild_orchestration(sessions.load(sid, store=tmp_path).data)
    assert rebuilt.prompt == report.prompt
    assert {r.agent for r in rebuilt.runs} == {r.agent for r in report.runs}
    assert rebuilt.total_cost_usd == pytest.approx(report.total_cost_usd)


def test_save_idempotent_by_id_checkpoint(tmp_path):
    report = _run_orchestration()
    sid = sessions.save(report, store=tmp_path, session_id="fixo")
    sessions.save(report, store=tmp_path, session_id="fixo")  # sobrescribe
    assert sid == "fixo"
    assert len(list(tmp_path.glob("*.json"))) == 1


def test_list_sessions_newest_first(tmp_path):
    a = sessions.save(_run_orchestration(), store=tmp_path, session_id="20260101-000000-aaaaaa")
    b = sessions.save(_run_orchestration(), store=tmp_path, session_id="20260202-000000-bbbbbb")
    ids = [s.id for s in sessions.list_sessions(store=tmp_path)]
    assert ids == [b, a]


def test_list_empty_store(tmp_path):
    assert sessions.list_sessions(store=tmp_path / "nope") == []


def test_load_missing_raises(tmp_path):
    with pytest.raises(FileNotFoundError):
        sessions.load("no-existe", store=tmp_path)


def test_save_and_rebuild_multiagent(tmp_path):
    ma = MultiAgent(_registry(), keys=KEYS, client=mock_api.make_client())
    report = asyncio.run(ma.run("parallel", "disena esto", review=False))
    sid = sessions.save(report, store=tmp_path)
    loaded = sessions.load(sid, store=tmp_path)
    assert loaded.kind == "multiagent"
    rebuilt = sessions.rebuild_multiagent(loaded.data)
    assert rebuilt.mode == report.mode
    assert len(rebuilt.final) == len(report.final)


def test_save_redacts_secret_in_prompt(tmp_path):
    """P1-7: el prompt se enviaba redactado a los proveedores pero se PERSISTIA en
    claro; una API key pegada en el prompt quedaba en disco."""
    from enjambre.orchestrator import OrchestrationReport
    rep = OrchestrationReport(
        prompt="usa la clave sk-ant-ABCDEFGHIJKLMNOPQRSTUVWX y corre")
    sid = sessions.save(rep, store=tmp_path)
    raw = (tmp_path / f"{sid}.json").read_text(encoding="utf-8")
    assert "sk-ant-ABCDEFGHIJKLMNOPQRSTUVWX" not in raw  # el secreto no toca el disco
    assert "[REDACTED:" in raw
    # el JSON sigue siendo valido tras redactar (los reemplazos no rompen comillas)
    s = sessions.load(sid, store=tmp_path)
    assert "[REDACTED:" in s.prompt


def test_save_rejects_unknown_type(tmp_path):
    with pytest.raises(TypeError):
        sessions.save({"not": "a report"}, store=tmp_path)
