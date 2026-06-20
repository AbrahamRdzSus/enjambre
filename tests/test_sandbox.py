"""Tests del sandbox runner (Fase 5). Cross-platform via sys.executable."""

import shutil
import sys

import pytest

from enjambre.changes import ApprovalRequired
from enjambre.sandbox import Sandbox

PY = sys.executable
HAS_DOCKER = shutil.which("docker") is not None


def _sb(tmp_path):
    return Sandbox(tmp_path)


def test_dry_run_does_not_execute(tmp_path):
    sb = _sb(tmp_path)
    res = sb.run([PY, "-c", "print('x')"], mode="dry")
    assert res.exit_code is None and res.blocked is None
    assert res.stdout == ""
    assert sb.audit[-1].outcome == "dry"


def test_real_execution_requires_approval(tmp_path):
    with pytest.raises(ApprovalRequired):
        _sb(tmp_path).run([PY, "-c", "print(1)"], mode="host", approved=False)


def test_dangerous_never_runs_even_approved(tmp_path):
    sb = _sb(tmp_path)
    res = sb.run(["rm", "-rf", "/"], mode="host", approved=True)
    assert res.blocked and res.exit_code is None
    assert sb.audit[-1].outcome.startswith("blocked:")


def test_host_run_captures_stdout_and_audits(tmp_path):
    sb = _sb(tmp_path)
    res = sb.run([PY, "-c", "print('hola-enjambre')"], mode="host", approved=True)
    assert res.ok and res.exit_code == 0
    assert "hola-enjambre" in res.stdout
    assert sb.audit[-1].outcome == "exit:0"


def test_host_run_nonzero_exit(tmp_path):
    res = _sb(tmp_path).run([PY, "-c", "import sys; sys.exit(3)"],
                            mode="host", approved=True)
    assert not res.ok and res.exit_code == 3


def test_timeout_is_marked_not_hang(tmp_path):
    res = _sb(tmp_path).run([PY, "-c", "import time; time.sleep(5)"],
                            mode="host", approved=True, timeout=0.5)
    assert res.timed_out and not res.ok


@pytest.mark.skipif(HAS_DOCKER, reason="docker presente: no se prueba la rama de ausencia")
def test_docker_unavailable_blocks(tmp_path):
    res = _sb(tmp_path).run([PY, "-c", "print(1)"], mode="docker", approved=True)
    assert res.blocked and "docker" in res.blocked.lower()
    assert res.exit_code is None


def test_run_tests_dry_by_default(tmp_path):
    sb = _sb(tmp_path)
    res = sb.run_tests()
    assert res.argv == ["pytest", "-q"] and res.mode == "dry"
    assert res.exit_code is None
