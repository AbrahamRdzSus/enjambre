import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

// Pantalla de carga con loader de panal hexagonal. Re-creacion nativa del concepto
// "honeycomb loader": 7 celdas hex (centro + 6) que pulsan en secuencia. Se auto-
// descarta (~1.1s) y se omite/acorta bajo prefers-reduced-motion. No bloquea el
// scroll despues de cerrarse. Solo decorativo en la primera carga.
const HEX = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';
const CELL = 30; // px
const GAP = 5;

// Posiciones de panal (centro + anillo de 6), en multiplos de la celda.
const W = CELL + GAP;
const POS: Array<[number, number]> = [
  [0, 0],
  [0, -W * 0.9],
  [W * 0.78, -W * 0.45],
  [W * 0.78, W * 0.45],
  [0, W * 0.9],
  [-W * 0.78, W * 0.45],
  [-W * 0.78, -W * 0.45],
];

export default function Splash() {
  const reduce = useReducedMotion();
  const [show, setShow] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShow(false), reduce ? 250 : 1150);
    return () => clearTimeout(t);
  }, [reduce]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] grid place-items-center"
          style={{ background: 'var(--bg)' }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          <div className="flex flex-col items-center gap-6">
            <div className="relative" style={{ width: W * 2.6, height: W * 2.6 }}>
              {POS.map(([x, y], i) => (
                <motion.span
                  key={i}
                  className="absolute left-1/2 top-1/2"
                  style={{
                    width: CELL,
                    height: CELL,
                    marginLeft: -CELL / 2,
                    marginTop: -CELL / 2,
                    x,
                    y,
                    clipPath: HEX,
                    background:
                      i === 0
                        ? 'var(--amber)'
                        : 'linear-gradient(180deg, var(--purple-2), var(--purple))',
                  }}
                  animate={
                    reduce
                      ? undefined
                      : { opacity: [0.2, 1, 0.2], scale: [0.85, 1, 0.85] }
                  }
                  transition={
                    reduce
                      ? undefined
                      : { duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.1 }
                  }
                />
              ))}
            </div>
            <span className="wordmark text-sm" style={{ letterSpacing: '0.28em' }}>
              ENJAMBRE
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
