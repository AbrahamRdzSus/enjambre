import { useState } from 'react';
import { FileText, Eye, Check } from 'lucide-react';
import {
  useApplyChanges,
  usePreviewChanges,
  useWorkspaceFiles,
} from '../api/hooks';

export default function ProjectsPage() {
  const [root, setRoot] = useState('.');
  const [activeRoot, setActiveRoot] = useState<string | null>(null);
  const files = useWorkspaceFiles(activeRoot ?? '', activeRoot !== null);

  const [target, setTarget] = useState('');
  const [content, setContent] = useState('');
  const [approved, setApproved] = useState(false);

  const preview = usePreviewChanges();
  const apply = useApplyChanges();

  const diff = preview.data?.diffs[target];
  const change = { root: activeRoot ?? root, changes: [{ path: target, new_content: content }] };

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="eyebrow">Proyectos & Archivos</p>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--fg)' }}>
          Workspace seguro
        </h1>
      </header>

      {/* Selector de raiz */}
      <div className="flex gap-2">
        <input
          value={root}
          onChange={(e) => setRoot(e.target.value)}
          placeholder="Ruta del proyecto local"
          className="flex-1 rounded-lg px-3 h-10 text-sm border"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--fg)' }}
        />
        <button
          type="button"
          onClick={() => setActiveRoot(root)}
          className="px-4 h-10 rounded-lg text-sm font-medium"
          style={{ background: 'rgba(139,92,246,0.16)', color: 'var(--purple-soft)' }}
        >
          Abrir
        </button>
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 1.4fr' }}>
        {/* Arbol de archivos */}
        <div
          className="rounded-xl border p-3 flex flex-col gap-1"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', maxHeight: 460, overflowY: 'auto' }}
        >
          {files.isError && (
            <p className="text-xs" style={{ color: 'var(--alert)' }}>
              {(files.error as Error).message}
            </p>
          )}
          {activeRoot === null && (
            <p className="text-xs" style={{ color: 'var(--fg-faint)' }}>Abre una carpeta.</p>
          )}
          {(files.data?.files ?? []).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setTarget(f)}
              className="flex items-center gap-2 text-left text-xs px-2 py-1.5 rounded-md hover:bg-[var(--bg-raised)]"
              style={{ color: f === target ? 'var(--amber-soft)' : 'var(--fg-mute)', fontFamily: 'var(--font-mono)' }}
            >
              <FileText size={13} /> {f}
            </button>
          ))}
        </div>

        {/* Editor + diff + aprobacion */}
        <div className="flex flex-col gap-3">
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Ruta del archivo a cambiar (relativa a la raiz)"
            className="rounded-lg px-3 h-10 text-sm border"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Contenido nuevo propuesto"
            className="rounded-lg p-3 text-xs border resize-y"
            style={{ minHeight: 140, background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => preview.mutate(change)}
              disabled={!target}
              className="flex items-center gap-2 px-4 h-9 rounded-lg text-sm disabled:opacity-50"
              style={{ background: 'var(--bg-raised)', color: 'var(--fg-mute)' }}
            >
              <Eye size={15} /> Previsualizar diff
            </button>
            <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--fg-mute)' }}>
              <input type="checkbox" checked={approved} onChange={(e) => setApproved(e.target.checked)} />
              apruebo aplicar (irreversible)
            </label>
            <button
              type="button"
              onClick={() => apply.mutate({ ...change, approved })}
              disabled={!target || !approved}
              className="flex items-center gap-2 px-4 h-9 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--amber)', color: '#1a1006' }}
            >
              <Check size={15} /> Aplicar
            </button>
          </div>

          {diff !== undefined && (
            <pre
              className="rounded-lg border p-3 text-xs whitespace-pre-wrap"
              style={{ background: 'var(--bg-app)', borderColor: 'var(--border)', color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}
            >
              {diff || '(archivo nuevo o sin cambios)'}
            </pre>
          )}

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
        </div>
      </div>
    </div>
  );
}
