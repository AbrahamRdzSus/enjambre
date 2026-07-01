import { motion } from 'motion/react';

// Logo/nucleo hexagonal con glow animado, re-creado nativo en SVG+motion. Anillos
// hexagonales que rotan lento en sentidos opuestos, nucleo que respira y nodos del
// enjambre. El glow va SOLO en el trazo (fill=none) para que los nodos no se vean
// opacos/emborronados; los nodos tienen relleno biselado (no plano). Movimiento
// deliberadamente calmado (poco ruido de fondo).
const PURPLE = '#8b5cf6';
const AMBER = '#ffb020';

function hex(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (-90 + i * 60) * (Math.PI / 180);
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(' ');
}

export default function HexCore({ size = 440 }: { size?: number }) {
  const c = size / 2;
  const R = size * 0.36;
  const spin = { transformOrigin: `${c}px ${c}px` };
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
        <radialGradient id="hc-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="30%" stopColor={AMBER} stopOpacity="0.85" />
          <stop offset="65%" stopColor={PURPLE} stopOpacity="0.45" />
          <stop offset="100%" stopColor={PURPLE} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hc-corefill" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#1b2740" />
          <stop offset="100%" stopColor="#0a0e18" />
        </radialGradient>
        {/* Rellenos biselados de los nodos (luz arriba, sombra abajo) por tipo */}
        <linearGradient id="hc-node-a" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2c2214" />
          <stop offset="100%" stopColor="#0c0a07" />
        </linearGradient>
        <linearGradient id="hc-node-p" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#201a3a" />
          <stop offset="100%" stopColor="#0a0814" />
        </linearGradient>
        <linearGradient id="hc-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={AMBER} />
          <stop offset="100%" stopColor={PURPLE} />
        </linearGradient>
        <linearGradient id="hc-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={AMBER} stopOpacity="0.7" />
          <stop offset="100%" stopColor={PURPLE} stopOpacity="0.2" />
        </linearGradient>
        {/* Glow ligero, solo para trazos (fill=none) */}
        <filter id="hc-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Halo de fondo que respira (suave) */}
      <motion.circle
        cx={c}
        cy={c}
        r={size * 0.42}
        fill="url(#hc-core)"
        animate={{ scale: [1, 1.05, 1], opacity: [0.55, 0.78, 0.55] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ ...spin, opacity: 0.6 }}
      />

      {/* Anillo hexagonal exterior (rota horario, lento) */}
      <motion.polygon
        points={hex(c, c, R * 1.22)}
        fill="none"
        stroke="url(#hc-ring)"
        strokeOpacity="0.32"
        strokeWidth="1.5"
        filter="url(#hc-glow)"
        animate={{ rotate: 360 }}
        transition={{ duration: 48, repeat: Infinity, ease: 'linear' }}
        style={spin}
      />
      {/* Anillo hexagonal medio (rota antihorario, lento) */}
      <motion.polygon
        points={hex(c, c, R * 1.0)}
        fill="none"
        stroke={PURPLE}
        strokeOpacity="0.22"
        strokeWidth="1"
        animate={{ rotate: -360 }}
        transition={{ duration: 38, repeat: Infinity, ease: 'linear' }}
        style={spin}
      />

      {/* Lineas al centro */}
      {nodes.map((n, i) => (
        <line
          key={`l-${i}`}
          x1={c}
          y1={c}
          x2={n.x}
          y2={n.y}
          stroke="url(#hc-line)"
          strokeWidth={1.6}
          strokeOpacity={0.45}
        />
      ))}

      {/* Particulas que viajan del centro a los nodos (pocas, lentas, solo nodos arch) */}
      {nodes.filter((n) => n.arch).map((n, i) => (
        <motion.circle
          key={`p-${i}`}
          r="2.4"
          fill={AMBER}
          filter="url(#hc-glow)"
          animate={{ cx: [c, n.x], cy: [c, n.y], opacity: [0, 0.75, 0] }}
          transition={{ duration: 3.4, repeat: Infinity, delay: i * 1.1, ease: 'easeInOut' }}
        />
      ))}

      {/* Nucleo hexagonal brillante (pulso sutil) */}
      <motion.g
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        style={spin}
      >
        <polygon points={hex(c, c, size * 0.1)} fill="url(#hc-corefill)" stroke={AMBER} strokeWidth="2.2" />
        <polygon points={hex(c, c, size * 0.1)} fill="none" stroke={AMBER} strokeWidth="2.2" strokeOpacity="0.7" filter="url(#hc-glow)" />
        <polygon points={hex(c, c, size * 0.055)} fill="none" stroke="#fff" strokeWidth="1" strokeOpacity="0.6" />
      </motion.g>

      {/* Nodos del enjambre: cuerpo biselado (crisp) + aura de glow solo en trazo */}
      {nodes.map((n, i) => {
        const stroke = n.arch ? AMBER : PURPLE;
        const fill = n.arch ? 'url(#hc-node-a)' : 'url(#hc-node-p)';
        const r = size * 0.05;
        return (
          <g key={`n-${i}`}>
            <polygon points={hex(n.x, n.y, r)} fill={fill} stroke={stroke} strokeWidth={1.6} strokeOpacity={0.9} />
            {/* brillo superior (bisel) */}
            <polygon
              points={hex(n.x, n.y - r * 0.12, r * 0.78)}
              fill="none"
              stroke="#fff"
              strokeWidth={0.8}
              strokeOpacity={0.12}
            />
            {/* aura de glow que pulsa (trazo, no relleno => no se ve opaco) */}
            <motion.polygon
              points={hex(n.x, n.y, r)}
              fill="none"
              stroke={stroke}
              strokeWidth={1.4}
              filter="url(#hc-glow)"
              animate={{ opacity: [0.35, 0.7, 0.35] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.25 }}
            />
            <circle cx={n.x} cy={n.y} r={size * 0.012} fill={stroke} />
          </g>
        );
      })}
    </svg>
  );
}
