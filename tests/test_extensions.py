"""Tests del SDK de extensiones (Fase 6): provider/agent/workflow + plugins."""

import asyncio
import sys
from pathlib import Path

import pytest

from enjambre import extensions as ext
from enjambre.orchestrator import Orchestrator
from enjambre.providers import (PROVIDERS, BaseProvider, ValidationResult,
                                build_provider, unregister_provider)
from enjambre.registry import Registry

# Hace importable examples/ (plugin de ejemplo) sin instalar.
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


class _Dummy(BaseProvider):
    name = "dummy"

    async def validate_key(self):
        return ValidationResult(True, "")

    async def chat(self, messages, *, model=None, max_tokens=1024):
        from enjambre.providers import ProviderResult
        return ProviderResult(self.name, model or "d", text="ok")


@pytest.fixture(autouse=True)
def _clean():
    """Aisla cada test: limpia templates y proveedores de prueba al terminar."""
    ext.clear_templates()
    yield
    ext.clear_templates()
    for name in ("dummy", "echo", "tomo"):
        unregister_provider(name)


# --- Provider SDK ----------------------------------------------------------
def test_register_provider_and_build():
    ext.register_provider("dummy", _Dummy)
    assert "dummy" in PROVIDERS
    assert isinstance(build_provider("dummy", "k"), _Dummy)


def test_register_provider_rejects_non_baseprovider():
    with pytest.raises(TypeError):
        ext.register_provider("bad", dict)  # no hereda de BaseProvider


def test_register_provider_rejects_duplicate_without_overwrite():
    ext.register_provider("dummy", _Dummy)
    with pytest.raises(ValueError):
        ext.register_provider("dummy", _Dummy)
    ext.register_provider("dummy", _Dummy, overwrite=True)  # ok con overwrite


# --- Templates -------------------------------------------------------------
def test_agent_template_builds_valid_agent():
    ext.register_provider("dummy", _Dummy)
    tpl = ext.AgentTemplate(name="t", provider="dummy", role="architect")
    agent = tpl.build(name="a1")
    assert agent.name == "a1" and agent.role == "architect"
    Registry([agent])  # el registro lo acepta sin lanzar


def test_workflow_template_validates_mode():
    with pytest.raises(ValueError):
        ext.WorkflowTemplate(name="w", mode="inexistente")  # type: ignore[arg-type]
    ok = ext.WorkflowTemplate(name="w", mode="vote")
    ext.register_workflow_template(ok)
    assert "w" in ext.list_workflow_templates()


# --- Plugins ---------------------------------------------------------------
def test_register_plugin_runs_hook():
    class P:
        name = "tomo"

        def register(self, reg):
            reg.register_provider("tomo", _Dummy)
            reg.register_agent_template(ext.AgentTemplate("ta", provider="tomo"))
            reg.register_workflow_template(ext.WorkflowTemplate("tw", mode="parallel"))

    ext.register_plugin(P())
    assert "tomo" in PROVIDERS
    assert "ta" in ext.list_agent_templates()
    assert "tw" in ext.list_workflow_templates()


def test_load_plugins_tolerant_when_none():
    # Grupo inexistente -> no falla, lista vacia.
    assert ext.load_plugins(group="enjambre.plugins.noexiste") == []


# --- Plugin de ejemplo end-to-end -----------------------------------------
def test_example_plugin_runs_through_orchestrator():
    from examples.echo_plugin import EchoPlugin

    ext.register_plugin(EchoPlugin())
    agent = ext.get_agent_template("echo-builder").build(name="e1")
    orch = Orchestrator(Registry([agent]), keys={"echo": "x"})
    report = asyncio.run(orch.run("hola mundo"))
    assert report.runs and report.runs[0].result.ok
    assert "echo: hola mundo" in report.runs[0].result.text
