import { motion, useReducedMotion } from 'motion/react';
import { useAgents } from '../api/hooks';
import type { Agent } from '../api/types';
import { useRunStore } from '../stores/run-store';

// Viz estrella del enjambre: nucleo brillante + agentes orbitando en hexagono.
// Estilo cyber/glassmorphism morado-ambar (ver DESIGN_SYSTEM.md). Datos reales
// via useAgents(); respeta prefers-reduced-motion (WCAG 2.3.3).

const PURPLE = '#8b5cf6';
const AMBER = '#ffb020';

function colorFor(a: Agent) {
  return a.role === 'architect' ? AMBER : PURPLE;
}

function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const ang = (-90 + i * 60) * (Math.PI / 180);
    return `${cx + r * Math.cos(ang)},${cy + r * Math.sin(ang)}`;
  }).join(' ');
}

const OK = '#22c55e';
const ALERT = '#ef4444';

export default function HexSwarm({ size = 420 }: { size?: number }) {
  const { data } = useAgents();
  const reduce = useReducedMotion();
  const runStatus = useRunStore((s) => s.status);
  const agents = (data ?? []).slice(0, 8);
  const c = size / 2;
  const R = size * 0.34;

  const nodes = agents.map((a, i) => {
    const ang = (-90 + i * (360 / Math.max(1, agents.length))) * (Math.PI / 180);
    return { a, x: c + R * Math.cos(ang), y: c + R * Math.sin(ang) };
  });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" role="img"
         aria-label="Visualizacion del enjambre: nucleo y agentes orbitando"
         style={{ maxWidth: size, display: 'block', margin: '0 auto' }}>
      <defs>
        <radialGradient id="hs-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={AMBER} stopOpacity="0.9" />
          <stop offset="45%" stopColor={PURPLE} stopOpacity="0.55" />
          <stop offset="100%" stopColor={PURPLE} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hs-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={AMBER} stopOpacity="0.7" />
          <stop offset="100%" stopColor={PURPLE} stopOpacity="0.25" />
        </linearGradient>
        <filter id="hs-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* anillo decorativo (rota lento; estatico si reduced-motion) */}
      <motion.polygon
        points={hexPoints(c, c, R * 1.18)}
        fill="none"
        stroke={PURPLE}
        strokeOpacity="0.12"
        strokeWidth="1"
        animate={reduce ? undefined : { rotate: 360 }}
        transition={reduce ? undefined : { duration: 90, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: `${c}px ${c}px` }}
      />

      {/* halo del nucleo (pulso) */}
      <motion.circle
        cx={c}
        cy={c}
        r={size * 0.2}
        fill="url(#hs-core)"
        animate={reduce ? undefined : { scale: [1, 1.1, 1], opacity: [0.7, 0.95, 0.7] }}
        transition={reduce ? undefined : { duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: `${c}px ${c}px`, opacity: 0.8 }}
      />

      {/* lineas core -> agente (mas gruesas + glow en habilitadas) */}
      {nodes.map((n) => (
        <line key={`l-${n.a.name}`} x1={c} y1={c} x2={n.x} y2={n.y}
          stroke="url(#hs-line)" strokeWidth={n.a.enabled ? 2.4 : 1.2}
          strokeOpacity={n.a.enabled ? 0.7 : 0.18}
          filter={n.a.enabled ? 'url(#hs-glow)' : undefined} />
      ))}

      {/* pulso viajando del core al agente habilitado (omitido si reduced-motion) */}
      {!reduce &&
        nodes.map((n, i) =>
          n.a.enabled ? (
            <motion.circle key={`p-${n.a.name}`} r="3" fill={AMBER} filter="url(#hs-glow)"
              animate={{ cx: [c, n.x], cy: [c, n.y], opacity: [0, 1, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.35, ease: 'easeInOut' }} />
          ) : null,
        )}

      {/* nucleo (hexagono) */}
      <polygon points={hexPoints(c, c, size * 0.088)} fill="#1a1530"
        stroke={AMBER} strokeWidth="2.2" filter="url(#hs-glow)" />
      <polygon points={hexPoints(c, c, size * 0.05)} fill="none"
        stroke={AMBER} strokeWidth="1" strokeOpacity="0.6" />

      {/* agentes */}
      {nodes.map((n) => {
        const st = runStatus[n.a.name];
        const running = st === 'running';
        const stroke = running ? AMBER : st === 'error' ? ALERT : st === 'ok' ? OK : colorFor(n.a);
        const glow = n.a.enabled || !!st;
        const pulse = running ? { duration: 0.9 } : { duration: 3 };
        return (
          <g key={`n-${n.a.name}`}>
            <motion.polygon
              points={hexPoints(n.x, n.y, size * (running ? 0.052 : 0.046))}
              fill="#141020"
              stroke={stroke}
              strokeWidth={running ? 2.2 : 1.6}
              strokeOpacity={n.a.enabled || st ? 1 : 0.4}
              filter={glow ? 'url(#hs-glow)' : undefined}
              animate={reduce || (!n.a.enabled && !running) ? undefined : { opacity: [0.85, 1, 0.85] }}
              transition={reduce ? undefined : { ...pulse, repeat: Infinity, ease: 'easeInOut' }}
            />
            <circle cx={n.x} cy={n.y} r={size * 0.012} fill={stroke}
              opacity={n.a.enabled || st ? 1 : 0.4} />
            <text x={n.x} y={n.y + size * 0.085} textAnchor="middle"
              fontSize={size * 0.026} fill={running ? AMBER : '#a99fc7'}
              style={{ fontFamily: 'var(--font-mono)' }}>
              {n.a.name}{running ? ' ·pensando' : ''}
            </text>
          </g>
        );
      })}

      {agents.length === 0 && (
        <text x={c} y={c + size * 0.18} textAnchor="middle" fontSize={size * 0.03} fill="#6f6690">
          sin agentes — agrega uno en la tab Agentes
        </text>
      )}
    </svg>
  );
}
