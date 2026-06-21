import { useAgents, useProviders, useStats } from '../api/hooks';

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-4 border"
      style={{
        background: 'var(--bg-card)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {children}
    </div>
  );
}

export default function OverviewPage() {
  const agents = useAgents();
  const providers = useProviders();
  const stats = useStats();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="eyebrow">Panel</p>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--fg)' }}>
          Tu equipo de IAs trabajando en paralelo
        </h1>
      </header>

      {/* Resumen rapido */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <p className="text-xs" style={{ color: 'var(--fg-mute)' }}>Agentes habilitados</p>
          <p className="text-2xl font-semibold" style={{ color: 'var(--purple-soft)' }}>
            {agents.data?.filter((a) => a.enabled).length ?? '—'}
          </p>
        </Card>
        <Card>
          <p className="text-xs" style={{ color: 'var(--fg-mute)' }}>Sesiones guardadas</p>
          <p className="text-2xl font-semibold" style={{ color: 'var(--fg)' }}>
            {stats.data?.sessions ?? '—'}
          </p>
        </Card>
        <Card>
          <p className="text-xs" style={{ color: 'var(--fg-mute)' }}>Costo acumulado</p>
          <p className="text-2xl font-semibold" style={{ color: 'var(--amber)' }}>
            ${(stats.data?.total_cost_usd ?? 0).toFixed(4)}
          </p>
        </Card>
      </div>

      {/* Agentes */}
      <section>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--fg-mute)' }}>
          AGENTES
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {(agents.data ?? []).map((a) => (
            <Card key={a.name}>
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
            </Card>
          ))}
          {agents.data?.length === 0 && (
            <p className="text-sm" style={{ color: 'var(--fg-faint)' }}>
              Sin agentes registrados.
            </p>
          )}
        </div>
      </section>

      {/* API Keys (BYOK) */}
      <section>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--fg-mute)' }}>
          API KEYS (BYOK)
        </h2>
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
