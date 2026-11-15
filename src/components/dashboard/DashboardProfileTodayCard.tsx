import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ClipboardCheck, FileText } from 'lucide-react';
import type { Astronaut, CheckIn, HealthAssessment } from '../../types';
import { AstronautAvatar } from '../ui/AstronautAvatar';
import { StatusPill, healthStatusToTone } from '../ui/StatusPill';
import { STATUS_META } from '../../engine/thresholds';

interface DashboardProfileTodayCardProps {
  astronaut: Astronaut;
  assessment: HealthAssessment;
  latestCheckIn?: CheckIn;
  missionDay: number;
}

export function DashboardProfileTodayCard({
  astronaut,
  assessment,
  latestCheckIn,
  missionDay,
}: DashboardProfileTodayCardProps) {
  const isCheckedInToday = latestCheckIn?.missionDay === missionDay;
  const tone = healthStatusToTone(assessment.overallStatus);

  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-[var(--arogya-border)] bg-white p-4 shadow-sm sm:p-5">
      {/* Astronaut Profile Section */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--arogya-border)] pb-3">
        <div className="flex items-center gap-3">
          <AstronautAvatar
            astronautId={astronaut.id}
            fullName={astronaut.fullName}
            status={assessment.overallStatus}
            size="md"
            active
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold tracking-wide text-[var(--arogya-text-primary)]">
                {astronaut.fullName}
              </h3>
              <span className="rounded bg-[var(--arogya-bg)] px-1.5 py-0.5 font-mono-tabular text-[10px] text-[var(--arogya-text-muted)]">
                {astronaut.id}
              </span>
            </div>
            <p className="text-[11px] text-[var(--arogya-text-secondary)]">
              {astronaut.role} · Call Sign {astronaut.callSign}
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-[var(--arogya-text-muted)]">Readiness Index</p>
          <div className="flex items-center justify-end gap-1.5">
            <span className="font-mono-tabular text-xl font-bold text-[var(--arogya-text-primary)]">
              {assessment.overallReadinessScore}
            </span>
            <span className="text-xs text-[var(--arogya-text-muted)]">/ 100</span>
            <StatusPill tone={tone} label={STATUS_META[assessment.overallStatus].shortLabel} />
          </div>
        </div>
      </div>

      {/* Today's Check-In Status & Actions */}
      <div className="mt-3 space-y-3">
        <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--arogya-border)] bg-[var(--arogya-bg)] p-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                isCheckedInToday ? 'bg-[#16A34A]/12 text-[#16A34A]' : 'bg-[#CA8A04]/12 text-[#CA8A04]'
              }`}
            >
              {isCheckedInToday ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <ClipboardCheck className="h-4 w-4" />
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--arogya-text-primary)]">
                {isCheckedInToday
                  ? `Sol ${missionDay} Check-In Complete`
                  : `Sol ${missionDay} Check-In Pending`}
              </p>
              <p className="text-[11px] text-[var(--arogya-text-secondary)]">
                {isCheckedInToday
                  ? "Daily behavioral & recovery log recorded."
                  : "Record mood, fatigue, sleep & hydration."}
              </p>
            </div>
          </div>

          <Link
            to="/check-in"
            className="inline-flex min-h-[36px] items-center gap-1 rounded-lg bg-[#1E3A5F] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#2D4A6F]"
          >
            <span>{isCheckedInToday ? 'Update' : 'Start Check-In'}</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Next Best Action Brief */}
        <div className="flex items-center justify-between gap-3 text-xs">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-[#1E3A5F] font-semibold">Next Recommended Step</p>
            <p className="truncate text-xs font-medium text-[var(--arogya-text-primary)]">
              {assessment.nextBestAction}
            </p>
          </div>
          <Link
            to="/reports"
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[var(--arogya-border)] bg-white px-2.5 py-1 text-xs text-[var(--arogya-text-secondary)] transition-colors hover:border-[#1E3A5F]/40 hover:text-[#1E3A5F]"
          >
            <FileText className="h-3 w-3 text-[#1E3A5F]" />
            <span>Reports</span>
          </Link>
        </div>
      </div>

      <div className="mt-3 border-t border-[var(--arogya-border)] pt-2 text-[10px] text-[var(--arogya-text-muted)]">
        Demo readiness index — not clinical clearance. Values derived from simulated cruise logs.
      </div>
    </div>
  );
}
