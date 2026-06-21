import { useLogs } from '../api/hooks';

const LEVEL_COLOR: Record<string, string> = {
  info: 'var(--fg-mute)',
  warn: 'var(--warn)',
  error: 'var(--alert)',
};

export default function LogsPage() {
  const logs = useLogs();
  const items = logs.data ?? [];

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="eyebrow">Logs en vivo</p>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--fg)' }}>
          Actividad del enjambre
        </h1>
      </header>

      <div
        className="rounded-xl border p-4 font-mono text-xs flex flex-col gap-1"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border)',
          maxHeight: 520,
          overflowY: 'auto',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {items.length === 0 && (
          <p style={{ color: 'var(--fg-faint)' }}>
            Sin eventos todavia. Lanza una tarea para ver actividad.
          </p>
        )}
        {items.map((e) => (
          <div
            key={`${e.ts}-${e.event}-${e.agent ?? ''}-${e.message}`}
            className="flex gap-3"
          >
            <span style={{ color: 'var(--fg-faint)' }}>
              {new Date(e.ts * 1000).toLocaleTimeString()}
            </span>
            <span style={{ color: 'var(--purple-soft)', minWidth: 110 }}>{e.event}</span>
            {e.agent && <span style={{ color: 'var(--amber-soft)' }}>{e.agent}</span>}
            <span style={{ color: LEVEL_COLOR[e.level] ?? 'var(--fg)' }}>{e.message}</span>
          </div>
        ))}
      </div>
      <p className="text-xs" style={{ color: 'var(--fg-faint)' }}>
        Refresco cada 2s (el sidecar tambien expone SSE en /logs/stream).
      </p>
    </div>
  );
}
