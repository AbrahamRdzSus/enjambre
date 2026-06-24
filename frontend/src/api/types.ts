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
