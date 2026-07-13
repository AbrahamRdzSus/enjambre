/**
 * Color y etiqueta del estado de un agente. UNA sola fuente.
 *
 * Vivia copiado en AgentCard (STATUS_META), SwarmFlow (statusColor/statusLabel) y
 * ActivityDock (STATUS_COLOR), y las etiquetas ya no coincidian entre si.
 *
 * OJO: el `statusColor` de DeployPage NO entra aqui: es de otro dominio (estado de
 * un proceso pm2: online/stopped/errored), no el de un agente.
 */
import type { AgentStatus } from '../stores/log-store';

export const STATUS_COLOR: Record<AgentStatus, string> = {
  idle: 'var(--fg-faint)',
  running: 'var(--amber)',
  ok: 'var(--ok)',
  error: 'var(--alert)',
};

export const STATUS_LABEL: Record<AgentStatus, string> = {
  idle: 'en espera',
  running: 'corriendo',
  ok: 'listo',
  error: 'error',
};
