import { motion } from 'motion/react';

// Tecla de encendido hexagonal. Apagado: gris, borde tenue, sin brillo (nucleo
// dormido). Hover: elevacion + glow + borde iluminado. Encendido (prop `on`):
// relleno morado/ambar, glow intenso y vibracion sutil. Reinterpretacion propia
// del concepto "bluetooth-key" de 21st.dev con el hexagono de identidad.
const HEX = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

export default function PowerHex({
  on,
  onActivate,
}: {
  on: boolean;
  onActivate: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onActivate}
      aria-label="Encender ENJAMBRE y entrar"
      aria-pressed={on}
      className="group relative grid place-items-center outline-none"
      style={{ width: 132, height: 132, background: 'transparent', border: 0, cursor: on ? 'default' : 'pointer' }}
      initial={false}
      whileHover={on ? undefined : { y: -3 }}
      whileTap={on ? undefined : { scale: 0.96 }}
      animate={on ? { x: [0, -2, 2, -1, 1, 0] } : undefined}
      transition={on ? { duration: 0.4, ease: 'easeInOut' } : { type: 'spring', stiffness: 300, damping: 18 }}
    >
      {/* Cuerpo de la tecla */}
      <span
        className="absolute inset-0 transition-all duration-300"
        style={{
          clipPath: HEX,
          background: on
            ? 'linear-gradient(160deg, var(--amber-2), var(--purple))'
            : 'linear-gradient(160deg, #14161d, #0c0e14)',
          boxShadow: on
            ? '0 0 44px 6px rgba(139,92,246,0.55), 0 0 80px 12px rgba(255,176,32,0.25)'
            : '0 8px 24px -10px rgba(0,0,0,0.8)',
        }}
      />
      {/* Borde (tenue apagado / iluminado encendido o en hover) */}
      <span
        className="absolute inset-0 transition-all duration-300 group-hover:opacity-100"
        style={{
          clipPath: HEX,
          boxShadow: on
            ? 'inset 0 0 0 1.5px rgba(255,255,255,0.5)'
            : 'inset 0 0 0 1.5px rgba(139,92,246,0.28)',
        }}
      />
      {/* Hexagono interior (nucleo) */}
      <svg width="56" height="56" viewBox="0 0 32 32" fill="none" className="relative">
        <polygon
          points="16,3 28,10 28,22 16,29 4,22 4,10"
          fill="none"
          stroke={on ? '#fff' : 'rgba(148,163,184,0.5)'}
          strokeWidth={on ? 2.2 : 1.6}
          style={{ transition: 'stroke 0.3s' }}
        />
        <circle
          cx="16"
          cy="16"
          r="3.5"
          fill={on ? '#fff' : 'rgba(148,163,184,0.35)'}
          style={{ transition: 'fill 0.3s' }}
        />
      </svg>
    </motion.button>
  );
}
