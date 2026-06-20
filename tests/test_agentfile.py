"""Tests del parser propio de enjambre.yaml (enjambre.agentfile)."""

import pytest

from enjambre import agentfile
from enjambre.agentfile import ConfigError

VALID = """\
# config de ejemplo
defaults:
  max_tokens: 1024
  mode: parallel

agents:
  - name: claude-builder
    provider: anthropic
    model: claude-sonnet-4-6
    role: builder
    enabled: true
    system_prompt: "Eres un dev backend. # no es comentario dentro de comillas"
  - name: gpt-arch
    provider: openai
    role: architect
    enabled: false
"""


def test_parse_valid():
    cfg = agentfile.parse(VALID)
    assert cfg.defaults == {"max_tokens": 1024, "mode": "parallel"}
    assert [a.name for a in cfg.agents] == ["claude-builder", "gpt-arch"]
    a0 = cfg.agents[0]
    assert a0.provider == "anthropic" and a0.role == "builder" and a0.enabled is True
    # el '#' dentro de comillas NO se trata como comentario
    assert "# no es comentario" in a0.system_prompt
    # bool falso parseado
    assert cfg.agents[1].enabled is False


def test_to_registry_roundtrips_enabled():
    reg = agentfile.parse(VALID).to_registry()
    assert {a.name for a in reg.enabled()} == {"claude-builder"}


def test_inline_comment_stripped_on_bare_value():
    cfg = agentfile.parse(
        "agents:\n  - name: a  # el agente\n    provider: openai\n")
    assert cfg.agents[0].name == "a"


def test_unknown_provider_rejected():
    with pytest.raises(ConfigError):
        agentfile.parse("agents:\n  - name: x\n    provider: noexiste\n")


def test_unknown_field_rejected_with_line():
    with pytest.raises(ConfigError) as e:
        agentfile.parse("agents:\n  - name: x\n    provider: openai\n    foo: bar\n")
    assert "linea 4" in str(e.value)


def test_unknown_section_rejected():
    with pytest.raises(ConfigError):
        agentfile.parse("otra:\n  x: 1\n")


def test_key_without_item_dash_rejected():
    with pytest.raises(ConfigError):
        agentfile.parse("agents:\n    name: x\n")


def test_agent_requires_name_and_provider():
    with pytest.raises(ConfigError):
        agentfile.parse("agents:\n  - role: builder\n")


def test_content_outside_section_rejected():
    with pytest.raises(ConfigError):
        agentfile.parse("  suelto: 1\n")


def test_empty_config():
    cfg = agentfile.parse("# vacio\n")
    assert cfg.agents == [] and cfg.defaults == {}


def test_load_from_file(tmp_path):
    p = tmp_path / "enjambre.yaml"
    p.write_text(VALID, encoding="utf-8")
    cfg = agentfile.load_config(p)
    assert len(cfg.agents) == 2
