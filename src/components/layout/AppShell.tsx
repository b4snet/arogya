import { useEffect, useState, type ReactNode } from 'react';
import { WifiOff } from 'lucide-react';
import { SidebarNav } from './SidebarNav';
import { TopTelemetryBar, SafetyDisclaimerFooter } from './TopTelemetryBar';
import { DriveSyncModal } from './DriveSyncModal';
import { useArogyaStore } from '../../store/useArogyaStore';
import { initAuth } from '../../services/firebaseAuth';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

interface AppShellProps {
  pageTitle: string;
  children: ReactNode;
}

export function AppShell({ pageTitle, children }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [driveModalOpen, setDriveModalOpen] = useState(false);

  const hydrateCachedDriveAssets = useArogyaStore((s) => s.hydrateCachedDriveAssets);
  const setDriveAuthState = useArogyaStore((s) => s.setDriveAuthState);
  const highContrast = useArogyaStore((s) => s.preferences.highContrast);
  const reducedMotion = useReducedMotion();
  const isOnline = useOnlineStatus();

  useEffect(() => {
    void hydrateCachedDriveAssets();
    const unsubscribe = initAuth(
      (user) => setDriveAuthState(false, user.email),
      () => setDriveAuthState(true, null)
    );
    return () => unsubscribe();
  }, [hydrateCachedDriveAssets, setDriveAuthState]);

  useEffect(() => {
    const root = document.documentElement;
    if (highContrast) {
      root.setAttribute('data-contrast', 'high');
    } else {
      root.removeAttribute('data-contrast');
    }
  }, [highContrast]);

  useEffect(() => {
    const root = document.documentElement;
    if (reducedMotion) {
      root.setAttribute('data-reduced-motion', 'true');
    } else {
      root.removeAttribute('data-reduced-motion');
    }
  }, [reducedMotion]);

  return (
    <div className="flex min-h-screen w-full bg-[var(--arogya-bg)] text-[var(--arogya-text-primary)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:border focus:border-[#1E3A5F] focus:bg-white focus:px-4 focus:py-2.5 focus:text-xs focus:font-semibold focus:text-[#1E3A5F] focus:shadow-xl"
      >
        Skip to main content
      </a>

      <SidebarNav
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopTelemetryBar
          pageTitle={pageTitle}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenDriveModal={() => setDriveModalOpen(true)}
        />

        {!isOnline && (
          <div
            role="status"
            aria-live="polite"
            className="no-print flex items-center gap-2 border-b border-[#CA8A04]/25 bg-[#CA8A04]/8 px-4 py-2 text-xs text-[#92400E] sm:px-6"
          >
            <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              Offline mode active — Arogya continues operating normally using your on-device telemetry and cached assets.
            </span>
          </div>
        )}

        <main id="main-content" tabIndex={-1} className="relative flex-1 overflow-x-hidden pb-20 focus:outline-none lg:pb-0">
          {children}
        </main>

        <SafetyDisclaimerFooter />
      </div>

      <DriveSyncModal
        isOpen={driveModalOpen}
        onClose={() => setDriveModalOpen(false)}
      />
    </div>
  );
}
