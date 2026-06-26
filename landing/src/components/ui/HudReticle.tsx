import { motion, useReducedMotion } from 'motion/react';

// Reticula HUD que enmarca el nucleo del hero. Re-interpretacion del concepto
// "targeting" en clave de marca: NO militar, sino "nodo de orquestacion en foco"
// — corchetes de esquina + anillo de ticks giratorio, morado/ambar. Decorativo.
const AMBER = '#ffb020';
const PURPLE = '#8b5cf6';

export default function HudReticle() {
  const reduce = useReducedMotion();
  return (
    <svg
      viewBox="0 0 200 200"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
      style={{ overflow: 'visible' }}
    >
      {/* Corchetes de esquina (respiran sutil) */}
      <motion.g
        stroke={AMBER}
        strokeWidth="1.4"
        fill="none"
        strokeOpacity="0.7"
        animate={reduce ? undefined : { opacity: [0.55, 0.95, 0.55] }}
        transition={reduce ? undefined : { duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path d="M10 26 V10 H26" />
        <path d="M174 10 H190 V26" />
        <path d="M190 174 V190 H174" />
        <path d="M26 190 H10 V174" />
      </motion.g>

      {/* Anillo de ticks giratorio */}
      <motion.g
        animate={reduce ? undefined : { rotate: 360 }}
        transition={reduce ? undefined : { duration: 36, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: '100px 100px' }}
      >
        <circle cx="100" cy="100" r="82" fill="none" stroke={PURPLE} strokeOpacity="0.18" strokeWidth="1" />
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i * 15 * Math.PI) / 180;
          const r1 = 82;
          const r2 = i % 6 === 0 ? 72 : 78;
          const major = i % 6 === 0;
          return (
            <line
              key={i}
              x1={100 + r1 * Math.cos(a)}
              y1={100 + r1 * Math.sin(a)}
              x2={100 + r2 * Math.cos(a)}
              y2={100 + r2 * Math.sin(a)}
              stroke={major ? AMBER : PURPLE}
              strokeOpacity={major ? 0.7 : 0.35}
              strokeWidth={major ? 1.4 : 1}
            />
          );
        })}
      </motion.g>
    </svg>
  );
}
