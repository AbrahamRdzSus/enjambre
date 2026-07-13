"""Tests de agregacion de uso (enjambre.stats). Sin red."""

import asyncio

import pytest

import mock_api
from enjambre import sessions, stats
from enjambre.multiagent import MultiAgent
from enjambre.orchestrator import Orchestrator
from enjambre.registry import Agent, Registry

KEYS = {"openai": "ok", "anthropic": "ok", "google": "ok", "xai": "ok"}


def _registry():
    return Registry([
        Agent(name="a-openai", provider="openai", model="gpt-4o-mini"),
        Agent(name="a-anthropic", provider="anthropic", model="claude-sonnet-4-6"),
    ])


def _orchestration():
    orch = Orchestrator(_registry(), keys=KEYS, client=mock_api.make_client())
    return asyncio.run(orch.run("tarea"))


def test_aggregate_orchestration_tokens_and_cost(tmp_path):
    sessions.save(_orchestration(), store=tmp_path)
    st = stats.from_store(store=tmp_path)
    assert st.sessions == 1
    # dos proveedores, un run cada uno
    assert set(st.by_provider) == {"openai", "anthropic"}
    assert all(t.runs == 1 and t.ok == 1 for t in st.by_provider.values())
    # el mock devuelve usage > 0 -> tokens y costo agregados
    assert st.total_tokens > 0
    assert st.total_cost_usd > 0


def test_aggregate_by_agent(tmp_path):
    sessions.save(_orchestration(), store=tmp_path)
    st = stats.from_store(store=tmp_path)
    assert set(st.by_agent) == {"a-openai", "a-anthropic"}


def test_timeline_accumulates_by_day(tmp_path):
    sessions.save(_orchestration(), store=tmp_path, session_id="20260101-000000-aaaaaa")
    sessions.save(_orchestration(), store=tmp_path, session_id="20260101-120000-bbbbbb")
    st = stats.from_store(store=tmp_path)
    # ambas sesiones caen en el mismo dia ISO del created_at real
    assert len(st.by_day) >= 1
    assert sum(st.by_day.values()) == st.total_cost_usd


def test_multiagent_counts_cost_and_tokens(tmp_path):
    """Antes esta prueba afirmaba `total_tokens == 0` ("Candidate no guarda usage").

    Era el bug consagrado como contrato: /stats agregaba el COSTO de los runs
    multiagente pero cero tokens, asi que el cockpit mostraba un costo sin los
    tokens que lo produjeron. Candidate ya arrastra usage/latency del
    ProviderResult.
    """
    ma = MultiAgent(_registry(), keys=KEYS, client=mock_api.make_client())
    report = asyncio.run(ma.run("parallel", "disena", review=False))
    sessions.save(report, store=tmp_path)
    st = stats.from_store(store=tmp_path)
    assert st.sessions == 1
    assert st.total_cost_usd > 0
    assert st.total_tokens > 0


def _registry_with_architect():
    return Registry([
        Agent(name="builder", provider="openai", model="gpt-4o-mini"),
        Agent(name="arch", provider="anthropic", model="claude-sonnet-4-6",
              role="architect"),
    ])


def test_multiagent_counts_architect_cost(tmp_path):
    """P2-1: el pase del arquitecto (verdicts) tiene costo propio (una corrida por
    candidato). Antes no se agregaba y /stats subestimaba el costo de vote/debate."""
    ma = MultiAgent(_registry_with_architect(), keys=KEYS,
                    client=mock_api.make_client())
    report = asyncio.run(ma.run("vote", "decide esto", review=True))
    assert report.verdicts, "vote debe producir veredictos del arquitecto"
    assert all(v.provider == "anthropic" for v in report.verdicts)
    assert all(v.cost_usd > 0 for v in report.verdicts)

    sessions.save(report, store=tmp_path)
    st = stats.from_store(store=tmp_path)
    # el provider del arquitecto aparece con su costo en /stats
    assert "anthropic" in st.by_provider
    assert st.by_provider["anthropic"].cost_usd > 0
    assert st.total_cost_usd == pytest.approx(report.total_cost_usd)


def test_empty_store(tmp_path):
    st = stats.from_store(store=tmp_path / "vacio")
    assert st.sessions == 0 and st.by_provider == {} and st.total_cost_usd == 0.0
