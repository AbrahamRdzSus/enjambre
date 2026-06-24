import type { LucideIcon } from 'lucide-react';

// Fila de metricas tipo cockpit. Datos reales: la pagina arma los items desde
// useStats/useAgents/useProjects/useSessions. Sin mock.

export interface Metric {
  label: string;
  value: string;
  extra?: string;
  tone?: 'up' | 'down' | 'muted';
  pct?: number;
  icon: LucideIcon;
}

export default function MetricsRow({ items }: { items: Metric[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {items.map((m) => {
        const extraColor =
          m.tone === 'up' || m.tone === 'down'
            ? 'text-success'
            : 'text-muted-foreground';
        return (
          <div key={m.label} className="glass p-4">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {m.label}
                </p>
                <p className="font-mono text-2xl font-semibold text-foreground tnum">
                  {m.value}
                </p>
                {m.extra && (
                  <p className={`mt-1 font-mono text-[11px] ${extraColor}`}>{m.extra}</p>
                )}
              </div>
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary">
                <m.icon className="size-4" />
              </span>
            </div>
            {m.pct != null && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min(100, Math.max(0, m.pct))}%` }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
