"""Tests del cliente REST de GitHub (Fase 4), offline con MockTransport."""

import asyncio
import json

import httpx
import pytest

from enjambre.github import GitHubClient, GitHubError

REPO = "acme/widget"


def _handler(request: httpx.Request) -> httpx.Response:
    path = request.url.path
    # Token invalido -> 401 (simula auth fallida).
    if "Bearer BAD" in request.headers.get("authorization", ""):
        return httpx.Response(401, json={"message": "Bad credentials"})

    if request.method == "GET" and path == f"/repos/{REPO}/issues":
        return httpx.Response(200, json=[
            {"number": 7, "title": "bug A", "body": "rompe", "html_url": "u7"},
            {"number": 8, "title": "pr disfrazado", "html_url": "u8",
             "pull_request": {"url": "x"}},  # debe excluirse
        ])

    if request.method == "POST" and path == f"/repos/{REPO}/pulls":
        body = json.loads(request.content)
        return httpx.Response(201, json={
            "number": 42, "html_url": "https://github.com/acme/widget/pull/42",
            "title": body["title"], "_sent": body,
        })

    if request.method == "POST" and path.endswith("/comments"):
        return httpx.Response(201, json={"id": 999, "html_url": "cmturl"})

    return httpx.Response(404, json={"message": f"sin ruta: {path}"})


def _client(token: str = "ok") -> GitHubClient:
    return GitHubClient(token,
                        client=httpx.AsyncClient(transport=httpx.MockTransport(_handler)))


def test_list_issues_excludes_prs():
    issues = asyncio.run(_client().list_issues(REPO))
    assert [i.number for i in issues] == [7]
    assert issues[0].title == "bug A"


def test_create_pull_request_payload_and_parse():
    pr = asyncio.run(_client().create_pull_request(
        REPO, title="Fix", head="feature/x", base="main", body="cuerpo"))
    assert pr.number == 42
    assert pr.url.endswith("/pull/42")


def test_comment():
    c = asyncio.run(_client().comment(REPO, 7, "resumen"))
    assert c.id == 999 and c.url == "cmturl"


def test_missing_token_raises():
    with pytest.raises(GitHubError):
        asyncio.run(_client(token="").list_issues(REPO))


def test_bad_credentials_raises():
    with pytest.raises(GitHubError) as exc:
        asyncio.run(_client(token="BAD").list_issues(REPO))
    assert "401" in str(exc.value)
