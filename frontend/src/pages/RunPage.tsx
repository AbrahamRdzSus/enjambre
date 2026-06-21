import { useState } from 'react';
import { Send } from 'lucide-react';
import { useAgents, useRun } from '../api/hooks';

export default function RunPage() {
  const agents = useAgents();
  const run = useRun();
  const [prompt, setPrompt] = useState('');
  const [selected, setSelected] = useState<string[] | null>(null);
  const [save, setSave] = useState(true);

  const all = agents.data ?? [];
  const enabled = all.filter((a) => a.enabled).map((a) => a.name);
  const chosen = selected ?? enabled;

  function toggle(name: string) {
    const base = selected ?? enabled;
    setSelected(
      base.includes(name) ? base.filter((n) => n !== name) : [...base, name],
    );
  }

  function launch() {
    if (!prompt.trim() || chosen.length === 0) return;
    run.mutate({ prompt, agents: chosen, save });
  }

  const report = run.data;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="eyebrow">Lanzar tarea</p>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--fg)' }}>
          Despacha un prompt en paralelo
        </h1>
      </header>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Refactoriza esta funcion para que sea mas legible..."
        className="w-full rounded-xl p-4 text-sm border resize-y"
        style={{
          minHeight: 130,
          background: 'var(--bg-card)',
          borderColor: 'var(--border)',
          color: 'var(--fg)',
        }}
      />

      <div className="flex flex-wrap gap-2">
        {all.map((a) => {
          const on = chosen.includes(a.name);
          return (
            <button
              key={a.name}
              onClick={() => toggle(a.name)}
              className="text-xs px-3 py-1.5 rounded-lg border transition-colors"
              style={{
                borderColor: on ? 'var(--purple)' : 'var(--border)',
                background: on ? 'rgba(139,92,246,0.16)' : 'transparent',
                color: on ? 'var(--purple-soft)' : 'var(--fg-mute)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {a.name}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={launch}
          disabled={run.isPending || !prompt.trim() || chosen.length === 0}
          className="flex items-center gap-2 px-5 h-11 rounded-xl font-semibold text-sm disabled:opacity-50"
          style={{ background: 'var(--amber)', color: '#1a1006' }}
        >
          <Send size={17} strokeWidth={2} />
          {run.isPending ? 'Consultando...' : 'Lanzar enjambre'}
        </button>
        <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--fg-mute)' }}>
          <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} />
          guardar sesion
        </label>
      </div>

      {run.isError && (
        <p className="text-sm" style={{ color: 'var(--alert)' }}>
          Error: {(run.error as Error).message}
        </p>
      )}

      {report && (
        <section className="flex flex-col gap-3">
          {report.warnings.map((w) => (
            <p key={w} className="text-xs" style={{ color: 'var(--warn)' }}>⚠ {w}</p>
          ))}
          <p className="text-xs" style={{ color: 'var(--fg-mute)' }}>
            Costo estimado total: ${report.total_cost_usd.toFixed(6)} USD
            {report.session_id ? ` · sesion ${report.session_id}` : ''}
          </p>
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.max(1, report.runs.length)}, minmax(0, 1fr))` }}>
            {report.runs.map((r) => (
              <div
                key={r.agent}
                className="rounded-xl p-4 border flex flex-col gap-2"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm" style={{ color: 'var(--purple-soft)' }}>
                    {r.agent}
                  </span>
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
                    <pre
                      className="text-xs whitespace-pre-wrap"
                      style={{ color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}
                    >
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
