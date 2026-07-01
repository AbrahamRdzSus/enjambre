import { motion, useReducedMotion } from 'motion/react';
import { Sparkles, GitCompareArrows, GitPullRequestArrow, Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAgents } from '../api/hooks';
import { useRunStore, type AgentStatus } from '../stores/run-store';
import ProviderIcon from './ProviderIcon';
import StatusIcon from './ui/StatusIcon';

// Pipeline del enjambre: prompt -> agentes en paralelo -> comparar -> aprobar.
// Cableado a datos reales: useAgents() para el roster, useRunStore() para el
// estado en vivo por agente (idle/running/ok/error, alimentado por SSE en
// run-store). Identidad ENJAMBRE (tokens obsidiana + morado + ambar), motion/react,
// respeta prefers-reduced-motion (WCAG 2.3.3).

const PURPLE = 'var(--purple)';
const AMBER = 'var(--amber)';

// Fase global derivada del mapa de estados del run-store.
type Phase = 'idle' | 'running' | 'done';

function phaseFrom(status: Record<string, AgentStatus>): Phase {
  const vals = Object.values(status);
  if (vals.length === 0) return 'idle';
  if (vals.some((s) => s === 'running')) return 'running';
  if (vals.every((s) => s === 'ok' || s === 'error')) return 'done';
  return 'running';
}

function statusColor(s: AgentStatus): string {
  if (s === 'running') return AMBER;
  if (s === 'ok') return 'var(--ok)';
  if (s === 'error') return 'var(--alert)';
  return 'var(--fg-faint)';
}

function statusLabel(s: AgentStatus): string {
  if (s === 'running') return 'pensando';
  if (s === 'ok') return 'listo';
  if (s === 'error') return 'error';
  return 'en espera';
}

// Nodo hexagonal de etapa (prompt / comparar / aprobar).
function StageNode({
  icon: Icon,
  label,
  sub,
  active,
  accent = PURPLE,
}: {
  icon: LucideIcon;
  label: string;
  sub: string;
  active: boolean;
  accent?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <div className="flex shrink-0 flex-col items-center gap-2">
      <motion.div
        className="relative grid place-items-center"
        style={{ width: 64, height: 64 }}
        animate={reduce || !active ? undefined : { scale: [1, 1.06, 1] }}
        transition={reduce ? undefined : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span
          className="absolute inset-0"
          style={{
            clipPath: 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)',
            background: 'var(--bg-card)',
            boxShadow: active
              ? `inset 0 0 0 1.6px ${accent}, 0 0 22px -4px ${accent}`
              : 'inset 0 0 0 1.4px var(--border)',
            transition: 'box-shadow 240ms var(--ease)',
          }}
        />
        <Icon size={24} strokeWidth={1.8} style={{ color: active ? accent : 'var(--fg-faint)', zIndex: 1 }} />
      </motion.div>
      <div className="text-center">
        <div className="font-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: active ? accent : 'var(--fg-mute)' }}>
          {label}
        </div>
        <div className="text-[10px]" style={{ color: 'var(--fg-faint)' }}>{sub}</div>
      </div>
    </div>
  );
}

// Conector con pulso de datos viajando (omitido si reduced-motion).
function Connector({ active }: { active: boolean }) {
  const reduce = useReducedMotion();
  return (
    <div className="relative mx-1 h-px flex-1 self-center" style={{ minWidth: 28 }}>
      <div
        className="absolute inset-0"
        style={{
          background: active
            ? `linear-gradient(90deg, ${PURPLE}, ${AMBER})`
            : 'var(--border)',
          opacity: active ? 0.7 : 0.4,
        }}
      />
      {active && !reduce && (
        <motion.div
          className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full"
          style={{ background: AMBER, boxShadow: `0 0 8px 1px ${AMBER}` }}
          animate={{ left: ['0%', '100%'], opacity: [0, 1, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </div>
  );
}

// Tarjeta compacta de agente dentro del abanico paralelo.
function AgentChip({ name, provider, status }: { name: string; provider: string; status: AgentStatus }) {
  const reduce = useReducedMotion();
  const color = statusColor(status);
  const running = status === 'running';
  return (
    <div
      className="glass-strong flex items-center gap-2 px-2.5 py-1.5"
      style={{ borderColor: `color-mix(in srgb, ${color} 40%, transparent)` }}
    >
      <ProviderIcon provider={provider} size={14} />
      <span className="max-w-[92px] truncate font-mono text-xs" style={{ color: 'var(--fg)' }}>{name}</span>
      <motion.span
        className="ml-auto flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
        style={{ color, background: `color-mix(in srgb, ${color} 16%, transparent)` }}
        animate={reduce || !running ? undefined : { opacity: [0.6, 1, 0.6] }}
        transition={reduce ? undefined : { duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <StatusIcon status={status} size={11} />
        {statusLabel(status)}
      </motion.span>
    </div>
  );
}

export default function SwarmFlow() {
  const agents = useAgents();
  const status = useRunStore((s) => s.status);
  const phase = phaseFrom(status);

  const roster = (agents.data ?? []).filter((a) => a.enabled);
  const active = roster.length > 0 ? roster : (agents.data ?? []);
  const running = phase === 'running';
  const done = phase === 'done';

  return (
    <div className="glass p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          Flujo del enjambre
        </span>
        <span className="font-mono text-[10px]" style={{ color: 'var(--fg-faint)' }}>
          {running ? 'ejecutando…' : done ? 'completado' : 'en espera'}
        </span>
      </div>

      <div className="flex items-stretch gap-1">
        <StageNode icon={Sparkles} label="Prompt" sub="entrada" active={running || done} accent={PURPLE} />

        <Connector active={running || done} />

        {/* Abanico de agentes en paralelo */}
        <div className="flex min-w-[180px] flex-1 flex-col justify-center gap-1.5">
          {active.length === 0 ? (
            <div className="text-center text-xs" style={{ color: 'var(--fg-faint)' }}>
              sin agentes — agrega uno en la tab Agentes
            </div>
          ) : (
            active.slice(0, 5).map((a) => (
              <AgentChip key={a.name} name={a.name} provider={a.provider} status={status[a.name] ?? 'idle'} />
            ))
          )}
          {active.length > 5 && (
            <div className="text-center font-mono text-[10px]" style={{ color: 'var(--fg-faint)' }}>
              +{active.length - 5} más
            </div>
          )}
        </div>

        <Connector active={running || done} />

        <StageNode icon={GitCompareArrows} label="Comparar" sub="salidas" active={done} accent={AMBER} />

        <Connector active={done} />

        <StageNode
          icon={done ? Check : GitPullRequestArrow}
          label="Aprobar"
          sub={done ? 'listo' : 'diff'}
          active={done}
          accent={PURPLE}
        />
      </div>
    </div>
  );
}
