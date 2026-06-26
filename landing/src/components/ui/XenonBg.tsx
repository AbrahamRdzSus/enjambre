import { useReducedMotion } from 'motion/react';
import { Opulento } from 'uvcanvas';

// Fondo shader "Xenon/Opulento" (paquete uvcanvas, MIT). Va a baja opacidad detras
// del hero, enmascarado y tintado para armonizar con la identidad morado/ambar y
// preservar contraste del texto. Se omite bajo prefers-reduced-motion (GPU + motion).
export default function XenonBg({ opacity = 0.32 }: { opacity?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          opacity,
          maskImage: 'radial-gradient(80% 75% at 50% 35%, #000 35%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(80% 75% at 50% 35%, #000 35%, transparent 100%)',
        }}
      >
        <Opulento />
      </div>
      {/* Velo para fundir con el negro obsidiana y dar contraste al texto */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 0%, transparent, rgba(5,5,9,0.5) 75%), linear-gradient(180deg, rgba(5,5,9,0.35), rgba(5,5,9,0.7))',
        }}
      />
    </div>
  );
}
