import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './components/ui';
import { useArogyaStore } from './store/useArogyaStore';

const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage }))
);
const CheckInPage = lazy(() =>
  import('./pages/CheckInPage').then((module) => ({ default: module.CheckInPage }))
);
const VitalsPage = lazy(() =>
  import('./pages/VitalsPage').then((module) => ({ default: module.VitalsPage }))
);
const ReportsPage = lazy(() =>
  import('./pages/ReportsPage').then((module) => ({ default: module.ReportsPage }))
);
const ResearchPage = lazy(() =>
  import('./pages/ResearchPage').then((module) => ({ default: module.ResearchPage }))
);
const MissionPage = lazy(() =>
  import('./pages/MissionPage').then((module) => ({ default: module.MissionPage }))
);
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage }))
);
const AboutPage = lazy(() =>
  import('./pages/AboutPage').then((module) => ({ default: module.AboutPage }))
);

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Mission Health Dashboard',
  '/check-in': 'Daily Crew Check-In',
  '/vitals': 'Biometric Vitals',
  '/reports': 'Flight Surgeon Briefings',
  '/research': 'Research Context',
  '/mission': 'Mission & Environment',
  '/settings': 'Settings & Crew Profile',
  '/about': 'About, Sources & Licenses',
};

function RoutedContent() {
  const location = useLocation();
  const resetDemoData = useArogyaStore((s) => s.resetDemoData);
  const pageTitle = ROUTE_TITLES[location.pathname] ?? 'Arogya Console';

  return (
    <AppShell pageTitle={pageTitle}>
      <ErrorBoundary resetKey={location.pathname} onLoadDemo={resetDemoData}>
        <Suspense
          fallback={
            <div
              className="p-6 text-sm text-[var(--arogya-text-secondary)]"
              role="status"
              aria-live="polite"
            >
              Loading mission page…
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/atlas" element={<Navigate to="/vitals" replace />} />
            <Route path="/check-in" element={<CheckInPage />} />
            <Route path="/vitals" element={<VitalsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/research" element={<ResearchPage />} />
            <Route path="/mission" element={<MissionPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </AppShell>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <RoutedContent />
    </BrowserRouter>
  );
}
