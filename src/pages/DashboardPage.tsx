import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import { useActiveAssessment } from '../hooks/useActiveAssessment';
import { useArogyaStore } from '../store/useArogyaStore';
import { Button, EmptyState } from '../components/ui';
import { DashboardMissionStrip } from '../components/dashboard/DashboardMissionStrip';
import { DashboardProfileTodayCard } from '../components/dashboard/DashboardProfileTodayCard';
import { LiveMonitorPanel } from '../components/monitor/LiveMonitorPanel';
import { MissionMonitorScene } from '../components/three/MissionMonitorScene';

export function DashboardPage() {
  const { astronaut, mission, vitals14d, checkIns14d, assessment } = useActiveAssessment();
  const resetDemoData = useArogyaStore((s) => s.resetDemoData);

  const [alertsTrayOpen, setAlertsTrayOpen] = useState(false);

  const latestCheckIn = checkIns14d[checkIns14d.length - 1];
  const hasNoCrewData = checkIns14d.length === 0 && vitals14d.length === 0;

  return (
    <div className="mx-auto max-w-[1680px] space-y-4 p-3.5 sm:p-5 lg:p-6">
      {assessment.escalationRequired && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-[#DC2626]/40 bg-[#FEF2F2] p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#DC2626]" aria-hidden="true" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#DC2626]">
                Recorded observations exceed an escalation threshold
              </p>
              <p className="mt-0.5 text-xs text-[var(--arogya-text-secondary)] sm:text-sm">
                {assessment.escalationReasons[0] ??
                  'A recorded deviation exceeds the configured safety boundary. Notify the Crew Medical Lead.'}
              </p>
            </div>
          </div>

          <Link
            to="/reports?escalate=1"
            className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#DC2626] px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#B91C1C]"
          >
            <span>Open escalation brief</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      )}

      {hasNoCrewData && (
        <EmptyState
          icon={<Activity className="h-5 w-5" />}
          title={`No Check-In or Vitals Logged Yet for ${astronaut.fullName}`}
          description="The live monitor runs on a demonstration stream. Record a daily crew check-in or load the demo mission dataset to review recorded health trends."
          action={
            <Link
              to="/check-in"
              className="inline-flex min-h-[40px] items-center rounded-lg bg-[#1E3A5F] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#2D4A6F]"
            >
              Start Daily Check-In
            </Link>
          }
          secondaryAction={
            <Button
              type="button"
              variant="secondary"
              size="md"
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={resetDemoData}
            >
              Load Demo Mission
            </Button>
          }
        />
      )}

      {assessment.alerts.length > 0 && !assessment.escalationRequired && (
        <div className="rounded-2xl border border-[#CA8A04]/25 bg-[#FFFBEB] px-4 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-[#CA8A04]" aria-hidden="true" />
              <span className="truncate text-xs font-medium text-[#92400E]">
                {assessment.alerts.length} recorded observation
                {assessment.alerts.length === 1 ? '' : 's'} flagged
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAlertsTrayOpen((prev) => !prev)}
              className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#1E3A5F] hover:text-[var(--arogya-text-primary)]"
            >
              <span>{alertsTrayOpen ? 'Hide findings' : 'View findings'}</span>
              {alertsTrayOpen ? (
                <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
          </div>

          {alertsTrayOpen && (
            <ul className="mt-3 divide-y divide-[var(--arogya-border)] border-t border-[var(--arogya-border)] pt-2 text-xs">
              {assessment.alerts.map((alert) => (
                <li key={alert.id} className="py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[var(--arogya-text-primary)]">
                      {alert.title}
                    </span>
                    <span className="font-mono-tabular text-[10px] uppercase text-[#CA8A04]">
                      {alert.severity}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[var(--arogya-text-secondary)]">{alert.rationale}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Hero: floating astronaut paired with the live monitor */}
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <MissionMonitorScene
            status={assessment.overallStatus}
            astronautName={astronaut.fullName}
          />
        </div>

        <div className="min-w-0 lg:col-span-5">
          <LiveMonitorPanel astronaut={astronaut} latestCheckIn={latestCheckIn} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <DashboardMissionStrip mission={mission} />
        </div>
        <div className="lg:col-span-5">
          <DashboardProfileTodayCard
            astronaut={astronaut}
            assessment={assessment}
            latestCheckIn={latestCheckIn}
            missionDay={mission.currentDay}
          />
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-[var(--arogya-text-muted)]">
        The monitor above is a seeded demonstration stream: heart rate, oxygen saturation and
        intermittent cuff values are simulated for interface evaluation, never written into
        recorded observations, and never included in a medical report. Recorded observations remain
        available on Vitals and Reports.
      </p>
    </div>
  );
}
