// Toggle estilo cockpit (verde = activo). Fuente unica: antes estaba reimplementado
// en RunPage y AppShell, y ambos animaban `left` (propiedad de LAYOUT) con
// `transition-all` -> doble falta de rendimiento. El knob ahora se mueve con
// `transform: translateX` y transiciona SOLO `transform` (compositor, sin reflow).
type ToggleProps = {
  on: boolean;
  onClick: () => void;
  label: string;
};

export default function Toggle({ on, onClick, label }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={on}
      className="relative h-5 w-9 shrink-0 rounded-full transition-colors"
      style={{
        background: on ? 'var(--ok)' : 'var(--bg-raised)',
        boxShadow: on
          ? '0 0 8px color-mix(in srgb, var(--ok) 50%, transparent)'
          : 'none',
      }}
    >
      <span
        className="absolute left-0.5 top-0.5 size-4 rounded-full bg-white"
        style={{
          transform: on ? 'translateX(16px)' : 'translateX(0)',
          transition: 'transform 160ms var(--ease)',
        }}
      />
    </button>
  );
}
