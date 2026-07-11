/*
 * F1 (OPS HUD): cliente del cockpit -> rutas /hub/* del sidecar (proxy al hub de CD).
 * El sidecar guarda el JWT del hub server-side; aqui solo se usa el X-API-Token del
 * sidecar (via el cliente `api`). Gated por VITE_HUB_DEPLOY (off por defecto).
 */
import { api } from './client';

export interface HubPm2 {
  status: string;
  uptime?: number;
  cpu?: number;
  memory?: number;
  restarts?: number;
}

export interface HubAppStatus {
  pm2?: HubPm2;
  health?: unknown;
  port?: number;
  color?: string;
  label?: string;
  lastCommit?: string;
  db?: unknown;
  deploying?: boolean;
}

/** Estado del hub: dict keyed por nombre de app. */
export type HubStatus = Record<string, HubAppStatus>;

/** Alcance del deploy que acepta el hub. */
export type DeployScope = 'full' | 'frontend' | 'backend';

/** Registro de un deploy pasado (del historial del hub). */
export interface HubDeployRecord {
  ts: string;
  app: string;
  only?: string;
  ok: boolean;
  total?: number;
  commitBefore?: string;
  commitAfter?: string;
  error?: string;
}

export const hub = {
  status: () => api.get<HubStatus>('/hub/status'),
  // Dispara el deploy; el sidecar reenvia al hub con el JWT admin. El progreso
  // real llega por el poll de status (campo `deploying`). 403=PIN no admin,
  // 409=deploy en curso (los propaga el sidecar).
  deploy: (app: string, only: DeployScope = 'full') =>
    api.post<{ started: boolean }>(`/hub/deploy/${encodeURIComponent(app)}`, { only }),
  history: () => api.get<HubDeployRecord[]>('/hub/history'),
  // URL del stream SSE de progreso de deploy en vivo. EventSource no manda headers,
  // asi que el token del sidecar viaja por query (?token=), como en /logs/stream.
  eventsUrl: (): string => {
    const t = api.token;
    return `${api.base}/hub/events${t ? `?token=${encodeURIComponent(t)}` : ''}`;
  },
  // Revierte una app a un commit (git checkout). Tras esto hay que redesplegar
  // para publicar. 403=PIN no admin, 404=app (los propaga el sidecar).
  rollback: (app: string, commit: string) =>
    api.post<{ ok: boolean; rolledBackTo: string }>(
      `/hub/rollback/${encodeURIComponent(app)}/${encodeURIComponent(commit)}`,
    ),
};
