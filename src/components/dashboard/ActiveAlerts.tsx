import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { HealthAssessment } from '../../types';
import { Card, CardHeader, EmptyState, StatusPill, healthStatusToTone } from '../ui';

interface ActiveAlertsProps {
  assessment: HealthAssessment;
}

export function ActiveAlerts({ assessment }: ActiveAlertsProps) {
  return (
    <Card padding="md">
      <CardHeader
        title="Active Alerts"
        action={
          <span className="font-mono-tabular text-xs text-[var(--arogya-text-secondary)]">
            {assessment.alerts.length} active
          </span>
        }
      />

      {assessment.escalationRequired && (
        <div
          role="alert"
          className="mt-3 space-y-2.5 rounded-lg border border-[#EF4444]/50 bg-[#EF4444]/12 p-3 text-xs text-[#FCA5A5]"
        >
          <p className="font-semibold text-[#F87171]">Medical Escalation Flagged</p>
          <p className="leading-relaxed text-[var(--arogya-text-primary)]">
            {assessment.escalationReasons[0] ??
              'Contact the crew medical officer or flight surgeon immediately.'}
          </p>
          <Link
            to="/reports?escalate=1"
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#EF4444] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#DC2626]"
          >
            <span>Contact Crew Medical Lead / Escalation Brief</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      )}

      {assessment.alerts.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            compact
            icon={<CheckCircle2 className="h-5 w-5 text-[#22C55E]" />}
            title="All Systems Within Baseline"
            description={`No physiological or behavioral threshold alerts triggered on Mission Day ${assessment.missionDay}.`}
          />
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-[var(--arogya-border)] border-t border-[var(--arogya-border)]">
          {assessment.alerts.slice(0, 3).map((alert) => {
            const tone = healthStatusToTone(alert.severity);
            return (
              <li key={alert.id} className="py-3 first:pt-3 last:pb-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <ShieldAlert
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        alert.severity === 'red'
                          ? 'text-[#EF4444]'
                          : alert.severity === 'orange'
                          ? 'text-[#F97316]'
                          : 'text-[#EAB308]'
                      }`}
                      aria-hidden="true"
                    />
                    <span className="text-xs font-semibold leading-snug text-[var(--arogya-text-primary)]">
                      {alert.title}
                    </span>
                  </div>
                  <StatusPill tone={tone} />
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
                  {alert.rationale}
                </p>
                <div className="mt-1.5 flex justify-end">
                  <Link
                    to={`/atlas?organ=${alert.organTarget}`}
                    className="inline-flex min-h-[40px] items-center gap-1 rounded-md px-2 text-xs font-medium text-[#22D3EE] transition-colors hover:bg-white/5 hover:text-[#38BDF8]"
                  >
                    <span>Inspect in 3D Atlas</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-[var(--arogya-border)] pt-2.5 text-xs">
        <span className="text-[var(--arogya-text-secondary)]">Need medical review?</span>
        <Link
          to={assessment.escalationRequired ? '/reports?escalate=1' : '/reports'}
          className="inline-flex min-h-[40px] items-center gap-1 font-medium text-[#22D3EE] hover:text-[#38BDF8]"
        >
          <span>Crew Medical Lead / Flight Surgeon Brief</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </Card>
  );
}
