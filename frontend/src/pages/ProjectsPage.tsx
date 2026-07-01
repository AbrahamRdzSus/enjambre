import { useState } from 'react';
import { FileText, Eye, Check } from 'lucide-react';
import {
  useApplyChanges,
  usePreviewChanges,
  useWorkspaceFiles,
} from '../api/hooks';
import { Panel, PageHeader } from '../components/ui/Panel';
import DiffViewer from '../components/DiffViewer';

export default function ProjectsPage() {
  const [root, setRoot] = useState('.');
  const [activeRoot, setActiveRoot] = useState<string | null>(null);
  const files = useWorkspaceFiles(activeRoot ?? '', activeRoot !== null);

  const [target, setTarget] = useState('');
  const [content, setContent] = useState('');
  const [approved, setApproved] = useState(false);

  const preview = usePreviewChanges();
  const apply = useApplyChanges();

  const change = { root: activeRoot ?? root, changes: [{ path: target, new_content: content }] };
  const inputStyle = {
    background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--fg)',
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="Proyectos & Archivos" title="Workspace seguro" />

      {/* Selector de raiz */}
      <div className="flex gap-2">
        <input
          value={root}
          onChange={(e) => setRoot(e.target.value)}
          placeholder="Ruta del proyecto local"
          className="h-10 flex-1 rounded-lg border px-3 text-sm"
          style={inputStyle}
        />
        <button
          type="button"
          onClick={() => setActiveRoot(root)}
          className="h-10 rounded-lg bg-primary/15 px-4 text-sm font-medium text-primary"
        >
          Abrir
        </button>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1.4fr' }}>
        {/* Arbol de archivos */}
        <Panel
          title="Archivos"
          action={
            (files.data?.files?.length ?? 0) > 0
              ? <span className="font-mono text-[10px] text-muted-foreground">{files.data!.files.length} archivos</span>
              : undefined
          }
          bodyClassName="flex flex-col gap-1 max-h-[460px] overflow-y-auto scrollbar-thin"
        >
          {files.isError && (
            <p className="text-xs" style={{ color: 'var(--alert)' }}>
              {(files.error as Error).message}
            </p>
          )}
          {activeRoot === null && (
            <p className="text-xs text-muted-foreground">Abre una carpeta.</p>
          )}
          {(files.data?.files ?? []).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setTarget(f)}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left font-mono text-xs hover:bg-secondary/50 ${
                f === target ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <FileText size={13} /> {f}
            </button>
          ))}
        </Panel>

        {/* Editor + diff + aprobacion */}
        <Panel title="Cambio propuesto" bodyClassName="flex flex-col gap-3">
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Ruta del archivo a cambiar (relativa a la raiz)"
            className="h-10 rounded-lg border px-3 font-mono text-sm"
            style={inputStyle}
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Contenido nuevo propuesto"
            className="resize-y rounded-lg border p-3 font-mono text-xs"
            style={{ minHeight: 140, ...inputStyle }}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => preview.mutate(change)}
              disabled={!target}
              className="flex h-9 items-center gap-2 rounded-lg bg-secondary px-4 text-sm text-muted-foreground disabled:opacity-50"
            >
              <Eye size={15} /> Previsualizar diff
            </button>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={approved} onChange={(e) => setApproved(e.target.checked)} />
              apruebo aplicar (irreversible)
            </label>
            <button
              type="button"
              onClick={() => apply.mutate({ ...change, approved })}
              disabled={!target || !approved}
              className="flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--amber)', color: '#1a1006' }}
            >
              <Check size={15} /> Aplicar
            </button>
          </div>

          {preview.data && <DiffViewer diffs={preview.data.diffs ?? {}} />}

          {apply.data && (
            apply.data.ok ? (
              <p className="text-xs" style={{ color: 'var(--ok)' }}>
                Escrito: {apply.data.written.join(', ')}
                {apply.data.temp_branch ? ` (branch ${apply.data.temp_branch})` : ''}
              </p>
            ) : (
              <div className="text-xs" style={{ color: 'var(--alert)' }}>
                {apply.data.rejected.map(([p, m]) => <p key={p}>Rechazado {p}: {m}</p>)}
              </div>
            )
          )}
          {apply.isError && (
            <p className="text-xs" style={{ color: 'var(--alert)' }}>
              {(apply.error as Error).message}
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}
