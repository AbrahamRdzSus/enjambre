import { motion, useReducedMotion } from 'motion/react';
import { Coins, Timer } from 'lucide-react';
import type { Agent, AgentResult } from '../api/types';
import type { AgentStatus } from '../stores/log-store';
import { STATUS_COLOR, STATUS_LABEL } from '../lib/status';
import { fmtCost, fmtTokens } from '../lib/format';
import ProviderIcon from './ProviderIcon';
import StatusIcon from './ui/StatusIcon';

// Tarjeta de agente EN VIVO: estado (idle/running/ok/error) + modelo/rol y, cuando
// hay resultado del run, tokens/costo/latencia. Presentacional: recibe el estado
// del log-store y el AgentResult del RunReport desde el padre. Tokens ENJAMBRE.

export interface AgentCardProps {
  agent: Agent;
  status?: AgentStatus;
  result?: AgentResult | null;
}

export default function AgentCard({ agent, status = 'idle', result }: AgentCardProps) {
  const reduce = useReducedMotion();
  const color = STATUS_COLOR[status];
  const running = status === 'running';
  const tokens = result ? result.usage.input_tokens + result.usage.output_tokens : null;

  return (
    <div
      className="glass-strong flex flex-col gap-3 p-4"
      style={{
        borderColor: `color-mix(in srgb, ${color} ${agent.enabled || status !== 'idle' ? 38 : 18}%, transparent)`,
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
          style={{ color, background: `color-mix(in srgb, ${color} 15%, transparent)` }}
          animate={reduce || !running ? undefined : { opacity: [0.6, 1, 0.6] }}
          transition={reduce ? undefined : { duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <StatusIcon status={status} size={12} />
          {STATUS_LABEL[status]}
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
            {fmtCost(result.cost_usd, 'fine')}
          </span>
        </div>
      )}

      {result?.error && (
        <p className="text-[11px]" style={{ color: 'var(--alert)' }}>{result.error}</p>
      )}
    </div>
  );
}
