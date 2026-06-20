"""Tests del loop de cierre Fase 4: ChangeSet -> commit -> push -> PR.

GitHub se mockea con un doble que captura los argumentos (verifica redaccion del
token y el resumen). El push va a un bare local (sin red), como en test_gitops.
"""

import asyncio
from dataclasses import dataclass, field

import pytest

import git_helpers as gh
from enjambre.changes import ApprovalRequired, Change, ChangeSet
from enjambre.github import Comment, PullRequest
from enjambre.gitops import GitOps
from enjambre.pull_request import ChangeRequest, submit_change_request

pytestmark = pytest.mark.skipif(not gh.HAS_GIT, reason="git no disponible")


@dataclass
class FakeGitHub:
    """Doble de GitHubClient que registra lo que recibe."""

    pulls: list[dict] = field(default_factory=list)
    comments: list[dict] = field(default_factory=list)

    async def create_pull_request(self, repo, *, title, head, base, body):
        self.pulls.append(dict(repo=repo, title=title, head=head, base=base,
                               body=body))
        return PullRequest(number=101, url="https://github.com/acme/w/pull/101",
                           title=title)

    async def comment(self, repo, number, body):
        self.comments.append(dict(repo=repo, number=number, body=body))
        return Comment(id=1, url="cmturl")


def _request(**kw):
    base = dict(repo="acme/w", branch="feature/auto", title="Agrega feature",
                body="cuerpo del PR", base="main")
    base.update(kw)
    return ChangeRequest(**base)


def test_full_loop_opens_pr(tmp_path):
    work = gh.init_repo_with_origin(tmp_path)
    cs = ChangeSet([Change("src/nuevo.py", "print('hola')\n")])
    fake = FakeGitHub()
    res = asyncio.run(submit_change_request(
        cs, GitOps(work), fake, _request(issue_number=7), approved=True))
    assert res.ok
    assert res.pull_request.number == 101
    assert res.pushed and res.commit
    assert (work / "src" / "nuevo.py").is_file()
    assert fake.pulls[0]["head"] == "feature/auto"
    # Se comento el resumen en el issue origen.
    assert fake.comments and fake.comments[0]["number"] == 7


def test_requires_approval(tmp_path):
    work = gh.init_repo_with_origin(tmp_path)
    cs = ChangeSet([Change("x.py", "1\n")])
    with pytest.raises(ApprovalRequired):
        asyncio.run(submit_change_request(
            cs, GitOps(work), FakeGitHub(), _request(), approved=False))


def test_token_not_leaked_into_pr(tmp_path):
    work = gh.init_repo_with_origin(tmp_path)
    cs = ChangeSet([Change("x.py", "1\n")])
    fake = FakeGitHub()
    leaky = _request(body="mira mi token ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ012345",
                     title="token ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ012345 aqui")
    res = asyncio.run(submit_change_request(
        cs, GitOps(work), fake, leaky, approved=True))
    assert res.ok
    assert "ghp_ABCDEF" not in fake.pulls[0]["body"]
    assert "ghp_ABCDEF" not in fake.pulls[0]["title"]
    assert "[REDACTED:github_token]" in fake.pulls[0]["body"]


def test_rejected_changeset_aborts_before_pr(tmp_path):
    work = gh.init_repo_with_origin(tmp_path)
    # Archivo sensible: lo rechaza el safety gate de Fase 2.
    cs = ChangeSet([Change(".env", "SECRET=1\n")])
    fake = FakeGitHub()
    res = asyncio.run(submit_change_request(
        cs, GitOps(work), fake, _request(), approved=True))
    assert not res.ok
    assert res.rejected
    assert fake.pulls == []  # nunca se abrio PR
