"""Tests de la entidad proyecto (enjambre.projects)."""

import pytest

from enjambre import projects


def test_add_list_remove(tmp_path):
    store = tmp_path / "projects.json"
    p = projects.add_project("E-Commerce Nexus", str(tmp_path), store=store)
    assert p.id and p.name == "E-Commerce Nexus"
    items = projects.list_projects(store=store)
    assert [x.name for x in items] == ["E-Commerce Nexus"]
    assert projects.remove_project(p.id, store=store) is True
    assert projects.list_projects(store=store) == []
    assert projects.remove_project(p.id, store=store) is False


def test_name_required(tmp_path):
    with pytest.raises(ValueError):
        projects.add_project("  ", ".", store=tmp_path / "p.json")


def test_empty_store(tmp_path):
    assert projects.list_projects(store=tmp_path / "nope.json") == []
