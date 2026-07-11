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

export const hub = {
  status: () => api.get<HubStatus>('/hub/status'),
};
