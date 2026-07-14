/**
 * UNA sola conexion SSE a /logs/stream para toda la app.
 *
 * Antes habia TRES EventSource abiertos contra el mismo endpoint (LogsPage,
 * ActivityDock y run-store via AppShell), cada uno con su propia logica de dedupe
 * -- y la de LogsPage no dedupeaba en absoluto, asi que cada reconexion le
 * re-inyectaba los 50 eventos del replay como si fueran nuevos.
 *
 * Aqui el stream se abre una vez (AppShell monta useLogStream) y todos los
 * consumidores leen del store.
 */
import { useEffect } from 'react';
import { create } from 'zustand';
import { api } from '../api/client';
import type { LogEvent } from '../api/types';

export type AgentStatus = 'idle' | 'running' | 'ok' | 'error';
export type Entry = LogEvent & { _id: string };

const MAX_EVENTS = 400;

interface LogState {
  events: Entry[];
  live: boolean;
  /** Estado en vivo por agente; lo consume HexSwarm para el pulso "pensando". */
  status: Record<string, AgentStatus>;
  push: (ev: LogEvent) => void;
  setLive: (live: boolean) => void;
  clear: () => void;
  reset: () => void;
}

export const useLogStore = create<LogState>((set) => ({
  events: [],
  live: false,
  status: {},

  push: (ev) =>
    set((s) => {
      // El dedupe solo debe cubrir el replay y las reconexiones. NO puede usar
      // `ts|agent|event` a secas: `ts` es un float de segundos y el backend emite
      // en rafaga, asi que dos agent.output legitimos del mismo agente colisionan
      // y se perderia el segundo. El message desempata y el _id lleva un indice.
      const key = `${ev.ts}|${ev.agent ?? ''}|${ev.event}|${ev.message}`;
      if (s.events.some((e) => e._id.startsWith(`${key}#`))) return s;

      const entry: Entry = { ...ev, _id: `${key}#${s.events.length}` };
      const events = [...s.events.slice(-(MAX_EVENTS - 1)), entry];

      // Estado por agente derivado del mismo stream (antes vivia en run-store con
      // su PROPIA conexion SSE).
      let status = s.status;
      const agents = ev.fields?.agents;
      if (ev.event === 'run.start' && Array.isArray(agents)) {
        status = Object.fromEntries(
          agents.filter((a): a is string => typeof a === 'string').map((n) => [n, 'running' as AgentStatus]),
        );
      } else if (ev.event === 'agent.done' && ev.agent) {
        status = { ...status, [ev.agent]: ev.level === 'error' ? 'error' : 'ok' };
      }
      return { events, status };
    }),

  setLive: (live) => set({ live }),
  clear: () => set({ events: [] }),
  reset: () => set({ status: {} }),
}));

/** Abre el stream. Montar UNA sola vez (AppShell). */
export function useLogStream() {
  useEffect(() => {
    const { push, setLive, reset } = useLogStore.getState();
    let es: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    async function connect() {
      if (closed) return;
      let url = `${api.base}/logs/stream?replay=50`;
      // Ticket efimero de un solo uso: evita poner el token REAL en la URL (queda en
      // logs/historial). Si el sidecar no exige token, /sse-ticket devuelve vacio y se
      // abre igual. Fallback al token por query si el fetch del ticket falla.
      try {
        const { ticket } = await api.post<{ ticket: string }>('/sse-ticket');
        if (ticket) url += `&ticket=${encodeURIComponent(ticket)}`;
        else if (api.token) url += `&token=${encodeURIComponent(api.token)}`;
      } catch {
        if (api.token) url += `&token=${encodeURIComponent(api.token)}`;
      }
      if (closed) return;
      es = new EventSource(url);
      es.onopen = () => setLive(true);
      es.onmessage = (m) => {
        try {
          const ev = JSON.parse(m.data) as LogEvent;
          push(ev);
          // run.done limpia el pulso de la viz, pero deja los eventos en la lista.
          if (ev.event === 'run.done') setTimeout(reset, 1500);
        } catch {
          /* ignora frames no-JSON (comentarios keep-alive) */
        }
      };
      es.onerror = () => {
        setLive(false);
        es?.close();  // el ticket ya se consumio: el reintento NATIVO reusaria uno
        es = null;    // muerto -> reconectamos a mano con un ticket nuevo
        if (!closed && retry === null) {
          retry = setTimeout(() => { retry = null; void connect(); }, 2000);
        }
      };
    }

    void connect();
    return () => {
      closed = true;
      if (retry !== null) clearTimeout(retry);
      es?.close();
    };
  }, []);
}
