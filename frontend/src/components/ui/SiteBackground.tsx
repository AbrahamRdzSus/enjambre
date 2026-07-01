import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';

// Fondo galaxy de toda la app (recreacion nativa del estilo galaxy-interactive-hero,
// generada a mano, sin deps): campo de estrellas + nebulosa morado/ambar sobre
// obsidiana, con leve parallax al mover el mouse. Incluye velo (scrim) para que el
// contenido y el glassmorphism encima sigan legibles. Perf: cap DPR 1.5, pausa con
// document.hidden, respeta prefers-reduced-motion (WCAG 2.3.3).

interface Star {
  x: number;
  y: number;
  z: number; // profundidad 0..1 (parallax + tamaño)
  r: number;
  tw: number; // fase de parpadeo
  amber: boolean;
}

const PURPLE = [139, 92, 246];
const AMBER = [255, 176, 32];

export default function SiteBackground({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0;
    let h = 0;
    let stars: Star[] = [];
    // objetivo y valor suavizado del parallax
    const mouse = { tx: 0, ty: 0, x: 0, y: 0 };

    const seed = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(220, Math.floor((w * h) / 9000));
      stars = Array.from({ length: count }, () => {
        const z = Math.random();
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          z,
          r: 0.4 + z * 1.6,
          tw: Math.random() * Math.PI * 2,
          amber: Math.random() < 0.14,
        };
      });
    };

    // Nebulosa: manchas radiales suaves. Se dibuja una vez por frame (barato).
    const blobs = [
      { fx: 0.22, fy: 0.28, rf: 0.55, col: PURPLE, a: 0.16 },
      { fx: 0.82, fy: 0.68, rf: 0.5, col: AMBER, a: 0.08 },
      { fx: 0.62, fy: 0.15, rf: 0.42, col: PURPLE, a: 0.1 },
    ];

    const drawNebula = () => {
      for (const b of blobs) {
        const cx = b.fx * w + mouse.x * (20 * b.rf);
        const cy = b.fy * h + mouse.y * (20 * b.rf);
        const rad = Math.max(w, h) * b.rf;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        const [r, gr, bl] = b.col;
        g.addColorStop(0, `rgba(${r},${gr},${bl},${b.a})`);
        g.addColorStop(1, 'rgba(12,10,20,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
    };

    let raf = 0;
    const render = (t: number) => {
      // fondo base obsidiana
      ctx.fillStyle = '#0c0a14';
      ctx.fillRect(0, 0, w, h);
      drawNebula();

      // suavizado del parallax hacia el objetivo
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;

      for (const s of stars) {
        const px = s.x + mouse.x * (s.z * 26);
        const py = s.y + mouse.y * (s.z * 26);
        const twinkle = reduce ? 0.85 : 0.55 + 0.45 * Math.sin(t * 0.001 + s.tw);
        const [r, g, b] = s.amber ? AMBER : PURPLE;
        // mezcla hacia blanco para el nucleo del punto
        ctx.beginPath();
        ctx.arc(px, py, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${(r + 255) >> 1},${(g + 255) >> 1},${(b + 255) >> 1},${twinkle})`;
        ctx.fill();
      }
      if (!reduce) raf = requestAnimationFrame(render);
    };

    const onMove = (e: MouseEvent) => {
      mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!reduce && !raf) {
        raf = requestAnimationFrame(render);
      }
    };
    const onResize = () => {
      seed();
      if (reduce) render(0);
    };

    seed();
    if (reduce) {
      render(0); // un frame estatico
    } else {
      raf = requestAnimationFrame(render);
      window.addEventListener('mousemove', onMove);
    }
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [reduce]);

  return (
    <div className={`fixed inset-0 pointer-events-none ${className ?? ''}`} style={{ zIndex: 0 }} aria-hidden="true">
      <canvas ref={ref} className="h-full w-full block" />
      {/* velo: oscurece para mantener legibles texto y glassmorphism encima */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 50% 0%, rgba(12,10,20,0.35) 0%, rgba(12,10,20,0.62) 55%, rgba(12,10,20,0.8) 100%)',
        }}
      />
    </div>
  );
}
