"""Tests de la capa de politica/seguridad."""

import pytest

from enjambre import policy


def test_scan_detects_openai_key():
    text = "mi clave es sk-proj-ABCDEFGHIJKLMNOPQRSTUVWX1234 ok"
    res = policy.scan_secrets(text)
    assert not res.clean
    assert any(f.kind == "openai_key" for f in res.findings)


def test_scan_detects_private_key_block():
    res = policy.scan_secrets("-----BEGIN RSA PRIVATE KEY-----")
    assert not res.clean


def test_clean_text():
    assert policy.scan_secrets("solo un prompt normal de codigo").clean


def test_redact_replaces_secret():
    text = "token ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 fin"
    redacted = policy.redact_secrets(text)
    assert "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" not in redacted
    assert "[REDACTED:github_token]" in redacted


def test_is_blocked_file():
    assert policy.is_blocked_file(".env")
    assert policy.is_blocked_file("config/.env.local")
    assert policy.is_blocked_file("server/id_rsa")
    assert not policy.is_blocked_file("src/app.py")


def test_check_mode_blocks_disallowed():
    with pytest.raises(PermissionError):
        policy.check_mode("distillation")


def test_check_mode_allows_normal():
    policy.check_mode("parallel")  # no lanza
