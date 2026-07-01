import { motion, useReducedMotion } from 'motion/react';
import { Loader2, CheckCircle2, XCircle, Circle, Coins, Timer } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Agent, AgentResult } from '../api/types';
import type { AgentStatus } from '../stores/run-store';
import ProviderIcon from './ProviderIcon';

// Tarjeta de agente EN VIVO: estado (idle/running/ok/error) + modelo/rol y, cuando
// hay resultado del run, tokens/costo/latencia. Presentacional: recibe el estado
// del run-store y el AgentResult del RunReport desde el padre. Tokens ENJAMBRE.

const STATUS_META: Record<AgentStatus, { color: string; label: string; icon: LucideIcon }> = {
  idle: { color: 'var(--fg-faint)', label: 'En espera', icon: Circle },
  running: { color: 'var(--amber)', label: 'Pensando', icon: Loader2 },
  ok: { color: 'var(--ok)', label: 'Listo', icon: CheckCircle2 },
  error: { color: 'var(--alert)', label: 'Error', icon: XCircle },
};

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export interface AgentCardProps {
  agent: Agent;
  status?: AgentStatus;
  result?: AgentResult | null;
}

export default function AgentCard({ agent, status = 'idle', result }: AgentCardProps) {
  const reduce = useReducedMotion();
  const meta = STATUS_META[status];
  const StatusIcon = meta.icon;
  const running = status === 'running';
  const tokens = result ? result.usage.input_tokens + result.usage.output_tokens : null;

  return (
    <div
      className="glass-strong flex flex-col gap-3 p-4"
      style={{
        borderColor: `color-mix(in srgb, ${meta.color} ${agent.enabled || status !== 'idle' ? 38 : 18}%, transparent)`,
        opacity: agent.enabled || status !== 'idle' ? 1 : 0.6,
      }}
    >
      {/* Cabecera: proveedor + nombre + badge de estado */}
      <div className="flex items-center gap-2.5">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
          style={{ background: 'color-mix(in srgb, var(--purple) 14%, transparent)' }}
        >
          <ProviderIcon provider={agent.provider} size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold" style={{ color: 'var(--fg)' }}>{agent.name}</div>
          <div className="truncate font-mono text-[11px]" style={{ color: 'var(--fg-mute)' }}>
            {agent.role} · {agent.provider}/{agent.model || 'default'}
          </div>
        </div>
        <motion.span
          className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: meta.color, background: `color-mix(in srgb, ${meta.color} 15%, transparent)` }}
          animate={reduce || !running ? undefined : { opacity: [0.6, 1, 0.6] }}
          transition={reduce ? undefined : { duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <motion.span
            animate={running && !reduce ? { rotate: 360 } : undefined}
            transition={running && !reduce ? { duration: 1.1, repeat: Infinity, ease: 'linear' } : undefined}
            style={{ display: 'inline-flex' }}
          >
            <StatusIcon size={12} />
          </motion.span>
          {meta.label}
        </motion.span>
      </div>

      {/* Pie: metricas del resultado (solo cuando hay run) */}
      {result && (
        <div className="flex items-center gap-4 border-t pt-2.5" style={{ borderColor: 'var(--border)' }}>
          <span className="flex items-center gap-1.5 font-mono text-[11px] tnum" style={{ color: 'var(--fg-mute)' }}>
            <Coins size={12} style={{ color: 'var(--amber)' }} />
            {tokens !== null ? fmtTokens(tokens) : '—'} tok
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[11px] tnum" style={{ color: 'var(--fg-mute)' }}>
            <Timer size={12} style={{ color: 'var(--purple-soft)' }} />
            {(result.latency_ms / 1000).toFixed(1)}s
          </span>
          <span className="ml-auto font-mono text-[11px] tnum font-semibold" style={{ color: 'var(--amber-soft)' }}>
            ${result.cost_usd.toFixed(4)}
          </span>
        </div>
      )}

      {result?.error && (
        <p className="text-[11px]" style={{ color: 'var(--alert)' }}>{result.error}</p>
      )}
    </div>
  );
}
