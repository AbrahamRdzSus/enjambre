import { useStats } from '../api/hooks';

export default function StatsPage() {
  const stats = useStats();
  const data = stats.data;
  const providers = Object.entries(data?.by_provider ?? {});
  const maxCost = Math.max(0.000001, ...providers.map(([, t]) => t.cost_usd));

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="eyebrow">Estadisticas</p>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--fg)' }}>
          Consumo por proveedor
        </h1>
      </header>

      {data && data.sessions === 0 && (
        <p className="text-sm" style={{ color: 'var(--fg-faint)' }}>
          Sin sesiones guardadas. Lanza una tarea con "guardar sesion" para ver consumo.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {providers.map(([name, t]) => (
          <div
            key={name}
            className="rounded-xl border p-4"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm" style={{ color: 'var(--fg)' }}>{name}</span>
              <span className="text-xs" style={{ color: 'var(--fg-mute)', fontFamily: 'var(--font-mono)' }}>
                {t.runs} runs · {t.input_tokens + t.output_tokens} tokens · ${t.cost_usd.toFixed(6)}
              </span>
            </div>
            <div className="h-2 rounded-full" style={{ background: 'var(--border)' }}>
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${(t.cost_usd / maxCost) * 100}%`,
                  background: 'linear-gradient(90deg, var(--purple), var(--amber))',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {data && (
        <p className="text-xs" style={{ color: 'var(--fg-mute)' }}>
          {data.sessions} sesiones · {data.total_tokens} tokens · ${data.total_cost_usd.toFixed(6)} USD total
        </p>
      )}
    </div>
  );
}
