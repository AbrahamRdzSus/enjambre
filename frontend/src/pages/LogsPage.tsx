import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useLogStore } from '../stores/log-store';
import { Panel, PageHeader } from '../components/ui/Panel';
import Dot from '../components/ui/Dot';

const LEVEL_COLOR: Record<string, string> = {
  info: 'var(--fg-mute)',
  warn: 'var(--warn)',
  error: 'var(--alert)',
};
const LEVEL_DOT: Record<string, string> = {
  info: 'var(--purple)',
  warn: 'var(--warn)',
  error: 'var(--alert)',
};
const FILTERS = ['all', 'info', 'warn', 'error'] as const;
type Filter = (typeof FILTERS)[number];

export default function LogsPage() {
  // Lee del store compartido: el stream lo abre AppShell (useLogStream) una sola
  // vez. Antes esta pagina abria SU PROPIA conexion y no dedupeaba, asi que cada
  // reconexion le re-inyectaba los 50 eventos del replay como si fueran nuevos.
  const events = useLogStore((s) => s.events);
  const live = useLogStore((s) => s.live);
  const clear = useLogStore((s) => s.clear);
  const [filter, setFilter] = useState<Filter>('all');

  const counts = useMemo(() => {
    const c = { info: 0, warn: 0, error: 0 };
    for (const e of events) if (e.level in c) c[e.level as keyof typeof c]++;
    return c;
  }, [events]);

  const shown = filter === 'all' ? events : events.filter((e) => e.level === filter);

  const liveBadge = (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] text-muted-foreground">{events.length} evt</span>
      <span
        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] ${
          live ? 'text-success' : 'text-muted-foreground'
        }`}
        style={{ border: `1px solid ${live ? 'color-mix(in srgb, var(--ok) 30%, transparent)' : 'var(--border)'}`, background: live ? 'color-mix(in srgb, var(--ok) 10%, transparent)' : 'transparent' }}
      >
        <Dot color={live ? 'var(--ok)' : 'var(--fg-faint)'} glow={live} />
        {live ? 'En tiempo real' : 'Sin stream'}
      </span>
      <button
        type="button"
        onClick={clear}
        aria-label="Limpiar"
        className="grid size-7 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="Logs en vivo" title="Actividad del enjambre" />

      {/* Filtros por nivel */}
      <div className="flex items-center gap-2">
        {FILTERS.map((f) => {
          const on = filter === f;
          const n = f === 'all' ? events.length : counts[f as keyof typeof counts];
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={on}
              className="flex items-center gap-1.5 rounded-lg px-3 h-8 font-mono text-xs capitalize transition-colors"
              style={{
                border: `1px solid ${on ? 'color-mix(in srgb, var(--purple) 40%, transparent)' : 'var(--border)'}`,
                background: on ? 'color-mix(in srgb, var(--purple) 12%, transparent)' : 'transparent',
                color: on ? 'var(--fg)' : 'var(--fg-mute)',
              }}
            >
              {f !== 'all' && <Dot color={LEVEL_DOT[f]} />}
              {f} <span style={{ color: 'var(--fg-faint)' }}>{n}</span>
            </button>
          );
        })}
      </div>

      <Panel
        title="Stream de eventos (SSE)"
        action={liveBadge}
        bodyClassName="flex flex-col max-h-[560px] overflow-y-auto scrollbar-thin font-mono text-[12px]"
      >
        {shown.length === 0 && (
          <p className="py-2 text-muted-foreground">
            {events.length === 0 ? 'Sin eventos todavia. Lanza una tarea para ver actividad en vivo.' : 'Sin eventos de este nivel.'}
          </p>
        )}
        {shown.map((e) => (
          <div key={e._id} className="flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-[color-mix(in_srgb,var(--purple)_7%,transparent)]">
            <Dot color={LEVEL_DOT[e.level] ?? 'var(--fg-faint)'} />
            <span className="shrink-0 text-muted-foreground">{new Date(e.ts * 1000).toLocaleTimeString()}</span>
            <span className="min-w-[110px] shrink-0 text-primary">{e.event}</span>
            {e.agent && (
              <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px]" style={{ background: 'color-mix(in srgb, var(--amber) 14%, transparent)', color: 'var(--amber)' }}>{e.agent}</span>
            )}
            <span className="truncate" style={{ color: LEVEL_COLOR[e.level] ?? 'var(--fg)' }}>{e.message}</span>
          </div>
        ))}
      </Panel>
    </div>
  );
}
