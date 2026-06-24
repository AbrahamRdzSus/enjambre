import { useNavigate } from 'react-router-dom';
import { Users, ListChecks, FolderKanban, Coins, Wallet, Gauge } from 'lucide-react';
import {
  useAgents,
  useLogs,
  useProjects,
  useSessions,
  useStats,
  useWorkspaceFiles,
} from '../api/hooks';
import { useProjectStore } from '../stores/project-store';
import HexSwarm from '../components/HexSwarm';
import { BorderBeam } from '../components/ui/border-beam';
import MetricsRow, { type Metric } from '../components/overview/MetricsRow';
import Conversations from '../components/overview/Conversations';
import FilePanel from '../components/overview/FilePanel';
import BottomRow from '../components/overview/BottomRow';

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function OverviewPage() {
  const navigate = useNavigate();
  const agents = useAgents();
  const projects = useProjects();
  const stats = useStats();
  const logs = useLogs();
  const sessions = useSessions();

  const activeId = useProjectStore((s) => s.activeId);
  const activeRoot =
    (projects.data ?? []).find((p) => p.id === activeId)?.root ?? null;
  const workspace = useWorkspaceFiles(activeRoot ?? '', !!activeRoot);

  const agentList = agents.data ?? [];
  const enabled = agentList.filter((a) => a.enabled).length;
  const totalAgents = agentList.length;
  const agentPct = totalAgents > 0 ? (enabled / totalAgents) * 100 : 0;

  const byProvider = Object.entries(stats.data?.by_provider ?? {});
  const byAgent = Object.entries(stats.data?.by_agent ?? {});
  const runs = byProvider.reduce((s, [, t]) => s + t.runs, 0);
  const ok = byProvider.reduce((s, [, t]) => s + t.ok, 0);
  const success = runs > 0 ? (ok / runs) * 100 : 0;
  const costToday = stats.data?.by_day?.[todayKey()] ?? 0;

  const metrics: Metric[] = [
    {
      label: 'Agentes activos',
      value: `${enabled} / ${totalAgents}`,
      extra: `${agentPct.toFixed(0)}%`,
      pct: agentPct,
      icon: Users,
    },
    {
      label: 'Sesiones',
      value: String(stats.data?.sessions ?? 0),
      extra: `${sessions.data?.length ?? 0} guardadas`,
      tone: 'muted',
      icon: ListChecks,
    },
    {
      label: 'Proyectos',
      value: String(projects.data?.length ?? 0),
      tone: 'muted',
      icon: FolderKanban,
    },
    {
      label: 'Tokens usados',
      value: fmtTokens(stats.data?.total_tokens ?? 0),
      extra: `$${(stats.data?.total_cost_usd ?? 0).toFixed(2)} acumulado`,
      icon: Coins,
    },
    {
      label: 'Costo hoy',
      value: `$${costToday.toFixed(2)}`,
      tone: 'muted',
      icon: Wallet,
    },
    {
      label: 'Tasa de exito',
      value: runs > 0 ? `${success.toFixed(1)}%` : '—',
      pct: success,
      icon: Gauge,
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <header className="px-1">
        <p className="eyebrow">Panel</p>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--fg)' }}>
          Tu equipo de IAs trabajando en paralelo
        </h1>
      </header>

      <MetricsRow items={metrics} />

      {/* Orquestacion (hex live) + sesiones recientes */}
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)' }}
      >
        <div className="relative flex items-center justify-center overflow-hidden glass p-4">
          <div className="absolute left-4 top-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Orquestacion del enjambre
          </div>
          <HexSwarm size={420} />
          <BorderBeam size={90} duration={8} />
        </div>

        <Conversations
          sessions={sessions.data ?? []}
          loading={sessions.isLoading}
          onLaunch={() => navigate('/run')}
        />
      </div>

      <FilePanel
        root={activeRoot}
        files={workspace.data?.files ?? []}
        loading={workspace.isLoading && !!activeRoot}
        error={workspace.isError}
      />

      <BottomRow
        byProvider={byProvider}
        logs={logs.data ?? []}
        byAgent={byAgent}
        onSeeLogs={() => navigate('/logs')}
      />
    </div>
  );
}
