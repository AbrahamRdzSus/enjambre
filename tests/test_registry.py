"""Tests del registro de agentes (UTF-8 + recuperacion del UTF-16 heredado)."""

from pathlib import Path

import pytest

from enjambre.registry import Agent, Registry


def test_save_load_roundtrip_utf8(tmp_path: Path):
    reg = Registry()
    reg.add(Agent(name="a1", provider="openai", model="gpt-4o-mini"))
    p = tmp_path / "registered.json"
    reg.save(p)
    raw = p.read_bytes()
    assert raw[:2] not in (b"\xff\xfe", b"\xfe\xff")  # no UTF-16 BOM
    again = Registry.load(p)
    assert [a.name for a in again.agents] == ["a1"]


def test_load_recovers_legacy_utf16(tmp_path: Path):
    p = tmp_path / "legacy.json"
    payload = '{"agents":[{"name":"x","provider":"anthropic"}]}'
    p.write_bytes(payload.encode("utf-16"))  # archivo heredado con BOM
    reg = Registry.load(p)
    assert [a.name for a in reg.agents] == ["x"]


def test_load_skips_empty_legacy_entries(tmp_path: Path):
    p = tmp_path / "old.json"
    p.write_text('{"Ruta":"","Nombre":"","Tipo":""}', encoding="utf-8")
    reg = Registry.load(p)
    assert reg.agents == []


def test_add_rejects_duplicate(tmp_path: Path):
    reg = Registry()
    reg.add(Agent(name="dup", provider="openai"))
    with pytest.raises(ValueError):
        reg.add(Agent(name="dup", provider="openai"))


def test_add_rejects_unknown_provider():
    reg = Registry()
    with pytest.raises(ValueError):
        reg.add(Agent(name="bad", provider="noexiste"))


def test_enabled_filter():
    reg = Registry([
        Agent(name="on", provider="openai", enabled=True),
        Agent(name="off", provider="openai", enabled=False),
    ])
    assert [a.name for a in reg.enabled()] == ["on"]


def test_repo_seed_file_loads():
    # El archivo versionado debe cargar limpio (regresion del UTF-16 corrupto).
    reg = Registry.load(Path("agents/registered.json"))
    assert len(reg.agents) >= 1
    assert all(a.provider for a in reg.agents)
