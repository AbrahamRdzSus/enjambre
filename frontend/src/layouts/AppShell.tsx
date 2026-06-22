import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LayoutGrid, Send, FolderTree, ScrollText, BarChart3, Users } from 'lucide-react';
import { api } from '../api/client';
import { useStats } from '../api/hooks';
import ProjectSelector from '../components/ProjectSelector';
import { useRunEvents } from '../stores/run-store';

const NAV = [
  { to: '/overview', label: 'Overview', icon: LayoutGrid },
  { to: '/run', label: 'Lanzar', icon: Send },
  { to: '/projects', label: 'Proyectos', icon: FolderTree },
  { to: '/logs', label: 'Logs', icon: ScrollText },
  { to: '/stats', label: 'Estadisticas', icon: BarChart3 },
  { to: '/agents', label: 'Agentes', icon: Users },
];

function useHealth() {
  const { data, isError } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.get<{ status: string }>('/health'),
    refetchInterval: 5000,
  });
  return !isError && data?.status === 'ok';
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-end leading-tight">
      <span className="text-sm font-semibold" style={{ color, fontFamily: 'var(--font-mono)' }}>{value}</span>
      <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--fg-faint)' }}>{label}</span>
    </div>
  );
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function Header() {
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
        background: 'color-mix(in srgb, var(--bg-raised) 78%, transparent)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <ProjectSelector />

      <div className="flex items-center gap-6">
        <Metric label="tokens" value={fmtTokens(data?.total_tokens ?? 0)} color="var(--fg)" />
        <Metric label="costo" value={`$${(data?.total_cost_usd ?? 0).toFixed(2)}`} color="var(--amber)" />
        <Metric label="exito" value={success} color="var(--purple-soft)" />
        <button
          type="button"
          onClick={() => navigate('/run')}
          className="flex items-center gap-2 px-5 h-10 rounded-xl font-semibold text-sm"
          style={{ background: 'var(--amber)', color: '#1a1006' }}
        >
          <Send size={16} strokeWidth={2} /> Lanzar Enjambre
        </button>
      </div>
    </header>
  );
}

export default function AppShell() {
  const healthy = useHealth();
  useRunEvents(); // estado live de agentes para la hex-viz

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-app)' }}>
      <aside
        className="fixed top-0 left-0 h-screen w-60 flex flex-col border-r z-30"
        style={{ background: 'var(--bg-raised)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2.5 h-16 px-5">
          <img src="/logos/hex.png" alt="ENJAMBRE" width={32} height={32}
               style={{ filter: 'drop-shadow(0 0 8px rgba(139,92,246,0.4))' }} />
          <span className="wordmark text-base" style={{ letterSpacing: '0.14em' }}>ENJAMBRE</span>
        </div>
        <nav className="flex-1 flex flex-col gap-1 px-3 mt-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 h-10 px-3 rounded-lg transition-colors ${
                  isActive ? 'text-[var(--fg)]' : 'text-[var(--fg-mute)] hover:text-[var(--fg)]'
                }`
              }
              style={({ isActive }) => (isActive ? { background: 'rgba(139,92,246,0.14)' } : {})}
            >
              <item.icon size={19} strokeWidth={1.7} />
              <span className="text-sm font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <p className="eyebrow mb-1">local-first · BYOK</p>
          <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--fg-mute)' }}>
            <span className="inline-block w-2 h-2 rounded-full"
                  style={{ background: healthy ? 'var(--ok)' : 'var(--alert)' }} />
            sidecar {healthy ? 'conectado' : 'sin conexion'}
          </span>
        </div>
      </aside>

      <main className="flex-1 ml-60 flex flex-col">
        <Header />
        <div className="mx-auto w-full" style={{ maxWidth: 1200, padding: 32 }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
