import { ExternalLink } from 'lucide-react';
import type { LogEvent, Tally } from '../../api/types';
import { fmtTokens } from '../../lib/format';
import { Panel } from '../ui/Panel';
import EmptyState from '../ui/EmptyState';
import Dot from '../ui/Dot';

// Fila inferior del cockpit, 3 paneles con fuentes reales distintas:
// uso de tokens (stats.by_provider), actividad (logs), rendimiento (stats.by_agent).
// El panel "deployments" del mockup se omite: no hay fuente real en este slice.

const PALETTE = ['var(--purple)', 'var(--amber)', '#38bdf8', 'var(--ok)', '#f472b6'];

export default function BottomRow({
  byProvider,
  logs,
  byAgent,
  onSeeLogs,
  layout = 'row',
}: {
  byProvider: Array<[string, Tally]>;
  logs: LogEvent[];
  byAgent: Array<[string, Tally]>;
  onSeeLogs: () => void;
  layout?: 'row' | 'column';
}) {
  const totalTokens = byProvider.reduce(
    (s, [, t]) => s + t.input_tokens + t.output_tokens,
    0,
  );

  return (
    <div
      className={
        layout === 'column'
          ? 'flex flex-col gap-3'
          : 'grid grid-cols-1 gap-3 lg:grid-cols-3'
      }
    >
      {/* Uso de tokens por IA */}
      <Panel
        title="Uso de tokens por proveedor"
        bodyClassName="flex-1 space-y-3"
        footer={
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-muted-foreground">Total</span>
            <span className="font-mono text-[13px] font-semibold text-foreground">
              {fmtTokens(totalTokens)} tokens
            </span>
          </div>
        }
      >
        {byProvider.length === 0 ? (
          <EmptyState text="Sin uso registrado todavia." />
        ) : (
          byProvider.map(([name, t], i) => {
            const tokens = t.input_tokens + t.output_tokens;
            const pct = totalTokens > 0 ? (tokens / totalTokens) * 100 : 0;
            return (
              <div key={name} className="flex items-center gap-2.5">
                <span className="w-24 shrink-0 truncate text-[12px] text-foreground">
                  {name}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: PALETTE[i % PALETTE.length] }}
                  />
                </div>
                <span className="w-12 shrink-0 text-right font-mono text-[11px] text-foreground">
                  {fmtTokens(tokens)}
                </span>
                <span className="w-10 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
                  {pct.toFixed(0)}%
                </span>
              </div>
            );
          })
        )}
      </Panel>

      {/* Actividad en tiempo real */}
      <Panel
        title="Actividad en tiempo real"
        bodyClassName="flex-1 space-y-2.5"
        footer={
          <button
            type="button"
            onClick={onSeeLogs}
            className="flex items-center gap-1 text-[12px] text-primary hover:underline"
          >
            Ver log completo <ExternalLink className="size-3" />
          </button>
        }
      >
        {logs.length === 0 ? (
          <EmptyState text="Sin actividad. Lanza una tarea." />
        ) : (
          logs
            .slice(-8)
            .reverse()
            .map((a, i) => (
              <div key={`${a.ts}-${i}`} className="flex items-start gap-2 text-[12px]">
                <span className="font-mono text-[11px] text-muted-foreground">
                  {new Date(a.ts * 1000).toLocaleTimeString()}
                </span>
                <Dot color="var(--purple)" className="mt-1.5" />
                <span className="flex-1 truncate text-foreground/85">
                  {a.message || a.event}
                </span>
                {a.agent && (
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {a.agent}
                  </span>
                )}
              </div>
            ))
        )}
      </Panel>

      {/* Rendimiento por agente */}
      <Panel
        title="Rendimiento por agente"
        bodyClassName="flex-1 space-y-2.5"
        footer={
          <span className="text-[11px] text-muted-foreground">
            Tasa de exito (ok / runs) por agente
          </span>
        }
      >
        {byAgent.length === 0 ? (
          <EmptyState text="Sin corridas por agente todavia." />
        ) : (
          byAgent.map(([name, t]) => {
            const rate = t.runs > 0 ? (t.ok / t.runs) * 100 : 0;
            const tone =
              rate >= 80
                ? 'bg-success/15 text-success'
                : t.runs === 0
                  ? 'bg-secondary text-muted-foreground'
                  : 'bg-primary/15 text-primary';
            return (
              <div key={name} className="flex items-center gap-2 text-[12px]">
                <span className="flex-1 truncate text-foreground/85">{name}</span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {t.runs} runs
                </span>
                <span className={`rounded px-2 py-0.5 text-[10px] ${tone}`}>
                  {rate.toFixed(0)}%
                </span>
              </div>
            );
          })
        )}
      </Panel>
    </div>
  );
}
