import { Brain, HeartPulse, User, Wind, type LucideIcon } from 'lucide-react';
import type { HealthAssessment, OrganTarget } from '../../types';
import { STATUS_META } from '../../engine/thresholds';
import { getOrganSelectorStatus } from '../../engine/atlasPanelBuilder';
import { Card, CardHeader, StatusPill, healthStatusToTone } from '../ui';

const ORGANS: Array<{
  organ: OrganTarget;
  label: string;
  system: 'behavioral' | 'cardiovascular' | 'respiratory' | null;
  icon: LucideIcon;
  context: string;
}> = [
  {
    organ: 'brain',
    label: 'Brain & behavior',
    system: 'behavioral',
    icon: Brain,
    context: 'Sleep, mood, stress, and cognitive load recorded from daily check-ins.',
  },
  {
    organ: 'heart',
    label: 'Heart & circulation',
    system: 'cardiovascular',
    icon: HeartPulse,
    context: 'Resting heart rate and blood pressure against pre-flight baselines.',
  },
  {
    organ: 'lungs',
    label: 'Lungs & respiration',
    system: 'respiratory',
    icon: Wind,
    context: 'Oxygen saturation and respiratory rate in the closed-loop cabin.',
  },
  {
    organ: 'full_body',
    label: 'Full-body readiness',
    system: null,
    icon: User,
    context: 'Combined view across all eight monitored systems and hazards.',
  },
];

export function OrganContextCard({ assessment }: { assessment: HealthAssessment }) {
  return (
    <Card padding="md" className="space-y-3">
      <CardHeader
        title="Organ & body-system context"
        subtitle="Illustrative mapping of recorded signals. Not an organ diagnosis."
      />

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {ORGANS.map(({ organ, label, system, icon: Icon, context }) => {
          const status = getOrganSelectorStatus(organ, assessment);
          return (
            <li
              key={organ}
              className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-subtle)] p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-semibold text-[var(--arogya-text-primary)]">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--arogya-info)]" aria-hidden="true" />
                  <span className="truncate">{label}</span>
                </span>
                <StatusPill
                  tone={healthStatusToTone(status)}
                  label={STATUS_META[status].shortLabel}
                  size="sm"
                />
              </div>
              <p className="line-clamp-3 text-[11px] leading-relaxed text-[var(--arogya-text-secondary)]">
                {system ? assessment.systems[system].plainLanguageSummary : context}
              </p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
