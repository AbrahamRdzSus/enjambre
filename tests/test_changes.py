"""Tests de cambios: diff + safety gate de aplicacion."""

from pathlib import Path

import pytest

from enjambre.changes import ApprovalRequired, Change, ChangeSet


def test_diff_against_existing_file(tmp_path: Path):
    f = tmp_path / "a.py"
    f.write_text("uno\ndos\n", encoding="utf-8")
    diff = Change("a.py", "uno\nDOS\n").diff(tmp_path)
    assert "-dos" in diff and "+DOS" in diff


def test_apply_requires_approval(tmp_path: Path):
    cs = ChangeSet([Change("nuevo.py", "x = 1\n")])
    with pytest.raises(ApprovalRequired):
        cs.apply(tmp_path, approved=False)
    assert not (tmp_path / "nuevo.py").exists()  # no escribio nada


def test_apply_writes_when_approved(tmp_path: Path):
    cs = ChangeSet([Change("nuevo.py", "x = 1\n")])
    report = cs.apply(tmp_path, approved=True)
    assert report.ok
    assert report.written == ["nuevo.py"]
    assert (tmp_path / "nuevo.py").read_text(encoding="utf-8") == "x = 1\n"


def test_apply_rejects_path_traversal(tmp_path: Path):
    cs = ChangeSet([Change("../escape.py", "x")])
    report = cs.apply(tmp_path, approved=True)
    assert not report.ok
    assert not (tmp_path.parent / "escape.py").exists()


def test_apply_rejects_blocked_file(tmp_path: Path):
    cs = ChangeSet([Change(".env", "SECRET=1")])
    report = cs.apply(tmp_path, approved=True)
    assert not report.ok
    assert "sensible" in report.rejected[0][1]


def test_apply_rejects_secret_in_content(tmp_path: Path):
    cs = ChangeSet([Change("cfg.py", "K='sk-proj-ABCDEFGHIJKLMNOPQRSTUVWX1234'")])
    report = cs.apply(tmp_path, approved=True)
    assert not report.ok
    assert "secretos" in report.rejected[0][1]


def test_apply_is_atomic_on_rejection(tmp_path: Path):
    # Un cambio valido + uno invalido: no se escribe NADA.
    cs = ChangeSet([
        Change("ok.py", "x = 1\n"),
        Change(".env", "SECRET=1"),
    ])
    report = cs.apply(tmp_path, approved=True)
    assert not report.ok
    assert not (tmp_path / "ok.py").exists()


def test_preview_returns_diffs(tmp_path: Path):
    (tmp_path / "a.py").write_text("viejo\n", encoding="utf-8")
    cs = ChangeSet([Change("a.py", "nuevo\n")])
    preview = cs.preview(tmp_path)
    assert "a.py" in preview
    assert "+nuevo" in preview["a.py"]
