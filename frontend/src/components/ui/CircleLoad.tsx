import { motion, useReducedMotion } from 'motion/react';

interface CircleLoadProps {
  size?: number;
  /** 0..1 for determinate; null/undefined for indeterminate spinner. */
  progress?: number | null;
  label?: string;
  accent?: string;
  className?: string;
}

const GRAD_ID = 'enjambre-circleload-grad';

/**
 * Animated circular SVG ring for the Enjambre desktop.
 * Determinate: shows % from `progress`. Indeterminate: continuous spin.
 * Purple->amber gradient stroke. Honors prefers-reduced-motion.
 * Meant to replace the RunPage orchestration progress ring.
 */
export default function CircleLoad({
  size = 120,
  progress = null,
  label,
  accent = 'var(--purple)',
  className,
}: CircleLoadProps) {
  const reduce = useReducedMotion();
  const stroke = Math.max(4, Math.round(size * 0.07));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;

  const determinate = typeof progress === 'number';
  const clamped = determinate ? Math.min(1, Math.max(0, progress as number)) : 0;
  const pct = Math.round(clamped * 100);

  // Indeterminate uses a fixed arc that rotates; determinate uses dashoffset.
  const arcLen = determinate ? c * clamped : c * 0.28;
  const dashOffset = determinate ? c - arcLen : 0;

  return (
    <div
      className={className}
      style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
      role="status"
      aria-label={label ?? (determinate ? `${pct}%` : 'Cargando')}
      aria-valuenow={determinate ? pct : undefined}
      aria-valuemin={determinate ? 0 : undefined}
      aria-valuemax={determinate ? 100 : undefined}
    >
      <div style={{ position: 'relative', width: size, height: size }}>
        <motion.svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: 'rotate(-90deg)' }}
          animate={!determinate && !reduce ? { rotate: [-90, 270] } : undefined}
          transition={
            !determinate && !reduce
              ? { repeat: Infinity, ease: 'linear', duration: 1.1 }
              : undefined
          }
        >
          <defs>
            <linearGradient id={GRAD_ID} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={accent} />
              <stop offset="100%" stopColor="#ffb020" />
            </linearGradient>
          </defs>
          {/* track */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#2a2342" strokeWidth={stroke} />
          {/* progress arc */}
          <motion.circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={`url(#${GRAD_ID})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            initial={false}
            animate={{ strokeDashoffset: dashOffset }}
            transition={
              reduce ? { duration: 0 } : { duration: 0.5, ease: 'easeOut' }
            }
          />
        </motion.svg>
        {determinate && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: Math.round(size * 0.2),
              fontWeight: 600,
              color: 'var(--fg)',
            }}
          >
            {pct}%
          </div>
        )}
      </div>
      {label && (
        <span style={{ fontSize: 13, color: 'var(--fg-mute)' }}>{label}</span>
      )}
    </div>
  );
}
