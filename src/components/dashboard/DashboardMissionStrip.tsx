import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Globe2, Radio } from 'lucide-react';
import type { Mission } from '../../types';

interface DashboardMissionStripProps {
  mission: Mission;
}

export function DashboardMissionStrip({ mission }: DashboardMissionStripProps) {
  const progressPct = Math.min(
    100,
    Math.round((mission.currentDay / mission.totalPlannedDays) * 100)
  );

  const delayMin = Math.floor(mission.oneWayLightDelaySec / 60);
  const delaySec = mission.oneWayLightDelaySec % 60;

  return (
    <div className="relative overflow-hidden rounded-xl border border-[var(--arogya-border)] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--arogya-border)] bg-[#1E3A5F]/8 text-[#1E3A5F]"
            aria-hidden="true"
          >
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold tracking-wide text-[var(--arogya-text-primary)]">
                Mission Elapsed Time
              </p>
              <span className="rounded bg-[var(--arogya-bg)] px-1.5 py-0.5 font-mono-tabular text-[10px] text-[var(--arogya-text-muted)]">
                SIMULATED TRANSIT
              </span>
            </div>
            <p className="mt-0.5 font-mono-tabular text-xl font-bold tracking-tight text-[var(--arogya-text-primary)] sm:text-2xl">
              Sol {mission.currentDay} <span className="text-xs font-normal text-[var(--arogya-text-muted)]">/ {mission.totalPlannedDays}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-right">
          <div>
            <p className="text-[11px] text-[var(--arogya-text-muted)]">Earth Comms Lag</p>
            <p className="flex items-center justify-end gap-1 font-mono-tabular text-xs font-semibold text-[#1E3A5F]">
              <Radio className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span>
                {delayMin}m {String(delaySec).padStart(2, '0')}s
              </span>
            </p>
          </div>

          <Link
            to="/mission"
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[var(--arogya-border)] bg-[var(--arogya-bg)] px-3 py-1.5 text-xs font-medium text-[var(--arogya-text-secondary)] transition-colors hover:border-[#1E3A5F]/30 hover:bg-[#1E3A5F]/5 hover:text-[#1E3A5F]"
          >
            <Globe2 className="h-3.5 w-3.5 text-[#1E3A5F]" aria-hidden="true" />
            <span>Mission Details</span>
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Transit progress bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-[11px] text-[var(--arogya-text-muted)]">
          <span>{mission.vehicleName} · {mission.phase}</span>
          <span className="font-mono-tabular font-semibold text-[var(--arogya-text-primary)]">{progressPct}% Elapsed ({mission.remainingTravelDays} days rem.)</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Mission progress ${progressPct} percent`}
          className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--arogya-bg)]"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#1E3A5F] to-[#3B82F6]"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
