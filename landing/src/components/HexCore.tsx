import { motion, useReducedMotion } from 'motion/react';

// Nucleo de orquestacion decorativo (hex ambar + nodos morados orbitando).
// Inspirado en el HexSwarm del dashboard y el enjambre-core.js de la identidad.
// Solo visual: no consume datos.

const PURPLE = '#8b5cf6';
const AMBER = '#ffb020';

function hex(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (-90 + i * 60) * (Math.PI / 180);
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(' ');
}

export default function HexCore({ size = 440 }: { size?: number }) {
  const reduce = useReducedMotion();
  const c = size / 2;
  const R = size * 0.36;
  const nodes = Array.from({ length: 8 }, (_, i) => {
    const a = (-90 + i * 45) * (Math.PI / 180);
    return { x: c + R * Math.cos(a), y: c + R * Math.sin(a), arch: i % 4 === 0 };
  });

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      role="img"
      aria-label="Nucleo de orquestacion del enjambre"
      style={{ maxWidth: size, display: 'block', margin: '0 auto' }}
    >
      <defs>
        <radialGradient id="lc-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={AMBER} stopOpacity="0.95" />
          <stop offset="45%" stopColor={PURPLE} stopOpacity="0.5" />
          <stop offset="100%" stopColor={PURPLE} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lc-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={AMBER} stopOpacity="0.7" />
          <stop offset="100%" stopColor={PURPLE} stopOpacity="0.25" />
        </linearGradient>
        <filter id="lc-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <motion.polygon
        points={hex(c, c, R * 1.16)}
        fill="none"
        stroke={PURPLE}
        strokeOpacity="0.12"
        strokeWidth="1"
        animate={reduce ? undefined : { rotate: 360 }}
        transition={reduce ? undefined : { duration: 80, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: `${c}px ${c}px` }}
      />

      <motion.circle
        cx={c}
        cy={c}
        r={size * 0.2}
        fill="url(#lc-core)"
        animate={reduce ? undefined : { scale: [1, 1.1, 1], opacity: [0.7, 0.95, 0.7] }}
        transition={reduce ? undefined : { duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: `${c}px ${c}px`, opacity: 0.8 }}
      />

      {nodes.map((n, i) => (
        <line
          key={`l-${i}`}
          x1={c}
          y1={c}
          x2={n.x}
          y2={n.y}
          stroke="url(#lc-line)"
          strokeWidth={2}
          strokeOpacity={0.6}
          filter="url(#lc-glow)"
        />
      ))}

      {!reduce &&
        nodes.map((n, i) => (
          <motion.circle
            key={`p-${i}`}
            r="3"
            fill={AMBER}
            filter="url(#lc-glow)"
            animate={{ cx: [c, n.x], cy: [c, n.y], opacity: [0, 1, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.3, ease: 'easeInOut' }}
          />
        ))}

      <polygon
        points={hex(c, c, size * 0.09)}
        fill="#10182a"
        stroke={AMBER}
        strokeWidth="2.2"
        filter="url(#lc-glow)"
      />
      <polygon points={hex(c, c, size * 0.05)} fill="none" stroke={AMBER} strokeWidth="1" strokeOpacity="0.6" />

      {nodes.map((n, i) => {
        const stroke = n.arch ? AMBER : PURPLE;
        return (
          <g key={`n-${i}`}>
            <motion.polygon
              points={hex(n.x, n.y, size * 0.046)}
              fill="#0d111c"
              stroke={stroke}
              strokeWidth={1.6}
              filter="url(#lc-glow)"
              animate={reduce ? undefined : { opacity: [0.85, 1, 0.85] }}
              transition={reduce ? undefined : { duration: 3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.2 }}
            />
            <circle cx={n.x} cy={n.y} r={size * 0.012} fill={stroke} />
          </g>
        );
      })}
    </svg>
  );
}
