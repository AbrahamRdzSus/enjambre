import { useEffect } from 'react';
import { create } from 'zustand';
import { api } from '../api/client';

// Estado EN VIVO de los agentes durante un run, alimentado por SSE (/logs/stream).
// Lo consume HexSwarm para el pulso "pensando". Eventos del backend:
// run.start (fields.agents) -> running; agent.done (agent, level) -> ok/error;
// run.done -> limpia tras un momento.

export type AgentStatus = 'idle' | 'running' | 'ok' | 'error';

interface RunState {
  status: Record<string, AgentStatus>;
  setRunning: (names: string[]) => void;
  setDone: (name: string, ok: boolean) => void;
  reset: () => void;
}

export const useRunStore = create<RunState>((set) => ({
  status: {},
  setRunning: (names) =>
    set({ status: Object.fromEntries(names.map((n) => [n, 'running' as AgentStatus])) }),
  setDone: (name, ok) =>
    set((s) => ({ status: { ...s.status, [name]: ok ? 'ok' : 'error' } })),
  reset: () => set({ status: {} }),
}));

// Hook global: abre el SSE una vez y actualiza el run-store. Montar en AppShell.
export function useRunEvents() {
  useEffect(() => {
    const { setRunning, setDone, reset } = useRunStore.getState();
    const q = new URLSearchParams({ replay: '0' });
    if (api.token) q.set('token', api.token);
    const es = new EventSource(`${api.base}/logs/stream?${q.toString()}`);
    es.onmessage = (m) => {
      try {
        const ev = JSON.parse(m.data) as {
          event: string; agent?: string | null; level?: string;
          fields?: { agents?: string[] | null };
        };
        if (ev.event === 'run.start' && Array.isArray(ev.fields?.agents)) {
          setRunning(ev.fields!.agents!);
        } else if (ev.event === 'agent.done' && ev.agent) {
          setDone(ev.agent, ev.level !== 'error');
        } else if (ev.event === 'run.done') {
          setTimeout(reset, 1500);
        }
      } catch {
        /* ignora frames no-JSON */
      }
    };
    return () => es.close();
  }, []);
}
