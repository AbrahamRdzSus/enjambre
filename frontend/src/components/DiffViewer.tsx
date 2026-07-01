import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface DiffViewerProps {
  /** clave = ruta de archivo, valor = texto de diff unificado. string vacio = archivo nuevo o sin cambios */
  diffs: Record<string, string>;
  className?: string;
}

type LineKind = 'add' | 'del' | 'hunk' | 'meta' | 'context';

interface ParsedLine {
  kind: LineKind;
  text: string;
  oldNo: number | null;
  newNo: number | null;
}

const KIND_STYLE: Record<LineKind, { bg: string; fg: string; sign: string }> = {
  add: {
    bg: 'color-mix(in srgb, var(--ok) 14%, transparent)',
    fg: 'var(--ok)',
    sign: '+',
  },
  del: {
    bg: 'color-mix(in srgb, var(--alert) 14%, transparent)',
    fg: 'var(--alert)',
    sign: '-',
  },
  hunk: {
    bg: 'color-mix(in srgb, var(--purple) 12%, transparent)',
    fg: 'var(--purple-soft)',
    sign: ' ',
  },
  meta: { bg: 'transparent', fg: 'var(--fg-faint)', sign: ' ' },
  context: { bg: 'transparent', fg: 'var(--fg-mute)', sign: ' ' },
};

const HUNK_RE = /^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/;

function classify(line: string): LineKind {
  if (line.startsWith('@@')) return 'hunk';
  if (line.startsWith('+++') || line.startsWith('---')) return 'meta';
  if (line.startsWith('diff ') || line.startsWith('index ')) return 'meta';
  if (line.startsWith('+')) return 'add';
  if (line.startsWith('-')) return 'del';
  return 'context';
}

function parseDiff(raw: string): ParsedLine[] {
  const out: ParsedLine[] = [];
  let oldNo = 0;
  let newNo = 0;
  for (const line of raw.split('\n')) {
    const kind = classify(line);
    if (kind === 'hunk') {
      const m = line.match(HUNK_RE);
      if (m) {
        oldNo = parseInt(m[1], 10);
        newNo = parseInt(m[2], 10);
      }
      out.push({ kind, text: line, oldNo: null, newNo: null });
      continue;
    }
    if (kind === 'meta') {
      out.push({ kind, text: line, oldNo: null, newNo: null });
      continue;
    }
    if (kind === 'add') {
      out.push({ kind, text: line.slice(1), oldNo: null, newNo: newNo++ });
    } else if (kind === 'del') {
      out.push({ kind, text: line.slice(1), oldNo: oldNo++, newNo: null });
    } else {
      out.push({
        kind: 'context',
        text: line.startsWith(' ') ? line.slice(1) : line,
        oldNo: oldNo++,
        newNo: newNo++,
      });
    }
  }
  return out;
}

export default function DiffViewer({ diffs, className }: DiffViewerProps) {
  const paths = useMemo(() => Object.keys(diffs), [diffs]);
  const [active, setActive] = useState<string | null>(paths[0] ?? null);
  const reduce = useReducedMotion();

  const current = active !== null && active in diffs ? active : paths[0] ?? null;
  const raw = current !== null ? diffs[current] : '';
  const lines = useMemo(() => (raw ? parseDiff(raw) : []), [raw]);

  if (paths.length === 0) {
    return (
      <div
        className={`rounded-lg border border-border p-4 text-xs text-muted-foreground ${className ?? ''}`}
        style={{ background: 'var(--bg-app)' }}
      >
        (sin diffs)
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-lg border border-border ${className ?? ''}`}
      style={{ background: 'var(--bg-app)' }}
    >
      {paths.length > 1 && (
        <div
          className="flex gap-1 overflow-x-auto border-b border-border p-1 scrollbar-thin"
          style={{ background: 'var(--bg-card)' }}
        >
          {paths.map((p) => {
            const isActive = p === current;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setActive(p)}
                className="whitespace-nowrap rounded-md px-3 py-1.5 font-mono text-[11px] transition-colors"
                style={{
                  background: isActive
                    ? 'color-mix(in srgb, var(--purple) 18%, transparent)'
                    : 'transparent',
                  color: isActive ? 'var(--purple-soft)' : 'var(--fg-mute)',
                }}
              >
                {p}
              </button>
            );
          })}
        </div>
      )}

      <motion.div
        key={current ?? ''}
        initial={reduce ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {raw === '' ? (
          <p className="p-4 text-xs text-muted-foreground">
            (archivo nuevo o sin cambios)
          </p>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <div className="min-w-full font-mono text-xs leading-5">
              {lines.map((l, i) => {
                const s = KIND_STYLE[l.kind];
                return (
                  <div
                    key={i}
                    className="flex items-stretch"
                    style={{ background: s.bg }}
                  >
                    <span
                      className="w-10 shrink-0 select-none px-2 text-right tabular-nums"
                      style={{ color: 'var(--fg-faint)' }}
                    >
                      {l.oldNo ?? ''}
                    </span>
                    <span
                      className="w-10 shrink-0 select-none border-r border-border px-2 text-right tabular-nums"
                      style={{ color: 'var(--fg-faint)' }}
                    >
                      {l.newNo ?? ''}
                    </span>
                    <span
                      aria-hidden
                      className="w-4 shrink-0 select-none text-center"
                      style={{ color: s.fg }}
                    >
                      {l.kind === 'hunk' || l.kind === 'meta' ? '' : s.sign}
                    </span>
                    <pre
                      className="flex-1 whitespace-pre px-2"
                      style={{ color: s.fg }}
                    >
                      {l.text || ' '}
                    </pre>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
