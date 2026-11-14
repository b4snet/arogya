import { Clock, Globe2, Shield } from 'lucide-react';
import type { Astronaut, Mission, VitalReading } from '../../types';
import { Card, CardHeader } from '../ui';

interface MissionProgressWidgetProps {
  mission: Mission;
  astronaut?: Astronaut;
  latestVital?: VitalReading;
}

export function MissionProgressWidget({
  mission,
  astronaut,
  latestVital,
}: MissionProgressWidgetProps) {
  const progressPct = Math.min(
    100,
    Math.round((mission.currentDay / mission.totalPlannedDays) * 100)
  );
  const delayMin = Math.floor(mission.oneWayLightDelaySec / 60);
  const delaySec = mission.oneWayLightDelaySec % 60;
  const cumRadMsv = latestVital?.cumulativeRadiationMsv ?? 0;
  const radBudgetMsv = astronaut?.baseline.radiationBudgetMsv ?? 150;

  return (
    <Card padding="md">
      <CardHeader
        title="Mission Progress & Mars Transit"
        subtitle={`${mission.vehicleName} · ${mission.phase}`}
        action={
          <span className="inline-flex items-center gap-1.5 font-mono-tabular text-xs font-semibold text-[#22D3EE]">
            <Globe2 className="h-3.5 w-3.5" aria-hidden="true" />
            {progressPct}%
          </span>
        }
      />

      <div className="mt-3">
        <div
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Mission transit ${progressPct} percent elapsed`}
          className="h-2 w-full overflow-hidden rounded-full bg-white/10"
        >
          <div
            className="h-full rounded-full bg-[#22D3EE]"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-3">
          <p className="text-[11px] text-[var(--arogya-text-secondary)]">Mars Distance</p>
          <p className="mt-1 font-mono-tabular text-base font-semibold text-[var(--arogya-text-primary)]">
            {(mission.marsDistanceKm / 1_000_000).toFixed(1)}M km
          </p>
        </div>

        <div className="rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-3">
          <p className="text-[11px] text-[var(--arogya-text-secondary)]">Remaining Travel</p>
          <p className="mt-1 font-mono-tabular text-base font-semibold text-[var(--arogya-text-primary)]">
            {mission.remainingTravelDays} days
          </p>
        </div>

        <div className="rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-3">
          <p className="text-[11px] text-[var(--arogya-text-secondary)]">Mission Day</p>
          <p className="mt-1 font-mono-tabular text-base font-semibold text-[var(--arogya-text-primary)]">
            Sol {mission.currentDay} / {mission.totalPlannedDays}
          </p>
        </div>

        <div className="rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-3">
          <p className="text-[11px] text-[var(--arogya-text-secondary)]">One-Way Lag</p>
          <p className="mt-1 flex items-center gap-1.5 font-mono-tabular text-base font-semibold text-[#22D3EE]">
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              {delayMin}m {String(delaySec).padStart(2, '0')}s
            </span>
          </p>
        </div>
      </div>

      {astronaut && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-bg)]/65 px-3 py-2 text-xs">
          <span className="flex items-center gap-1.5 text-[var(--arogya-text-secondary)]">
            <Shield className="h-3.5 w-3.5 text-[#38BDF8]" aria-hidden="true" />
            <span>
              <strong className="text-[var(--arogya-text-primary)]">{astronaut.callSign}</strong> EVA:{' '}
              <span className="font-mono-tabular text-[var(--arogya-text-primary)]">
                {astronaut.evaHoursTotal.toFixed(1)} h
              </span>
            </span>
          </span>
          <span className="font-mono-tabular text-[var(--arogya-text-secondary)]">
            Cumulative Dose:{' '}
            <strong className="text-[var(--arogya-text-primary)]">
              {cumRadMsv.toFixed(1)} / {radBudgetMsv} mSv
            </strong>
          </span>
        </div>
      )}
    </Card>
  );
}
