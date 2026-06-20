"""Tests de la CLI (enjambre.cli). Sin red: usa el transporte mock de los tests."""

import mock_api
from enjambre import cli
from enjambre.registry import Agent, Registry

KEYS = {"openai": "ok", "anthropic": "ok", "google": "ok", "xai": "ok"}


def _registry_two():
    return Registry([
        Agent(name="a-openai", provider="openai", model="gpt-4o-mini"),
        Agent(name="a-anthropic", provider="anthropic", model="claude-sonnet-4-6"),
    ])


def test_parser_requires_command():
    parser = cli.build_parser()
    # 'run' sin prompt o sin comando -> SystemExit (argparse)
    import pytest
    with pytest.raises(SystemExit):
        parser.parse_args([])


def test_cmd_agents_lists(capsys):
    rc = cli.cmd_agents(_registry_two())
    out = capsys.readouterr().out
    assert rc == 0
    assert "a-openai" in out and "a-anthropic" in out


def test_cmd_agents_empty(capsys):
    rc = cli.cmd_agents(Registry())
    assert rc == 0
    assert "sin agentes" in capsys.readouterr().out


def test_cmd_providers(capsys):
    rc = cli.cmd_providers(env={"OPENAI_API_KEY": "x"})
    out = capsys.readouterr().out
    assert rc == 0
    assert "openai" in out and "presente" in out and "falta" in out


def test_cmd_validate_ok(capsys):
    rc = cli.cmd_validate(_registry_two(), keys=KEYS, client=mock_api.make_client())
    out = capsys.readouterr().out
    assert rc == 0
    assert "OK" in out and "anthropic" in out


def test_cmd_validate_bad_key_returns_1(capsys):
    bad = {**KEYS, "openai": "BAD"}
    rc = cli.cmd_validate(_registry_two(), keys=bad, client=mock_api.make_client())
    assert rc == 1
    assert "FALLA" in capsys.readouterr().out


def test_cmd_run_side_by_side(capsys):
    rc = cli.cmd_run("refactor", _registry_two(), keys=KEYS,
                     client=mock_api.make_client())
    out = capsys.readouterr().out
    assert rc == 0
    assert "a-openai" in out and "a-anthropic" in out
    assert "Costo estimado total" in out


def test_cmd_run_subset(capsys):
    rc = cli.cmd_run("hola", _registry_two(), agents=["a-openai"], keys=KEYS,
                     client=mock_api.make_client())
    out = capsys.readouterr().out
    assert rc == 0
    assert "a-openai" in out and "a-anthropic" not in out


def test_cmd_run_blocks_secret_when_no_redact(capsys):
    rc = cli.cmd_run("clave sk-proj-ABCDEFGHIJKLMNOPQRSTUVWX1234", _registry_two(),
                     redact=False, keys=KEYS, client=mock_api.make_client())
    assert rc == 1
    assert "bloqueado" in capsys.readouterr().out
