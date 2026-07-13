import { Boxes, GitBranch, Send } from 'lucide-react';
import type { Session } from '../../api/types';
import { Panel } from '../ui/Panel';
import EmptyState from '../ui/EmptyState';

// Panel "Sesiones recientes" (sustituye el hilo de chat mockeado del cockpit:
// no hay backend de conversaciones en vivo). Datos reales via useSessions().
// El composer enruta a /run en vez de simular un chat.

const KIND_LABEL: Record<string, string> = {
  orchestration: 'Comparacion',
  multiagent: 'Multiagente',
};

export default function Conversations({
  sessions,
  loading,
  onLaunch,
}: {
  sessions: Session[];
  loading: boolean;
  onLaunch: () => void;
}) {
  return (
    <Panel
      title="Sesiones recientes"
      action={<GitBranch className="size-3.5 text-primary" />}
      className="h-full"
      bodyClassName="flex-1 space-y-3 overflow-y-auto scrollbar-thin"
      footer={
        <button
          type="button"
          onClick={onLaunch}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
        >
          <Send className="size-3.5" /> Lanzar nueva tarea
        </button>
      }
    >
      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 64 }} />
        ))
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={Boxes}
          text="Sin sesiones todavia. Lanza una tarea para comparar agentes."
        />
      ) : (
        sessions.slice(0, 8).map((s) => (
          <div
            key={s.id}
            className="rounded-xl border border-border bg-secondary/30 p-3"
          >
            <div className="mb-1.5 flex items-center gap-2">
              <span className="rounded bg-primary/15 px-1.5 py-px font-mono text-[10px] text-primary">
                {KIND_LABEL[s.kind] ?? s.kind}
              </span>
              <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                {new Date(s.created_at).toLocaleString()}
              </span>
            </div>
            <p className="line-clamp-2 text-[12px] leading-relaxed text-foreground/85">
              {s.prompt || '(sin prompt)'}
            </p>
          </div>
        ))
      )}
    </Panel>
  );
}
