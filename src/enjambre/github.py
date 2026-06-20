"""Cliente REST de GitHub (Fase 4), BYOK y offline-testable.

Mismo patron que los adapters de proveedor: token en memoria (nunca persistido),
cliente httpx inyectable para tests con MockTransport. Operaciones minimas para
convertir una tarea aprobada en un Pull Request revisable en el repo DEL USUARIO:
leer issues, abrir PR, comentar resumen. Enjambre ABRE el PR; no lo mergea solo.
"""

from __future__ import annotations

import contextlib
from dataclasses import dataclass
from typing import AsyncIterator

import httpx

API_ROOT = "https://api.github.com"
_API_VERSION = "2022-11-28"


class GitHubError(RuntimeError):
    """Fallo de la API de GitHub (status >= 400 o respuesta inesperada)."""


@dataclass
class Issue:
    number: int
    title: str
    body: str
    url: str


@dataclass
class PullRequest:
    number: int
    url: str
    title: str


@dataclass
class Comment:
    id: int
    url: str


class GitHubClient:
    """Cliente BYOK de la API de GitHub. `repo` siempre en formato 'owner/name'."""

    def __init__(self, token: str, *, base_url: str = API_ROOT,
                 timeout: float = 30.0,
                 client: httpx.AsyncClient | None = None) -> None:
        self.token = (token or "").strip()
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self._injected = client

    # --- transporte -------------------------------------------------------
    @contextlib.asynccontextmanager
    async def _http(self) -> AsyncIterator[httpx.AsyncClient]:
        if self._injected is not None:
            yield self._injected
            return
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            yield client

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": _API_VERSION,
        }

    async def _request(self, method: str, path: str, *,
                       json: dict | None = None) -> httpx.Response:
        if not self.token:
            raise GitHubError("Falta GITHUB_TOKEN (BYOK).")
        url = f"{self.base_url}{path}"
        async with self._http() as client:
            resp = await client.request(method, url, headers=self._headers(),
                                        json=json)
        if resp.status_code >= 400:
            raise GitHubError(_error_detail(resp))
        return resp

    # --- operaciones ------------------------------------------------------
    async def list_issues(self, repo: str, *, state: str = "open") -> list[Issue]:
        """Issues del repo. Excluye PRs (GitHub los lista como issues)."""
        resp = await self._request(
            "GET", f"/repos/{repo}/issues?state={state}")
        out: list[Issue] = []
        for it in resp.json():
            if "pull_request" in it:  # un PR disfrazado de issue
                continue
            out.append(Issue(
                number=it["number"],
                title=it.get("title", ""),
                body=it.get("body") or "",
                url=it.get("html_url", ""),
            ))
        return out

    async def create_pull_request(self, repo: str, *, title: str, head: str,
                                  base: str = "main",
                                  body: str = "") -> PullRequest:
        """Abre un PR `head` -> `base`. No lo mergea (revision humana)."""
        resp = await self._request(
            "POST", f"/repos/{repo}/pulls",
            json={"title": title, "head": head, "base": base, "body": body})
        data = resp.json()
        return PullRequest(number=data["number"],
                           url=data.get("html_url", ""),
                           title=data.get("title", title))

    async def comment(self, repo: str, number: int, body: str) -> Comment:
        """Comenta en un issue o PR (mismo endpoint en GitHub)."""
        resp = await self._request(
            "POST", f"/repos/{repo}/issues/{number}/comments",
            json={"body": body})
        data = resp.json()
        return Comment(id=data.get("id", 0), url=data.get("html_url", ""))


def _error_detail(resp: httpx.Response) -> str:
    try:
        msg = resp.json().get("message", "")
    except Exception:  # respuesta no-JSON
        msg = resp.text[:200]
    return f"GitHub API {resp.status_code}: {msg}"
