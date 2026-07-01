import { useState } from 'react';
import { Send } from 'lucide-react';
import { useAgents, useProviders, useRun } from '../api/hooks';
import CircularProgress from '../components/CircularProgress';
import ProviderIcon from '../components/ProviderIcon';
import { Panel, PageHeader } from '../components/ui/Panel';

const PURPLE = '#8b5cf6';
const AMBER = '#ffb020';
const MODES = [
  { id: 'parallel', label: 'Paralelo', ready: true },
  { id: 'sequential', label: 'Secuencial', ready: true },
  { id: 'debate', label: 'Debate', ready: true },
];

export default function RunPage() {
  const agents = useAgents();
  const providers = useProviders();
  const run = useRun();
  const [prompt, setPrompt] = useState('');
  const [selected, setSelected] = useState<string[] | null>(null);
  const [save, setSave] = useState(true);
  const [mode, setMode] = useState('parallel');

  const all = agents.data ?? [];
  const enabled = all.filter((a) => a.enabled).map((a) => a.name);
  const chosen = selected ?? enabled;
  const report = run.data;

  // providers sin key configurada: sus agentes fallarán al lanzar
  const keyless = new Set(
    (providers.data ?? []).filter((p) => !p.key_present).map((p) => p.provider),
  );
  const chosenKeyless = all
    .filter((a) => chosen.includes(a.name) && keyless.has(a.provider))
    .map((a) => a.name);

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
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="Lanzar tarea / Chats" title="Despacha un prompt en paralelo" />

      <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)' }}>
        {/* Columna izquierda: prompt + agentes + modo */}
        <Panel title="Tarea" bodyClassName="flex flex-col gap-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Refactoriza esta funcion para que sea mas legible..."
            aria-label="Prompt de la tarea"
            className="w-full resize-y rounded-lg border border-border bg-secondary/30 p-3 text-sm text-foreground"
            style={{ minHeight: 130 }}
          />

          {/* Chips de agente */}
          <div>
            <p className="eyebrow mb-2">Agentes</p>
            <div className="flex flex-wrap gap-2">
              {all.map((a) => {
                const on = chosen.includes(a.name);
                const noKey = keyless.has(a.provider);
                const color = a.role === 'architect' ? AMBER : PURPLE;
                return (
                  <button
                    key={a.name}
                    type="button"
                    onClick={() => toggle(a.name)}
                    title={noKey ? `Sin API key para ${a.provider} — configúrala en Agentes` : ''}
                    className="flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors"
                    style={{
                      borderColor: on ? color : 'var(--border)',
                      background: on ? `color-mix(in srgb, ${color} 16%, transparent)` : 'transparent',
                      color: on ? 'var(--fg)' : 'var(--fg-mute)',
                    }}
                  >
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: color, opacity: a.enabled ? 1 : 0.4 }} />
                    {a.name}
                    <span style={{ color: 'var(--fg-faint)' }}>· {a.provider}</span>
                    {noKey && (
                      <span className="rounded px-1 text-[10px] font-semibold" style={{ background: 'color-mix(in srgb, var(--alert) 18%, transparent)', color: 'var(--alert)' }}>
                        sin key
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {chosenKeyless.length > 0 && (
              <p className="mt-2 text-[11px]" style={{ color: 'var(--warn)' }}>
                ⚠ {chosenKeyless.length} agente(s) seleccionado(s) sin API key ({chosenKeyless.join(', ')}) fallarán al lanzar.
              </p>
            )}
          </div>

          {/* Modo */}
          <div>
            <p className="eyebrow mb-2">Modo</p>
            <div className="inline-flex rounded-lg border border-border p-1">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  disabled={!m.ready}
                  onClick={() => m.ready && setMode(m.id)}
                  title={m.ready ? '' : 'próximamente'}
                  className="h-8 rounded-md px-3 font-mono text-xs transition-colors disabled:opacity-40"
                  style={{
                    background: mode === m.id ? 'rgba(139,92,246,0.18)' : 'transparent',
                    color: mode === m.id ? 'var(--purple-soft)' : 'var(--fg-mute)',
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
              className="flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold disabled:opacity-50"
              style={{ background: AMBER, color: '#1a1006' }}
            >
              <Send size={17} strokeWidth={2} />
              {run.isPending ? 'Consultando...' : 'Lanzar enjambre'}
            </button>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} aria-label="Guardar sesion" />
              guardar sesion
            </label>
          </div>
        </Panel>

        {/* Columna derecha: progreso + salidas */}
        <Panel
          title="Salidas de los agentes"
          bodyClassName="flex flex-col gap-4 max-h-[640px] overflow-y-auto scrollbar-thin"
        >
          <div className="flex flex-col items-center gap-2">
            <CircularProgress
              indeterminate={run.isPending}
              value={successPct}
              label={run.isPending ? 'corriendo' : 'éxito'}
            />
            <p className="text-center text-xs text-muted-foreground">
              {run.isPending
                ? `Consultando ${chosen.length} agente(s) en ${mode}...`
                : report
                  ? `${report.runs.filter((r) => !r.result.error).length}/${report.runs.length} ok · $${report.total_cost_usd.toFixed(6)}`
                  : 'Selecciona agentes y lanza el enjambre'}
            </p>
          </div>

          {report && (
            <div className="flex flex-col gap-3 border-t border-border pt-3">
              {report.warnings.map((w) => (
                <p key={w} className="text-xs" style={{ color: 'var(--warn)' }}>⚠ {w}</p>
              ))}
              {report.session_id && (
                <p className="text-[11px] text-muted-foreground">sesión {report.session_id}</p>
              )}
              {report.runs.map((r) => (
                <div key={r.agent} className="rounded-lg border border-border bg-secondary/30 p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-semibold text-primary">{r.agent}</span>
                    <span className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                      <ProviderIcon provider={r.provider} size={14} />
                      {r.provider}/{r.model}
                    </span>
                  </div>
                  {r.result.error ? (
                    <p className="text-xs" style={{ color: 'var(--alert)' }}>{r.result.error}</p>
                  ) : (
                    <>
                      <p className="mb-1 text-[10px] text-muted-foreground">
                        {r.result.latency_ms} ms · ${r.result.cost_usd.toFixed(6)}
                      </p>
                      <pre className="whitespace-pre-wrap font-mono text-xs text-foreground">
                        {r.result.text || '(respuesta vacia)'}
                      </pre>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
