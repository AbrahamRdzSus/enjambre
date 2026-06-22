import { useState } from 'react';
import { Send } from 'lucide-react';
import { useAgents, useRun } from '../api/hooks';
import CircularProgress from '../components/CircularProgress';

const PURPLE = '#8b5cf6';
const AMBER = '#ffb020';
const MODES = [
  { id: 'parallel', label: 'Paralelo', ready: true },
  { id: 'sequential', label: 'Secuencial', ready: true },
  { id: 'debate', label: 'Debate', ready: true },
];

export default function RunPage() {
  const agents = useAgents();
  const run = useRun();
  const [prompt, setPrompt] = useState('');
  const [selected, setSelected] = useState<string[] | null>(null);
  const [save, setSave] = useState(true);
  const [mode, setMode] = useState('parallel');

  const all = agents.data ?? [];
  const enabled = all.filter((a) => a.enabled).map((a) => a.name);
  const chosen = selected ?? enabled;
  const report = run.data;

  function toggle(name: string) {
    const base = selected ?? enabled;
    setSelected(base.includes(name) ? base.filter((n) => n !== name) : [...base, name]);
  }

  function launch() {
    if (!prompt.trim() || chosen.length === 0) return;
    run.mutate({ prompt, agents: chosen, save, mode });
  }

  const successPct = report && report.runs.length
    ? (report.runs.filter((r) => !r.result.error).length / report.runs.length) * 100
    : 0;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="eyebrow">Lanzar tarea / Chats</p>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--fg)' }}>
          Despacha un prompt en paralelo
        </h1>
      </header>

      <div className="grid gap-5" style={{ gridTemplateColumns: '1.5fr 0.9fr' }}>
        {/* Columna izquierda: prompt + agentes + modo */}
        <div className="flex flex-col gap-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Refactoriza esta funcion para que sea mas legible..."
            aria-label="Prompt de la tarea"
            className="glass w-full p-4 text-sm resize-y"
            style={{ minHeight: 130, color: 'var(--fg)' }}
          />

          {/* Chips de agente */}
          <div>
            <p className="eyebrow mb-2">Agentes</p>
            <div className="flex flex-wrap gap-2">
              {all.map((a) => {
                const on = chosen.includes(a.name);
                const color = a.role === 'architect' ? AMBER : PURPLE;
                return (
                  <button
                    key={a.name}
                    type="button"
                    onClick={() => toggle(a.name)}
                    className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-colors"
                    style={{
                      borderColor: on ? color : 'var(--border)',
                      background: on ? `color-mix(in srgb, ${color} 16%, transparent)` : 'transparent',
                      color: on ? 'var(--fg)' : 'var(--fg-mute)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    <span className="inline-block w-2 h-2 rounded-full" style={{ background: color, opacity: a.enabled ? 1 : 0.4 }} />
                    {a.name}
                    <span style={{ color: 'var(--fg-faint)' }}>· {a.provider}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Modo */}
          <div>
            <p className="eyebrow mb-2">Modo</p>
            <div className="inline-flex rounded-lg border p-1" style={{ borderColor: 'var(--border)' }}>
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  disabled={!m.ready}
                  onClick={() => m.ready && setMode(m.id)}
                  title={m.ready ? '' : 'próximamente'}
                  className="text-xs px-3 h-8 rounded-md transition-colors disabled:opacity-40"
                  style={{
                    background: mode === m.id ? 'rgba(139,92,246,0.18)' : 'transparent',
                    color: mode === m.id ? 'var(--purple-soft)' : 'var(--fg-mute)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {m.label}{!m.ready && ' ·pronto'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={launch}
              disabled={run.isPending || !prompt.trim() || chosen.length === 0}
              className="flex items-center gap-2 px-5 h-11 rounded-xl font-semibold text-sm disabled:opacity-50"
              style={{ background: AMBER, color: '#1a1006' }}
            >
              <Send size={17} strokeWidth={2} />
              {run.isPending ? 'Consultando...' : 'Lanzar enjambre'}
            </button>
            <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--fg-mute)' }}>
              <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} aria-label="Guardar sesion" />
              guardar sesion
            </label>
          </div>
        </div>

        {/* Columna derecha: anillo de progreso */}
        <div className="glass flex flex-col items-center justify-center gap-3 p-6">
          <CircularProgress
            indeterminate={run.isPending}
            value={successPct}
            label={run.isPending ? 'corriendo' : 'éxito'}
          />
          <p className="text-xs text-center" style={{ color: 'var(--fg-mute)' }}>
            {run.isPending
              ? `Consultando ${chosen.length} agente(s) en ${mode}...`
              : report
                ? `${report.runs.filter((r) => !r.result.error).length}/${report.runs.length} ok · $${report.total_cost_usd.toFixed(6)}`
                : 'Selecciona agentes y lanza el enjambre'}
          </p>
        </div>
      </div>

      {/* Resultados lado a lado */}
      {report && (
        <section className="flex flex-col gap-3">
          {report.warnings.map((w) => (
            <p key={w} className="text-xs" style={{ color: 'var(--warn)' }}>⚠ {w}</p>
          ))}
          {report.session_id && (
            <p className="text-xs" style={{ color: 'var(--fg-faint)' }}>sesión {report.session_id}</p>
          )}
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.max(1, report.runs.length)}, minmax(0, 1fr))` }}>
            {report.runs.map((r) => (
              <div key={r.agent} className="glass p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm" style={{ color: 'var(--purple-soft)' }}>{r.agent}</span>
                  <span className="text-xs" style={{ color: 'var(--fg-faint)', fontFamily: 'var(--font-mono)' }}>
                    {r.provider}/{r.model}
                  </span>
                </div>
                {r.result.error ? (
                  <p className="text-xs" style={{ color: 'var(--alert)' }}>{r.result.error}</p>
                ) : (
                  <>
                    <p className="text-xs" style={{ color: 'var(--fg-faint)' }}>
                      {r.result.latency_ms} ms · ${r.result.cost_usd.toFixed(6)}
                    </p>
                    <pre className="text-xs whitespace-pre-wrap" style={{ color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}>
                      {r.result.text || '(respuesta vacia)'}
                    </pre>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
