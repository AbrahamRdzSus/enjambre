import { useState } from 'react';
import { Send, Check, X, Wrench, FileEdit, TerminalSquare, Eye } from 'lucide-react';
import { useRunTools, useApproveTools, useProjects } from '../api/hooks';
import { useProjectStore } from '../stores/project-store';
import type { ToolRunState, ToolPendingCall } from '../api/types';
import DiffViewer from '../components/DiffViewer';
import MicroLoader from '../components/ui/MicroLoader';
import { Panel, PageHeader } from '../components/ui/Panel';

const DANGER: Record<string, { label: string; color: string; icon: typeof Eye }> = {
  read: { label: 'Lectura', color: 'var(--muted-foreground)', icon: Eye },
  write: { label: 'Escritura', color: 'var(--amber)', icon: FileEdit },
  shell: { label: 'Shell', color: 'var(--alert)', icon: TerminalSquare },
};

function CallCard({
  call, decision, onDecide,
}: {
  call: ToolPendingCall;
  decision: boolean | undefined;
  onDecide: (approved: boolean) => void;
}) {
  const d = DANGER[call.danger] ?? DANGER.write;
  const Icon = d.icon;
  return (
    <div className="rounded-lg border border-border bg-secondary/20 p-3 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Icon size={14} style={{ color: d.color }} />
        <span className="font-mono text-sm text-foreground">{call.name}</span>
        <span className="text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: d.color }}>{d.label}</span>
      </div>

      {call.danger === 'write' ? (
        <DiffViewer diffs={{ [String(call.arguments.path ?? call.name)]: call.preview }} />
      ) : (
        <pre className="overflow-x-auto rounded bg-background/60 p-2 text-xs font-mono text-muted-foreground">
          {call.preview || JSON.stringify(call.arguments, null, 2)}
        </pre>
      )}

      <div className="flex items-center gap-2 border-t border-border pt-2">
        <button
          type="button"
          onClick={() => onDecide(true)}
          className="flex h-8 items-center gap-1 rounded-md px-3 text-xs font-semibold"
          style={decision === true
            ? { background: 'var(--ok)', color: '#08210f' }
            : { border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}
        >
          <Check size={14} /> Aprobar
        </button>
        <button
          type="button"
          onClick={() => onDecide(false)}
          className="flex h-8 items-center gap-1 rounded-md px-3 text-xs font-semibold"
          style={decision === false
            ? { background: 'var(--alert)', color: '#2a0a0a' }
            : { border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}
        >
          <X size={14} /> Rechazar
        </button>
      </div>
    </div>
  );
}

export default function ToolsPage() {
  const { data: projects } = useProjects();
  const { activeId } = useProjectStore();
  const run = useRunTools();
  const approve = useApproveTools();

  const [prompt, setPrompt] = useState('');
  const [state, setState] = useState<ToolRunState | null>(null);
  const [decisions, setDecisions] = useState<Record<string, boolean>>({});

  const active = (projects ?? []).find((p) => p.id === activeId) ?? null;
  const pending = state?.status === 'awaiting_approval' ? state.pending : [];
  const allDecided = pending.length > 0 && pending.every((c) => c.call_id in decisions);

  function launch() {
    if (!prompt.trim() || !active) return;
    setState(null);
    setDecisions({});
    run.mutate({ project_id: active.id, prompt }, { onSuccess: (s) => setState(s) });
  }

  function submitDecisions() {
    if (!state) return;
    const payload = pending.map((c) => ({
      call_id: c.call_id, approved: decisions[c.call_id] ?? false,
    }));
    approve.mutate(
      { runId: state.run_id, decisions: payload },
      { onSuccess: (s) => { setState(s); setDecisions({}); } },
    );
  }

  const busy = run.isPending || approve.isPending;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="Herramientas" title="El modelo usa herramientas bajo tu aprobacion" />

      {!active && (
        <p className="text-[13px]" style={{ color: 'var(--warn)' }}>
          Selecciona un proyecto en el header (las herramientas operan sobre su carpeta).
        </p>
      )}

      <Panel
        title={<span className="flex items-center gap-2"><Wrench size={13} /> Tarea agentica</span>}
        bodyClassName="flex flex-col gap-4"
      >
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe la tarea. El agente puede leer archivos por su cuenta; escribir o correr comandos te lo pide antes de ejecutar."
          aria-label="Prompt de la tarea agentica"
          className="w-full resize-y rounded-lg border border-border bg-secondary/30 p-4 text-sm text-foreground outline-none"
          style={{ minHeight: 120 }}
        />
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={launch}
            disabled={busy || !prompt.trim() || !active}
            className="flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold disabled:opacity-50"
            style={{ background: 'var(--amber)', color: '#1a1006' }}
          >
            {busy ? <MicroLoader variant="dots" size={8} /> : <Send size={17} strokeWidth={2} />}
            {busy ? 'Corriendo...' : 'Lanzar tarea'}
          </button>
          {active && <span className="text-xs text-muted-foreground font-mono">{active.name}</span>}
        </div>
        {run.isError && (
          <p className="text-xs" style={{ color: 'var(--alert)' }}>
            {(run.error as Error)?.message ?? 'Error al lanzar'}
          </p>
        )}
        {state?.status === 'error' && (
          <p className="text-xs" style={{ color: 'var(--alert)' }}>{state.error}</p>
        )}
      </Panel>

      {pending.length > 0 && (
        <Panel
          title={`Aprobacion requerida (${pending.length} accion(es))`}
          bodyClassName="flex flex-col gap-3"
        >
          {pending.map((c) => (
            <CallCard
              key={c.call_id}
              call={c}
              decision={decisions[c.call_id]}
              onDecide={(a) => setDecisions((d) => ({ ...d, [c.call_id]: a }))}
            />
          ))}
          <div className="flex items-center gap-3 border-t border-border pt-3">
            <button
              type="button"
              onClick={submitDecisions}
              disabled={approve.isPending || !allDecided}
              className="flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--ok)', color: '#08210f' }}
            >
              <Check size={16} /> Enviar decisiones y continuar
            </button>
            {!allDecided && (
              <span className="text-xs text-muted-foreground">Decide cada accion para continuar.</span>
            )}
          </div>
        </Panel>
      )}

      {state?.status === 'done' && (
        <Panel title="Respuesta del agente" bodyClassName="flex flex-col gap-2 text-[13px]">
          <p className="whitespace-pre-wrap text-foreground">{state.text}</p>
          <p className="text-xs text-muted-foreground font-mono">
            {state.iters} iteracion(es) - {state.usage.input_tokens + state.usage.output_tokens} tokens
            {state.cost_usd > 0 && ` - $${state.cost_usd.toFixed(4)}`}
          </p>
        </Panel>
      )}
    </div>
  );
}
