import { useMemo } from 'react';
import {
  File,
  FileCode,
  FileText,
  FolderOpen,
  FolderTree,
  ChevronDown,
} from 'lucide-react';

// Arbol de archivos del proyecto activo. Datos reales via useWorkspaceFiles()
// (listado plano de rutas relativas); aqui se reconstruye el arbol. Sin mock.

type Row = { name: string; type: 'folder' | 'file'; depth: number };

const CODE_EXT = new Set(['ts', 'tsx', 'js', 'jsx', 'py', 'rs', 'go', 'cs', 'css']);

interface TreeNode {
  name: string;
  children: Map<string, TreeNode>;
  isFile: boolean;
}

function buildRows(files: string[]): Row[] {
  const root: TreeNode = { name: '', children: new Map(), isFile: false };
  for (const path of files) {
    const parts = path.split(/[\\/]/).filter(Boolean);
    let node = root;
    parts.forEach((part, i) => {
      const isFile = i === parts.length - 1;
      let child = node.children.get(part);
      if (!child) {
        child = { name: part, children: new Map(), isFile };
        node.children.set(part, child);
      }
      node = child;
    });
  }
  const rows: Row[] = [];
  const walk = (node: TreeNode, depth: number) => {
    const entries = [...node.children.values()].toSorted((a, b) => {
      if (a.isFile !== b.isFile) return a.isFile ? 1 : -1; // carpetas primero
      return a.name.localeCompare(b.name);
    });
    for (const e of entries) {
      rows.push({ name: e.name, type: e.isFile ? 'file' : 'folder', depth });
      if (!e.isFile) walk(e, depth + 1);
    }
  };
  walk(root, 0);
  return rows;
}

function iconFor(row: Row) {
  if (row.type === 'folder') return FolderOpen;
  const ext = row.name.split('.').pop()?.toLowerCase() ?? '';
  if (CODE_EXT.has(ext)) return FileCode;
  if (ext === 'md' || ext === 'txt') return FileText;
  return File;
}

export default function FilePanel({
  root,
  files,
  loading,
  error,
}: {
  root: string | null;
  files: string[];
  loading: boolean;
  error: boolean;
}) {
  const rows = useMemo(() => buildRows(files), [files]);
  const rootName = root ? root.split(/[\\/]/).filter(Boolean).pop() : null;

  return (
    <div className="flex flex-col glass">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Proyecto en trabajo
        </p>
        {rootName && (
          <span className="flex items-center gap-1 font-mono text-[11px] text-foreground">
            <ChevronDown className="size-3 text-muted-foreground" />
            {rootName}
          </span>
        )}
      </div>

      <div className="max-h-72 flex-1 overflow-y-auto scrollbar-thin px-2 py-2 font-mono text-[12px]">
        {!root ? (
          <Empty text="Selecciona un proyecto en el header para ver sus archivos." />
        ) : loading ? (
          <div className="space-y-1 p-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 18 }} />
            ))}
          </div>
        ) : error ? (
          <Empty text="No se pudo leer la carpeta del proyecto." />
        ) : rows.length === 0 ? (
          <Empty text="Carpeta vacia o todo ignorado por .enjambreignore." />
        ) : (
          rows.map((n, i) => {
            const Icon = iconFor(n);
            return (
              <div
                key={`${n.name}-${i}`}
                className="flex items-center gap-1.5 rounded-md py-1 pr-2 text-foreground/80 transition-colors hover:bg-secondary/50"
                style={{ paddingLeft: `${n.depth * 14 + 6}px` }}
              >
                <Icon
                  className={`size-3.5 shrink-0 ${
                    n.type === 'folder' ? 'text-accent' : 'text-primary/80'
                  }`}
                />
                <span className="truncate">{n.name}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
      <FolderTree className="size-6 text-muted-foreground" />
      <p className="text-[12px] text-muted-foreground">{text}</p>
    </div>
  );
}
