import { useMemo } from 'react';
import { ArrowDown, ShieldAlert } from 'lucide-react';
import type { Astronaut, CheckIn, VitalReading } from '../../types';
import { buildRecoveryReadiness } from '../../engine/recoveryReadiness';
import { useSimulatedTelemetryStore } from '../../store/useSimulatedTelemetryStore';
import { StatusPill, type StatusTone } from '../ui';

interface RecoveryReadinessSummaryProps {
  astronaut: Astronaut;
  missionDay: number;
  checkIns: CheckIn[];
  vitals: VitalReading[];
  escalationRequired: boolean;
  escalationReasons: string[];
  className?: string;
}

function summaryTone(
  band: 'ready' | 'monitor' | 'rest',
  escalationLevel: 'none' | 'review' | 'urgent'
): StatusTone {
  if (escalationLevel === 'urgent') return 'critical';
  if (band === 'ready') return 'success';
  if (band === 'monitor') return 'warning';
  return 'caution';
}

export function RecoveryReadinessSummary({
  astronaut,
  missionDay,
  checkIns,
  vitals,
  escalationRequired,
  escalationReasons,
  className = '',
}: RecoveryReadinessSummaryProps) {
  const simulatedPoints = useSimulatedTelemetryStore((state) => state.points);
  const simulatedAstronautId = useSimulatedTelemetryStore((state) => state.astronautId);

  const readiness = useMemo(
    () =>
      buildRecoveryReadiness({
        astronaut,
        checkIns,
        missionDay,
        vitals,
        windowDays: 7,
        escalation: { required: escalationRequired, reasons: escalationReasons },
        simulated: { points: simulatedPoints, sessionAstronautId: simulatedAstronautId },
      }),
    [
      astronaut,
      checkIns,
      missionDay,
      vitals,
      escalationRequired,
      escalationReasons,
      simulatedPoints,
      simulatedAstronautId,
    ]
  );

  const tone = summaryTone(readiness.band, readiness.escalation.level);

  return (
    <section
      aria-labelledby="today-readiness-heading"
      className={`flex h-full flex-col justify-between rounded-xl border border-[var(--arogya-border)] bg-[var(--arogya-surface)] p-4 arogya-elevation-1 ${className}`}
    >
      <div>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p
              id="today-readiness-heading"
              className="arogya-overline text-[var(--arogya-text-secondary)]"
            >
              Today’s recovery readiness
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-2">
              <span className="font-mono-tabular text-3xl font-semibold leading-none text-[var(--arogya-text-primary)]">
                {readiness.score == null ? 'Not scored' : readiness.score}
                {readiness.score != null && (
                  <span className="ml-0.5 text-sm font-normal text-[var(--arogya-text-muted)]">
                    /100
                  </span>
                )}
              </span>
              <StatusPill tone={tone} label={readiness.bandLabel} size="sm" />
            </div>
          </div>

          {readiness.escalation.level !== 'none' && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--arogya-warning-border)] bg-[var(--arogya-warning-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--arogya-warning-text)]">
              <ShieldAlert className="h-3 w-3" aria-hidden="true" />
              Review pathway
            </span>
          )}
        </div>

        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
          {readiness.score == null ? readiness.missingDataNote : readiness.bandReason}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-2 border-t border-[var(--arogya-border)] pt-3">
        <dl className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[var(--arogya-text-muted)]">
          <div className="flex items-baseline gap-1">
            <dt>Day coverage</dt>
            <dd className="font-mono-tabular text-xs font-semibold text-[var(--arogya-text-primary)]">
              {readiness.dayCoveragePercent}%
            </dd>
          </div>
          <div className="flex items-baseline gap-1">
            <dt>Evidence</dt>
            <dd className="font-mono-tabular text-xs font-semibold text-[var(--arogya-text-primary)]">
              {readiness.evidenceCoveragePercent}%
            </dd>
          </div>
          <div className="flex items-baseline gap-1">
            <dt>Window</dt>
            <dd className="font-mono-tabular text-xs font-semibold text-[var(--arogya-text-primary)]">
              {readiness.window.requestedDays}d
            </dd>
          </div>
        </dl>

        <a
          href="#recovery-readiness"
          className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[var(--arogya-border-strong)] bg-[var(--arogya-surface-elevated)] px-2.5 text-[11px] font-semibold text-[var(--arogya-text-primary)] hover:bg-[var(--arogya-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F] focus-visible:ring-offset-2"
        >
          <span>Review detail</span>
          <ArrowDown className="h-3 w-3" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
