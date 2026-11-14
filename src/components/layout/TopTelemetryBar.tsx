import { Link } from 'react-router-dom';
import { HardDriveDownload, Menu, Radio, ShieldAlert, Wifi, WifiOff, Wind } from 'lucide-react';
import { useArogyaStore } from '../../store/useArogyaStore';
import { useActiveAssessment } from '../../hooks/useActiveAssessment';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { AstronautSelector } from '../dashboard/AstronautSelector';
import { SAFETY_DISCLAIMER } from '../../engine/thresholds';

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
  const driveAssets = useArogyaStore((s) => s.driveAssets);
  const driveSyncStatus = useArogyaStore((s) => s.driveSyncStatus);
  const { mission } = useActiveAssessment();
  const isOnline = useOnlineStatus();

  const delayMin = Math.floor(mission.oneWayLightDelaySec / 60);
  const delaySec = mission.oneWayLightDelaySec % 60;
  const speLabel =
    mission.environment.solarParticleAlert === 'quiet'
      ? 'SPE Quiet'
      : mission.environment.solarParticleAlert === 'elevated'
      ? 'SPE Elevated'
      : 'SPE Shelter';

  return (
    <header className="no-print border-b border-[var(--arogya-border)] bg-[var(--arogya-surface)]/95 px-4 py-3 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Mobile Drawer Trigger, Arogya Mark & Page Context */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--arogya-border-strong)] bg-[var(--arogya-surface-elevated)] text-[var(--arogya-text-primary)] hover:bg-white/10 lg:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <Link
            to="/"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#22D3EE]/35 bg-[#0D1522] text-sm font-bold text-[#22D3EE] lg:hidden"
            aria-label="Arogya Home"
          >
            <span className="font-mono-tabular">A</span>
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="hidden font-mono-tabular text-[11px] font-semibold uppercase tracking-widest text-[#22D3EE] sm:inline">
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
              <span className="font-mono-tabular font-medium text-[var(--arogya-text-primary)]">
                Sol {mission.currentDay}/{mission.totalPlannedDays}
              </span>
              <span aria-hidden="true">·</span>
              <span className="truncate">{mission.name}</span>
            </p>
          </div>
        </div>

        {/* Center/Right: Environment, Comms Status, Crew Selector & Drive Sync */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <div
            className="hidden items-center gap-2 rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-bg)]/80 px-2.5 py-1.5 font-mono-tabular text-[11px] text-[var(--arogya-text-secondary)] xl:flex"
            aria-label="Cabin environment telemetry"
          >
            <Wind className="h-3.5 w-3.5 text-[#38BDF8]" aria-hidden="true" />
            <span>{mission.environment.cabinPressureKpa} kPa</span>
            <span aria-hidden="true">·</span>
            <span>{mission.environment.cabinOxygenPercent}% O₂</span>
            <span aria-hidden="true">·</span>
            <span>CO₂ {mission.environment.cabinCo2MmHg}</span>
            <span aria-hidden="true">·</span>
            <span
              className={
                mission.environment.solarParticleAlert === 'quiet'
                  ? 'text-[#4ADE80]'
                  : 'text-[#FACC15]'
              }
            >
              {speLabel}
            </span>
          </div>

          <div
            className={`hidden items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono-tabular text-[11px] md:flex ${
              isOnline
                ? 'border-[var(--arogya-border)] bg-[var(--arogya-bg)]/80 text-[var(--arogya-text-secondary)]'
                : 'border-[#EAB308]/45 bg-[#EAB308]/12 text-[#FACC15]'
            }`}
            aria-label="Network and Earth communication link status"
          >
            {isOnline ? (
              <Radio className="h-3.5 w-3.5 text-[#22D3EE]" aria-hidden="true" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-[#FACC15]" aria-hidden="true" />
            )}
            <span>
              {isOnline ? 'Local' : 'Offline'} · {delayMin}m {String(delaySec).padStart(2, '0')}s lag
            </span>
          </div>

          <AstronautSelector compact />

          <button
            type="button"
            onClick={onOpenDriveModal}
            className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-lg border border-[#22D3EE]/40 bg-[#0B3D91] px-3 text-xs font-medium text-white transition-colors hover:bg-[#1D4ED8] focus-visible:outline-2 focus-visible:outline-[#22D3EE]"
          >
            <HardDriveDownload className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              {driveSyncStatus === 'syncing'
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
    <footer className="no-print border-t border-[var(--arogya-border)] bg-[var(--arogya-bg)] px-4 py-2.5 text-xs text-[var(--arogya-text-secondary)] sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-[#EAB308]" aria-hidden="true" />
          <span>
            {SAFETY_DISCLAIMER}
          </span>
        </p>
        <span
          className={`inline-flex items-center gap-1.5 font-mono-tabular text-[11px] ${
            isOnline ? 'text-[var(--arogya-text-muted)]' : 'text-[#FACC15]'
          }`}
        >
          {isOnline ? (
            <Wifi className="h-3 w-3 text-[#4ADE80]" aria-hidden="true" />
          ) : (
            <WifiOff className="h-3 w-3 text-[#FACC15]" aria-hidden="true" />
          )}
          {isOnline ? 'Online · Offline-First Local Cache Active' : 'Offline Mode · Local Telemetry Active'}
        </span>
      </div>
    </footer>
  );
}
