import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { checkForUpdate, type UpdateInfo } from '../lib/updater';

// Aviso de actualizacion para la app de escritorio. En navegador no aparece
// (checkForUpdate devuelve null fuera de Tauri).
export default function UpdateBanner() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let alive = true;
    checkForUpdate().then((u) => {
      if (alive) setUpdate(u);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!update || dismissed) return null;

  return (
    <div
      className="glass fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3"
      style={{ maxWidth: 360, borderColor: 'var(--amber)' }}
    >
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
          Nueva version {update.version}
        </span>
        <span className="text-xs" style={{ color: 'var(--fg-mute)' }}>
          {busy ? 'Descargando e instalando...' : 'Lista para instalar'}
        </span>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          update.install().catch(() => setBusy(false));
        }}
        className="flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ background: 'var(--amber)', color: '#1a1006' }}
      >
        <Download size={15} /> Actualizar
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="text-[var(--fg-faint)] hover:text-[var(--fg)] cursor-pointer"
        aria-label="Cerrar aviso"
      >
        <X size={16} />
      </button>
    </div>
  );
}
