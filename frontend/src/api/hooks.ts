import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { Agent, Provider, RunReport, Stats, LogEvent } from './types';

export function useAgents() {
  return useQuery({ queryKey: ['agents'], queryFn: () => api.get<Agent[]>('/agents') });
}

export function useProviders() {
  return useQuery({
    queryKey: ['providers'],
    queryFn: () => api.get<Provider[]>('/providers'),
  });
}

export function useStats() {
  return useQuery({ queryKey: ['stats'], queryFn: () => api.get<Stats>('/stats') });
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
