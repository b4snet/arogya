import type { Astronaut, HealthAssessment } from '../../types';
import { STATUS_PILL_LABELS } from '../../engine/atlasPanelBuilder';
import { getStatusAlertMessage } from '../../content/healthContent';
import { AstronautAvatar, Card, StatusPill, healthStatusToTone } from '../ui';

interface HealthReadinessCardProps {
  assessment: HealthAssessment;
  astronaut?: Astronaut;
}

const STATUS_GUIDANCE_SURFACE = {
  green: 'border-[#22C55E]/30 bg-[#22C55E]/10 text-[#4ADE80]',
  yellow: 'border-[#EAB308]/35 bg-[#EAB308]/10 text-[#FACC15]',
  orange: 'border-[#F97316]/40 bg-[#F97316]/12 text-[#FB923C]',
  red: 'border-[#EF4444]/45 bg-[#EF4444]/15 text-[#F87171]',
} as const;

export function HealthReadinessCard({ assessment, astronaut }: HealthReadinessCardProps) {
  const tone = healthStatusToTone(assessment.overallStatus);

  return (
    <Card variant="elevated" padding="md">
      {astronaut && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--arogya-border)] pb-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <AstronautAvatar
              astronautId={astronaut.id}
              fullName={astronaut.fullName}
              status={assessment.overallStatus}
              size="md"
              active
            />
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-[var(--arogya-text-primary)]">
                {astronaut.fullName}
              </h2>
              <p className="text-xs text-[var(--arogya-text-secondary)]">
                {astronaut.role} · Call Sign {astronaut.callSign}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 font-mono-tabular text-[11px] text-[var(--arogya-text-secondary)]">
            <span>Base {astronaut.baseline.restingHeartRateBpm} bpm</span>
            <span aria-hidden="true">·</span>
            <span>Sleep {astronaut.baseline.sleepTargetHours.toFixed(1)}h</span>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--arogya-text-secondary)]">
            Overall Health Readiness
          </p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-mono-tabular text-4xl font-bold text-[var(--arogya-text-primary)]">
              {assessment.overallReadinessScore}
            </span>
            <span className="font-mono-tabular text-sm text-[var(--arogya-text-secondary)]">
              / 100
            </span>
          </div>
          <p className="mt-1 font-mono-tabular text-[11px] text-[var(--arogya-text-secondary)]">
            Telemetry completeness: {assessment.dataQuality.completenessPercent}% ({assessment.dataQuality.qualityTier})
          </p>
        </div>

        <StatusPill
          tone={tone}
          label={STATUS_PILL_LABELS[assessment.overallStatus]}
          size="md"
        />
      </div>

      <p
        className={`mt-3 rounded-lg border px-3 py-2 text-xs font-medium ${STATUS_GUIDANCE_SURFACE[assessment.overallStatus]}`}
      >
        {getStatusAlertMessage(assessment.overallStatus)}
      </p>

      {assessment.dataQuality.missingFields.length > 0 && (
        <p className="mt-2.5 rounded-md border border-[#EAB308]/30 bg-[#EAB308]/10 px-2.5 py-1.5 text-[11px] text-[#FACC15]">
          Missing data noted: {assessment.dataQuality.missingFields.join(', ')}
        </p>
      )}
    </Card>
  );
}
