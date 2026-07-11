/*
 * F1 (OPS HUD): vista Deploy. Lista las apps del hub de CD (pm2, health, ultimo
 * commit) via el proxy del sidecar /hub/status, y permite DISPARAR un deploy
 * (/hub/deploy/{app}). El progreso real llega por el poll de status (campo
 * `deploying`); el stream WS en vivo es un slice posterior. Gated por
 * VITE_HUB_DEPLOY; requiere que el sidecar tenga ENJAMBRE_HUB_URL + PIN admin.
 * Disparar un deploy pide confirmacion (step-up UX): el credencial vive
 * server-side, el frontend solo confirma la accion.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hub, type HubAppStatus, type HubDeployRecord } from '../api/hub';

function statusColor(s?: string): string {
  if (s === 'online') return 'var(--ok)';
  if (s === 'stopped' || s === 'errored') return 'var(--alert)';
  return 'var(--fg-faint)';
}

export default function DeployPage() {
  const qc = useQueryClient();
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['hub-status'],
    queryFn: () => hub.status(),
    refetchInterval: 8000,
  });

  const deploy = useMutation({
    mutationFn: (app: string) => hub.deploy(app, 'full'),
    onSuccess: (_res, app) => {
      setMsg({ kind: 'ok', text: `Deploy de ${app} iniciado. Sigue el avance en la columna Estado.` });
      qc.invalidateQueries({ queryKey: ['hub-status'] });
    },
    onError: (e: Error, app) => setMsg({ kind: 'err', text: `No se pudo desplegar ${app}: ${e.message}` }),
  });

  const history = useQuery({
    queryKey: ['hub-history'],
    queryFn: () => hub.history(),
    refetchInterval: 15000,
  });

  const rollback = useMutation({
    mutationFn: ({ app, commit }: { app: string; commit: string }) => hub.rollback(app, commit),
    onSuccess: (res, { app }) => {
      setMsg({
        kind: 'ok',
        text: `${app} revertido a ${res.rolledBackTo}. Ahora DESPLIEGA para publicar el binario.`,
      });
    },
    onError: (e: Error, { app }) => setMsg({ kind: 'err', text: `No se pudo revertir ${app}: ${e.message}` }),
  });

  function onDeploy(app: string) {
    const ok = window.confirm(
      `Desplegar "${app}"?\n\nEsto hace git pull, reconstruye y reinicia la app en PRODUCCION.`,
    );
    if (ok) deploy.mutate(app);
  }

  function onRollback(app: string, commit: string) {
    const ok = window.confirm(
      `Revertir "${app}" al commit ${commit}?\n\nHace git checkout de ese commit. Despues debes DESPLEGAR para publicarlo.`,
    );
    if (ok) rollback.mutate({ app, commit });
  }

  const records = history.data ?? [];

  const apps = data ? Object.entries(data) : [];
  const busy = (app: string, row: HubAppStatus) =>
    row.deploying || (deploy.isPending && deploy.variables === app);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="eyebrow">Obsidia CD</p>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--fg)' }}>Deploy</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--fg-mute)' }}>
          Estado de las apps del hub y disparo de deploys (proxy via el sidecar).
        </p>
      </div>

      {msg && (
        <div className="rounded-lg border px-4 py-2 text-sm flex items-center justify-between gap-4"
             style={{ borderColor: 'var(--border)', color: msg.kind === 'ok' ? 'var(--ok)' : 'var(--alert)' }}>
          <span>{msg.text}</span>
          <button type="button" onClick={() => setMsg(null)} style={{ color: 'var(--fg-faint)' }}>cerrar</button>
        </div>
      )}

      {isLoading && (
        <p className="text-sm" style={{ color: 'var(--fg-faint)' }}>Cargando estado del hub…</p>
      )}
      {isError && (
        <div className="rounded-lg border px-4 py-3 text-sm"
             style={{ borderColor: 'var(--border)', color: 'var(--fg-mute)' }}>
          No se pudo leer el hub. Verifica que el sidecar tenga <code>ENJAMBRE_HUB_URL</code>
          {' '}y <code>ENJAMBRE_HUB_PIN</code> (admin) configurados.
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
                <th className="text-right px-4 py-2 font-medium">Accion</th>
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
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => onDeploy(name)}
                      disabled={busy(name, app)}
                      className="px-3 h-8 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-40"
                      style={{ background: 'var(--amber)', color: '#1a1006' }}
                    >
                      {busy(name, app) ? 'Desplegando…' : 'Desplegar'}
                    </button>
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

      {records.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="eyebrow">Historial de deploys</p>
          <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: 'var(--fg-faint)' }}>
                  <th className="text-left px-4 py-2 font-medium">Fecha</th>
                  <th className="text-left px-4 py-2 font-medium">App</th>
                  <th className="text-left px-4 py-2 font-medium">Alcance</th>
                  <th className="text-left px-4 py-2 font-medium">Resultado</th>
                  <th className="text-left px-4 py-2 font-medium">Commit</th>
                  <th className="text-right px-4 py-2 font-medium">Accion</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r: HubDeployRecord, i: number) => (
                  <tr key={`${r.ts}-${i}`} style={{ borderTop: '1px solid var(--border)' }}>
                    <td className="px-4 py-2 text-[12px]" style={{ color: 'var(--fg-mute)' }}>
                      {new Date(r.ts).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 font-mono" style={{ color: 'var(--fg)' }}>{r.app}</td>
                    <td className="px-4 py-2" style={{ color: 'var(--fg-mute)' }}>{r.only ?? '—'}</td>
                    <td className="px-4 py-2" style={{ color: r.ok ? 'var(--ok)' : 'var(--alert)' }}>
                      {r.ok ? 'ok' : (r.error ? `error: ${r.error}` : 'error')}
                    </td>
                    <td className="px-4 py-2 font-mono text-[12px]" style={{ color: 'var(--fg-mute)' }}>
                      {r.commitBefore ? `${r.commitBefore} → ${r.commitAfter ?? '?'}` : '—'}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {r.commitBefore && (
                        <button
                          type="button"
                          onClick={() => onRollback(r.app, r.commitBefore!)}
                          disabled={rollback.isPending}
                          className="px-3 h-8 rounded-lg text-xs font-medium border transition-opacity disabled:opacity-40"
                          style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
                          title={`Revertir ${r.app} a ${r.commitBefore}`}
                        >
                          Revertir a {r.commitBefore}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
