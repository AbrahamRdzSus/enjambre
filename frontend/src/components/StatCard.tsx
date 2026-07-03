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
  /** mini-barras (distribucion, p.ej. por proveedor) al pie de la card */
  bars?: number[];
}

function Sparkbars({ data, accent }: { data: number[]; accent: string }) {
  const max = Math.max(1, ...data);
  return (
    <div className="flex items-end gap-1 mt-2" style={{ height: 26 }} aria-hidden="true">
      {data.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${Math.max(8, (v / max) * 100)}%`,
            background: accent,
            opacity: 0.35 + 0.55 * (v / max),
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
}

export default function StatCard({ label, value, format, accent = 'var(--purple-soft)', hint, bars }: StatCardProps) {
  const reduce = useReducedMotion();
  const animated = useCountUp(value, !reduce);
  const shown = format ? format(animated) : String(Math.round(animated));
  return (
    <div className="glass p-4 flex flex-col gap-1 transition-transform duration-200 will-change-transform hover:-translate-y-0.5">
      <span className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--fg-faint)' }}>
        {label}
      </span>
      <span
        className="text-2xl font-semibold tnum self-start"
        style={{
          color: accent,
          fontFamily: 'var(--font-mono)',
          borderBottom: `2px solid color-mix(in srgb, ${accent} 45%, transparent)`,
          paddingBottom: 2,
        }}
      >
        {shown}
      </span>
      {hint && <span className="text-xs" style={{ color: 'var(--fg-mute)' }}>{hint}</span>}
      {bars && bars.length > 0 && <Sparkbars data={bars} accent={accent} />}
    </div>
  );
}
