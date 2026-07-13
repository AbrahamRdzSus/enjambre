import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LayoutGrid, Send, FolderTree, ScrollText, BarChart3, Users, KeyRound, Terminal, Rocket } from 'lucide-react';
import { api } from '../api/client';
import { useAgents, useProviders, usePatchAgent, useStats } from '../api/hooks';
import ProjectSelector from '../components/ProjectSelector';
import ProviderIcon from '../components/ProviderIcon';
import UpdateBanner from '../components/UpdateBanner';
import SiteBackground from '../components/ui/SiteBackground';
import StatusIcon, { type Status } from '../components/ui/StatusIcon';
import { useLogStream, useLogStore } from '../stores/log-store';

const NAV = [
  { to: '/overview', label: 'Overview', icon: LayoutGrid },
  { to: '/run', label: 'Lanzar', icon: Send },
  { to: '/projects', label: 'Proyectos', icon: FolderTree },
  { to: '/logs', label: 'Logs', icon: ScrollText },
  { to: '/stats', label: 'Estadisticas', icon: BarChart3 },
  { to: '/agents', label: 'Agentes', icon: Users },
  ...(import.meta.env.VITE_CLI_AGENTS === '1'
    ? [{ to: '/cli', label: 'Agente CLI', icon: Terminal }]
    : []),
  ...(import.meta.env.VITE_HUB_DEPLOY === '1'
    ? [{ to: '/deploy', label: 'Deploy', icon: Rocket }]
    : []),
];

function useHealth() {
  const { data, isError } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.get<{ status: string }>('/health'),
    refetchInterval: 5000,
  });
  return !isError && data?.status === 'ok';
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/* --- Sidebar: API keys con dot de estado ---------------------------------- */
function SidebarKeys() {
  const navigate = useNavigate();
  const { data } = useProviders();
  const provs = data ?? [];
  if (provs.length === 0) return null;
  return (
    <div className="px-3 pt-1">
      <p className="eyebrow px-2 mb-2 flex items-center gap-1.5"><KeyRound size={11} /> API keys</p>
      <div className="flex flex-col gap-0.5">
        {provs.map((p) => (
          <button
            key={p.provider}
            type="button"
            onClick={() => navigate('/agents')}
            className="flex items-center gap-2 rounded-md px-2 h-8 text-xs transition-colors hover:bg-[color-mix(in_srgb,var(--purple)_10%,transparent)]"
          >
            <ProviderIcon provider={p.provider} size={15} />
            <span className="truncate text-left" style={{ color: 'var(--fg-mute)', fontFamily: 'var(--font-mono)' }}>{p.provider}</span>
            <span className="ml-auto flex items-center gap-1.5 text-[10px]"
                  style={{ color: p.key_present ? 'var(--ok)' : 'var(--fg-faint)' }}>
              {p.key_present ? 'Activa' : 'sin key'}
              <span className="inline-block w-1.5 h-1.5 rounded-full"
                    style={{ background: p.key_present ? 'var(--ok)' : 'var(--fg-faint)' }} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* --- Sidebar: agentes con toggle real ------------------------------------- */
function SidebarAgents() {
  const { data } = useAgents();
  const patch = usePatchAgent();
  const status = useLogStore((s) => s.status);
  const agents = data ?? [];
  if (agents.length === 0) return null;
  return (
    <div className="px-3 pt-3 pb-2">
      <p className="eyebrow px-2 mb-2">Agentes registrados</p>
      <div className="flex flex-col gap-0.5">
        {agents.slice(0, 8).map((a) => {
          const st: Status = status[a.name] ?? (a.enabled ? 'enabled' : 'idle');
          return (
            <div key={a.name} className="flex items-center gap-2 px-2 h-9 text-xs">
              <span className="grid w-3.5 shrink-0 place-items-center"><StatusIcon status={st} size={11} /></span>
              <span className="min-w-0 leading-tight">
                <span className="block truncate" style={{ color: 'var(--fg-mute)', fontFamily: 'var(--font-mono)' }}>{a.name}</span>
                <span className="block truncate text-[10px]" style={{ color: 'var(--fg-faint)' }}>{a.provider}/{a.model || 'default'}</span>
              </span>
              <button
                type="button"
                onClick={() => patch.mutate({ name: a.name, patch: { enabled: !a.enabled } })}
                aria-label={`Alternar ${a.name}`}
                aria-pressed={a.enabled}
                className="relative ml-auto h-4 w-7 shrink-0 rounded-full transition-colors"
                style={{ background: a.enabled ? 'var(--ok)' : 'var(--bg-card)' }}
              >
                <span
                  className="absolute left-0.5 top-0.5 size-3 rounded-full bg-white"
                  style={{
                    transform: a.enabled ? 'translateX(12px)' : 'translateX(0)',
                    transition: 'transform 160ms var(--ease)',
                  }}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* --- Topbar --------------------------------------------------------------- */
function Header({ healthy }: { healthy: boolean }) {
  const navigate = useNavigate();
  const { data } = useStats();
  const tallies = Object.values(data?.by_provider ?? {});
  const runs = tallies.reduce((s, t) => s + t.runs, 0);
  const ok = tallies.reduce((s, t) => s + t.ok, 0);
  const success = runs > 0 ? `${((ok / runs) * 100).toFixed(1)}%` : '—';

  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between gap-4 px-6 border-b"
      style={{
        height: 64,
        borderColor: 'var(--border)',
        background: 'color-mix(in srgb, var(--bg-raised) 80%, transparent)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <ProjectSelector />

      <div className="flex items-center gap-5">
        {/* Tokens usados hoy */}
        <div className="hidden flex-col items-end leading-tight sm:flex">
          <span className="font-mono text-sm font-semibold tnum" style={{ color: 'var(--fg)' }}>
            {fmtTokens(data?.total_tokens ?? 0)}
          </span>
          <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--fg-faint)' }}>tokens</span>
        </div>
        <div className="hidden flex-col items-end leading-tight sm:flex">
          <span className="font-mono text-sm font-semibold tnum" style={{ color: 'var(--amber)' }}>
            ${(data?.total_cost_usd ?? 0).toFixed(2)}
          </span>
          <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--fg-faint)' }}>costo</span>
        </div>
        <div className="hidden flex-col items-end leading-tight md:flex">
          <span className="font-mono text-sm font-semibold tnum" style={{ color: 'var(--purple-soft)' }}>{success}</span>
          <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--fg-faint)' }}>exito</span>
        </div>

        {/* Estado del sistema */}
        <div className="hidden items-center gap-2 rounded-lg border px-3 h-10 lg:flex"
             style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--bg-card) 40%, transparent)' }}>
          <span className="inline-block w-2 h-2 rounded-full"
                style={{ background: healthy ? 'var(--ok)' : 'var(--alert)', boxShadow: healthy ? '0 0 6px var(--ok)' : 'none' }} />
          <span className="leading-tight">
            <span className="block text-[12px] font-medium" style={{ color: 'var(--fg)' }}>{healthy ? 'En línea' : 'Sin conexión'}</span>
            <span className="block text-[10px]" style={{ color: 'var(--fg-faint)' }}>{healthy ? 'Todos los sistemas' : 'sidecar caído'}</span>
          </span>
        </div>

        <button
          type="button"
          onClick={() => navigate('/run')}
          className="flex items-center gap-2 px-5 h-10 rounded-xl font-semibold text-sm transition-transform hover:scale-[1.02]"
          style={{ background: 'var(--amber)', color: '#1a1006', boxShadow: '0 4px 16px color-mix(in srgb, var(--amber) 30%, transparent)' }}
        >
          <Send size={16} strokeWidth={2} /> Lanzar Enjambre
        </button>
      </div>
    </header>
  );
}

export default function AppShell() {
  const healthy = useHealth();
  useLogStream(); // UNICA conexion SSE de la app: la comparten viz, logs y el dock

  return (
    <div className="flex min-h-screen app-texture">
      <SiteBackground />
      <aside
        className="fixed top-0 left-0 h-screen w-60 flex flex-col border-r z-30"
        style={{ background: 'var(--bg-raised)', borderColor: 'var(--border)' }}
      >
        {/* Marca */}
        <div className="flex items-center gap-2.5 h-16 px-5 shrink-0">
          <img src="/logos/hex.svg" alt="ENJAMBRE" width={32} height={32}
               style={{ filter: 'drop-shadow(0 0 8px rgba(139,92,246,0.4))' }} />
          <span className="leading-none">
            <span className="wordmark block text-base" style={{ letterSpacing: '0.14em' }}>ENJAMBRE</span>
            <span className="block text-[10px] mt-0.5" style={{ color: 'var(--fg-faint)' }}>IA Coder · Obsidia</span>
          </span>
        </div>

        {/* Zona desplazable: nav + keys + agentes */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <nav className="flex flex-col gap-1 px-3 mt-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 h-10 px-3 rounded-lg transition-colors ${
                    isActive ? 'text-[var(--fg)]' : 'text-[var(--fg-mute)] hover:text-[var(--fg)]'
                  }`
                }
                style={({ isActive }) => (isActive
                  ? { background: 'rgba(139,92,246,0.14)', boxShadow: 'inset 2px 0 0 var(--purple)' }
                  : {})}
              >
                <item.icon size={19} strokeWidth={1.7} />
                <span className="text-sm font-medium">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="my-3 mx-5 border-t" style={{ borderColor: 'var(--border)' }} />
          <SidebarKeys />
          <SidebarAgents />
        </div>

        {/* Footer: plan + estado sidecar */}
        <div className="px-4 py-3 border-t shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2"
               style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--bg-card) 40%, transparent)' }}>
            <span className="grid size-7 place-items-center rounded-md shrink-0"
                  style={{ background: 'color-mix(in srgb, var(--purple) 15%, transparent)', color: 'var(--purple)' }}>
              <Users size={14} />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[12px] font-semibold" style={{ color: 'var(--fg)' }}>Obsidia</span>
              <span className="block text-[10px]" style={{ color: 'var(--fg-faint)' }}>local-first · BYOK</span>
            </span>
            <span className="ml-auto inline-block w-2 h-2 rounded-full shrink-0"
                  style={{ background: healthy ? 'var(--ok)' : 'var(--alert)' }}
                  title={healthy ? 'sidecar conectado' : 'sidecar sin conexión'} />
          </div>
        </div>
      </aside>

      <main className="flex-1 ml-60 flex flex-col relative" style={{ zIndex: 10 }}>
        <Header healthy={healthy} />
        <div className="mx-auto w-full" style={{ maxWidth: 1760, padding: 28 }}>
          <Outlet />
        </div>
      </main>
      <UpdateBanner />
    </div>
  );
}
