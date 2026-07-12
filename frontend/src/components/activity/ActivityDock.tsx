/**
 * Panel "Actividad por modelo" (dock inferior estilo Jules).
 *
 * Muestra la actividad EN VIVO de cada agente (carriles alimentados por el SSE
 * /logs/stream). La COMPARATIVA de salidas completas NO vive aqui: vive en la
 * columna derecha de RunPage, que lee la misma fuente (report.runs). Tener las dos
 * era duplicacion pura (misma fuente, mismo campo, mismo <pre>).
 *
 * Gated por VITE_ACTIVITY_DOCK. Respeta el gate humano: aprobar un diff exige
 * click + confirmacion, nunca auto-aplica.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Activity, Check, ChevronDown, ChevronUp, Copy, Eye, FileCode2, MessageSquare, Wrench, X, XCircle,
} from 'lucide-react';
import { api } from '../../api/client';
import { useApproveCliRun, useCliRunStatus } from '../../api/hooks';
import { asAgentOutput, type LogEvent, type RunReport } from '../../api/types';
import DiffViewer from '../DiffViewer';
import ProviderIcon from '../ProviderIcon';

type Entry = LogEvent & { _id: string };
type LaneStatus = 'running' | 'ok' | 'error';

const CLI_AGENTS = import.meta.env.VITE_CLI_AGENTS === '1';
const PREVIEW_CLAMP = 240; // chars antes de ofrecer "ver mas"
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]; // = var(--ease)

interface Lane {
  agent: string;
  provider?: string;
  status: LaneStatus;
  /** Motivo del fallo (mensaje del agent.done en nivel error). */
  reason?: string;
  events: Entry[];
  outputs: Entry[];
}

const STATUS_COLOR: Record<LaneStatus, string> = {
  running: 'var(--amber)',
  ok: 'var(--ok)',
  error: 'var(--alert)',
};

const STATUS_LABEL: Record<LaneStatus, string> = {
  running: 'corriendo',
  ok: 'listo',
  error: 'error',
};

/**
 * Agrupa los eventos SSE por agente. El estado sale del `agent.done`, NO de
 * cuantas salidas hay: antes un agente en error se quedaba diciendo "esperando
 * salida..." para siempre, porque solo se miraba outputs.length.
 */
function buildLanes(events: Entry[], report: RunReport | null, running: boolean): Lane[] {
  const byAgent = new Map<string, Lane>();
  for (const e of events) {
    if (!e.agent) continue;
    let lane = byAgent.get(e.agent);
    if (!lane) {
      lane = { agent: e.agent, status: 'running', events: [], outputs: [] };
      byAgent.set(e.agent, lane);
    }
    lane.events.push(e);
    const provider = e.fields?.provider;
    if (typeof provider === 'string') lane.provider = provider;
    if (e.event === 'agent.output') lane.outputs.push(e);
    if (e.event === 'agent.done') {
      lane.status = e.level === 'error' ? 'error' : 'ok';
      if (e.level === 'error') lane.reason = e.message;
    }
  }

  // Reconciliacion: si el run ya termino, ningun carril puede seguir "corriendo".
  // Sin esto, perder un agent.done (recarga, sidecar caido, evento descartado)
  // dejaba el carril en ambar para siempre.
  if (!running && report) {
    for (const r of report.runs) {
      const lane = byAgent.get(r.agent);
      if (!lane || lane.status !== 'running') continue;
      lane.status = r.result.error ? 'error' : 'ok';
      lane.reason = r.result.error ?? undefined;
    }
    for (const lane of byAgent.values()) {
      if (lane.status === 'running') {
        lane.status = 'error';
        lane.reason ??= 'el run termino sin respuesta de este agente';
      }
    }
  }
  return [...byAgent.values()];
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label={done ? 'Copiado' : 'Copiar'}
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        });
      }}
      className="grid size-6 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground"
    >
      {done ? <Check size={12} style={{ color: 'var(--ok)' }} /> : <Copy size={12} />}
    </button>
  );
}

/**
 * Cuerpo de una tarjeta tool_call (agente CLI): archivos tocados + ver diff +
 * aprobar/rechazar. Solo se monta si VITE_CLI_AGENTS esta activo: si no, pintaria
 * botones que pegan a endpoints apagados (404 crudo y "cargando diff..." eterno).
 */
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
        <div className="flex flex-wrap items-center gap-2">
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

/** Texto con clamp: una salida larga no debe desbordar el carril. */
function ClampedText({ text, mono }: { text: string; mono?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const long = text.length > PREVIEW_CLAMP;
  const shown = expanded || !long ? text : `${text.slice(0, PREVIEW_CLAMP)}...`;
  return (
    <div className="flex flex-col gap-1">
      {mono ? (
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md bg-black/30 p-2 font-mono text-[11px] text-secondary-foreground scrollbar-thin">
          {shown || '(vacio)'}
        </pre>
      ) : (
        <p className="whitespace-pre-wrap break-words text-[12px] leading-snug text-secondary-foreground">
          {shown || <span className="text-muted-foreground">(respuesta vacia)</span>}
        </p>
      )}
      {long && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="self-start font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {expanded ? 'ver menos' : 'ver mas'}
        </button>
      )}
    </div>
  );
}

/** Tarjeta plegable de una salida (agent.output), tipada por fields.kind. */
function OutputCard({ e }: { e: Entry }) {
  const [open, setOpen] = useState(true);
  const reduce = useReducedMotion();
  const out = asAgentOutput(e.fields ?? {});
  const preview = out.preview || e.message || '';

  const Icon = out.kind === 'tool_call' ? Wrench : out.kind === 'code' ? FileCode2 : MessageSquare;
  const label = out.kind === 'tool_call'
    ? `tool · ${out.changed_files.length} archivo(s)`
    : (out.kind === 'code' ? out.lang : null) || out.kind;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-secondary/25">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left"
      >
        <Icon size={13} style={{ color: 'var(--purple)' }} />
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="ml-auto text-muted-foreground">
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </span>
      </button>

      {/* Altura+opacidad, no teletransporte. Transicion (no keyframes) para que se
          pueda interrumpir a medio camino si el usuario vuelve a hacer click. */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            style={{ overflow: 'hidden' }}
          >
            <div className="border-t border-border px-2.5 py-2">
              {out.kind === 'tool_call' ? (
                CLI_AGENTS ? (
                  <ToolCallBody runId={out.run_id} changed={out.changed_files} />
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    {out.changed_files.length} archivo(s) tocados. Activa el agente CLI para ver el
                    diff y aprobarlo.
                  </p>
                )
              ) : (
                <>
                  {out.kind === 'code' && (
                    <div className="mb-1 flex justify-end"><CopyButton text={preview} /></div>
                  )}
                  <ClampedText text={preview} mono={out.kind === 'code'} />
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Carril de un agente. El scroll vive DENTRO del carril (no en el dock entero),
 *  asi el header con el nombre del agente no se va al leer una salida larga. */
function AgentLane({ lane, index }: { lane: Lane; index: number }) {
  const reduce = useReducedMotion();
  const color = STATUS_COLOR[lane.status];

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      // Stagger decorativo: escalona la aparicion, pero se corta a los ~5 para que
      // el ultimo agente no espere medio segundo a ser interactivo.
      transition={{ duration: 0.22, ease: EASE, delay: reduce ? 0 : Math.min(index, 5) * 0.04 }}
      className="flex min-w-0 flex-col rounded-xl border bg-secondary/20"
      style={{
        borderColor: `color-mix(in srgb, ${color} 34%, var(--border))`,
        transition: 'border-color var(--dur) var(--ease)',
      }}
    >
      <div className="sticky top-0 z-[1] flex items-center gap-2 rounded-t-xl border-b border-border bg-card/95 px-2.5 py-2">
        {lane.provider && <ProviderIcon provider={lane.provider} size={16} />}
        <span className="truncate text-[13px] font-semibold text-foreground">{lane.agent}</span>
        <span
          className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px]"
          style={{ color, borderColor: 'currentColor', transition: 'color var(--dur) var(--ease)' }}
        >
          <span className="size-1.5 rounded-full" style={{ background: 'currentColor' }} />
          {STATUS_LABEL[lane.status]}
        </span>
      </div>

      <div className="flex max-h-56 flex-col gap-2 overflow-y-auto p-2.5 scrollbar-thin">
        {lane.outputs.length > 0 ? (
          lane.outputs.map((e) => <OutputCard key={e._id} e={e} />)
        ) : lane.status === 'error' ? (
          // El estado honesto: antes esto decia "esperando salida..." para siempre.
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'var(--alert)' }}>
              <XCircle size={12} /> Sin salida
            </span>
            {lane.reason && (
              <span className="break-words font-mono text-[10px] text-muted-foreground">{lane.reason}</span>
            )}
          </div>
        ) : lane.status === 'ok' ? (
          <span className="text-[11px] text-muted-foreground">Termino sin producir salida.</span>
        ) : (
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="size-1.5 rounded-full" style={{ background: 'var(--fg-faint)' }} />
            Esperando salida · {lane.events.length} evt
          </span>
        )}
      </div>
    </motion.div>
  );
}

export default function ActivityDock({ report, running }: { report: RunReport | null; running: boolean }) {
  const [events, setEvents] = useState<Entry[]>([]);
  const [live, setLive] = useState(false);
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const seen = useRef(new Set<string>());
  const seq = useRef(0);

  useEffect(() => {
    const q = new URLSearchParams({ replay: '50' });
    if (api.token) q.set('token', api.token);
    const es = new EventSource(`${api.base}/logs/stream?${q.toString()}`);
    es.onopen = () => setLive(true);
    es.onerror = () => setLive(false);
    es.onmessage = (m) => {
      try {
        const ev = JSON.parse(m.data) as LogEvent;
        // Dedupe SOLO contra el replay/reconexion. Antes la clave era
        // `ts|agent|event`, que descartaba dos agent.output legitimos del mismo
        // agente emitidos en la misma rafaga (ts es un float de segundos): se
        // perdian salidas. El _id lleva ahora un contador monotono.
        const key = `${ev.ts}|${ev.agent ?? ''}|${ev.event}|${ev.message}`;
        if (seen.current.has(key)) return;
        seen.current.add(key);
        seq.current += 1;
        const id = `${key}#${seq.current}`;
        setEvents((prev) => [...prev.slice(-400), { ...ev, _id: id }]);
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

  const lanes = useMemo(() => buildLanes(events, report, running), [events, report, running]);

  return (
    <div className="rounded-t-2xl border-t border-border glass">
      {/* Barra (siempre visible) */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-2"
      >
        <Activity size={15} style={{ color: 'var(--purple)' }} />
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-primary">
          Actividad por modelo
        </span>
        <span className="font-mono text-[10px] text-muted-foreground tnum">
          {lanes.length} agente(s) · {events.length} evt
        </span>
        <span
          className="flex items-center gap-1.5 font-mono text-[10px]"
          style={{ color: live ? 'var(--ok)' : 'var(--fg-faint)' }}
        >
          <span
            className="size-1.5 rounded-full"
            style={{ background: 'currentColor', boxShadow: live ? '0 0 5px currentColor' : 'none' }}
          />
          {live ? 'en vivo' : 'sin stream'}
        </span>
        <span className="ml-auto text-muted-foreground">
          {open ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </span>
      </button>

      {/* El dock se revela desde su propio borde inferior (translateY del 100% de su
          altura): explica de donde viene. Transicion interrumpible, nunca keyframes:
          abrir/cerrar es rapido y reversible. */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { y: '100%', opacity: 0 }}
            transition={{ duration: 0.24, ease: EASE }}
            className="border-t border-border"
          >
            <div className="p-4">
              {lanes.length === 0 ? (
                <p className="text-[12px] text-muted-foreground">
                  Lanza el enjambre para ver la actividad de cada modelo aqui.
                </p>
              ) : (
                // auto-fit: los carriles se reparten el ancho y ENVUELVEN. Antes eran
                // 288px fijos sin wrap -> 5 agentes = 1504px de scroll horizontal.
                <div
                  className="grid gap-3"
                  style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(238px, 1fr))' }}
                >
                  {lanes.map((lane, i) => (
                    <AgentLane key={lane.agent} lane={lane} index={i} />
                  ))}
                </div>
              )}
              <p className="mt-3 text-[10px] text-muted-foreground">
                Comparar y copiar las salidas completas: columna derecha. Aplicar cambios pasa por
                el gate humano; esta vista no auto-aplica.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
