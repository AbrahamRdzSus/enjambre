import { motion, useReducedMotion } from 'motion/react';

// Anillo de progreso (mockup 3). value 0-100; indeterminate = girando (durante run).

export default function CircularProgress({
  value,
  indeterminate = false,
  size = 120,
  label,
}: {
  value?: number;
  indeterminate?: boolean;
  size?: number;
  label?: string;
}) {
  const reduce = useReducedMotion();
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value ?? 0));
  const dash = indeterminate ? circ * 0.3 : (pct / 100) * circ;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id="cp-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#ffb020" />
          </linearGradient>
        </defs>
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <motion.circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke="url(#cp-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          transform={`rotate(-90 ${c} ${c})`}
          animate={indeterminate && !reduce ? { rotate: 360 } : undefined}
          transition={indeterminate && !reduce ? { duration: 1.1, repeat: Infinity, ease: 'linear' } : undefined}
          style={{ transformOrigin: `${c}px ${c}px` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-xl font-semibold" style={{ color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}>
          {indeterminate ? '···' : `${Math.round(pct)}%`}
        </span>
        {label && <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--fg-faint)' }}>{label}</span>}
      </div>
    </div>
  );
}
