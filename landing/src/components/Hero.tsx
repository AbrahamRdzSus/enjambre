import { Download, GitFork } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import MicroHex from './ui/MicroHex';
import HexBloom from './ui/HexBloom';
import HexCore from './HexCore';
import { REPO } from '../links';
import { useLatestInstaller } from '../useLatestInstaller';

export default function Hero() {
  const { href: downloadHref } = useLatestInstaller();
  const reduce = useReducedMotion();
  return (
    <section className="relative overflow-hidden px-6 pb-16 pt-10">
      <MicroHex />

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
          {/* Halo que respira (referencia hero Obsidia Eye): glow organico, sin anillos mecanicos */}
          <motion.div
            className="pointer-events-none absolute"
            aria-hidden
            style={{
              width: '78%',
              aspectRatio: '1',
              borderRadius: '50%',
              background:
                'radial-gradient(circle at 50% 45%, rgba(255,176,32,0.20), rgba(139,92,246,0.16) 38%, transparent 68%)',
              filter: 'blur(8px)',
            }}
            animate={reduce ? undefined : { scale: [1, 1.08, 1], opacity: [0.65, 1, 0.65] }}
            transition={reduce ? undefined : { duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="glass relative w-full max-w-md overflow-hidden p-6"
            style={{
              background:
                'radial-gradient(120% 90% at 50% 0%, rgba(139,92,246,0.14), transparent 60%), color-mix(in srgb, var(--panel-2) 80%, transparent)',
            }}
            animate={reduce ? undefined : { y: [0, -12, 0] }}
            transition={reduce ? undefined : { duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          >
            <HexBloom />
            <HexCore size={420} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
