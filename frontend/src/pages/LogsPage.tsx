import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { LogEvent } from '../api/types';
import { Panel, PageHeader } from '../components/ui/Panel';

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

  const liveBadge = (
    <span
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] ${
        live
          ? 'border border-success/30 bg-success/10 text-success'
          : 'border border-border bg-secondary text-muted-foreground'
      }`}
    >
      <span
        className="size-1.5 rounded-full"
        style={{ background: live ? 'var(--ok)' : 'var(--fg-faint)' }}
      />
      {live ? 'En tiempo real' : 'Sin stream'}
    </span>
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="Logs en vivo" title="Actividad del enjambre" />

      <Panel
        title="Stream de eventos (SSE)"
        action={liveBadge}
        bodyClassName="flex flex-col gap-1 max-h-[520px] overflow-y-auto scrollbar-thin font-mono text-[12px]"
      >
        {events.length === 0 && (
          <p className="text-muted-foreground">
            Sin eventos todavia. Lanza una tarea para ver actividad en vivo.
          </p>
        )}
        {events.map((e) => (
          <div key={e._id} className="flex gap-3">
            <span className="text-muted-foreground">
              {new Date(e.ts * 1000).toLocaleTimeString()}
            </span>
            <span className="min-w-[110px] text-primary">{e.event}</span>
            {e.agent && <span style={{ color: 'var(--amber-soft)' }}>{e.agent}</span>}
            <span style={{ color: LEVEL_COLOR[e.level] ?? 'var(--fg)' }}>{e.message}</span>
          </div>
        ))}
      </Panel>
    </div>
  );
}
