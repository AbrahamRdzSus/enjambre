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
import SwarmFlow from '../components/SwarmFlow';
import MetricsRow, { type Metric } from '../components/overview/MetricsRow';
import Conversations from '../components/overview/Conversations';
import FilePanel from '../components/overview/FilePanel';
import BottomRow from '../components/overview/BottomRow';
import OfflineBanner from '../components/ui/OfflineBanner';
import { fmtCost, fmtTokens } from '../lib/format';

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
      extra: `${fmtCost(stats.data?.total_cost_usd ?? 0)} acumulado`,
      icon: Coins,
    },
    {
      label: 'Costo hoy',
      value: fmtCost(costToday),
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

      {/* Sin esto, un sidecar caido pinta 0 agentes / $0.00 / "—" de exito, que se
          lee identico a "todavia no has usado la app". */}
      {stats.isError && <OfflineBanner error={stats.error} />}

      {/* Cockpit de 3 columnas que aprovecha el ancho de la ventana:
          izquierda = proyecto en trabajo, centro = metricas + flujo +
          orquestacion + sesiones, derecha = tokens/actividad/rendimiento.
          Colapsa a 1 columna en ventanas angostas (< xl). */}
      <div className="grid items-start gap-3 xl:grid-cols-[minmax(260px,300px)_minmax(0,1fr)_minmax(320px,360px)]">
        {/* Riel izquierdo: proyecto en trabajo */}
        <div className="order-2 flex flex-col gap-3 xl:order-1">
          <FilePanel
            root={activeRoot}
            files={workspace.data?.files ?? []}
            loading={workspace.isLoading && !!activeRoot}
            error={workspace.isError}
          />
        </div>

        {/* Centro: metricas + flujo + orquestacion + sesiones */}
        <div className="order-1 flex flex-col gap-3 xl:order-2">
          <MetricsRow items={metrics} />
          <SwarmFlow />
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)' }}
          >
            <div className="relative flex items-center justify-center overflow-hidden glass p-4">
              <div className="absolute left-4 top-3 text-[13px] font-semibold tracking-tight" style={{ color: 'var(--fg)' }}>
                Orquestacion del enjambre
              </div>
              <HexSwarm size={420} />
            </div>

            <Conversations
              sessions={sessions.data ?? []}
              loading={sessions.isLoading}
              onLaunch={() => navigate('/run')}
            />
          </div>
        </div>

        {/* Riel derecho: tokens por proveedor + actividad + rendimiento */}
        <div className="order-3 flex flex-col gap-3">
          <BottomRow
            byProvider={byProvider}
            logs={logs.data ?? []}
            byAgent={byAgent}
            onSeeLogs={() => navigate('/logs')}
            layout="column"
          />
        </div>
      </div>
    </div>
  );
}
