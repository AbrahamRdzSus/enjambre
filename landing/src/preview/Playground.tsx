import { useState } from 'react';
import BluetoothKey from './BluetoothKey';
import PowerHex from '../components/ui/PowerHex';
import SequenceReveal from './SequenceReveal';

// VENTANA DE PRUEBA. Compara, sin tocar produccion:
//  - Tecla: Bluetooth (baseline "tal cual") vs Hexagono (PowerHex de produccion).
//  - Acceso: animacion en secuencia con Cuadros vs Hexagonos.
// Sirve para iterar el diseno ANTES de modificar EntryGate/PowerHex/HeroReveal.
type Tab = 'tecla' | 'acceso';
type Shape = 'square' | 'hex';

function Seg<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { v: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-border p-1" style={{ background: 'rgba(255,255,255,0.03)' }}>
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className="rounded-md px-3 py-1.5 text-sm transition-colors"
          style={
            value === o.v
              ? { background: 'var(--purple, #8b5cf6)', color: '#fff' }
              : { color: 'var(--muted-foreground, #94a3b8)' }
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function Playground() {
  const [tab, setTab] = useState<Tab>('tecla');
  const [keyKind, setKeyKind] = useState<'bt' | 'hex'>('hex');
  const [on, setOn] = useState(false);
  const [shape, setShape] = useState<Shape>('hex');
  const [playKey, setPlayKey] = useState(0);

  return (
    <div className="min-h-screen text-foreground" style={{ background: 'var(--bg, #050509)' }}>
      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-1">
          <span className="kicker">ventana de prueba (no produccion)</span>
          <h1 className="wordmark text-2xl">ENJAMBRE — Lab de entrada</h1>
          <p className="text-sm text-muted-foreground">
            Compara la tecla y la animacion de acceso. Empieza por el baseline (bluetooth + cuadros) y cambia a hexagonos para ver el objetivo.
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-3">
          <Seg<Tab>
            value={tab}
            onChange={setTab}
            options={[
              { v: 'tecla', label: 'Tecla' },
              { v: 'acceso', label: 'Acceso (secuencia)' },
            ]}
          />
          {tab === 'tecla' && (
            <Seg
              value={keyKind}
              onChange={(v) => {
                setKeyKind(v);
                setOn(false);
              }}
              options={[
                { v: 'bt', label: 'Bluetooth (baseline)' },
                { v: 'hex', label: 'Hexagono' },
              ]}
            />
          )}
          {tab === 'acceso' && (
            <Seg<Shape>
              value={shape}
              onChange={(v) => {
                setShape(v);
                setPlayKey((k) => k + 1);
              }}
              options={[
                { v: 'square', label: 'Cuadros (baseline)' },
                { v: 'hex', label: 'Hexagonos' },
              ]}
            />
          )}
        </div>

        <div
          className="relative grid min-h-[420px] place-items-center overflow-hidden rounded-2xl border border-border"
          style={{
            background:
              'radial-gradient(60% 50% at 50% 45%, rgba(139,92,246,0.10), transparent 70%), rgba(255,255,255,0.02)',
          }}
        >
          {tab === 'tecla' && (
            <div className="flex flex-col items-center gap-6">
              {keyKind === 'bt' ? (
                <BluetoothKey on={on} onActivate={() => setOn((v) => !v)} />
              ) : (
                <PowerHex on={on} onActivate={() => setOn((v) => !v)} />
              )}
              <button
                type="button"
                onClick={() => setOn((v) => !v)}
                className="rounded-md border border-border px-4 py-1.5 text-sm hover:text-foreground"
              >
                {on ? 'Apagar' : 'Encender'}
              </button>
            </div>
          )}

          {tab === 'acceso' && (
            <>
              <div className="z-0 flex flex-col items-center gap-2 text-center">
                <span className="wordmark text-xl" style={{ letterSpacing: '0.26em' }}>
                  ENJAMBRE
                </span>
                <span className="text-sm text-muted-foreground">contenido revelado detras</span>
              </div>
              <div className="absolute inset-0">
                <SequenceReveal shape={shape} playKey={playKey} />
              </div>
              <button
                type="button"
                onClick={() => setPlayKey((k) => k + 1)}
                className="absolute bottom-4 right-4 z-10 rounded-md border border-border px-4 py-1.5 text-sm hover:text-foreground"
                style={{ background: 'rgba(5,5,9,0.6)' }}
              >
                Repetir
              </button>
            </>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Dev: <code>npm run dev</code> y abre <code>/preview.html</code>. Esta pagina no entra al build de Vercel.
        </p>
      </div>
    </div>
  );
}
