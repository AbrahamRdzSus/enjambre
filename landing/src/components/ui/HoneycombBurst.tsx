import { useMemo } from 'react';
import { motion } from 'motion/react';

// Cinematica de ACCESO (corre una vez al entrar): PANAL hexagonal con divisiones
// claras y bisel 3D que se enciende en SECUENCIA radial desde el centro, mas
// lineas hexagonales que GIRAN EN SECUENCIA (anillos en cascada que se expanden
// y rotan alternando sentido). Overlay a pantalla completa, sin interaccion.
const HEX = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

function rng(i: number) {
  const s = Math.sin(i * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

export default function HoneycombBurst() {
  const { cells, w, h, dispW, dispH, maxDist } = useMemo(() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 900;
    const AREA_W = vw * 1.15;
    const AREA_H = vh * 1.15;
    const hexW = 74;
    const hexH = hexW * 1.1547;
    const colStep = hexW;
    const rowStep = hexH * 0.75;
    const cols = Math.ceil(AREA_W / colStep) + 2;
    const rows = Math.ceil(AREA_H / rowStep) + 2;
    const w = cols * colStep;
    const h = rows * rowStep;
    const cx = w / 2;
    const cy = h / 2;
    const cells: { x: number; y: number; dist: number; warm: boolean; shade: number }[] = [];
    let i = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * colStep + (r % 2 ? colStep / 2 : 0);
        const y = r * rowStep;
        cells.push({ x, y, dist: Math.hypot(x - cx, y - cy), warm: (r + c) % 2 === 0, shade: rng(i++) });
      }
    }
    const maxDist = cells.reduce((m, c) => Math.max(m, c.dist), 1);
    return { cells, w, h, dispW: hexW * 0.9, dispH: hexH * 0.9, maxDist };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden" aria-hidden>
      <div className="relative" style={{ width: w, height: h }}>
        {cells.map((cell, i) => {
          const delay = (cell.dist / maxDist) * 1.1;
          const warmStroke = cell.warm ? 'rgba(255,176,32,0.7)' : 'rgba(139,92,246,0.7)';
          const base = 0.06 + cell.shade * 0.06;
          return (
            <motion.span
              key={i}
              className="absolute"
              style={{
                left: cell.x,
                top: cell.y,
                width: dispW,
                height: dispH,
                marginLeft: -dispW / 2,
                marginTop: -dispH / 2,
                clipPath: HEX,
                background: `linear-gradient(150deg, rgba(255,255,255,${0.05 + cell.shade * 0.04}) 0%, rgba(20,20,26,0.85) 38%, rgba(0,0,0,0.92) 100%), rgba(255,255,255,${base})`,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), inset 0 0 0 1px rgba(0,0,0,0.55)',
              }}
              initial={{ opacity: 0.18, scale: 0.96 }}
              animate={{
                opacity: [0.18, 1, 1, 0],
                scale: [0.96, 1, 1, 1.12],
                boxShadow: [
                  'inset 0 1px 0 rgba(255,255,255,0.10), inset 0 0 0 1px rgba(0,0,0,0.55)',
                  `inset 0 1px 0 rgba(255,255,255,0.10), inset 0 0 0 1.5px ${warmStroke}, 0 0 18px ${warmStroke}`,
                  `inset 0 1px 0 rgba(255,255,255,0.10), inset 0 0 0 1.5px ${warmStroke}, 0 0 18px ${warmStroke}`,
                  'inset 0 1px 0 rgba(255,255,255,0.10), inset 0 0 0 1px rgba(0,0,0,0.55)',
                ],
              }}
              transition={{ duration: 1.6, delay, ease: 'easeInOut', times: [0, 0.22, 0.62, 1] }}
            />
          );
        })}
      </div>

      {/* Lineas hexagonales que giran en secuencia (anillos en cascada) */}
      {Array.from({ length: 7 }).map((_, i) => {
        const warm = i % 2 === 0;
        const dir = i % 2 ? -1 : 1;
        return (
          <motion.span
            key={`r-${i}`}
            className="absolute"
            style={{
              width: 200,
              height: 200 * 1.1547,
              clipPath: HEX,
              boxShadow: `inset 0 0 0 ${2.2 - i * 0.18}px ${warm ? 'rgba(255,176,32,0.75)' : 'rgba(139,92,246,0.75)'}`,
            }}
            initial={{ scale: 0.15, opacity: 0, rotate: dir * -40 }}
            animate={{ scale: [0.15, 3.6], opacity: [0, 0.85, 0], rotate: dir * 120 }}
            transition={{ duration: 2, ease: [0.22, 1, 0.36, 1], delay: 0.45 + i * 0.16 }}
          />
        );
      })}
    </div>
  );
}
