/**
 * Banner de "el sidecar no responde".
 *
 * Existe porque Overview y Stats caian a `?? 0` cuando la query fallaba: con el
 * sidecar caido el cockpit pintaba 0 agentes, $0.00 y "—" de exito, que es
 * indistinguible de "todavia no has usado la app". Mostrar ceros como si fueran
 * datos reales es peor que no mostrar nada.
 */
import { AlertTriangle } from 'lucide-react';
import { errorMessage } from '../../lib/errors';

export default function OfflineBanner({ error }: { error: unknown }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-lg border px-3 py-2.5"
      style={{
        borderColor: 'color-mix(in srgb, var(--alert) 35%, transparent)',
        background: 'color-mix(in srgb, var(--alert) 8%, transparent)',
      }}
    >
      <AlertTriangle size={15} style={{ color: 'var(--alert)', marginTop: 1, flex: 'none' }} />
      <div className="min-w-0">
        <p className="text-[12px] font-semibold" style={{ color: 'var(--alert)' }}>
          Sin datos del sidecar
        </p>
        <p className="text-[11px] text-muted-foreground">
          {errorMessage(error)} Las cifras de abajo no son reales.
        </p>
      </div>
    </div>
  );
}
