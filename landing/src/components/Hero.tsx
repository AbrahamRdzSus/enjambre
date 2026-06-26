import { Download, GitFork } from 'lucide-react';
import { Particles } from './ui/particles';
import { BorderBeam } from './ui/border-beam';
import HexCore from './HexCore';
import { REPO } from '../links';
import { useLatestInstaller } from '../useLatestInstaller';

export default function Hero() {
  const { href: downloadHref } = useLatestInstaller();
  return (
    <section className="relative overflow-hidden px-6 pb-16 pt-10">
      <Particles
        className="absolute inset-0"
        style={{ zIndex: 0, opacity: 0.6 }}
        quantity={90}
        color="#8b5cf6"
        size={0.5}
        staticity={60}
      />

      <div
        className="relative mx-auto grid w-full max-w-6xl items-center gap-10 py-10 lg:grid-cols-2"
        style={{ zIndex: 1 }}
      >
        <div className="flex flex-col gap-6">
          <span className="kicker">by Obsidia Studio · local-first · BYOK</span>
          <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
            Tu equipo de IAs<br />
            <span className="wordmark">trabajando en paralelo</span>
          </h1>
          <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
            ENJAMBRE coordina varios agentes de IA de codificacion sobre tus proyectos.
            Conectas tus propias API keys, lanzas una tarea en paralelo, comparas las
            salidas de cada agente y aplicas los cambios con aprobacion humana. Corre en
            tu maquina: tu codigo y tus claves no salen de ahi.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={downloadHref}
              className="flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-transform active:scale-[0.97]"
              style={{ background: 'var(--amber)', color: '#1a1006', boxShadow: '0 10px 40px -12px rgba(255,176,32,0.5)' }}
            >
              <Download size={18} /> Descargar para Windows
            </a>
            <a
              href={REPO}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-medium text-foreground transition-colors active:scale-[0.97] hover:border-primary"
            >
              <GitFork size={18} /> Ver en GitHub
            </a>
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            Apache-2.0 · open source · sin entrenamiento de modelos de terceros
          </p>
        </div>

        <div className="relative flex items-center justify-center">
          <div
            className="glass relative w-full max-w-md overflow-hidden p-6"
            style={{
              background:
                'radial-gradient(120% 90% at 50% 0%, rgba(139,92,246,0.14), transparent 60%), color-mix(in srgb, var(--panel-2) 80%, transparent)',
            }}
          >
            <HexCore size={420} />
            <BorderBeam size={100} duration={8} />
          </div>
        </div>
      </div>
    </section>
  );
}
