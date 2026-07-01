import { motion } from 'motion/react';

// Re-creacion NATIVA del look "bluetooth key" (keycap 3D oscuro con LED azul de
// bajo-glow). Replicado desde la referencia visual (no es codigo de terceros).
// Capas: sombra base -> cuerpo del keycap (biselado) -> cara recesada -> glifo
// bluetooth grabado -> LED + halo azul inferior. `on` intensifica el glow.
export default function BluetoothKey({ on, onActivate }: { on: boolean; onActivate: () => void }) {
  const blue = '#3b82f6';
  return (
    <button
      type="button"
      onClick={onActivate}
      aria-label="Bluetooth"
      aria-pressed={on}
      className="group relative grid place-items-center outline-none"
      style={{ width: 180, height: 200, background: 'transparent', border: 0, cursor: 'pointer' }}
    >
      {/* Halo azul inferior (LED bleed) */}
      <span
        className="absolute left-1/2 -translate-x-1/2 transition-opacity duration-300"
        style={{
          bottom: 24,
          width: 120,
          height: 46,
          borderRadius: '50%',
          background: blue,
          filter: 'blur(26px)',
          opacity: on ? 0.85 : 0.5,
        }}
      />

      {/* Cuerpo del keycap */}
      <motion.div
        className="relative"
        style={{
          width: 132,
          height: 132,
          borderRadius: 28,
          background: 'linear-gradient(150deg, #34343a 0%, #232328 42%, #16161a 100%)',
          boxShadow: [
            'inset 0 2px 1px rgba(255,255,255,0.18)', // luz superior del borde
            'inset 0 -3px 2px rgba(0,0,0,0.6)', // sombra inferior interna
            '0 18px 36px -10px rgba(0,0,0,0.85)', // drop shadow
            `0 6px 20px -2px ${on ? 'rgba(59,130,246,0.55)' : 'rgba(59,130,246,0.22)'}`, // glow azul
          ].join(', '),
        }}
        initial={false}
        whileHover={{ y: -2 }}
        whileTap={{ y: 4, scale: 0.985 }}
        transition={{ type: 'spring', stiffness: 320, damping: 20 }}
      >
        {/* Cara recesada (donde va el glifo) */}
        <div
          className="absolute grid place-items-center"
          style={{
            inset: 16,
            borderRadius: 18,
            background: 'linear-gradient(150deg, #2b2b30, #1a1a1e 70%)',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.7), inset 0 -1px 1px rgba(255,255,255,0.05)',
          }}
        >
          {/* Glifo bluetooth grabado (gris con borde de luz) */}
          <svg width="46" height="62" viewBox="0 0 24 32" fill="none">
            <path
              d="M7 9 L17 23 L12 28 V4 L17 9 L7 23"
              stroke={on ? '#cfe0ff' : '#7b7b82'}
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transition: 'stroke 0.3s',
                filter: on
                  ? 'drop-shadow(0 0 6px rgba(96,165,250,0.8))'
                  : 'drop-shadow(0 1px 0 rgba(255,255,255,0.08)) drop-shadow(0 -1px 1px rgba(0,0,0,0.6))',
              }}
            />
          </svg>
        </div>
      </motion.div>

      {/* LED azul puntual */}
      <span
        className="absolute left-1/2 -translate-x-1/2 transition-all duration-300"
        style={{
          bottom: 40,
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: '#bcd4ff',
          boxShadow: `0 0 10px 3px ${blue}, 0 0 22px 6px rgba(59,130,246,0.6)`,
          opacity: on ? 1 : 0.7,
        }}
      />
    </button>
  );
}
