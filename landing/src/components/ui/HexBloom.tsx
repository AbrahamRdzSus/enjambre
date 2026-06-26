import { motion, useReducedMotion } from 'motion/react';

// "Bloom" hexagonal: anillos hexagonales concentricos que escalan y rotan hacia
// afuera con desvanecido (efecto ripple), detras del nucleo del hero. Re-creacion
// nativa del concepto bloom adaptada al hexagono de la identidad (no cuadrados).
const HEX = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

export default function HexBloom({ rings = 4 }: { rings?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden>
      {Array.from({ length: rings }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute"
          style={{
            width: '46%',
            aspectRatio: '1',
            clipPath: HEX,
            boxShadow: 'inset 0 0 0 1.5px rgba(139,92,246,0.5)',
          }}
          initial={{ scale: 0.5, opacity: 0, rotate: 0 }}
          animate={{ scale: 2.1, opacity: [0, 0.5, 0], rotate: 90 }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: 'easeOut',
            delay: (i * 6) / rings,
          }}
        />
      ))}
    </div>
  );
}
