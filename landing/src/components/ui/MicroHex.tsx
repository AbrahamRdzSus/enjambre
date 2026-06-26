import { motion, useReducedMotion } from 'motion/react';

// Micro-hexagonos a la deriva: elemento visual propio (identidad enjambre) que
// flota sobre el fondo galaxy. Hexagonos pequenos morado/ambar que derivan y giran
// muy lento, a baja opacidad. Decorativo; estatico bajo prefers-reduced-motion.
const HEX = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

type Hx = { top: string; left: string; size: number; dur: number; drift: number; amber?: boolean };
const HEXES: Hx[] = [
  { top: '12%', left: '8%', size: 22, dur: 14, drift: 16 },
  { top: '22%', left: '82%', size: 14, dur: 11, drift: -12, amber: true },
  { top: '64%', left: '14%', size: 18, dur: 16, drift: -14, amber: true },
  { top: '74%', left: '72%', size: 26, dur: 18, drift: 18 },
  { top: '40%', left: '46%', size: 12, dur: 12, drift: 10 },
  { top: '86%', left: '38%', size: 16, dur: 15, drift: -10 },
  { top: '8%', left: '60%', size: 13, dur: 13, drift: 12, amber: true },
  { top: '52%', left: '90%', size: 20, dur: 17, drift: -16 },
];

export default function MicroHex() {
  const reduce = useReducedMotion();
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {HEXES.map((hx, i) => {
        const color = hx.amber ? 'rgba(255,176,32,0.45)' : 'rgba(139,92,246,0.45)';
        return (
          <motion.span
            key={i}
            className="absolute"
            style={{
              top: hx.top,
              left: hx.left,
              width: hx.size,
              height: hx.size,
              clipPath: HEX,
              boxShadow: `inset 0 0 0 1.5px ${color}`,
              opacity: 0.5,
            }}
            animate={reduce ? undefined : { y: [0, hx.drift, 0], rotate: [0, 60, 0] }}
            transition={
              reduce
                ? undefined
                : { duration: hx.dur, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }
            }
          />
        );
      })}
    </div>
  );
}
