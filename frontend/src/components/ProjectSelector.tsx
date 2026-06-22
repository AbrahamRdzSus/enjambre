import { useState } from 'react';
import { ChevronDown, FolderPlus, Trash2 } from 'lucide-react';
import { useAddProject, useDeleteProject, useProjects } from '../api/hooks';
import { useProjectStore } from '../stores/project-store';

// Selector de proyecto del header (reemplaza el "local" estatico).

export default function ProjectSelector() {
  const { data } = useProjects();
  const projects = data ?? [];
  const { activeId, setActive } = useProjectStore();
  const add = useAddProject();
  const del = useDeleteProject();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [root, setRoot] = useState('.');

  const active = projects.find((p) => p.id === activeId) ?? null;

  function create() {
    if (!name.trim()) return;
    add.mutate(
      { name, root },
      { onSuccess: (p) => { setActive(p.id); setName(''); setRoot('.'); setOpen(false); } },
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2"
      >
        <span className="eyebrow">Proyecto</span>
        <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
          {active?.name ?? 'local'}
        </span>
        <ChevronDown size={14} style={{ color: 'var(--fg-mute)' }} />
      </button>

      {open && (
        <div
          className="glass absolute left-0 top-9 z-40 w-72 p-2 flex flex-col gap-1"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          <button
            type="button"
            onClick={() => { setActive(null); setOpen(false); }}
            className="text-left text-xs px-2 py-1.5 rounded hover:bg-[var(--bg-raised)]"
            style={{ color: activeId === null ? 'var(--amber-soft)' : 'var(--fg-mute)' }}
          >
            local (sin proyecto)
          </button>
          {projects.map((p) => (
            <div key={p.id} className="flex items-center gap-1 group">
              <button
                type="button"
                onClick={() => { setActive(p.id); setOpen(false); }}
                className="flex-1 text-left text-xs px-2 py-1.5 rounded hover:bg-[var(--bg-raised)]"
                style={{ color: p.id === activeId ? 'var(--amber-soft)' : 'var(--fg)' }}
              >
                {p.name}
                <span className="ml-2" style={{ color: 'var(--fg-faint)', fontFamily: 'var(--font-mono)' }}>{p.root}</span>
              </button>
              <button
                type="button"
                onClick={() => { del.mutate(p.id); if (p.id === activeId) setActive(null); }}
                aria-label={`Eliminar ${p.name}`}
                className="p-1 rounded"
                style={{ color: 'var(--alert)' }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}

          <div className="border-t mt-1 pt-2 flex flex-col gap-1" style={{ borderColor: 'var(--border)' }}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="nombre del proyecto"
              aria-label="Nombre del proyecto"
              className="rounded px-2 h-8 text-xs border"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--fg)' }}
            />
            <div className="flex gap-1">
              <input
                value={root}
                onChange={(e) => setRoot(e.target.value)}
                placeholder="ruta local"
                aria-label="Ruta del proyecto"
                className="flex-1 rounded px-2 h-8 text-xs border"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}
              />
              <button
                type="button"
                onClick={create}
                disabled={!name.trim() || add.isPending}
                className="flex items-center gap-1 px-2 h-8 rounded text-xs font-semibold disabled:opacity-50"
                style={{ background: 'var(--amber)', color: '#1a1006' }}
              >
                <FolderPlus size={13} /> Crear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
