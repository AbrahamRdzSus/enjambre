import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import PowerHex from './ui/PowerHex';

// Experiencia de entrada cinematografica. Secuencia: idle (tecla hex apagada) ->
// igniting (encendido) -> portal (hexagonos concentricos que se expanden/rotan/
// desvanecen + fade de textos) -> done (overlay se disuelve y se revela la landing).
// Bloquea el scroll durante la secuencia. La intro SIEMPRE se ve; con
// prefers-reduced-motion se muestra una version calmada (sin portal ni vibracion,
// entrada rapida). Llama onDone() al terminar para que el padre habilite el scroll.
const HEX = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';
type Phase = 'idle' | 'igniting' | 'portal';

const SEEN_KEY = 'enjambre_intro_seen';

export default function EntryGate({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion();
  // REC: una vez por sesion + bypass si llega con deep-link a una seccion.
  const [show, setShow] = useState(() => {
    if (typeof window === 'undefined') return true;
    const seen = sessionStorage.getItem(SEEN_KEY) === '1';
    const deepLink = window.location.hash.length > 1;
    return !seen && !deepLink;
  });
  const [phase, setPhase] = useState<Phase>('idle');

  function finish() {
    try {
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* sessionStorage no disponible: no pasa nada */
    }
    setShow(false);
    onDone();
  }

  function ignite() {
    if (phase !== 'idle') return;
    setPhase('igniting');
    if (reduce) {
      // Version calmada: sin portal, entrada rapida.
      setTimeout(finish, 500);
      return;
    }
    // REC: portal mas corto (~1.6s, total ~2.1s).
    setTimeout(() => setPhase('portal'), 380);
    setTimeout(finish, 2150);
  }

  // Si la intro no debe mostrarse, entra directo.
  useEffect(() => {
    if (!show) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          {/* Portal: cinematica "nested" pero de HEXAGONOS — muchos hexagonos
              anidados que escalan 0->2x y rotan 180deg en cascada (ripple). */}
          {phase === 'portal' && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden>
              {Array.from({ length: 16 }).map((_, i) => (
                <motion.span
                  key={i}
                  className="absolute"
                  style={{
                    width: 340,
                    height: 340,
                    clipPath: HEX,
                    boxShadow: `inset 0 0 0 1.5px ${i % 2 ? 'rgba(255,176,32,0.55)' : 'rgba(139,92,246,0.55)'}`,
                  }}
                  initial={{ scale: 0, opacity: 0, rotate: 0 }}
                  animate={{ scale: [0, 2], opacity: [0, 0.8, 0], rotate: 180 }}
                  transition={{
                    duration: 1.5,
                    ease: 'easeInOut',
                    delay: i * 0.05,
                    times: [0, 1],
                  }}
                />
              ))}
              {/* Algunas particulas geometricas cruzando */}
              {Array.from({ length: 5 }).map((_, i) => (
                <motion.span
                  key={`p-${i}`}
                  className="absolute"
                  style={{
                    width: 12 + i * 4,
                    height: 12 + i * 4,
                    clipPath: HEX,
                    boxShadow: 'inset 0 0 0 1px rgba(167,139,250,0.7)',
                  }}
                  initial={{ x: 0, y: 0, opacity: 0 }}
                  animate={{
                    x: (i % 2 ? 1 : -1) * (220 + i * 60),
                    y: (i % 3 - 1) * (160 + i * 30),
                    opacity: [0, 1, 0],
                    rotate: 120,
                  }}
                  transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 + i * 0.1 }}
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
