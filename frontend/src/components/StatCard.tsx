import { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';

// KPI card glass con contador animado (estilo mockup: valor grande + label).

function useCountUp(target: number, enabled: boolean) {
  const [val, setVal] = useState(enabled ? 0 : target);
  useEffect(() => {
    if (!enabled) {
      setVal(target);
      return;
    }
    const start = performance.now();
    const dur = 700;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      setVal(target * (1 - Math.pow(1 - p, 3))); // easeOutCubic
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, enabled]);
  return val;
}

export interface StatCardProps {
  label: string;
  value: number;
  /** formato del valor ya contado */
  format?: (n: number) => string;
  accent?: string;
  hint?: string;
}

export default function StatCard({ label, value, format, accent = 'var(--purple-soft)', hint }: StatCardProps) {
  const reduce = useReducedMotion();
  const animated = useCountUp(value, !reduce);
  const shown = format ? format(animated) : String(Math.round(animated));
  return (
    <div className="glass p-4 flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--fg-faint)' }}>
        {label}
      </span>
      <span className="text-2xl font-semibold" style={{ color: accent, fontFamily: 'var(--font-mono)' }}>
        {shown}
      </span>
      {hint && <span className="text-xs" style={{ color: 'var(--fg-mute)' }}>{hint}</span>}
    </div>
  );
}
