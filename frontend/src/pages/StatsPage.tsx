import { Activity, Coins, Hash, Users, CheckCircle2, CalendarDays } from 'lucide-react';
import { useStats } from '../api/hooks';
import { Panel, PageHeader } from '../components/ui/Panel';
import ProviderIcon from '../components/ProviderIcon';

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function MetricCard({ icon: Icon, label, value, extra, extraColor }: {
  icon: typeof Coins; label: string; value: string; extra?: string; extraColor?: string;
}) {
  return (
    <div className="rounded-xl glass p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="font-mono text-2xl font-semibold text-foreground tnum">{value}</p>
          {extra && <p className="mt-1 font-mono text-[11px]" style={{ color: extraColor ?? 'var(--fg-mute)' }}>{extra}</p>}
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-lg" style={{ background: 'color-mix(in srgb, var(--purple) 12%, transparent)', color: 'var(--purple)' }}>
          <Icon className="size-4" />
        </span>
      </div>
    </div>
  );
}

export default function StatsPage() {
  const stats = useStats();
  const data = stats.data;

  const byProvider = Object.entries(data?.by_provider ?? {});
  const byAgent = Object.entries(data?.by_agent ?? {});
  const byDay = Object.entries(data?.by_day ?? {}).sort(([a], [b]) => a.localeCompare(b));

  const maxCost = Math.max(0.000001, ...byProvider.map(([, t]) => t.cost_usd));
  const maxDay = Math.max(0.000001, ...byDay.map(([, c]) => c));
  const runs = byProvider.reduce((s, [, t]) => s + t.runs, 0);
  const ok = byProvider.reduce((s, [, t]) => s + t.ok, 0);
  const successPct = runs > 0 ? Math.round((ok / runs) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="Estadisticas" title="Consumo por proveedor" />

      {/* Fila de métricas (lenguaje cockpit) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <MetricCard icon={Activity} label="Sesiones" value={String(data?.sessions ?? 0)} />
        <MetricCard icon={Hash} label="Tokens" value={fmtTokens(data?.total_tokens ?? 0)} />
        <MetricCard icon={Coins} label="Costo total" value={`$${(data?.total_cost_usd ?? 0).toFixed(4)}`} extra="acumulado" extraColor="var(--amber)" />
        <MetricCard icon={CheckCircle2} label="Éxito" value={`${successPct}%`} extra={`${ok}/${runs} runs`} extraColor="var(--ok)" />
        <MetricCard icon={Users} label="Agentes" value={String(byAgent.length)} extra="con actividad" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Costo por proveedor */}
        <Panel title="Costo por proveedor" bodyClassName="flex flex-col gap-3">
          {byProvider.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin sesiones guardadas. Lanza una tarea con "guardar sesion" para ver consumo.
            </p>
          ) : (
            byProvider.map(([name, t]) => (
              <div key={name}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <ProviderIcon provider={name} size={16} />
                    {name}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {t.runs} runs · {fmtTokens(t.input_tokens + t.output_tokens)} tokens · ${t.cost_usd.toFixed(6)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div className="h-2 rounded-full" style={{ width: `${(t.cost_usd / maxCost) * 100}%`, background: 'linear-gradient(90deg, var(--purple), var(--amber))' }} />
                </div>
              </div>
            ))
          )}
        </Panel>

        {/* Costo por día */}
        <Panel title={<span className="flex items-center gap-2"><CalendarDays size={13} /> Costo por día</span>} bodyClassName="flex flex-col gap-3">
          {byDay.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin actividad diaria registrada.</p>
          ) : (
            <div className="flex h-40 items-end gap-1.5">
              {byDay.map(([day, cost]) => (
                <div key={day} className="flex flex-1 flex-col items-center gap-1" title={`${day}: $${cost.toFixed(6)}`}>
                  <div className="w-full rounded-t" style={{ height: `${Math.max(2, (cost / maxDay) * 100)}%`, background: 'linear-gradient(180deg, var(--purple-soft), var(--purple))', minHeight: 2 }} />
                  <span className="font-mono text-[9px] text-muted-foreground">{day.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Por agente */}
      {byAgent.length > 0 && (
        <Panel title="Consumo por agente" bodyClassName="flex flex-col gap-2">
          {byAgent.map(([name, t]) => (
            <div key={name} className="flex items-center justify-between rounded-lg border border-border bg-secondary/25 px-3 py-2">
              <span className="text-sm font-semibold text-foreground">{name}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {t.runs} runs · {t.ok} ok · {t.errors} err · {fmtTokens(t.input_tokens + t.output_tokens)} tok · ${t.cost_usd.toFixed(6)}
              </span>
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}
