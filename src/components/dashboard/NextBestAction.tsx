import { Link } from 'react-router-dom';
import { ArrowRight, Compass, Stethoscope } from 'lucide-react';
import type { HealthAssessment } from '../../types';
import { Card, CardHeader } from '../ui';

interface NextBestActionProps {
  assessment: HealthAssessment;
}

const PRIORITY_STYLE = {
  immediate: 'border-[#EF4444]/40 bg-[#EF4444]/12 text-[#F87171]',
  today: 'border-[#F97316]/35 bg-[#F97316]/10 text-[#FB923C]',
  monitor: 'border-[#22D3EE]/30 bg-[#22D3EE]/10 text-[#22D3EE]',
} as const;

export function NextBestAction({ assessment }: NextBestActionProps) {
  const followUpActions = assessment.prioritizedActions.slice(1, 3);

  return (
    <Card padding="md">
      <CardHeader
        title="Next Best Action"
        action={<Compass className="h-4 w-4 text-[#22D3EE]" aria-hidden="true" />}
      />

      <p className="mt-2.5 text-sm font-medium leading-relaxed text-[var(--arogya-text-primary)]">
        {assessment.nextBestAction}
      </p>

      <div className="mt-3">
        <Link
          to={assessment.escalationRequired ? '/reports?escalate=1' : '/reports'}
          className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors ${
            assessment.escalationRequired
              ? 'border-[#EF4444]/50 bg-[#EF4444]/15 text-[#FCA5A5] hover:bg-[#EF4444]/25'
              : 'border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] text-[#22D3EE] hover:border-[#22D3EE]/50'
          }`}
        >
          <Stethoscope className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            {assessment.escalationRequired
              ? 'Escalate to Crew Medical Lead / Flight Surgeon'
              : 'Prepare Crew Medical Lead SBAR Brief'}
          </span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        </Link>
      </div>

      {followUpActions.length > 0 && (
        <ul className="mt-3 space-y-2 border-t border-[var(--arogya-border)] pt-3">
          {followUpActions.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-2 text-xs text-[var(--arogya-text-secondary)]"
            >
              <span className="leading-relaxed text-[var(--arogya-text-primary)]">
                {item.title}
              </span>
              <span
                className={`shrink-0 rounded border px-1.5 py-0.5 font-mono-tabular text-[10px] uppercase ${PRIORITY_STYLE[item.priority]}`}
              >
                {item.priority}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
