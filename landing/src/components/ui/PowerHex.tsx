import { motion } from 'motion/react';

// Tecla de encendido HEXAGONAL con relieve/profundidad (mismo lenguaje 3D que un
// keycap fisico): cuerpo extruido + cara biselada (luz arriba / sombra abajo) +
// receso interno grabado + glifo hexagonal + LED inferior (identidad ENJAMBRE:
// ambar/morado). El clip-path corta el box-shadow exterior, asi que la sombra y
// el glow se hacen con filter:drop-shadow y el bisel con capas de gradiente.
const HEX = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';
const AMBER = '#ffb020';
const PURPLE = '#8b5cf6';

export default function PowerHex({ on, onActivate }: { on: boolean; onActivate: () => void }) {
  return (
    <button
      type="button"
      onClick={onActivate}
      aria-label="Encender ENJAMBRE y entrar"
      aria-pressed={on}
      className="group relative grid place-items-center outline-none"
      style={{ width: 184, height: 208, background: 'transparent', border: 0, cursor: on ? 'default' : 'pointer' }}
    >
      {/* Halo inferior (LED bleed) */}
      <span
        className="absolute left-1/2 -translate-x-1/2 transition-opacity duration-300"
        style={{
          bottom: 22,
          width: 118,
          height: 44,
          borderRadius: '50%',
          background: on ? AMBER : PURPLE,
          filter: 'blur(26px)',
          opacity: on ? 0.85 : 0.4,
        }}
      />

      {/* Cuerpo del keycap (drop-shadow porque clip-path corta el box-shadow) */}
      <motion.div
        className="relative grid place-items-center"
        style={{
          width: 138,
          height: 138 * 1.1547,
          filter: `drop-shadow(0 16px 22px rgba(0,0,0,0.85)) drop-shadow(0 6px 16px ${
            on ? 'rgba(255,176,32,0.5)' : 'rgba(139,92,246,0.28)'
          })`,
        }}
        initial={false}
        whileHover={on ? undefined : { y: -2 }}
        whileTap={on ? undefined : { y: 5, scale: 0.985 }}
        animate={on ? { y: [0, 6, 0], x: [0, -1.5, 1.5, -1, 1, 0] } : { y: 0 }}
        transition={on ? { duration: 0.45, ease: 'easeInOut' } : { type: 'spring', stiffness: 320, damping: 20 }}
      >
        {/* Lado extruido (mas oscuro, desplazado hacia abajo) */}
        <span
          className="absolute"
          style={{
            inset: 0,
            top: 6,
            clipPath: HEX,
            background: on ? 'linear-gradient(180deg, #4a338f, #241a4d)' : 'linear-gradient(180deg, #0a0c12, #05070c)',
          }}
        />
        {/* Cara superior */}
        <span
          className="absolute"
          style={{
            inset: 0,
            bottom: 6,
            clipPath: HEX,
            background: on
              ? 'linear-gradient(150deg, #ffc24a 0%, #b07bff 55%, #7c4bff 100%)'
              : 'linear-gradient(150deg, #34343a 0%, #232328 42%, #16161a 100%)',
          }}
        />
        {/* Bisel: luz arriba */}
        <span
          className="absolute"
          style={{ inset: 0, bottom: 6, clipPath: HEX, background: 'linear-gradient(180deg, rgba(255,255,255,0.22), transparent 32%)' }}
        />
        {/* Bisel: sombra abajo */}
        <span
          className="absolute"
          style={{ inset: 0, bottom: 6, clipPath: HEX, background: 'linear-gradient(0deg, rgba(0,0,0,0.55), transparent 36%)' }}
        />

        {/* Receso interno grabado */}
        <span
          className="absolute grid place-items-center"
          style={{
            width: '64%',
            height: '64%',
            marginBottom: 6,
            clipPath: HEX,
            background: on
              ? 'linear-gradient(150deg, #b98bff, #6d3fd6 70%)'
              : 'linear-gradient(150deg, #2b2b30, #1a1a1e 70%)',
            boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.7)',
          }}
        >
          <span
            className="absolute"
            style={{ inset: 0, clipPath: HEX, background: 'linear-gradient(180deg, rgba(255,255,255,0.16), transparent 40%)' }}
          />
          {/* Glifo: HEXAGONO grabado */}
          <svg width="52" height="58" viewBox="0 0 28 32" fill="none" className="relative">
            <polygon
              points="14,3 25,9.5 25,22.5 14,29 3,22.5 3,9.5"
              fill="none"
              stroke={on ? '#fff' : '#7b7b82'}
              strokeWidth={on ? 2.4 : 2}
              strokeLinejoin="round"
              style={{
                transition: 'stroke 0.3s',
                filter: on
                  ? 'drop-shadow(0 0 6px rgba(255,255,255,0.8))'
                  : 'drop-shadow(0 1px 0 rgba(255,255,255,0.08)) drop-shadow(0 -1px 1px rgba(0,0,0,0.6))',
              }}
            />
            <circle cx="14" cy="16" r="2.6" fill={on ? '#fff' : 'rgba(148,163,184,0.5)'} style={{ transition: 'fill 0.3s' }} />
          </svg>
        </span>
      </motion.div>

      {/* LED puntual */}
      <span
        className="absolute left-1/2 -translate-x-1/2 transition-all duration-300"
        style={{
          bottom: 38,
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: on ? '#ffe6b0' : '#cdbcff',
          boxShadow: `0 0 10px 3px ${on ? AMBER : PURPLE}, 0 0 22px 6px ${on ? 'rgba(255,176,32,0.6)' : 'rgba(139,92,246,0.5)'}`,
          opacity: on ? 1 : 0.65,
        }}
      />
    </button>
  );
}
