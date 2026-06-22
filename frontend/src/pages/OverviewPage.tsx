import { useAgents, useLogs, useProviders, useStats } from '../api/hooks';
import HexSwarm from '../components/HexSwarm';
import StatCard from '../components/StatCard';
import CircularProgress from '../components/CircularProgress';
import { ProviderCostBars, ProviderTokenDonut } from '../components/UsageCharts';
import { useRunStore } from '../stores/run-store';

const DOT: Record<string, string> = {
  running: 'var(--amber)', ok: 'var(--ok)', error: 'var(--alert)',
  enabled: 'var(--purple)', idle: 'var(--fg-faint)',
};

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

export default function OverviewPage() {
  const agents = useAgents();
  const providers = useProviders();
  const stats = useStats();
  const logs = useLogs();
  const runStatus = useRunStore((s) => s.status);

  const enabled = (agents.data ?? []).filter((a) => a.enabled).length;
  const total = agents.data?.length ?? 0;
  const tallies = Object.values(stats.data?.by_provider ?? {});
  const runs = tallies.reduce((s, t) => s + t.runs, 0);
  const ok = tallies.reduce((s, t) => s + t.ok, 0);
  const success = runs > 0 ? (ok / runs) * 100 : 0;
  const tokenBars = tallies.map((t) => t.input_tokens + t.output_tokens);
  const costBars = tallies.map((t) => t.cost_usd);
  const runBars = tallies.map((t) => t.runs);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="eyebrow">Panel</p>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--fg)' }}>
          Tu equipo de IAs trabajando en paralelo
        </h1>
      </header>

      {/* Hero: viz hexagonal + panel de estado (2 columnas, densifica el ancho) */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)' }}>
        <div
          className="gradient-border relative overflow-hidden flex items-center"
          style={{
            background:
              'radial-gradient(120% 90% at 50% 0%, rgba(139,92,246,0.12), transparent 60%), var(--bg-raised)',
            padding: 8,
          }}
        >
          <HexSwarm size={400} />
        </div>

        <div className="glass p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--fg-mute)' }}>ESTADO DEL ENJAMBRE</h2>
            <CircularProgress value={success} size={72} label="éxito" />
          </div>
          <div className="flex flex-col gap-2">
            {(agents.data ?? []).map((a) => {
              const st = runStatus[a.name] ?? (a.enabled ? 'enabled' : 'idle');
              return (
                <div key={a.name} className="flex items-center gap-2 text-xs">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ background: DOT[st] }} />
                  <span style={{ color: 'var(--fg)' }}>{a.name}</span>
                  <span className="ml-auto" style={{ color: 'var(--fg-faint)', fontFamily: 'var(--font-mono)' }}>
                    {st === 'running' ? 'pensando' : st === 'enabled' ? a.provider : st}
                  </span>
                </div>
              );
            })}
            {agents.data?.length === 0 && (
              <p className="text-xs" style={{ color: 'var(--fg-faint)' }}>Sin agentes.</p>
            )}
          </div>

          <div className="border-t pt-2 mt-1" style={{ borderColor: 'var(--border)' }}>
            <p className="eyebrow mb-2">Actividad</p>
            <div className="flex flex-col gap-1" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
              {(logs.data ?? []).slice(-6).reverse().map((e, i) => (
                <div key={`${e.ts}-${i}`} className="flex gap-2 truncate">
                  <span style={{ color: 'var(--purple-soft)' }}>{e.event}</span>
                  {e.agent && <span style={{ color: 'var(--amber-soft)' }}>{e.agent}</span>}
                </div>
              ))}
              {(logs.data ?? []).length === 0 && (
                <span style={{ color: 'var(--fg-faint)' }}>Sin actividad. Lanza una tarea.</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 84 }} />
          ))
        ) : (
          <>
            <StatCard label="Agentes activos" value={enabled} accent="var(--purple-soft)" hint={`de ${total} registrados`} bars={runBars} />
            <StatCard label="Sesiones" value={stats.data?.sessions ?? 0} accent="var(--fg)" />
            <StatCard label="Tokens" value={stats.data?.total_tokens ?? 0} format={fmtTokens} accent="var(--purple-soft)" bars={tokenBars} />
            <StatCard label="Costo acumulado" value={stats.data?.total_cost_usd ?? 0} format={(n) => `$${n.toFixed(4)}`} accent="var(--amber)" bars={costBars} />
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
