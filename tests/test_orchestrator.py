"""Tests del orquestador paralelo (Fase 1, solo lectura)."""

import asyncio

import mock_api

from enjambre.orchestrator import Orchestrator
from enjambre.registry import Agent, Registry

KEYS = {"openai": "ok", "anthropic": "ok", "google": "ok", "xai": "ok"}


def _orch(registry):
    return Orchestrator(registry, keys=KEYS, client=mock_api.make_client())


def _registry_two():
    return Registry([
        Agent(name="a-openai", provider="openai", model="gpt-4o-mini"),
        Agent(name="a-anthropic", provider="anthropic", model="claude-sonnet-4-6"),
    ])


def test_parallel_run_side_by_side():
    orch = _orch(_registry_two())
    report = asyncio.run(orch.run("refactor this function"))
    assert len(report.runs) == 2
    assert {r.agent for r in report.runs} == {"a-openai", "a-anthropic"}
    assert all(r.result.ok for r in report.runs)
    assert report.total_cost_usd > 0


def test_run_redacts_secret_in_prompt():
    orch = _orch(_registry_two())
    prompt = "usa esta clave sk-proj-ABCDEFGHIJKLMNOPQRSTUVWX1234 y arregla"
    report = asyncio.run(orch.run(prompt))
    assert any("redactaron" in w for w in report.warnings)
    assert report.runs  # se ejecuto igual, pero con prompt redactado


def test_run_blocks_secret_when_redact_off():
    orch = _orch(_registry_two())
    prompt = "clave sk-proj-ABCDEFGHIJKLMNOPQRSTUVWX1234"
    report = asyncio.run(orch.run(prompt, redact=False))
    assert report.runs == []
    assert any("bloqueado" in w for w in report.warnings)


def test_select_subset_of_agents():
    orch = _orch(_registry_two())
    report = asyncio.run(orch.run("hola", agents=["a-openai"]))
    assert [r.agent for r in report.runs] == ["a-openai"]


def test_validate_keys():
    orch = _orch(_registry_two())
    results = asyncio.run(orch.validate_keys())
    assert results["openai"].ok and results["anthropic"].ok


def test_no_enabled_agents_warns():
    orch = _orch(Registry([Agent(name="off", provider="openai", enabled=False)]))
    report = asyncio.run(orch.run("hola"))
    assert report.runs == []
    assert report.warnings
