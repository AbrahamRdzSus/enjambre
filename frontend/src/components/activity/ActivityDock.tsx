/**
 * Panel "Actividad por modelo" (dock inferior estilo Jules).
 *
 * Se alimenta de DOS fuentes (ver specs/panel-actividad-por-modelo.md):
 *   (a) SSE /logs/stream  -> actividad en vivo por agente + step badges.
 *   (b) prop `report` (respuesta de /run) -> contenido completo para la comparativa.
 *
 * Gated por VITE_ACTIVITY_DOCK (off por defecto). Reusa el patron EventSource de
 * LogsPage.tsx y ProviderIcon. Respeta el gate humano: la comparativa NO auto-aplica.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Check, ChevronDown, ChevronUp, Columns2, Copy, Eye, FileCode2, MessageSquare, Wrench, X } from 'lucide-react';
import { api } from '../../api/client';
import { useApproveCliRun, useCliRunStatus } from '../../api/hooks';
import type { LogEvent, RunReport } from '../../api/types';
import DiffViewer from '../DiffViewer';
import ProviderIcon from '../ProviderIcon';

type OutputKind = 'message' | 'code' | 'tool_call';
type Entry = LogEvent & { _id: string };

interface Lane {
  agent: string;
  provider?: string;
  status: 'running' | 'ok' | 'error';
  events: Entry[];
  outputs: Entry[];
}

const KIND_ICON: Record<OutputKind, typeof MessageSquare> = {
  message: MessageSquare,
  code: FileCode2,
  tool_call: Wrench,
};

function fields(e: Entry) {
  return (e.fields ?? {}) as Record<string, unknown>;
}

/** Agrupa los eventos SSE por agente en carriles (una columna por modelo). */
function buildLanes(events: Entry[]): Lane[] {
  const byAgent = new Map<string, Lane>();
  for (const e of events) {
    if (!e.agent) continue;
    let lane = byAgent.get(e.agent);
    if (!lane) {
      lane = { agent: e.agent, status: 'running', events: [], outputs: [] };
      byAgent.set(e.agent, lane);
    }
    lane.events.push(e);
    const f = fields(e);
    if (typeof f.provider === 'string') lane.provider = f.provider;
    if (e.event === 'agent.output') lane.outputs.push(e);
    if (e.event === 'agent.done') lane.status = e.level === 'error' ? 'error' : 'ok';
  }
  return [...byAgent.values()];
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label="Copiar"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        });
      }}
      className="grid size-6 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground"
    >
      <Copy size={12} />
      {done && <span className="sr-only">copiado</span>}
    </button>
  );
}

/** Tarjeta plegable de una salida (agent.output), tipada por fields.kind. */
/** Cuerpo de una tarjeta tool_call (agente CLI): lista de archivos + ver diff +
 *  aprobar/rechazar via el flujo CLI existente (POST /cli/{run_id}/approve).
 *  Respeta el gate humano: aprobar exige click + confirmacion, nunca auto-aplica. */
function ToolCallBody({ runId, changed }: { runId?: string; changed: string[] }) {
  const [showDiff, setShowDiff] = useState(false);
  const [applied, setApplied] = useState<null | boolean>(null);
  const status = useCliRunStatus(showDiff ? (runId ?? null) : null);
  const approve = useApproveCliRun();

  function decide(ok: boolean) {
    if (!runId) return;
    if (ok && !window.confirm('Aplicar estos cambios al repositorio real?')) return;
    approve.mutate({ runId, approved: ok }, { onSuccess: () => setApplied(ok) });
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-1 font-mono text-[11px] text-secondary-foreground">
        {changed.length === 0 && <li className="text-muted-foreground">(sin archivos)</li>}
        {changed.map((c) => (
          <li key={c} className="flex items-center gap-1.5">
            <FileCode2 size={11} style={{ color: 'var(--amber)' }} /> {c}
          </li>
        ))}
      </ul>
      {runId && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDiff((v) => !v)}
            className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11px] text-foreground transition-colors hover:border-primary"
          >
            <Eye size={12} style={{ color: 'var(--purple)' }} /> {showDiff ? 'Ocultar diff' : 'Ver diff'}
          </button>
          {applied === null ? (
            <>
              <button
                type="button"
                disabled={approve.isPending}
                onClick={() => decide(true)}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold disabled:opacity-50"
                style={{ background: 'var(--ok)', color: '#05130a' }}
              >
                <Check size={12} /> Aprobar
              </button>
              <button
                type="button"
                disabled={approve.isPending}
                onClick={() => decide(false)}
                className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              >
                <X size={12} /> Rechazar
              </button>
            </>
          ) : (
            <span className="font-mono text-[11px]" style={{ color: applied ? 'var(--ok)' : 'var(--fg-mute)' }}>
              {applied ? 'aplicado' : 'rechazado'}
            </span>
          )}
        </div>
      )}
      {showDiff && (
        status.data?.diff
          ? <DiffViewer diffs={{ [`${changed.length} archivo(s)`]: status.data.diff }} />
          : <p className="text-[11px] text-muted-foreground">cargando diff...</p>
      )}
    </div>
  );
}

function OutputCard({ e }: { e: Entry }) {
  const [open, setOpen] = useState(true);
  const f = fields(e);
  const kind = (f.kind as OutputKind) ?? 'message';
  const Icon = KIND_ICON[kind] ?? MessageSquare;
  const preview = (f.preview as string) ?? e.message ?? '';
  const lang = (f.lang as string | null) ?? null;
  const changed = (f.changed_files as string[] | undefined) ?? [];
  const runId = f.run_id as string | undefined;

  return (
    <div className="rounded-lg border border-border bg-secondary/25">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left"
      >
        <Icon size={13} style={{ color: 'var(--purple)' }} />
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {kind === 'tool_call' ? `tool · ${changed.length} archivo(s)` : lang || kind}
        </span>
        <span className="ml-auto">{open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}</span>
      </button>
      {open && (
        <div className="border-t border-border px-2.5 py-2">
          {kind === 'tool_call' ? (
            <ToolCallBody runId={runId} changed={changed} />
          ) : kind === 'code' ? (
            <div className="flex flex-col gap-1">
              <div className="flex justify-end"><CopyButton text={preview} /></div>
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-black/30 p-2 font-mono text-[11px] text-secondary-foreground scrollbar-thin">
                {preview || '(vacio)'}
              </pre>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-[12px] leading-snug text-secondary-foreground">
              {preview || <span className="text-muted-foreground">(respuesta vacia)</span>}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

const STATUS_COLOR: Record<Lane['status'], string> = {
  running: 'var(--amber)',
  ok: 'var(--ok)',
  error: 'var(--alert)',
};

function AgentLane({ lane }: { lane: Lane }) {
  return (
    <div className="flex w-72 shrink-0 flex-col gap-2">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-2.5 py-1.5">
        {lane.provider && <ProviderIcon provider={lane.provider} size={16} />}
        <span className="truncate text-[13px] font-semibold text-foreground">{lane.agent}</span>
        <span
          className="ml-auto flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px]"
          style={{ color: STATUS_COLOR[lane.status] }}
        >
          <span className="size-1.5 rounded-full" style={{ background: STATUS_COLOR[lane.status] }} />
          paso {lane.outputs.length || 1} · {lane.events.length} evt
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {lane.outputs.length === 0 ? (
          <p className="px-1 text-[11px] text-muted-foreground">esperando salida...</p>
        ) : (
          lane.outputs.map((e) => <OutputCard key={e._id} e={e} />)
        )}
      </div>
    </div>
  );
}

/** Rejilla comparativa lado-a-lado con la salida COMPLETA de cada agente (report). */
function CompareGrid({ report, onClose }: { report: RunReport; onClose: () => void }) {
  const runs = report.runs;
  const texts = runs.map((r) => (r.result.text || '').trim());
  const allSame = texts.length > 1 && texts.every((t) => t === texts[0]);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Columns2 size={14} style={{ color: 'var(--purple)' }} />
        <span className="font-mono text-[11px] uppercase tracking-wider text-primary">
          Comparativa ({runs.length} salidas)
        </span>
        {runs.length > 1 && (
          <span
            className="rounded-md px-2 py-0.5 font-mono text-[10px]"
            style={{ color: allSame ? 'var(--ok)' : 'var(--amber)' }}
          >
            {allSame ? 'identicas' : 'difieren'}
          </span>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar comparativa"
          className="ml-auto grid size-6 place-items-center rounded-md border border-border text-muted-foreground hover:text-foreground"
        >
          <X size={13} />
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
        {runs.map((r) => {
          const err = r.result.error;
          return (
            <div key={r.agent} className="flex w-80 shrink-0 flex-col gap-1.5 rounded-lg border border-border bg-secondary/25 p-2.5">
              <div className="flex items-center gap-2">
                <ProviderIcon provider={r.provider} size={15} />
                <span className="truncate text-[12px] font-semibold text-foreground">{r.agent}</span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                  ${r.result.cost_usd.toFixed(5)}
                </span>
              </div>
              {err ? (
                <p className="text-[11px]" style={{ color: 'var(--alert)' }}>error: {err}</p>
              ) : (
                <>
                  <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-md bg-black/30 p-2 font-mono text-[11px] text-secondary-foreground scrollbar-thin">
                    {r.result.text || '(respuesta vacia)'}
                  </pre>
                  <div className="flex items-center justify-end gap-2">
                    <CopyButton text={r.result.text || ''} />
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Comparar y copiar. Aplicar cambios pasa por el gate humano existente (Cambios / Agente CLI); esta vista no auto-aplica.
      </p>
    </div>
  );
}

export default function ActivityDock({ report, running }: { report: RunReport | null; running: boolean }) {
  const [events, setEvents] = useState<Entry[]>([]);
  const [live, setLive] = useState(false);
  const [open, setOpen] = useState(false);
  const [compare, setCompare] = useState(false);
  const seen = useRef(new Set<string>());

  useEffect(() => {
    const q = new URLSearchParams({ replay: '50' });
    if (api.token) q.set('token', api.token);
    const es = new EventSource(`${api.base}/logs/stream?${q.toString()}`);
    es.onopen = () => setLive(true);
    es.onerror = () => setLive(false);
    es.onmessage = (m) => {
      try {
        const ev = JSON.parse(m.data) as LogEvent;
        const key = `${ev.ts}|${ev.agent ?? ''}|${ev.event}`;
        if (seen.current.has(key)) return; // dedupe replay/reconexion
        seen.current.add(key);
        setEvents((prev) => [...prev.slice(-400), { ...ev, _id: key }]);
      } catch {
        /* ignora frames no-JSON (comentarios keep-alive) */
      }
    };
    return () => es.close();
  }, []);

  // Abre el dock automaticamente cuando arranca un run.
  useEffect(() => {
    if (running) setOpen(true);
  }, [running]);

  const lanes = useMemo(() => buildLanes(events), [events]);
  const canCompare = (report?.runs.length ?? 0) > 0;

  return (
    <div
      className="sticky bottom-0 z-20 rounded-t-xl border border-border glass"
      style={{ background: 'color-mix(in srgb, var(--bg-raised) 92%, transparent)' }}
    >
      {/* Barra (siempre visible) */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-2"
      >
        <Activity size={15} style={{ color: 'var(--purple)' }} />
        <span className="font-mono text-[11px] uppercase tracking-wider text-primary">
          Actividad por modelo
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          {lanes.length} agente(s) · {events.length} evt
        </span>
        <span
          className="flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px]"
          style={{ color: live ? 'var(--ok)' : 'var(--fg-faint)' }}
        >
          <span
            className="size-1.5 rounded-full"
            style={{ background: live ? 'var(--ok)' : 'var(--fg-faint)', boxShadow: live ? '0 0 5px var(--ok)' : 'none' }}
          />
          {live ? 'en vivo' : 'sin stream'}
        </span>
        <span className="ml-auto">{open ? <ChevronDown size={16} /> : <ChevronUp size={16} />}</span>
      </button>

      {open && (
        <div className="flex max-h-[46vh] flex-col gap-3 overflow-y-auto border-t border-border p-4 scrollbar-thin">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!canCompare}
              onClick={() => setCompare((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-[12px] text-foreground transition-colors hover:border-primary disabled:opacity-40"
            >
              <Columns2 size={13} style={{ color: 'var(--purple)' }} />
              {compare ? 'Ocultar comparativa' : 'Comparar salidas'}
            </button>
          </div>

          {compare && report && <CompareGrid report={report} onClose={() => setCompare(false)} />}

          {lanes.length === 0 ? (
            <p className="text-[12px] text-muted-foreground">
              Lanza el enjambre para ver la actividad de cada modelo aqui.
            </p>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-thin">
              {lanes.map((lane) => (
                <AgentLane key={lane.agent} lane={lane} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
