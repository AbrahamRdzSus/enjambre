import { motion } from 'motion/react';

// Animacion de ACCESO. Dos modos para comparar:
//  - 'square': malla cuadrada tipo tablero (baseline).
//  - 'hex': PANAL real (honeycomb) estilo "Magnific" — hexagonos biselados con
//    DIVISIONES CLARAS (separacion visible entre celdas) y sombra 3D, que se
//    encienden en SECUENCIA radial desde el centro y luego el campo se disuelve.
const HEX = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

const AREA_W = 1280;
const AREA_H = 760;

type Cell = { x: number; y: number; dist: number; warm: boolean; shade: number };

// Pseudo-random determinista por celda (para variar el tono base sin libs).
function rng(i: number) {
  const s = Math.sin(i * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

function honeycomb() {
  const hexW = 70;
  const hexH = hexW * 1.1547; // pointy-top
  const colStep = hexW;
  const rowStep = hexH * 0.75;
  const cols = Math.ceil(AREA_W / colStep) + 2;
  const rows = Math.ceil(AREA_H / rowStep) + 2;
  const w = cols * colStep;
  const h = rows * rowStep;
  const cx = w / 2;
  const cy = h / 2;
  const cells: Cell[] = [];
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * colStep + (r % 2 ? colStep / 2 : 0);
      const y = r * rowStep;
      cells.push({ x, y, dist: Math.hypot(x - cx, y - cy), warm: (r + c) % 2 === 0, shade: rng(i++) });
    }
  }
  // Hex un poco mas chico que el paso => GAP visible = divisiones claras.
  return { cells, w, h, dispW: hexW * 0.9, dispH: hexH * 0.9 };
}

function squares() {
  const size = 64;
  const gap = 8;
  const step = size + gap;
  const cols = Math.ceil(AREA_W / step) + 1;
  const rows = Math.ceil(AREA_H / step) + 1;
  const w = cols * step;
  const h = rows * step;
  const cx = w / 2;
  const cy = h / 2;
  const cells: Cell[] = [];
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * step;
      const y = r * step;
      cells.push({ x, y, dist: Math.hypot(x - cx, y - cy), warm: (r + c) % 2 === 0, shade: rng(i++) });
    }
  }
  return { cells, w, h, dispW: size, dispH: size };
}

export default function SequenceReveal({ shape, playKey }: { shape: 'square' | 'hex'; playKey: number }) {
  const isHex = shape === 'hex';
  const { cells, w, h, dispW, dispH } = isHex ? honeycomb() : squares();
  const maxDist = cells.reduce((m, c) => Math.max(m, c.dist), 1);

  return (
    <div
      key={playKey}
      className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden"
      aria-hidden
    >
      <div className="relative" style={{ width: w, height: h }}>
        {cells.map((cell, i) => {
          const delay = (cell.dist / maxDist) * 1.1;
          const warmStroke = cell.warm ? 'rgba(255,176,32,0.7)' : 'rgba(139,92,246,0.7)';
          // Tono base oscuro variado + bisel (luz arriba-izq, sombra abajo-der).
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
                clipPath: isHex ? HEX : undefined,
                borderRadius: isHex ? 0 : 8,
                background: `linear-gradient(150deg, rgba(255,255,255,${0.05 + cell.shade * 0.04}) 0%, rgba(20,20,26,${0.85}) 38%, rgba(0,0,0,${0.92}) 100%), rgba(255,255,255,${base})`,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.10), inset 0 0 0 1px rgba(0,0,0,0.55)`,
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

      {/* Lineas hexagonales que GIRAN EN SECUENCIA: anillos en cascada que nacen
          del centro, se expanden, rotan (alternando sentido) y se desvanecen.
          Capas con grosor decreciente y delay escalonado para sensacion de torno. */}
      {Array.from({ length: 7 }).map((_, i) => {
        const cw = isHex ? 1 : 0; // morado/ambar alternado
        const warm = (i + cw) % 2 === 0;
        const dir = i % 2 ? -1 : 1;
        return (
          <motion.span
            key={`r-${i}`}
            className="absolute"
            style={{
              width: 180,
              height: isHex ? 180 * 1.1547 : 180,
              clipPath: isHex ? HEX : undefined,
              borderRadius: isHex ? 0 : 18,
              boxShadow: `inset 0 0 0 ${2.2 - i * 0.18}px ${warm ? 'rgba(255,176,32,0.75)' : 'rgba(139,92,246,0.75)'}`,
            }}
            initial={{ scale: 0.15, opacity: 0, rotate: dir * -40 }}
            animate={{ scale: [0.15, 3.4], opacity: [0, 0.85, 0], rotate: dir * (isHex ? 120 : 30) }}
            transition={{ duration: 2, ease: [0.22, 1, 0.36, 1], delay: 0.45 + i * 0.16 }}
          />
        );
      })}
    </div>
  );
}
