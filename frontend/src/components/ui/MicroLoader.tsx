import { motion, useReducedMotion } from 'motion/react';

type Variant = 'dots' | 'bars' | 'pulse';

interface MicroLoaderProps {
  variant?: Variant;
  size?: number;
  label?: string;
  className?: string;
}

const PURPLE = '#8b5cf6'; // --purple
const AMBER = '#ffb020'; // --amber

/**
 * Small inline loader for the Enjambre desktop in purple/amber.
 * Replaces inline skeletons/spinners. Honors prefers-reduced-motion.
 */
export default function MicroLoader({
  variant = 'dots',
  size = 8,
  label,
  className,
}: MicroLoaderProps) {
  const reduce = useReducedMotion();

  const wrap = (children: React.ReactNode) => (
    <span
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
      role="status"
      aria-label={label ?? 'Cargando'}
    >
      {children}
      {label && (
        <span style={{ fontSize: 12, color: '#a99fc7' /* --fg-mute */ }}>{label}</span>
      )}
    </span>
  );

  if (reduce) {
    // Minimal static state.
    return wrap(
      <span
        className="animate-pulse"
        style={{
          width: size,
          height: size,
          borderRadius: '9999px',
          background: PURPLE,
          display: 'inline-block',
        }}
      />,
    );
  }

  if (variant === 'bars') {
    const bars = [0, 1, 2, 3];
    return wrap(
      <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 2, height: size * 2 }}>
        {bars.map((i) => (
          <motion.span
            key={i}
            style={{
              width: Math.max(2, Math.round(size / 3)),
              background: i % 2 === 0 ? PURPLE : AMBER,
              borderRadius: 2,
              display: 'inline-block',
            }}
            animate={{ height: [size * 0.6, size * 2, size * 0.6] }}
            transition={{ repeat: Infinity, duration: 0.9, ease: 'easeInOut', delay: i * 0.12 }}
          />
        ))}
      </span>,
    );
  }

  if (variant === 'pulse') {
    return wrap(
      <motion.span
        style={{
          width: size * 1.6,
          height: size * 1.6,
          borderRadius: '9999px',
          background: PURPLE,
          display: 'inline-block',
        }}
        animate={{ scale: [1, 1.5, 1], opacity: [0.9, 0.3, 0.9] }}
        transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
      />,
    );
  }

  // dots (default)
  const dots = [0, 1, 2];
  return wrap(
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.5 }}>
      {dots.map((i) => (
        <motion.span
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: '9999px',
            background: i === 1 ? AMBER : PURPLE,
            display: 'inline-block',
          }}
          animate={{ y: [0, -size * 0.7, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 0.8, ease: 'easeInOut', delay: i * 0.16 }}
        />
      ))}
    </span>,
  );
}
