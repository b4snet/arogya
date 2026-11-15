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
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-[var(--radius-md)] focus:border focus:border-[var(--arogya-accent-primary)] focus:bg-[var(--arogya-surface)] focus:px-4 focus:py-2.5 focus:text-xs focus:font-semibold focus:text-[var(--arogya-accent-primary)] focus:shadow-[var(--arogya-shadow-2)]"
      >
        Skip to main content
      </a>

      <SidebarNav
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopTelemetryBar
          pageTitle={pageTitle}
          mobileMenuOpen={mobileMenuOpen}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenDriveModal={() => setDriveModalOpen(true)}
        />

        {!isOnline && (
          <div
            role="status"
            aria-live="polite"
            className="no-print flex items-center gap-2 border-b border-[var(--arogya-warning-border)] bg-[var(--arogya-warning-soft)] px-4 py-2 text-xs text-[var(--arogya-warning-text)] sm:px-6"
          >
            <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              Offline mode active — Arogya continues operating normally using your on-device telemetry and cached assets.
            </span>
          </div>
        )}

        <main
          id="main-content"
          tabIndex={-1}
          className="relative min-w-0 flex-1 overflow-x-hidden pb-20 focus:outline-none lg:pb-0"
        >
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
