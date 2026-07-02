import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type {
  Agent, Project, Provider, RunReport, Stats, LogEvent, Session,
  CliRunResult, CliApplyReport,
} from './types';

export function useProjects() {
  return useQuery({ queryKey: ['projects'], queryFn: () => api.get<Project[]>('/projects') });
}

export function useAddProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; root: string }) => api.post<Project>('/projects', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/projects/${encodeURIComponent(id)}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useAgents() {
  return useQuery({ queryKey: ['agents'], queryFn: () => api.get<Agent[]>('/agents') });
}

function useAgentMutation<V>(fn: (v: V) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }),
  });
}

export function useAddAgent() {
  return useAgentMutation((a: Partial<Agent> & { name: string; provider: string }) =>
    api.post('/agents', a));
}

export function usePatchAgent() {
  return useAgentMutation(({ name, patch }: { name: string; patch: Partial<Agent> }) =>
    api.patch(`/agents/${encodeURIComponent(name)}`, patch));
}

export function useDeleteAgent() {
  return useAgentMutation((name: string) =>
    api.del(`/agents/${encodeURIComponent(name)}`));
}

export function useSetKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { provider: string; key: string }) => api.post('/keys', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['providers'] }),
  });
}

export function useProviders() {
  return useQuery({
    queryKey: ['providers'],
    queryFn: () => api.get<Provider[]>('/providers'),
  });
}

export interface ValidationResult { ok: boolean; detail: string }

export function useValidateKeys() {
  return useMutation({
    mutationFn: () => api.post<Record<string, ValidationResult>>('/validate'),
  });
}

export function useStats() {
  return useQuery({ queryKey: ['stats'], queryFn: () => api.get<Stats>('/stats') });
}

export function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.get<Session[]>('/sessions'),
    refetchInterval: 5000,
  });
}

export function useLogs(agent?: string) {
  return useQuery({
    queryKey: ['logs', agent ?? 'all'],
    queryFn: () =>
      api.get<LogEvent[]>(`/logs${agent ? `?agent=${encodeURIComponent(agent)}` : ''}`),
    refetchInterval: 2000,
  });
}

export interface RunInput {
  prompt: string;
  agents?: string[];
  save?: boolean;
  mode?: string;
}

export function useRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RunInput) => api.post<RunReport>('/run', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stats'] });
      qc.invalidateQueries({ queryKey: ['logs'] });
    },
  });
}

// --- workspace + changes (tab Proyectos & Archivos) ----------------------
export function useWorkspaceFiles(root: string, enabled: boolean) {
  return useQuery({
    queryKey: ['workspace', root],
    queryFn: () =>
      api.get<{ root: string; files: string[] }>(
        `/workspace/files?root=${encodeURIComponent(root)}`),
    enabled,
    retry: false,
  });
}

export interface ChangeIn { path: string; new_content: string }

export function usePreviewChanges() {
  return useMutation({
    mutationFn: (body: { root: string; changes: ChangeIn[] }) =>
      api.post<{ diffs: Record<string, string> }>('/changes/preview', body),
  });
}

export interface ApplyReport {
  ok: boolean;
  written: string[];
  rejected: [string, string][];
  temp_branch: string | null;
}

export function useApplyChanges() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { root: string; changes: ChangeIn[]; approved: boolean }) =>
      api.post<ApplyReport>('/changes/apply', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace'] }),
  });
}

/* --- Agente CLI (tipo "CLI", opt-in con VITE_CLI_AGENTS) ------------------- */
export function useRunCliTask() {
  return useMutation({
    mutationFn: (body: { project_id: string; prompt: string }) =>
      api.post<CliRunResult>('/cli/run', body),
  });
}

export function useCliRunStatus(runId: string | null) {
  return useQuery({
    queryKey: ['cli', runId],
    queryFn: () => api.get<CliRunResult>(`/cli/${encodeURIComponent(runId!)}`),
    enabled: !!runId,
  });
}

export function useApproveCliRun() {
  return useMutation({
    mutationFn: ({ runId, approved }: { runId: string; approved: boolean }) =>
      api.post<CliApplyReport>(`/cli/${encodeURIComponent(runId)}/approve`, { approved }),
  });
}
