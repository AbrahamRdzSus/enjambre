import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { LogEvent } from '../api/types';

const LEVEL_COLOR: Record<string, string> = {
  info: 'var(--fg-mute)',
  warn: 'var(--warn)',
  error: 'var(--alert)',
};

type Entry = LogEvent & { _id: string };

export default function LogsPage() {
  const [events, setEvents] = useState<Entry[]>([]);
  const [live, setLive] = useState(false);

  useEffect(() => {
    // SSE en vivo: el sidecar emite eventos por defecto (onmessage). replay=50
    // reemite los recientes al conectar. El token (si hay) va por query param
    // porque EventSource no manda headers.
    const q = new URLSearchParams({ replay: '50' });
    if (api.token) q.set('token', api.token);
    const es = new EventSource(`${api.base}/logs/stream?${q.toString()}`);
    es.onopen = () => setLive(true);
    es.onerror = () => setLive(false);
    es.onmessage = (m) => {
      try {
        const ev = JSON.parse(m.data) as LogEvent;
        setEvents((prev) => [...prev.slice(-300), { ...ev, _id: crypto.randomUUID() }]);
      } catch {
        /* ignora frames no-JSON */
      }
    };
    return () => es.close();
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div>
          <p className="eyebrow">Logs en vivo</p>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--fg)' }}>
            Actividad del enjambre
          </h1>
        </div>
        <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--fg-mute)' }}>
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: live ? 'var(--ok)' : 'var(--fg-faint)' }}
          />
          {live ? 'SSE conectado' : 'sin stream'}
        </span>
      </header>

      <div
        className="rounded-xl border p-4 flex flex-col gap-1"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border)',
          maxHeight: 520,
          overflowY: 'auto',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
        }}
      >
        {events.length === 0 && (
          <p style={{ color: 'var(--fg-faint)' }}>
            Sin eventos todavia. Lanza una tarea para ver actividad en vivo.
          </p>
        )}
        {events.map((e) => (
          <div key={e._id} className="flex gap-3">
            <span style={{ color: 'var(--fg-faint)' }}>
              {new Date(e.ts * 1000).toLocaleTimeString()}
            </span>
            <span style={{ color: 'var(--purple-soft)', minWidth: 110 }}>{e.event}</span>
            {e.agent && <span style={{ color: 'var(--amber-soft)' }}>{e.agent}</span>}
            <span style={{ color: LEVEL_COLOR[e.level] ?? 'var(--fg)' }}>{e.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
