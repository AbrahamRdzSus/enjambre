"""F1 OPS HUD: proxy del sidecar hacia el hub de CD (03-tooling/01-hub).

El cockpit de ENJAMBRE consume `/hub/*` (con el X-API-Token del sidecar); el
sidecar habla con el hub :5099 y guarda el JWT del hub SERVER-SIDE, de modo que
el frontend nunca ve el PIN/JWT del hub (decision F1: proxy por el sidecar).

Rutas:
  GET  /hub/status        estado de las apps (read-only)
  POST /hub/deploy/{app}  dispara un deploy (body {only})

`requireAdmin` del hub pasa con el Bearer si el JWT es de rol admin, y el hub
mintea un JWT admin cuando el PIN de login es el HUB_PIN admin. Es decir: para
disparar deploys, ENJAMBRE_HUB_PIN debe ser el PIN ADMIN del hub (no el viewer).
Si es viewer, el hub responde 403 y aqui se propaga como 403.

El progreso del deploy en el hub va por WebSocket (broadcast deploy-step/output),
no por HTTP; este proxy solo dispara y devuelve {started:true}. El cockpit refleja
el avance con el poll de /hub/status (campo `deploying`). Proxear el WS = slice futuro.

Config (el router solo se monta si ENJAMBRE_HUB_URL esta definido):
  ENJAMBRE_HUB_URL   base del hub, p.ej. http://127.0.0.1:5099
  ENJAMBRE_HUB_PIN   PIN admin del hub. Contrato login: POST /api/auth {"pin"} -> {"token","role"}
"""

from __future__ import annotations

import os

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/hub", tags=["hub"])

# only: alcance del deploy que acepta el hub. 'full' reconstruye front+back.
_DEPLOY_SCOPES = {"full", "frontend", "backend"}


class HubError(RuntimeError):
    """Fallo al hablar con el hub. `status` = codigo HTTP del hub si aplica."""

    def __init__(self, message: str, status: int | None = None):
        super().__init__(message)
        self.status = status


class DeployIn(BaseModel):
    only: str = "full"


def _err(r: httpx.Response) -> str:
    """Extrae el mensaje de error del hub ({error:...}) o cae al texto crudo."""
    try:
        return r.json().get("error", r.text)
    except ValueError:
        return r.text


class HubClient:
    """Cliente minimo al hub de CD. Cachea el JWT y re-loguea si el hub da 401."""

    def __init__(self, base_url: str, pin: str):
        if not base_url:
            raise HubError("ENJAMBRE_HUB_URL no definido")
        self.base_url = base_url.rstrip("/")
        self.pin = pin
        self._token: str | None = None

    async def login(self, client: httpx.AsyncClient) -> str:
        r = await client.post(f"{self.base_url}/api/auth", json={"pin": self.pin})
        if r.status_code != 200:
            raise HubError(f"login del hub fallo ({r.status_code})", status=r.status_code)
        token = r.json().get("token")
        if not token:
            raise HubError("el hub no devolvio token")
        self._token = token
        return token

    async def _request(self, client: httpx.AsyncClient, method: str, path: str, *, json=None):
        """Request autenticado con re-login unico ante 401 (token caduco)."""
        if not self._token:
            await self.login(client)
        r = None
        for attempt in (1, 2):
            headers = {"Authorization": f"Bearer {self._token}"}
            r = await client.request(method, f"{self.base_url}{path}", headers=headers, json=json)
            if r.status_code == 401 and attempt == 1:
                await self.login(client)
                continue
            break
        return r

    async def status(self, client: httpx.AsyncClient) -> dict:
        """Dict de apps del hub: pm2, health, port, lastCommit, deploying..."""
        r = await self._request(client, "GET", "/api/status")
        if r.status_code != 200:
            raise HubError(f"GET /api/status del hub fallo ({r.status_code})", status=r.status_code)
        return r.json()

    async def deploy(self, client: httpx.AsyncClient, app: str, only: str = "full") -> dict:
        """Dispara POST /api/deploy/{app}. Devuelve {started:true} o levanta HubError
        con el status del hub (403 no-admin, 404 app, 409 deploy en curso)."""
        if only not in _DEPLOY_SCOPES:
            valid = ", ".join(sorted(_DEPLOY_SCOPES))
            raise HubError(f"alcance invalido: {only!r}; validos: {valid}")
        r = await self._request(client, "POST", f"/api/deploy/{app}", json={"only": only})
        if r.status_code == 200:
            return r.json()
        raise HubError(f"deploy {app!r}: {_err(r)}", status=r.status_code)

    async def history(self, client: httpx.AsyncClient) -> list:
        """Ultimos deploys (mas reciente primero): ts, app, only, ok, commitBefore/After..."""
        r = await self._request(client, "GET", "/api/deploy-history")
        if r.status_code != 200:
            raise HubError(
                f"GET /api/deploy-history del hub fallo ({r.status_code})", status=r.status_code
            )
        return r.json()

    async def rollback(self, client: httpx.AsyncClient, app: str, commit: str) -> dict:
        """Revierte {app} a {commit} (git checkout). Requiere JWT admin. Tras esto hay
        que redesplegar para publicar el binario. Levanta HubError con el status del hub."""
        r = await self._request(client, "POST", f"/api/rollback/{app}/{commit}")
        if r.status_code == 200:
            return r.json()
        raise HubError(f"rollback {app!r}@{commit}: {_err(r)}", status=r.status_code)


_hub: HubClient | None = None


def _get_hub() -> HubClient:
    global _hub
    if _hub is None:
        _hub = HubClient(
            os.environ.get("ENJAMBRE_HUB_URL", ""), os.environ.get("ENJAMBRE_HUB_PIN", "")
        )
    return _hub


@router.get("/status")
async def hub_status():
    """Estado de las apps del hub (proxy read-only)."""
    hub = _get_hub()
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            return await hub.status(client)
        except HubError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/deploy/{app}")
async def hub_deploy(app: str, body: DeployIn):
    """Dispara un deploy en el hub. Propaga 403/404/409 del hub; el resto -> 502."""
    hub = _get_hub()
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            return await hub.deploy(client, app, body.only)
        except HubError as exc:
            code = exc.status if exc.status in (403, 404, 409) else 502
            raise HTTPException(status_code=code, detail=str(exc)) from exc


@router.get("/history")
async def hub_history():
    """Ultimos deploys del hub (mas reciente primero)."""
    hub = _get_hub()
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            return await hub.history(client)
        except HubError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/rollback/{app}/{commit}")
async def hub_rollback(app: str, commit: str):
    """Revierte una app a un commit. Propaga 403/404 del hub; el resto -> 502.
    Tras el rollback hay que redesplegar para publicar el binario."""
    hub = _get_hub()
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            return await hub.rollback(client, app, commit)
        except HubError as exc:
            code = exc.status if exc.status in (403, 404) else 502
            raise HTTPException(status_code=code, detail=str(exc)) from exc
