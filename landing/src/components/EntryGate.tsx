import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import PowerHex from './ui/PowerHex';

// Experiencia de entrada cinematografica. Secuencia: idle (tecla hex apagada) ->
// igniting (encendido) -> portal (hexagonos concentricos que se expanden/rotan/
// desvanecen + fade de textos) -> done (overlay se disuelve y se revela la landing).
// Bloquea el scroll durante la secuencia. Respeta prefers-reduced-motion (entra
// directo). Llama onDone() al terminar para que el padre habilite el scroll.
const HEX = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';
type Phase = 'idle' | 'igniting' | 'portal';

export default function EntryGate({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion();
  const [show, setShow] = useState(true);
  const [phase, setPhase] = useState<Phase>('idle');

  // Bypass por accesibilidad: con reduced-motion no hay gate.
  useEffect(() => {
    if (reduce) {
      setShow(false);
      onDone();
    }
  }, [reduce, onDone]);

  function finish() {
    setShow(false);
    onDone();
  }

  function ignite() {
    if (phase !== 'idle') return;
    setPhase('igniting');
    setTimeout(() => setPhase('portal'), 520);
    setTimeout(finish, 3200);
  }

  if (reduce) return null;

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
          {/* Portal: hexagonos concentricos que estallan al encender */}
          {phase === 'portal' && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden>
              {Array.from({ length: 6 }).map((_, i) => (
                <motion.span
                  key={i}
                  className="absolute"
                  style={{
                    width: 160,
                    height: 160,
                    clipPath: HEX,
                    boxShadow: `inset 0 0 0 1.5px ${i % 2 ? 'rgba(255,176,32,0.6)' : 'rgba(139,92,246,0.6)'}`,
                  }}
                  initial={{ scale: 0.3, opacity: 0, rotate: 0 }}
                  animate={{ scale: 9, opacity: [0, 0.7, 0], rotate: 120 }}
                  transition={{ duration: 2.6, ease: 'easeOut', delay: i * 0.16 }}
                />
              ))}
            </div>
          )}

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
