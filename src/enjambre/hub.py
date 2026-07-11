"""F1 OPS HUD: proxy del sidecar hacia el hub de CD (03-tooling/01-hub).

El cockpit de ENJAMBRE consume `/hub/*` (con el X-API-Token del sidecar); el
sidecar habla con el hub :5099 y guarda el JWT del hub SERVER-SIDE, de modo que
el frontend nunca ve el PIN/JWT del hub (decision F1: proxy por el sidecar).

Read-only por ahora (status del hub). Disparar deploys es un slice posterior
(POST /api/deploy/:app requiere ademas el header X-Hub-Pin).

Config por entorno (el router solo se monta si ENJAMBRE_HUB_URL esta definido):
  ENJAMBRE_HUB_URL   base del hub, p.ej. http://127.0.0.1:5099
  ENJAMBRE_HUB_PIN   PIN del hub. Contrato: POST /api/auth {"pin"} -> {"token","role"}
"""

from __future__ import annotations

import os

import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/hub", tags=["hub"])


class HubError(RuntimeError):
    """Fallo al hablar con el hub (login o request)."""


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
            raise HubError(f"login del hub fallo ({r.status_code})")
        token = r.json().get("token")
        if not token:
            raise HubError("el hub no devolvio token")
        self._token = token
        return token

    async def _get(self, client: httpx.AsyncClient, path: str):
        if not self._token:
            await self.login(client)
        for attempt in (1, 2):
            headers = {"Authorization": f"Bearer {self._token}"}
            r = await client.get(f"{self.base_url}{path}", headers=headers)
            if r.status_code == 401 and attempt == 1:
                await self.login(client)  # token caduco: re-login una vez
                continue
            if r.status_code != 200:
                raise HubError(f"GET {path} del hub fallo ({r.status_code})")
            return r.json()

    async def status(self, client: httpx.AsyncClient) -> dict:
        """Dict de apps del hub: pm2, health, port, lastCommit, deploying..."""
        return await self._get(client, "/api/status")


_hub: HubClient | None = None


def _get_hub() -> HubClient:
    global _hub
    if _hub is None:
        _hub = HubClient(os.environ.get("ENJAMBRE_HUB_URL", ""), os.environ.get("ENJAMBRE_HUB_PIN", ""))
    return _hub


@router.get("/status")
async def hub_status():
    """Estado de las apps del hub (proxy read-only)."""
    hub = _get_hub()
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            return await hub.status(client)
        except HubError as exc:
            raise HTTPException(status_code=502, detail=str(exc))
