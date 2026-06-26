import { motion } from 'motion/react';

// Tecla (keycap) de encendido, estilo "bluetooth-key" pero con el icono de la
// marca: un HEXAGONO en lugar del bluetooth. Apagado: keycap gris, icono tenue,
// nucleo dormido. Hover: elevacion + glow + borde iluminado. Encendido (`on`):
// cara morado/ambar, glow intenso, icono encendido y vibracion sutil.
export default function PowerHex({
  on,
  onActivate,
}: {
  on: boolean;
  onActivate: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onActivate}
      aria-label="Encender ENJAMBRE y entrar"
      aria-pressed={on}
      className="group relative outline-none"
      style={{ width: 132, height: 132, background: 'transparent', border: 0, cursor: on ? 'default' : 'pointer' }}
    >
      {/* Base/lado de la tecla (da profundidad 3D) */}
      <span
        className="absolute inset-x-0"
        style={{
          top: 12,
          bottom: 0,
          borderRadius: 22,
          background: on
            ? 'linear-gradient(180deg, #6d4bd0, #3a2a6b)'
            : 'linear-gradient(180deg, #0b0d13, #070910)',
          boxShadow: '0 14px 30px -12px rgba(0,0,0,0.85)',
        }}
      />
      {/* Cara superior de la tecla (se hunde al presionar) */}
      <motion.span
        className="absolute inset-x-0 grid place-items-center transition-colors duration-300"
        style={{
          top: 0,
          bottom: 12,
          borderRadius: 22,
          background: on
            ? 'linear-gradient(160deg, var(--amber-2), var(--purple))'
            : 'linear-gradient(160deg, #181b24, #0e1018)',
          boxShadow: on
            ? 'inset 0 0 0 1.5px rgba(255,255,255,0.45), 0 0 46px 6px rgba(139,92,246,0.5), 0 0 80px 14px rgba(255,176,32,0.22)'
            : 'inset 0 0 0 1.5px rgba(139,92,246,0.22)',
        }}
        initial={false}
        whileHover={on ? undefined : { y: -3, boxShadow: 'inset 0 0 0 1.5px rgba(139,92,246,0.5), 0 0 30px 2px rgba(139,92,246,0.3)' }}
        whileTap={on ? undefined : { y: 10 }}
        animate={on ? { y: [0, 8, 0], x: [0, -2, 2, -1, 1, 0] } : { y: 0 }}
        transition={on ? { duration: 0.45, ease: 'easeInOut' } : { type: 'spring', stiffness: 320, damping: 18 }}
      >
        {/* Icono: HEXAGONO (reemplaza al bluetooth) */}
        <svg width="54" height="54" viewBox="0 0 32 32" fill="none">
          <polygon
            points="16,3 28,10 28,22 16,29 4,22 4,10"
            fill="none"
            stroke={on ? '#fff' : 'rgba(148,163,184,0.55)'}
            strokeWidth={on ? 2.2 : 1.6}
            style={{ transition: 'stroke 0.3s' }}
          />
          <circle
            cx="16"
            cy="16"
            r="3.4"
            fill={on ? '#fff' : 'rgba(148,163,184,0.4)'}
            style={{ transition: 'fill 0.3s' }}
          />
        </svg>
      </motion.span>
    </button>
  );
}
