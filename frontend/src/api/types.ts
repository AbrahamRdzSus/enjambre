// Tipos del contrato del sidecar (enjambre.api). Mantener alineados con el backend.

export interface Agent {
  name: string;
  provider: string;
  model: string;
  role: string;
  enabled: boolean;
  system_prompt: string;
}

export interface Provider {
  provider: string;
  env: string;
  key_present: boolean;
  default_model: string;
  models: string[];
  // model -> [precio_input, precio_output] en USD por 1M tokens (estimado)
  pricing: Record<string, [number, number]>;
}

export interface AgentResult {
  provider: string;
  model: string;
  text: string;
  usage: { input_tokens: number; output_tokens: number };
  cost_usd: number;
  latency_ms: number;
  error: string | null;
}

export interface AgentRun {
  agent: string;
  provider: string;
  model: string;
  result: AgentResult;
}

export interface RunReport {
  prompt: string;
  runs: AgentRun[];
  warnings: string[];
  total_cost_usd: number;
  session_id?: string;
}

export interface Tally {
  runs: number;
  ok: number;
  errors: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
}

export interface Stats {
  sessions: number;
  total_tokens: number;
  total_cost_usd: number;
  by_provider: Record<string, Tally>;
  by_agent: Record<string, Tally>;
  by_day: Record<string, number>;
}

export interface Project {
  id: string;
  name: string;
  root: string;
  created_at: string;
}

export interface CliRunResult {
  run_id: string;
  ok: boolean;
  diff: string;
  changed_files: string[];
  log: string;
  error: string | null;
  status?: 'done' | 'error';
}

export interface CliApplyReport {
  ok: boolean;
  written: string[];
  rejected: [string, string][];
  temp_branch: string | null;
}

export interface ToolPendingCall {
  call_id: string;
  name: string;
  arguments: Record<string, unknown>;
  danger: 'read' | 'write' | 'shell';
  preview: string;
}

export interface ToolRunState {
  run_id: string;
  status: 'running' | 'awaiting_approval' | 'done' | 'error';
  agent: string;
  text: string;
  error: string | null;
  iters: number;
  cost_usd: number;
  usage: { input_tokens: number; output_tokens: number };
  pending: ToolPendingCall[];
}

export interface Session {
  id: string;
  kind: string;
  created_at: string;
  prompt: string;
}

export interface LogEvent {
  ts: number;
  level: string;
  event: string;
  message: string;
  agent: string | null;
  fields: Record<string, unknown>;
}

/**
 * Payload de `fields` en el evento SSE `agent.output`.
 *
 * OJO: el backend emite DOS formas incompatibles bajo el MISMO nombre de evento
 * (ver src/enjambre/api.py):
 *   - agentes API  -> provider, cost_usd, kind 'code'|'message', lang, preview
 *   - agente CLI   -> kind 'tool_call', changed_files, run_id  (sin preview/lang)
 * Modelarlo como union discriminada por `kind` evita los casts a ciegas que
 * reventaban si el backend cambiaba una clave.
 */
export type AgentOutputFields =
  | { kind: 'message' | 'code'; preview: string; lang: string | null; provider?: string; cost_usd?: number }
  | { kind: 'tool_call'; changed_files: string[]; run_id?: string; preview?: string };

/** Lee `fields` de un agent.output sin confiar en el backend. */
export function asAgentOutput(fields: Record<string, unknown>): AgentOutputFields {
  if (fields.kind === 'tool_call') {
    const files = fields.changed_files;
    return {
      kind: 'tool_call',
      changed_files: Array.isArray(files) ? files.filter((f): f is string => typeof f === 'string') : [],
      run_id: typeof fields.run_id === 'string' ? fields.run_id : undefined,
      preview: typeof fields.preview === 'string' ? fields.preview : undefined,
    };
  }
  return {
    kind: fields.kind === 'code' ? 'code' : 'message',
    preview: typeof fields.preview === 'string' ? fields.preview : '',
    lang: typeof fields.lang === 'string' ? fields.lang : null,
    provider: typeof fields.provider === 'string' ? fields.provider : undefined,
    cost_usd: typeof fields.cost_usd === 'number' ? fields.cost_usd : undefined,
  };
}
