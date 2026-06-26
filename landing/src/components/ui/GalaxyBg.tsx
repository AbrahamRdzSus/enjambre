import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';

// Fondo "galaxy" interactivo, re-creacion nativa (canvas 2D, sin deps externas ni
// escenas alojadas): campo de estrellas en 3 capas de profundidad con deriva lenta,
// parallax segun el cursor, titileo, y nebulosas radiales morado/ambar de identidad.
// Inspirado en el concepto galaxy-interactive-hero de 21st.dev; codigo propio.
// Respeta prefers-reduced-motion (pinta un campo estatico).
export default function GalaxyBg() {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const LAYERS = 3;
    let w = 0;
    let h = 0;
    let raf = 0;
    let t = 0;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

    type Star = { x: number; y: number; z: number; r: number; tw: number; ph: number };
    let stars: Star[] = [];

    const tint = (z: number) =>
      z === 1 ? '#ffd9a0' : z === 2 ? '#c4b5fd' : '#e9e4ff';

    function resize() {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(420, Math.floor((w * h) / 3500));
      stars = Array.from({ length: count }, () => {
        const z = Math.ceil(Math.random() * LAYERS);
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          z,
          r: (LAYERS - z + 1) * 0.5 + Math.random() * 0.6,
          tw: 0.4 + Math.random() * 0.6,
          ph: Math.random() * Math.PI * 2,
        };
      });
    }

    function nebula() {
      ctx.fillStyle = '#050509';
      ctx.fillRect(0, 0, w, h);
      const g1 = ctx.createRadialGradient(w * 0.5, h * 0.08, 0, w * 0.5, h * 0.08, h * 0.95);
      g1.addColorStop(0, 'rgba(139,92,246,0.20)');
      g1.addColorStop(0.5, 'rgba(139,92,246,0.05)');
      g1.addColorStop(1, 'transparent');
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);
      const g2 = ctx.createRadialGradient(w * 0.85, h * 0.9, 0, w * 0.85, h * 0.9, h * 0.7);
      g2.addColorStop(0, 'rgba(255,176,32,0.12)');
      g2.addColorStop(1, 'transparent');
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, w, h);
    }

    function wrap(v: number, max: number) {
      return ((v % max) + max) % max;
    }

    function frame() {
      t += 0.016;
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;
      nebula();
      for (const s of stars) {
        const depth = LAYERS - s.z + 1;
        const x = wrap(s.x + mouse.x * depth * 8, w);
        const y = wrap(s.y + mouse.y * depth * 8 + t * depth * 3, h);
        ctx.globalAlpha = s.tw * (0.5 + 0.5 * Math.sin(t * 1.5 + s.ph));
        ctx.fillStyle = tint(s.z);
        ctx.beginPath();
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }

    function onMove(e: PointerEvent) {
      mouse.tx = (e.clientX - w / 2) / (w / 2);
      mouse.ty = (e.clientY - h / 2) / (h / 2);
    }

    resize();
    window.addEventListener('resize', resize);

    if (reduce) {
      nebula();
      for (const s of stars) {
        ctx.globalAlpha = s.tw;
        ctx.fillStyle = tint(s.z);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else {
      window.addEventListener('pointermove', onMove);
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
    };
  }, [reduce]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
