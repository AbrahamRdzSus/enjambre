import { useAgents, useProviders, useStats } from '../api/hooks';
import HexSwarm from '../components/HexSwarm';
import StatCard from '../components/StatCard';
import { ProviderCostBars, ProviderTokenDonut } from '../components/UsageCharts';

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

export default function OverviewPage() {
  const agents = useAgents();
  const providers = useProviders();
  const stats = useStats();

  const enabled = (agents.data ?? []).filter((a) => a.enabled).length;
  const total = agents.data?.length ?? 0;
  const tallies = Object.values(stats.data?.by_provider ?? {});
  const runs = tallies.reduce((s, t) => s + t.runs, 0);
  const ok = tallies.reduce((s, t) => s + t.ok, 0);
  const success = runs > 0 ? (ok / runs) * 100 : 0;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="eyebrow">Panel</p>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--fg)' }}>
          Tu equipo de IAs trabajando en paralelo
        </h1>
      </header>

      {/* Hero: viz hexagonal del enjambre */}
      <div
        className="gradient-border relative overflow-hidden"
        style={{
          background:
            'radial-gradient(120% 90% at 50% 0%, rgba(139,92,246,0.10), transparent 60%), var(--bg-raised)',
          padding: 8,
        }}
      >
        <HexSwarm size={440} />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 84 }} />
          ))
        ) : (
          <>
            <StatCard label="Agentes activos" value={enabled} accent="var(--purple-soft)" hint={`de ${total} registrados`} />
            <StatCard label="Sesiones" value={stats.data?.sessions ?? 0} accent="var(--fg)" />
            <StatCard label="Tokens" value={stats.data?.total_tokens ?? 0} format={fmtTokens} accent="var(--purple-soft)" />
            <StatCard label="Costo acumulado" value={stats.data?.total_cost_usd ?? 0} format={(n) => `$${n.toFixed(4)}`} accent="var(--amber)" />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="glass p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--fg-mute)' }}>Costo por proveedor</h2>
            <span className="text-xs" style={{ color: 'var(--amber)' }}>{success.toFixed(1)}% éxito</span>
          </div>
          <ProviderCostBars stats={stats.data} />
        </div>
        <div className="glass p-4">
          <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--fg-mute)' }}>Tokens por proveedor</h2>
          <ProviderTokenDonut stats={stats.data} />
        </div>
      </div>

      {/* Agentes */}
      <section>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--fg-mute)' }}>AGENTES</h2>
        <div className="grid grid-cols-2 gap-4">
          {(agents.data ?? []).map((a) => (
            <div key={a.name} className="glass p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold" style={{ color: 'var(--fg)' }}>{a.name}</span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: a.enabled ? 'rgba(34,197,94,0.15)' : 'rgba(111,102,144,0.15)',
                    color: a.enabled ? 'var(--ok)' : 'var(--fg-faint)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {a.enabled ? 'activo' : 'inactivo'}
                </span>
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--fg-mute)' }}>
                {a.role} · {a.provider}/{a.model || 'default'}
              </p>
            </div>
          ))}
          {agents.data?.length === 0 && (
            <p className="text-sm" style={{ color: 'var(--fg-faint)' }}>Sin agentes registrados.</p>
          )}
        </div>
      </section>

      {/* API Keys (BYOK) */}
      <section>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--fg-mute)' }}>API KEYS (BYOK)</h2>
        <div className="flex flex-wrap gap-2">
          {(providers.data ?? []).map((p) => (
            <span
              key={p.provider}
              className="text-xs px-3 py-1.5 rounded-lg border"
              style={{
                borderColor: 'var(--border)',
                color: p.key_present ? 'var(--ok)' : 'var(--fg-faint)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {p.provider}: {p.key_present ? 'OK' : 'falta'}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
