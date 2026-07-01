import GalaxyBg from './GalaxyBg';

// Fondo permanente de toda la pagina: galaxia animada (canvas nativo) fija detras
// del contenido, con un velo de profundidad para contraste. Siempre se mueve (no
// estatico), tambien bajo prefers-reduced-motion en version suave.
export default function SiteBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <GalaxyBg />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(70% 55% at 50% 0%, transparent, rgba(5,5,9,0.35) 85%), linear-gradient(180deg, rgba(5,5,9,0.15), rgba(5,5,9,0.55))',
        }}
      />
    </div>
  );
}
