import { useReducedMotion } from 'motion/react';
import { Opulento } from 'uvcanvas';

// Fondo permanente de toda la pagina: shader "Opulento" (uvcanvas, MIT) fijo detras
// del contenido, a baja opacidad, enmascarado y con velo oscuro para contraste y
// sensacion de profundidad/IA. Se omite bajo prefers-reduced-motion (GPU + motion).
export default function SiteBackground() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.4,
          maskImage: 'radial-gradient(95% 85% at 50% 30%, #000 45%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(95% 85% at 50% 30%, #000 45%, transparent 100%)',
        }}
      >
        <Opulento />
      </div>
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(70% 55% at 50% 0%, transparent, rgba(5,5,9,0.55) 80%), linear-gradient(180deg, rgba(5,5,9,0.4), rgba(5,5,9,0.78))',
        }}
      />
    </div>
  );
}
