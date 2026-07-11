/*
 * F1 (OPS HUD): vista Deploy. Read-only por ahora: lista las apps del hub de CD
 * (pm2, health, ultimo commit) via el proxy del sidecar /hub/status. Gated por
 * VITE_HUB_DEPLOY; requiere que el sidecar tenga ENJAMBRE_HUB_URL definido (si no,
 * /hub/status responde 404 y aqui se muestra "hub no configurado"). Disparar deploys
 * es un slice posterior.
 */
import { useQuery } from '@tanstack/react-query';
import { hub, type HubAppStatus } from '../api/hub';

function statusColor(s?: string): string {
  if (s === 'online') return 'var(--ok)';
  if (s === 'stopped' || s === 'errored') return 'var(--alert)';
  return 'var(--fg-faint)';
}

export default function DeployPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['hub-status'],
    queryFn: () => hub.status(),
    refetchInterval: 8000,
  });

  const apps = data ? Object.entries(data) : [];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="eyebrow">Obsidia CD</p>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--fg)' }}>Deploy</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--fg-mute)' }}>
          Estado de las apps del hub (proxy read-only via el sidecar).
        </p>
      </div>

      {isLoading && (
        <p className="text-sm" style={{ color: 'var(--fg-faint)' }}>Cargando estado del hub…</p>
      )}
      {isError && (
        <div className="rounded-lg border px-4 py-3 text-sm"
             style={{ borderColor: 'var(--border)', color: 'var(--fg-mute)' }}>
          No se pudo leer el hub. Verifica que el sidecar tenga <code>ENJAMBRE_HUB_URL</code>
          {' '}y <code>ENJAMBRE_HUB_PIN</code> configurados.
          <span className="block mt-1 text-[11px]" style={{ color: 'var(--fg-faint)' }}>
            {(error as Error)?.message}
          </span>
        </div>
      )}

      {!isLoading && !isError && apps.length > 0 && (
        <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: 'var(--fg-faint)' }}>
                <th className="text-left px-4 py-2 font-medium">App</th>
                <th className="text-left px-4 py-2 font-medium">PM2</th>
                <th className="text-left px-4 py-2 font-medium">Puerto</th>
                <th className="text-left px-4 py-2 font-medium">Ultimo commit</th>
                <th className="text-left px-4 py-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {apps.map(([name, app]: [string, HubAppStatus]) => (
                <tr key={name} style={{ borderTop: '1px solid var(--border)' }}>
                  <td className="px-4 py-2 font-mono" style={{ color: 'var(--fg)' }}>
                    {app.label || name}
                  </td>
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full"
                            style={{ background: statusColor(app.pm2?.status) }} />
                      {app.pm2?.status ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2" style={{ color: 'var(--fg-mute)' }}>{app.port ?? '—'}</td>
                  <td className="px-4 py-2 font-mono text-[12px]" style={{ color: 'var(--fg-mute)' }}>
                    {app.lastCommit ?? '—'}
                  </td>
                  <td className="px-4 py-2" style={{ color: 'var(--fg-mute)' }}>
                    {app.deploying ? 'desplegando…' : (app.health ? 'ok' : '—')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && !isError && apps.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--fg-faint)' }}>El hub no reporto apps.</p>
      )}
    </div>
  );
}
