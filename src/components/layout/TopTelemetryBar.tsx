import { Link, useLocation } from 'react-router-dom';
import { HardDriveDownload, Menu, Radio, ShieldAlert, Wifi, WifiOff, Wind } from 'lucide-react';
import { useArogyaStore } from '../../store/useArogyaStore';
import { useActiveAssessment } from '../../hooks/useActiveAssessment';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { AstronautSelector } from '../dashboard/AstronautSelector';
import { SAFETY_DISCLAIMER } from '../../engine/thresholds';
import { useDriveExportState } from '../../services/driveExportStore';

interface TopTelemetryBarProps {
  pageTitle: string;
  onOpenMobileMenu: () => void;
  onOpenDriveModal: () => void;
}

export function TopTelemetryBar({
  pageTitle,
  onOpenMobileMenu,
  onOpenDriveModal,
}: TopTelemetryBarProps) {
  const location = useLocation();
  const isDashboard = location.pathname === '/';
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

  return (
    <header className="no-print border-b border-[var(--arogya-border)] bg-white px-4 py-3 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Mobile Drawer Trigger, Arogya Mark & Page Context */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-bg)] text-[var(--arogya-text-primary)] hover:bg-[var(--arogya-border)] lg:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <Link
            to="/"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--arogya-border)] bg-[#1E3A5F] text-sm font-bold text-white lg:hidden"
            aria-label="Arogya Home"
          >
            <span className="font-mono-tabular">A</span>
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="hidden font-mono-tabular text-[11px] font-semibold uppercase tracking-widest text-[#1E3A5F] sm:inline">
                AROGYA
              </span>
              <span className="hidden text-[var(--arogya-text-muted)] sm:inline" aria-hidden="true">
                /
              </span>
              <h1 className="truncate text-base font-semibold tracking-tight text-[var(--arogya-text-primary)] sm:text-lg">
                {pageTitle}
              </h1>
            </div>
            <p className="flex flex-wrap items-center gap-x-2 text-xs text-[var(--arogya-text-secondary)]">
              {isDashboard ? (
                <>
                  <span className="text-[var(--arogya-text-muted)]">Arogya · Crew Health Console</span>
                  <span aria-hidden="true" className="text-[var(--arogya-border-strong)]">·</span>
                  <span className="font-mono-tabular text-[#1E3A5F]">
                    Sol {mission.currentDay} / {mission.totalPlannedDays}
                  </span>
                </>
              ) : (
                <>
                  <span className="font-mono-tabular font-medium text-[var(--arogya-text-primary)]">
                    Sol {mission.currentDay}/{mission.totalPlannedDays}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{mission.name}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Center/Right: Environment, Comms Status, Crew Selector & Drive Sync */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <div
            className="hidden items-center gap-2 rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-bg)] px-2.5 py-1.5 font-mono-tabular text-[11px] text-[var(--arogya-text-secondary)] xl:flex"
            aria-label="Cabin environment telemetry"
          >
            <Wind className="h-3.5 w-3.5 text-[#1E3A5F]" aria-hidden="true" />
            <span>{mission.environment.cabinPressureKpa} kPa</span>
            <span aria-hidden="true">·</span>
            <span>{mission.environment.cabinOxygenPercent}% O₂</span>
            <span aria-hidden="true">·</span>
            <span>CO₂ {mission.environment.cabinCo2MmHg}</span>
            <span aria-hidden="true">·</span>
            <span
              className={
                mission.environment.solarParticleAlert === 'quiet'
                  ? 'text-[#16A34A]'
                  : 'text-[#CA8A04]'
              }
            >
              {speLabel}
            </span>
          </div>

          <div
            className={`hidden items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono-tabular text-[11px] md:flex ${
              isOnline
                ? 'border-[var(--arogya-border)] bg-[var(--arogya-bg)] text-[var(--arogya-text-secondary)]'
                : 'border-[#CA8A04]/45 bg-[#CA8A04]/8 text-[#92400E]'
            }`}
            aria-label="Network and Earth communication link status"
          >
            {isOnline ? (
              <Radio className="h-3.5 w-3.5 text-[#1E3A5F]" aria-hidden="true" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-[#92400E]" aria-hidden="true" />
            )}
            <span>
              {isOnline ? 'Local' : 'Offline'} · {delayMin}m {String(delaySec).padStart(2, '0')}s lag
            </span>
          </div>

          <AstronautSelector compact />

          <button
            type="button"
            onClick={onOpenDriveModal}
            className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-lg border border-[#1E3A5F]/30 bg-[#1E3A5F] px-3 text-xs font-medium text-white transition-colors hover:bg-[#2D4A6F] focus-visible:outline-2 focus-visible:outline-[#1E3A5F]"
          >
            <HardDriveDownload className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              {driveExport.status === 'connecting'
                ? 'Connecting…'
                : driveExport.status === 'connected'
                ? 'Drive connected'
                : driveSyncStatus === 'syncing'
                ? 'Syncing...'
                : driveAssets.length > 0
                ? `Drive (${driveAssets.length})`
                : 'Connect Drive'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}

export function SafetyDisclaimerFooter() {
  const isOnline = useOnlineStatus();

  return (
    <footer className="no-print border-t border-[var(--arogya-border)] bg-white px-4 py-2.5 text-xs text-[var(--arogya-text-secondary)] sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-[#CA8A04]" aria-hidden="true" />
          <span>
            {SAFETY_DISCLAIMER}
          </span>
        </p>
        <span
          className={`inline-flex items-center gap-1.5 font-mono-tabular text-[11px] ${
            isOnline ? 'text-[var(--arogya-text-muted)]' : 'text-[#92400E]'
          }`}
        >
          {isOnline ? (
            <Wifi className="h-3 w-3 text-[#16A34A]" aria-hidden="true" />
          ) : (
            <WifiOff className="h-3 w-3 text-[#92400E]" aria-hidden="true" />
          )}
          {isOnline ? 'Online · Offline-First Local Cache Active' : 'Offline Mode · Local Telemetry Active'}
        </span>
      </div>
    </footer>
  );
}
