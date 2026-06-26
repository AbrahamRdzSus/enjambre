import { Download as DownloadIcon, Terminal, GitFork } from 'lucide-react';
import { REPO, RELEASES } from '../links';
import { useLatestInstaller } from '../useLatestInstaller';

export default function Download() {
  const { href: downloadHref, version } = useLatestInstaller();
  return (
    <section id="descargar" className="px-6 py-20">
      <div className="mx-auto w-full max-w-4xl">
        <div className="glass hex-field relative overflow-hidden p-8 text-center sm:p-12">
          <span className="kicker mb-3 justify-center">Descarga</span>
          <h2 className="mb-3 text-3xl font-bold">Instala ENJAMBRE en Windows</h2>
          <p className="mx-auto mb-8 max-w-2xl text-sm text-muted-foreground">
            Instalador de escritorio (Tauri). Doble clic y listo: incluye el motor local.
            Proyecto en beta; al ser un instalador sin firma todavia, Windows SmartScreen
            puede pedir confirmacion (Mas informacion - Ejecutar de todos modos).
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href={downloadHref}
              className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold"
              style={{ background: 'var(--amber)', color: '#1a1006' }}
            >
              <DownloadIcon size={18} /> Descargar .exe (Windows x64)
              {version && <span className="font-mono opacity-70">{version}</span>}
            </a>
            <a
              href={RELEASES}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-medium hover:border-primary"
            >
              Ver todas las versiones
            </a>
          </div>

          <div className="mt-8 flex flex-col items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <Terminal size={14} /> Otras plataformas: clona el repo y compila desde fuente.
            </span>
            <a href={REPO} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
              <GitFork size={14} /> Instrucciones en el README
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
