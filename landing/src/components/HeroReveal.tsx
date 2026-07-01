import { useEffect, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';

// Revelado del hero: dos mitades con borde hexagonal cubren el contenido y, al
// "entrar" (active=true), se abren de lado a lado mostrando la informacion
// principal, con un destello de hexagono en la costura. Sin overlay bajo
// prefers-reduced-motion. El overlay se retira al terminar (no bloquea clics).
const HEX = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';
const EASE = [0.7, 0, 0.3, 1] as const;

export default function HeroReveal({ active, children }: { active: boolean; children: ReactNode }) {
  const reduce = useReducedMotion();
  const [covered, setCovered] = useState(true);

  useEffect(() => {
    if (reduce) {
      setCovered(false);
      return;
    }
    if (active) {
      const t = setTimeout(() => setCovered(false), 1400);
      return () => clearTimeout(t);
    }
  }, [active, reduce]);

  return (
    <div className="relative">
      {children}
      {covered && !reduce && (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
          {/* Mitad izquierda (borde derecho = medio hexagono) */}
          <motion.div
            className="absolute inset-y-0 left-0"
            style={{
              width: 'calc(50% + 1px)',
              background: 'var(--bg)',
              clipPath: 'polygon(0 0, 100% 0, calc(100% - 64px) 50%, 100% 100%, 0 100%)',
            }}
            initial={{ x: 0 }}
            animate={active ? { x: '-104%' } : { x: 0 }}
            transition={{ duration: 1, ease: EASE, delay: 0.15 }}
          />
          {/* Mitad derecha (borde izquierdo = medio hexagono) */}
          <motion.div
            className="absolute inset-y-0 right-0"
            style={{
              width: 'calc(50% + 1px)',
              background: 'var(--bg)',
              clipPath: 'polygon(64px 50%, 0 0, 100% 0, 100% 100%, 0 100%)',
            }}
            initial={{ x: 0 }}
            animate={active ? { x: '104%' } : { x: 0 }}
            transition={{ duration: 1, ease: EASE, delay: 0.15 }}
          />
          {/* Destello del hexagono en la costura */}
          <motion.span
            className="absolute left-1/2 top-1/2"
            style={{ width: 150, height: 150, marginLeft: -75, marginTop: -75, clipPath: HEX, boxShadow: 'inset 0 0 0 2px rgba(255,176,32,0.75)' }}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={active ? { scale: [0.6, 1.15, 1.7], opacity: [0, 1, 0] } : { opacity: 0 }}
            transition={{ duration: 0.95, ease: 'easeOut' }}
          />
        </div>
      )}
    </div>
  );
}
