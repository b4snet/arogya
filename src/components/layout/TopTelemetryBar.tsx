import { Link } from 'react-router-dom';
import { HardDriveDownload, Menu, Radio, ShieldAlert, Wifi, WifiOff, Wind } from 'lucide-react';
import { useArogyaStore } from '../../store/useArogyaStore';
import { useActiveAssessment } from '../../hooks/useActiveAssessment';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { AstronautSelector } from '../dashboard/AstronautSelector';
import { SAFETY_DISCLAIMER } from '../../engine/thresholds';
import { useDriveExportState } from '../../services/driveExportStore';

interface TopTelemetryBarProps {
  pageTitle: string;
  mobileMenuOpen: boolean;
  onOpenMobileMenu: () => void;
  onOpenDriveModal: () => void;
}

export function TopTelemetryBar({
  pageTitle,
  mobileMenuOpen,
  onOpenMobileMenu,
  onOpenDriveModal,
}: TopTelemetryBarProps) {
  const driveAssets = useArogyaStore((s) => s.driveAssets);
  const driveSyncStatus = useArogyaStore((s) => s.driveSyncStatus);
  const { mission } = useActiveAssessment();
  const isOnline = useOnlineStatus();
  const driveExport = useDriveExportState();

  const delayMin = Math.floor(mission.oneWayLightDelaySec / 60);
  const delaySec = mission.oneWayLightDelaySec % 60;
  const speLabel =
    mission.environment.solarParticleAlert === 'quiet'
      ? 'SPE Quiet'
      : mission.environment.solarParticleAlert === 'elevated'
      ? 'SPE Elevated'
      : 'SPE Shelter';

  const driveLabel =
    driveExport.status === 'connecting'
      ? 'Connecting…'
      : driveExport.status === 'connected'
      ? 'Drive connected'
      : driveSyncStatus === 'syncing'
      ? 'Syncing…'
      : driveAssets.length > 0
      ? `Drive (${driveAssets.length})`
      : 'Connect Drive';

  return (
    <header className="no-print sticky top-0 z-30 border-b border-[var(--arogya-border)] bg-[var(--arogya-surface)]/95 backdrop-blur-sm">
      <div className="flex min-h-[60px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:px-6">
        <div className="flex w-full min-w-0 flex-1 items-center gap-2.5 sm:w-auto">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Open navigation menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation-drawer"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--arogya-border)] bg-[var(--arogya-surface-subtle)] text-[var(--arogya-text-primary)] transition-colors hover:border-[var(--arogya-border-strong)] hover:bg-[var(--arogya-surface)] sm:h-9 sm:w-9 lg:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <Link
            to="/"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--arogya-accent-primary)] font-mono-tabular text-sm font-semibold text-white sm:h-9 sm:w-9 lg:hidden"
            aria-label="Arogya home"
          >
            A
          </Link>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-[var(--arogya-text-primary)] sm:text-base">
              {pageTitle}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--arogya-text-muted)]">
              <span className="font-mono-tabular font-medium text-[var(--arogya-text-secondary)]">
                Sol {mission.currentDay}/{mission.totalPlannedDays}
              </span>
              <span aria-hidden="true" className="text-[var(--arogya-border-strong)]">
                ·
              </span>
              <span className="truncate">{mission.name}</span>
            </p>
          </div>
        </div>

        <div className="flex w-full items-center justify-between gap-2 sm:ml-auto sm:w-auto sm:justify-end sm:gap-3">
          <div
            className="hidden items-center gap-2.5 border-l border-[var(--arogya-border-subtle)] pl-4 font-mono-tabular text-[11px] text-[var(--arogya-text-secondary)] xl:flex"
            aria-label="Cabin environment telemetry"
          >
            <Wind className="h-3.5 w-3.5 text-[var(--arogya-accent-primary)]" aria-hidden="true" />
            <span>{mission.environment.cabinPressureKpa} kPa</span>
            <span aria-hidden="true" className="text-[var(--arogya-border-strong)]">
              ·
            </span>
            <span>{mission.environment.cabinOxygenPercent}% O₂</span>
            <span aria-hidden="true" className="text-[var(--arogya-border-strong)]">
              ·
            </span>
            <span>CO₂ {mission.environment.cabinCo2MmHg}</span>
            <span aria-hidden="true" className="text-[var(--arogya-border-strong)]">
              ·
            </span>
            <span
              className={
                mission.environment.solarParticleAlert === 'quiet'
                  ? 'text-[var(--arogya-success-text)]'
                  : 'text-[var(--arogya-warning-text)]'
              }
            >
              {speLabel}
            </span>
          </div>

          <div
            className={`hidden items-center gap-1.5 font-mono-tabular text-[11px] 2xl:flex ${
              isOnline
                ? 'text-[var(--arogya-text-muted)]'
                : 'rounded-[var(--radius-sm)] bg-[var(--arogya-warning-soft)] px-2 py-1 text-[var(--arogya-warning-text)]'
            }`}
            aria-label="Network and Earth communication link status"
          >
            {isOnline ? (
              <Radio className="h-3.5 w-3.5 text-[var(--arogya-accent-primary)]" aria-hidden="true" />
            ) : (
              <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>
              {isOnline ? 'Comms local' : 'Offline'} · {delayMin}m{' '}
              {String(delaySec).padStart(2, '0')}s lag
            </span>
          </div>

          <AstronautSelector compact />

          <button
            type="button"
            onClick={onOpenDriveModal}
            aria-label={driveLabel}
            title={driveLabel}
            className="inline-flex h-11 w-11 items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-md)] bg-[var(--arogya-accent-primary)] text-xs font-medium text-white transition-colors hover:bg-[var(--arogya-accent-primary-hover)] sm:h-9 sm:w-auto sm:justify-start sm:px-3"
          >
            <HardDriveDownload className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">{driveLabel}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export function SafetyDisclaimerFooter() {
  const isOnline = useOnlineStatus();

  return (
    <footer className="no-print border-t border-[var(--arogya-border)] bg-[var(--arogya-surface)] px-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] pt-2.5 text-xs text-[var(--arogya-text-secondary)] sm:px-6 lg:pb-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="flex items-start gap-2 leading-relaxed">
          <ShieldAlert
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--arogya-warning)]"
            aria-hidden="true"
          />
          <span>{SAFETY_DISCLAIMER}</span>
        </p>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 font-mono-tabular text-[11px] ${
            isOnline ? 'text-[var(--arogya-text-muted)]' : 'text-[var(--arogya-warning-text)]'
          }`}
        >
          {isOnline ? (
            <Wifi className="h-3 w-3 text-[var(--arogya-success)]" aria-hidden="true" />
          ) : (
            <WifiOff className="h-3 w-3" aria-hidden="true" />
          )}
          {isOnline
            ? 'Online · Offline-First Local Cache Active'
            : 'Offline Mode · Local Telemetry Active'}
        </span>
      </div>
    </footer>
  );
}
