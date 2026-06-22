"""Tests del dir de datos del usuario (enjambre.paths) + defaults del registro."""

from enjambre import paths
from enjambre.registry import Agent, Registry


def test_data_dir_env_override(tmp_path, monkeypatch):
    monkeypatch.setenv("ENJAMBRE_DATA_DIR", str(tmp_path / "d"))
    d = paths.data_dir()
    assert d == (tmp_path / "d") and d.is_dir()


def test_registry_default_agents_on_fresh(tmp_path, monkeypatch):
    monkeypatch.setenv("ENJAMBRE_DATA_DIR", str(tmp_path))
    reg = Registry.load()  # sin archivo -> agentes por defecto
    names = {a.name for a in reg.agents}
    assert {"claude-builder", "gpt-builder", "gemini-builder", "grok-builder"} <= names


def test_registry_roundtrip_in_data_dir(tmp_path, monkeypatch):
    monkeypatch.setenv("ENJAMBRE_DATA_DIR", str(tmp_path))
    Registry([Agent("solo", "openai")]).save()
    assert (tmp_path / "registered.json").exists()
    assert [a.name for a in Registry.load().agents] == ["solo"]
