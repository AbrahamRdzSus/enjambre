import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { api } from '../api/client';

// Pantalla de carga (mockup 1): hex logo + wordmark ENJAMBRE + tagline + pasos.
// Se desvanece al terminar la secuencia. Respeta prefers-reduced-motion.

const STEPS = ['Cargando proyecto local', 'Verificando API Keys', 'Preparando enjambre'];

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [show, setShow] = useState(true);

  useEffect(() => {
    api.get('/health').catch(() => {}); // warm-up best-effort
    const base = reduce ? 120 : 600;
    const timers = [
      setTimeout(() => setStep(1), base),
      setTimeout(() => setStep(2), base * 2),
      setTimeout(() => setStep(3), base * 3),
      setTimeout(() => setShow(false), base * 3 + 500),
    ];
    return () => timers.forEach(clearTimeout);
  }, [reduce]);

  return (
    <AnimatePresence onExitComplete={onDone}>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{
            background:
              'radial-gradient(120% 80% at 50% 35%, rgba(139,92,246,0.16), transparent 60%), var(--bg-app)',
          }}
        >
          <motion.img
            src="/logos/hex.png"
            alt="ENJAMBRE"
            width={132}
            height={132}
            initial={reduce ? false : { scale: 0.8, opacity: 0 }}
            animate={reduce ? undefined : { scale: 1, opacity: 1, y: [0, -6, 0] }}
            transition={reduce ? undefined : { scale: { duration: 0.6 }, opacity: { duration: 0.6 }, y: { duration: 4, repeat: Infinity, ease: 'easeInOut' } }}
            style={{ filter: 'drop-shadow(0 0 24px rgba(139,92,246,0.5))' }}
          />
          <h1 className="wordmark mt-6" style={{ fontSize: 52, letterSpacing: '0.22em' }}>
            ENJAMBRE
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--amber-soft)', fontFamily: 'var(--font-mono)' }}>
            IA Coder · by Obsidia Studio
          </p>
          <p className="mt-2 text-sm" style={{ color: 'var(--fg-mute)' }}>
            Tu equipo de IAs trabajando en paralelo
          </p>

          {/* barra de progreso */}
          <div className="mt-8 w-72 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <motion.div
              className="h-full"
              style={{ background: 'linear-gradient(90deg, var(--purple), var(--amber))' }}
              initial={{ width: '0%' }}
              animate={{ width: `${(step / STEPS.length) * 100}%` }}
              transition={{ duration: reduce ? 0 : 0.4 }}
            />
          </div>

          {/* pasos */}
          <div className="mt-5 flex flex-col gap-2">
            {STEPS.map((label, i) => {
              const done = i < step;
              return (
                <div key={label} className="flex items-center gap-2 text-xs" style={{ color: done ? 'var(--fg)' : 'var(--fg-faint)' }}>
                  <span
                    className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px]"
                    style={{ background: done ? 'var(--ok)' : 'var(--border)', color: '#05140a' }}
                  >
                    {done ? '✓' : ''}
                  </span>
                  {label}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
