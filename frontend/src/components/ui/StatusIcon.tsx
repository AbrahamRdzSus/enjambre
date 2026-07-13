import { motion, useReducedMotion } from 'motion/react';
import { Loader2, Circle } from 'lucide-react';

export type Status = 'idle' | 'running' | 'ok' | 'error' | 'enabled';

interface StatusIconProps {
  status: Status;
  size?: number;
  className?: string;
  title?: string;
}

const COLORS: Record<Status, string> = {
  idle: '#6f6690', // --fg-faint
  running: '#ffb020', // --amber
  ok: '#22c55e', // --ok
  error: '#ef4444', // --alert
  enabled: '#8b5cf6', // --purple
};

// UI en espanol (regla dura): el aria-label caia al status crudo en ingles
// ("running"/"ok"/...) cuando no se pasaba `title`. Se mapea a etiquetas legibles.
const LABELS: Record<Status, string> = {
  idle: 'inactivo',
  running: 'en curso',
  ok: 'completado',
  error: 'error',
  enabled: 'habilitado',
};

/**
 * Small animated per-state icon for the Enjambre desktop.
 * running -> amber spinner/pulse, ok -> drawn green check,
 * error -> red X with short shake, idle -> faint dot,
 * enabled -> stable purple ring. Honors prefers-reduced-motion.
 */
export default function StatusIcon({
  status,
  size = 16,
  className,
  title,
}: StatusIconProps) {
  const reduce = useReducedMotion();
  const color = COLORS[status];
  const label = title ?? LABELS[status];

  // Static fallbacks when motion is reduced.
  if (reduce) {
    if (status === 'running') {
      return <Loader2 size={size} color={color} className={className} aria-label={label} />;
    }
    if (status === 'ok') {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-label={label}>
          <path d="M5 12.5l4 4 10-10" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }
    if (status === 'error') {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-label={label}>
          <path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
        </svg>
      );
    }
    // idle / enabled -> dot / ring
    return (
      <Circle
        size={size}
        color={color}
        fill={status === 'idle' ? color : 'none'}
        strokeWidth={status === 'enabled' ? 2.5 : 1}
        className={className}
        aria-label={label}
      />
    );
  }

  if (status === 'running') {
    return (
      <motion.span
        className={className}
        style={{ display: 'inline-flex', color }}
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, ease: 'linear', duration: 0.9 }}
        aria-label={label}
        role="status"
      >
        <Loader2 size={size} />
      </motion.span>
    );
  }

  if (status === 'ok') {
    return (
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        initial={{ scale: 0.6 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 18 }}
        aria-label={label}
      >
        <motion.path
          d="M5 12.5l4 4 10-10"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </motion.svg>
    );
  }

  if (status === 'error') {
    return (
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        initial={{ x: 0 }}
        animate={{ x: [0, -3, 3, -2, 2, 0] }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
        aria-label={label}
      >
        <path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      </motion.svg>
    );
  }

  if (status === 'enabled') {
    return (
      <motion.span
        className={className}
        style={{ display: 'inline-flex', color }}
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        aria-label={label}
      >
        <Circle size={size} strokeWidth={2.5} />
      </motion.span>
    );
  }

  // idle
  return (
    <motion.span
      className={className}
      style={{ display: 'inline-flex', color }}
      animate={{ opacity: [0.4, 0.8, 0.4] }}
      transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
      aria-label={label}
    >
      <Circle size={size} fill={color} strokeWidth={0} />
    </motion.span>
  );
}
