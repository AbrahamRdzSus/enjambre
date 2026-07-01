import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import PowerHex from './ui/PowerHex';
import HoneycombBurst from './ui/HoneycombBurst';

// Experiencia de entrada cinematografica. Secuencia: idle (tecla hex apagada) ->
// igniting (encendido) -> portal (hexagonos concentricos que se expanden/rotan/
// desvanecen + fade de textos) -> done (overlay se disuelve y se revela la landing).
// Bloquea el scroll durante la secuencia. La intro SIEMPRE se ve; con
// prefers-reduced-motion se muestra una version calmada (sin portal ni vibracion,
// entrada rapida). Llama onDone() al terminar para que el padre habilite el scroll.

type Phase = 'idle' | 'igniting' | 'portal';

export default function EntryGate({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion();
  const [show, setShow] = useState(true);
  const [phase, setPhase] = useState<Phase>('idle');

  function finish() {
    setShow(false);
    onDone();
  }

  function ignite() {
    if (phase !== 'idle') return;
    setPhase('igniting');
    if (reduce) {
      // Version calmada: sin portal, entrada rapida.
      setTimeout(finish, 600);
      return;
    }
    setTimeout(() => setPhase('portal'), 520);
    setTimeout(finish, 3200);
  }

  // Esc salta la intro (accesibilidad / recurrentes).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const textGone = phase === 'portal';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[120] grid place-items-center overflow-hidden"
          style={{
            background:
              'radial-gradient(60% 50% at 50% 45%, rgba(139,92,246,0.10), transparent 70%), var(--bg)',
          }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
        >
          {/* Acceso: panal hexagonal en secuencia radial + lineas que giran. */}
          {phase === 'portal' && <HoneycombBurst />}

          <div className="relative flex flex-col items-center gap-7 px-6 text-center">
            <motion.span
              className="kicker"
              animate={textGone ? { opacity: 0, y: -10 } : { opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              sistema de orquestacion
            </motion.span>

            <PowerHex on={phase !== 'idle'} onActivate={ignite} />

            <motion.div
              className="flex flex-col items-center gap-2"
              animate={textGone ? { opacity: 0, y: -16 } : { opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="wordmark text-xl" style={{ letterSpacing: '0.26em' }}>
                ENJAMBRE
              </span>
              <span className="text-sm text-muted-foreground">
                {phase === 'idle' ? 'Pulsa el nucleo para entrar' : 'Encendiendo...'}
              </span>
            </motion.div>
          </div>

          {/* Saltar (accesibilidad / recurrentes) */}
          {phase === 'idle' && (
            <button
              type="button"
              onClick={finish}
              className="absolute bottom-6 right-6 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              saltar intro →
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
