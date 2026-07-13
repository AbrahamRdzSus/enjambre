// Punto de estado (nodo de color). Reutilizado en carriles, logs, chips de agente
// y la lista lateral: antes era un `<span className="size-1.5 rounded-full" style=.../>`
// repetido en 5+ sitios. `glow` anade el halo suave del indicador "en vivo".
export default function Dot({
  color = 'var(--fg-faint)',
  size = 6,
  glow = false,
  className,
}: {
  color?: string;
  size?: number;
  glow?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`shrink-0 rounded-full ${className ?? ''}`}
      style={{
        width: size,
        height: size,
        background: color,
        boxShadow: glow ? `0 0 5px ${color}` : undefined,
      }}
    />
  );
}
