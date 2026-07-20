import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, useState } from 'react';
import AppShell from './layouts/AppShell';
import SplashScreen from './components/SplashScreen';
import ErrorBoundary from './components/ui/ErrorBoundary';

const OverviewPage = lazy(() => import('./pages/OverviewPage'));
const RunPage = lazy(() => import('./pages/RunPage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const LogsPage = lazy(() => import('./pages/LogsPage'));
const StatsPage = lazy(() => import('./pages/StatsPage'));
const AgentsPage = lazy(() => import('./pages/AgentsPage'));
const CliPage = lazy(() => import('./pages/CliPage'));
const ToolsPage = lazy(() => import('./pages/ToolsPage'));
const DeployPage = lazy(() => import('./pages/DeployPage'));

const CLI_AGENTS = import.meta.env.VITE_CLI_AGENTS === '1';
const TOOLS = import.meta.env.VITE_TOOLS === '1';
const HUB_DEPLOY = import.meta.env.VITE_HUB_DEPLOY === '1';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

export default function App() {
  const [ready, setReady] = useState(false);
  return (
    <QueryClientProvider client={queryClient}>
      {!ready && <SplashScreen onDone={() => setReady(true)} />}
      <BrowserRouter>
        <ErrorBoundary>
          <Suspense fallback={<div className="skeleton m-6 h-64" />}>
            <Routes>
              <Route path="/" element={<AppShell />}>
                <Route index element={<Navigate to="overview" replace />} />
                <Route path="overview" element={<OverviewPage />} />
                <Route path="run" element={<RunPage />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="logs" element={<LogsPage />} />
                <Route path="stats" element={<StatsPage />} />
                <Route path="agents" element={<AgentsPage />} />
                {CLI_AGENTS && <Route path="cli" element={<CliPage />} />}
                {TOOLS && <Route path="tools" element={<ToolsPage />} />}
                {HUB_DEPLOY && <Route path="deploy" element={<DeployPage />} />}
                {/* Con los flags apagados, /cli y /deploy no existen: sin esta ruta,
                    navegar ahi renderiza el AppShell con el Outlet vacio (pantalla
                    en blanco, sin 404). */}
                <Route path="*" element={<Navigate to="overview" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
