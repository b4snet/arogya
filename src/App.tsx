import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './components/ui';
import { useArogyaStore } from './store/useArogyaStore';
import { DashboardPage } from './pages/DashboardPage';
import { AtlasPage } from './pages/AtlasPage';
import { CheckInPage } from './pages/CheckInPage';
import { VitalsPage } from './pages/VitalsPage';
import { ReportsPage } from './pages/ReportsPage';
import { MissionPage } from './pages/MissionPage';
import { SettingsPage } from './pages/SettingsPage';
import { AboutPage } from './pages/AboutPage';

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Mission Health Dashboard',
  '/atlas': '3D Health Atlas',
  '/check-in': 'Daily Crew Check-In',
  '/vitals': 'Biometric Vitals',
  '/reports': 'Flight Surgeon Briefings',
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
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/atlas" element={<AtlasPage />} />
          <Route path="/check-in" element={<CheckInPage />} />
          <Route path="/vitals" element={<VitalsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/mission" element={<MissionPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
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
