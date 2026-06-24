import { useStats } from '../api/hooks';
import { Panel, PageHeader } from '../components/ui/Panel';

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

export default function StatsPage() {
  const stats = useStats();
  const data = stats.data;
  const providers = Object.entries(data?.by_provider ?? {});
  const maxCost = Math.max(0.000001, ...providers.map(([, t]) => t.cost_usd));

  const summary = [
    { label: 'Sesiones', value: String(data?.sessions ?? 0) },
    { label: 'Tokens', value: fmtTokens(data?.total_tokens ?? 0) },
    { label: 'Costo total', value: `$${(data?.total_cost_usd ?? 0).toFixed(4)}` },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="Estadisticas" title="Consumo por proveedor" />

      <div className="grid grid-cols-3 gap-3">
        {summary.map((s) => (
          <div key={s.label} className="glass p-4">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {s.label}
            </p>
            <p className="font-mono text-2xl font-semibold text-foreground tnum">{s.value}</p>
          </div>
        ))}
      </div>

      <Panel title="Costo por proveedor" bodyClassName="flex flex-col gap-3">
        {providers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin sesiones guardadas. Lanza una tarea con "guardar sesion" para ver consumo.
          </p>
        ) : (
          providers.map(([name, t]) => (
            <div key={name}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">{name}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {t.runs} runs · {fmtTokens(t.input_tokens + t.output_tokens)} tokens · $
                  {t.cost_usd.toFixed(6)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${(t.cost_usd / maxCost) * 100}%`,
                    background: 'linear-gradient(90deg, var(--purple), var(--amber))',
                  }}
                />
              </div>
            </div>
          ))
        )}
      </Panel>
    </div>
  );
}
