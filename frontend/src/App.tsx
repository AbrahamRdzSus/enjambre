import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';
import AppShell from './layouts/AppShell';

const OverviewPage = lazy(() => import('./pages/OverviewPage'));
const RunPage = lazy(() => import('./pages/RunPage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const LogsPage = lazy(() => import('./pages/LogsPage'));
const StatsPage = lazy(() => import('./pages/StatsPage'));
const AgentsPage = lazy(() => import('./pages/AgentsPage'));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<AppShell />}>
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<OverviewPage />} />
              <Route path="run" element={<RunPage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="logs" element={<LogsPage />} />
              <Route path="stats" element={<StatsPage />} />
              <Route path="agents" element={<AgentsPage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
