import { useState } from 'react';
import {
  Send, Network, Settings, Sparkles, Target, Paperclip, Code2, Boxes, FileText,
  AlertTriangle, Check, Copy,
} from 'lucide-react';
import { useAgents, useProviders, useRun } from '../api/hooks';
import { errorMessage } from '../lib/errors';
import { fmtCost } from '../lib/format';
import type { Agent } from '../api/types';
import CircleLoad from '../components/ui/CircleLoad';
import MicroLoader from '../components/ui/MicroLoader';
import ProviderIcon from '../components/ProviderIcon';
import AgentCard from '../components/AgentCard';
import ActivityDock from '../components/activity/ActivityDock';
import { Panel, PageHeader } from '../components/ui/Panel';
import Toggle from '../components/ui/Toggle';

const ACTIVITY_DOCK = import.meta.env.VITE_ACTIVITY_DOCK === '1';
const MODES = [
  { id: 'parallel', label: 'Paralelo' },
  { id: 'sequential', label: 'Secuencial' },
  { id: 'debate', label: 'Debate' },
];

/** Copiar la salida de un agente. Heredado del CompareGrid que vivia en el dock:
 *  la columna derecha es ahora LA superficie de comparacion, sin duplicado. */
function CopyOutput({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label={done ? 'Copiado' : 'Copiar salida'}
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        });
      }}
      className="flex items-center gap-1 self-end rounded-md border border-border px-2 py-1 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground"
    >
      {done ? <Check size={11} style={{ color: 'var(--ok)' }} /> : <Copy size={11} />}
      {done ? 'copiado' : 'copiar'}
    </button>
  );
}

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

  // Marca de comparacion: con 2+ salidas ok, avisa si los modelos coincidieron.
  const okTexts = (report?.runs ?? [])
    .filter((r) => !r.result.error)
    .map((r) => (r.result.text || '').trim());
  const allSame = okTexts.length > 1 && okTexts.every((t) => t === okTexts[0]);

  // Botones de composición aún sin backend: visibles como placeholder deshabilitado.
  const composerActions = [
    { icon: Paperclip, label: 'Adjuntar archivo' },
    { icon: Code2, label: 'Variables' },
    { icon: Boxes, label: 'Contexto del proyecto' },
    { icon: FileText, label: 'Plantillas' },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="Lanzar tarea / Chats" title="Despacha un prompt en paralelo" />

      <div className="grid gap-5" style={{ gridTemplateColumns: 'minmax(0,1fr) 420px' }}>
        {/* Columna izquierda: composer */}
        <div className="flex flex-col gap-5">
          {/* Cabecera: modo + config */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-muted-foreground">
              Trabaja con múltiples agentes de IA en paralelo sobre el mismo objetivo.
            </p>
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-1 rounded-lg glass p-1">
                <Network size={15} className="mx-1.5 text-primary" />
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id)}
                    className="h-7 rounded-md px-2.5 font-mono text-xs transition-colors"
                    style={{
                      background: mode === m.id ? 'rgba(139,92,246,0.18)' : 'transparent',
                      color: mode === m.id ? 'var(--purple-soft)' : 'var(--fg-mute)',
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 1. Prompt */}
          <Panel title="1. Escribe tu prompt / tarea" bodyClassName="flex flex-col gap-4">
            <div className="rounded-lg border border-border bg-secondary/30 p-4">
              <div className="mb-3 flex items-start justify-between gap-2">
                <label className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  Prompt / Instrucciones
                </label>
                <Sparkles size={15} style={{ color: 'var(--amber)' }} />
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Refactoriza esta funcion para que sea mas legible..."
                aria-label="Prompt de la tarea"
                className="w-full resize-y bg-transparent text-sm text-foreground outline-none"
                style={{ minHeight: 120 }}
              />
            </div>

            {/* Acciones (placeholder: aún sin backend) */}
            <div className="flex flex-wrap items-center gap-2">
              {composerActions.map((b) => (
                <button
                  key={b.label}
                  type="button"
                  disabled
                  title="Próximamente"
                  className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-[13px] text-muted-foreground opacity-50"
                >
                  <b.icon size={14} style={{ color: 'var(--purple)' }} /> {b.label}
                </button>
              ))}
            </div>

            {/* Objetivo = espejo del prompt actual */}
            {prompt.trim() && (
              <div className="flex items-center gap-3 rounded-lg p-4" style={{ border: '1px solid color-mix(in srgb, var(--amber) 30%, transparent)', background: 'color-mix(in srgb, var(--amber) 6%, transparent)' }}>
                <span className="grid size-9 shrink-0 place-items-center rounded-lg glow-amber" style={{ background: 'color-mix(in srgb, var(--amber) 15%, transparent)', color: 'var(--amber)' }}>
                  <Target size={16} />
                </span>
                <span className="flex-1 text-[13px] leading-snug text-foreground line-clamp-2">
                  {prompt.trim()}
                </span>
                <span className="shrink-0 rounded-md px-2.5 py-1 font-mono text-[11px] font-medium" style={{ background: 'color-mix(in srgb, var(--amber) 15%, transparent)', color: 'var(--amber)' }}>
                  {mode}
                </span>
              </div>
            )}
          </Panel>

          {/* 2. Selección de agentes */}
          <Panel title="2. Selecciona agentes de IA" bodyClassName="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
              {all.map((a) => {
                const on = chosen.includes(a.name);
                const noKey = keyless.has(a.provider);
                return (
                  <div
                    key={a.name}
                    className="rounded-lg border p-3 transition-colors"
                    style={{
                      borderColor: on ? 'color-mix(in srgb, var(--purple) 40%, transparent)' : 'var(--border)',
                      background: on ? 'color-mix(in srgb, var(--purple) 7%, transparent)' : 'color-mix(in srgb, var(--bg-raised) 30%, transparent)',
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <ProviderIcon provider={a.provider} size={22} />
                      <Toggle on={on} onClick={() => toggle(a.name)} label={`Alternar ${a.name}`} />
                    </div>
                    <p className="mt-3 text-[14px] font-semibold text-foreground">{a.name}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {a.provider}/{a.model || 'default'} · {a.role}
                    </p>
                    {noKey ? (
                      <p className="mt-3 flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--alert)' }}>
                        <span className="size-1.5 rounded-full" style={{ background: 'var(--alert)' }} /> Sin API key
                      </p>
                    ) : (
                      <p className="mt-3 flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--ok)' }}>
                        <span className="size-1.5 rounded-full" style={{ background: 'var(--ok)' }} /> Listo
                      </p>
                    )}
                  </div>
                );
              })}
              {all.length === 0 && (
                <p className="col-span-full text-xs text-muted-foreground">
                  Sin agentes. Crea uno en la pestaña Agentes.
                </p>
              )}
            </div>
            {chosenKeyless.length > 0 && (
              <p className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--warn)' }}>
                <AlertTriangle size={12} />
                {chosenKeyless.length} agente(s) sin API key ({chosenKeyless.join(', ')}) fallarán al lanzar.
              </p>
            )}

            <div className="flex items-center gap-4 border-t border-border pt-3">
              <button
                type="button"
                onClick={launch}
                disabled={run.isPending || !prompt.trim() || chosen.length === 0}
                className="flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold disabled:opacity-50"
                style={{ background: 'var(--amber)', color: '#1a1006' }}
              >
                {run.isPending ? <MicroLoader variant="dots" size={8} /> : <Send size={17} strokeWidth={2} />}
                {run.isPending ? 'Consultando...' : 'Lanzar enjambre'}
              </button>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} aria-label="Guardar sesion" />
                guardar sesion
              </label>
              <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                <Settings size={14} /> {chosen.length} seleccionado(s)
              </span>
            </div>

            {/* Sin esto, un /run fallido (sidecar caido, 500) devolvia el boton a
                "Lanzar enjambre" SIN decir nada: la accion principal fallaba en silencio. */}
            {run.isError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg px-3 py-2"
                style={{
                  border: '1px solid color-mix(in srgb, var(--alert) 35%, transparent)',
                  background: 'color-mix(in srgb, var(--alert) 8%, transparent)',
                }}
              >
                <AlertTriangle size={14} style={{ color: 'var(--alert)', marginTop: 2, flex: 'none' }} />
                <p className="text-[12px]" style={{ color: 'var(--alert)' }}>
                  No se pudo lanzar el enjambre. {errorMessage(run.error)}
                </p>
              </div>
            )}
          </Panel>
        </div>

        {/* Columna derecha: LA comparativa de salidas (el dock ya no la duplica) */}
        <Panel
          title="3. Chats / Salidas en paralelo"
          action={okTexts.length > 1 ? (
            <span
              className="rounded-md px-2 py-0.5 font-mono text-[10px]"
              style={{ color: allSame ? 'var(--ok)' : 'var(--amber)' }}
            >
              {allSame ? 'identicas' : 'difieren'}
            </span>
          ) : undefined}
          bodyClassName="flex flex-col gap-4 max-h-[720px] overflow-y-auto scrollbar-thin"
        >
          <div className="flex flex-col items-center gap-2">
            <CircleLoad
              progress={run.isPending ? null : successPct / 100}
              label={run.isPending ? 'corriendo' : 'éxito'}
            />
            <p className="text-center text-xs text-muted-foreground">
              {run.isPending
                ? `Consultando ${chosen.length} agente(s) en ${mode}...`
                : report
                  ? `${report.runs.filter((r) => !r.result.error).length}/${report.runs.length} ok · ${fmtCost(report.total_cost_usd, 'fine')}`
                  : 'Selecciona agentes y lanza el enjambre'}
            </p>
          </div>

          {report && (
            <div className="flex flex-col gap-3 border-t border-border pt-3">
              {report.warnings.map((w) => (
                <p key={w} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--warn)' }}>
                  <AlertTriangle size={12} /> {w}
                </p>
              ))}
              {report.session_id && (
                <p className="text-[11px] text-muted-foreground">sesión {report.session_id}</p>
              )}
              {report.runs.map((r) => {
                const ag: Agent = all.find((a) => a.name === r.agent) ?? {
                  name: r.agent, provider: r.provider, model: r.model,
                  role: '', enabled: true, system_prompt: '',
                };
                return (
                  <div key={r.agent} className="flex flex-col gap-2">
                    <AgentCard agent={ag} status={r.result.error ? 'error' : 'ok'} result={r.result} />
                    {!r.result.error && (
                      <>
                        <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-secondary/25 p-3 font-mono text-xs text-secondary-foreground scrollbar-thin">
                          {r.result.text || '(respuesta vacia)'}
                        </pre>
                        <CopyOutput text={r.result.text || ''} />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      {ACTIVITY_DOCK && <ActivityDock report={report ?? null} running={run.isPending} />}
    </div>
  );
}
