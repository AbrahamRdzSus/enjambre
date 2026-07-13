import { useState } from 'react';
import { Send, Check, X, Terminal } from 'lucide-react';
import { useRunCliTask, useApproveCliRun } from '../api/hooks';
import { useProjects } from '../api/hooks';
import { useProjectStore } from '../stores/project-store';
import type { CliRunResult, CliApplyReport } from '../api/types';
import DiffViewer from '../components/DiffViewer';
import MicroLoader from '../components/ui/MicroLoader';
import { Panel, PageHeader } from '../components/ui/Panel';

// Parte el diff agregado de `git diff` en un Record<ruta, diff> para el DiffViewer.
function splitDiff(diff: string, files: string[]): Record<string, string> {
  if (!diff.trim()) return Object.fromEntries(files.map((f) => [f, '']));
  const out: Record<string, string> = {};
  const parts = diff.split(/(?=^diff --git )/m);
  for (const part of parts) {
    const m = part.match(/^diff --git a\/(.+?) b\//m);
    if (m) out[m[1]] = part;
  }
  return Object.keys(out).length ? out : { cambios: diff };
}

export default function CliPage() {
  const { data: projects } = useProjects();
  const { activeId } = useProjectStore();
  const run = useRunCliTask();
  const approve = useApproveCliRun();

  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<CliRunResult | null>(null);
  const [report, setReport] = useState<CliApplyReport | null>(null);

  const active = (projects ?? []).find((p) => p.id === activeId) ?? null;

  function launch() {
    if (!prompt.trim() || !active) return;
    setResult(null);
    setReport(null);
    run.mutate(
      { project_id: active.id, prompt },
      { onSuccess: (r) => setResult(r) },
    );
  }

  function decide(approved: boolean) {
    if (!result) return;
    approve.mutate(
      { runId: result.run_id, approved },
      { onSuccess: (rep) => { setReport(rep); setResult(null); } },
    );
  }

  const diffs = result && result.ok ? splitDiff(result.diff, result.changed_files) : null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="Agente CLI" title="Lanza un coding-agent en un worktree aislado" />

      {!active && (
        <p className="text-[13px]" style={{ color: 'var(--warn)' }}>
          Selecciona un proyecto en el header (el agente CLI opera sobre su carpeta git).
        </p>
      )}

      <Panel
        title={
          <h3 className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            <Terminal size={13} /> Agente CLI (claude)
          </h3>
        }
        bodyClassName="flex flex-col gap-4"
      >
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe la tarea. Claude Code correra headless en un git worktree y veras su diff antes de aplicarlo."
          aria-label="Prompt del agente CLI"
          className="w-full resize-y rounded-lg border border-border bg-secondary/30 p-4 text-sm text-foreground outline-none"
          style={{ minHeight: 120 }}
        />
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={launch}
            disabled={run.isPending || !prompt.trim() || !active}
            className="flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold disabled:opacity-50"
            style={{ background: 'var(--amber)', color: '#1a1006' }}
          >
            {run.isPending ? <MicroLoader variant="dots" size={8} /> : <Send size={17} strokeWidth={2} />}
            {run.isPending ? 'Corriendo...' : 'Lanzar agente CLI'}
          </button>
          {active && (
            <span className="text-xs text-muted-foreground font-mono">{active.name}</span>
          )}
        </div>
        {run.isError && (
          <p className="text-xs" style={{ color: 'var(--alert)' }}>
            {(run.error as Error)?.message ?? 'Error al lanzar'}
          </p>
        )}
        {result && !result.ok && (
          <p className="text-xs" style={{ color: 'var(--alert)' }}>{result.error}</p>
        )}
      </Panel>

      {result && result.ok && (
        <Panel
          title={
            <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Diff propuesto ({result.changed_files.length} archivo(s))
            </h3>
          }
          bodyClassName="flex flex-col gap-4"
        >
          {result.changed_files.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">El agente no propuso cambios.</p>
          ) : (
            <DiffViewer diffs={diffs!} />
          )}
          <div className="flex items-center gap-3 border-t border-border pt-3">
            <button
              type="button"
              onClick={() => decide(true)}
              disabled={approve.isPending || result.changed_files.length === 0}
              className="flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--ok)', color: '#08210f' }}
            >
              <Check size={16} /> Aprobar y aplicar
            </button>
            <button
              type="button"
              onClick={() => decide(false)}
              disabled={approve.isPending}
              className="flex h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm text-muted-foreground disabled:opacity-50"
            >
              <X size={16} /> Descartar
            </button>
          </div>
        </Panel>
      )}

      {report && (
        <Panel
          title={
            <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Resultado
            </h3>
          }
          bodyClassName="flex flex-col gap-2 text-[13px]"
        >
          {report.written.length > 0 && (
            <p style={{ color: 'var(--ok)' }}>
              Aplicados: {report.written.join(', ')}
            </p>
          )}
          {report.rejected.length > 0 && (
            <div style={{ color: 'var(--alert)' }}>
              {report.rejected.map(([p, m]) => (
                <p key={p}>Rechazado {p}: {m}</p>
              ))}
            </div>
          )}
          {report.written.length === 0 && report.rejected.length === 0 && (
            <p className="text-muted-foreground">Descartado. No se aplico ningun cambio.</p>
          )}
        </Panel>
      )}
    </div>
  );
}
