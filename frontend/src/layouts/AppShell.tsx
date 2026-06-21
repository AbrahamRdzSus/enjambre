import { NavLink, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LayoutGrid, Send, FolderTree, ScrollText, BarChart3, Users, Hexagon } from 'lucide-react';
import { api } from '../api/client';

const NAV = [
  { to: '/overview', label: 'Overview', icon: LayoutGrid },
  { to: '/run', label: 'Lanzar', icon: Send },
  { to: '/projects', label: 'Proyectos', icon: FolderTree },
  { to: '/logs', label: 'Logs', icon: ScrollText },
  { to: '/stats', label: 'Estadisticas', icon: BarChart3 },
  { to: '/agents', label: 'Agentes', icon: Users },
];

function HealthDot() {
  const { data, isError } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.get<{ status: string }>('/health'),
    refetchInterval: 5000,
  });
  const ok = !isError && data?.status === 'ok';
  return (
    <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--fg-mute)' }}>
      <span
        className="inline-block w-2 h-2 rounded-full"
        style={{ background: ok ? 'var(--ok)' : 'var(--alert)' }}
      />
      sidecar {ok ? 'conectado' : 'sin conexion'}
    </span>
  );
}

export default function AppShell() {
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-app)' }}>
      <aside
        className="fixed top-0 left-0 h-screen w-60 flex flex-col border-r"
        style={{ background: 'var(--bg-raised)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2 h-16 px-5">
          <Hexagon size={26} strokeWidth={1.6} style={{ color: 'var(--purple)' }} />
          <span className="wordmark text-lg">Enjambre</span>
        </div>
        <nav className="flex-1 flex flex-col gap-1 px-3 mt-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 h-10 px-3 rounded-lg transition-colors ${
                  isActive
                    ? 'text-[var(--fg)]'
                    : 'text-[var(--fg-mute)] hover:text-[var(--fg)]'
                }`
              }
              style={({ isActive }) =>
                isActive ? { background: 'rgba(139,92,246,0.14)' } : {}
              }
            >
              <item.icon size={19} strokeWidth={1.7} />
              <span className="text-sm font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <p className="eyebrow mb-1">local-first · BYOK</p>
          <HealthDot />
        </div>
      </aside>

      <main className="flex-1 ml-60">
        <div className="mx-auto w-full" style={{ maxWidth: 1200, padding: 32 }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
