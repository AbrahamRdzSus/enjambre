"""Tests de gitops (Fase 4): gating de aprobacion + branch/commit/push real."""

from pathlib import Path

import pytest

import git_helpers as gh
from enjambre.changes import ApprovalRequired, Change, ChangeSet
from enjambre.gitops import GitOps

pytestmark = pytest.mark.skipif(not gh.HAS_GIT, reason="git no disponible")


def test_read_ops_no_approval(tmp_path):
    work = gh.init_repo_with_origin(tmp_path)
    ops = GitOps(work)
    assert ops.is_repo()
    assert ops.current_branch() == "main"
    assert ops.has_changes() is False


def test_mutations_require_approval(tmp_path):
    work = gh.init_repo_with_origin(tmp_path)
    ops = GitOps(work)
    with pytest.raises(ApprovalRequired):
        ops.create_branch("feature/x", approved=False)
    with pytest.raises(ApprovalRequired):
        ops.commit("msg", approved=False)
    with pytest.raises(ApprovalRequired):
        ops.push(approved=False)
    # No se creo la rama: seguimos en main.
    assert ops.current_branch() == "main"


def test_branch_commit_push_roundtrip(tmp_path):
    work = gh.init_repo_with_origin(tmp_path)
    ops = GitOps(work)
    ops.create_branch("feature/x", approved=True)
    (work / "nuevo.txt").write_text("hola\n", encoding="utf-8")
    ops.stage(approved=True)
    sha = ops.commit("agrega nuevo", approved=True)
    assert sha and ops.current_branch() == "feature/x"
    ops.push(branch="feature/x", approved=True)
    # La rama existe en el remoto bare.
    assert "feature/x" in gh.run(work, "ls-remote", "--heads", "origin")


def test_worktree_requires_approval(tmp_path):
    work = gh.init_repo_with_origin(tmp_path)
    ops = GitOps(work)
    wt = tmp_path / "wt"
    with pytest.raises(ApprovalRequired):
        ops.create_worktree(wt, approved=False)
    with pytest.raises(ApprovalRequired):
        ops.remove_worktree(wt, approved=False)


def test_worktree_create_list_apply_remove(tmp_path):
    work = gh.init_repo_with_origin(tmp_path)
    ops = GitOps(work)

    # 1. Worktree aislado en rama nueva, sin tocar el working tree principal.
    path = ops.create_worktree(tmp_path / "cand-a", approved=True,
                               branch="cand-a")
    branches = {w.branch for w in ops.list_worktrees()}
    assert "cand-a" in branches
    assert ops.current_branch() == "main"  # el principal sigue intacto

    # 2. ChangeSet.apply escribe DENTRO del worktree (es un root valido).
    cs = ChangeSet([Change(path="nota.txt", new_content="hola worktree\n")])
    report = cs.apply(path, approved=True)
    assert report.ok and (Path(path) / "nota.txt").read_text() == "hola worktree\n"

    # 3. Limpieza (force porque tiene cambios sin commitear).
    ops.remove_worktree(path, approved=True, force=True)
    assert "cand-a" not in {w.path for w in ops.list_worktrees()}
