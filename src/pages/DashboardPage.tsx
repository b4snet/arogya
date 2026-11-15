import { lazy, Suspense, useState } from 'react';
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
import { useSimulatedTelemetryStore } from '../store/useSimulatedTelemetryStore';
import { Button, EmptyState } from '../components/ui';
import { VideoBackground } from '../components/dashboard/VideoBackground';
import { BackdropMotionControl } from '../components/dashboard/BackdropMotionControl';
import { DashboardMetricGrid } from '../components/dashboard/DashboardMetricGrid';
import { DashboardMissionStrip } from '../components/dashboard/DashboardMissionStrip';
import { DashboardVitalsOverview } from '../components/dashboard/DashboardVitalsOverview';
import { DashboardProfileTodayCard } from '../components/dashboard/DashboardProfileTodayCard';
import { SimulatedTelemetryPanel } from '../components/dashboard/SimulatedTelemetryPanel';
import { SimulatedTelemetryChart } from '../components/dashboard/SimulatedTelemetryChart';

const Small3DAstronautPreview = lazy(() =>
  import('../components/dashboard/Small3DAstronautPreview').then((module) => ({
    default: module.Small3DAstronautPreview,
  }))
);

type DashboardDataMode = 'recorded' | 'simulated';

const DATA_MODE_OPTIONS: Array<{ id: DashboardDataMode; label: string; hint: string }> = [
  {
    id: 'recorded',
    label: 'Recorded observations',
    hint: 'Historical readings stored in the mission record',
  },
  {
    id: 'simulated',
    label: 'Simulated live demonstration',
    hint: 'Seeded, bounded demonstration stream — not patient measurements',
  },
];

export function DashboardPage() {
  const { astronaut, mission, vitals14d, checkIns14d, assessment } = useActiveAssessment();
  const resetDemoData = useArogyaStore((s) => s.resetDemoData);
  const simulatedPoints = useSimulatedTelemetryStore((s) => s.points);

  const [alertsTrayOpen, setAlertsTrayOpen] = useState(false);
  const [dataMode, setDataMode] = useState<DashboardDataMode>('recorded');

  const latestCheckIn = checkIns14d[checkIns14d.length - 1];
  const latestVital = vitals14d[vitals14d.length - 1];
  const hasNoCrewData = checkIns14d.length === 0 && vitals14d.length === 0;

  const activeMode = DATA_MODE_OPTIONS.find((option) => option.id === dataMode)!;

  return (
    <div className="relative min-h-full">
      {/* Page-wide space backdrop, veiled towards white — one video for the whole content area */}
      <VideoBackground />

      {/* Main Dashboard Content Grid Container */}
      <div className="relative z-10 mx-auto max-w-[1680px] space-y-4 p-3.5 sm:p-5 lg:p-6">
        {/* Urgent Medical Escalation Banner (always prominent when red/orange alert triggered) */}
        {assessment.escalationRequired && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-2xl border border-[#DC2626]/40 bg-[#FEF2F2] p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#DC2626]" aria-hidden="true" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#DC2626]">
                  Urgent Clinical Escalation Flagged
                </p>
                <p className="mt-0.5 text-xs text-[var(--arogya-text-secondary)] sm:text-sm">
                  {assessment.escalationReasons[0] ??
                    'Physiological deviation exceeds autonomous safety boundaries. Notify Crew Medical Lead.'}
                </p>
              </div>
            </div>

            <Link
              to="/reports?escalate=1"
              className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#DC2626] px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#B91C1C]"
            >
              <span>Open Escalation SBAR Brief</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        )}

        {/* Data mode: recorded observations vs. an explicitly simulated demonstration */}
        <div className="flex flex-col gap-2 rounded-2xl border border-[var(--arogya-border)] bg-white px-3.5 py-2.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--arogya-text-secondary)]">
              Dashboard data mode
            </p>
            <p className="text-[11px] text-[var(--arogya-text-muted)]">{activeMode.hint}</p>
          </div>

          <div
            role="group"
            aria-label="Dashboard data mode"
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] p-1"
          >
            {DATA_MODE_OPTIONS.map((option) => {
              const active = dataMode === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setDataMode(option.id)}
                  aria-pressed={active}
                  className={`min-h-[36px] whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? 'bg-[#1E3A5F] text-white'
                      : 'text-[var(--arogya-text-secondary)] hover:text-[var(--arogya-text-primary)]'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Empty state fallback when astronaut has zero recorded check-in/vitals data */}
        {hasNoCrewData && (
          <EmptyState
            icon={<Activity className="h-5 w-5" />}
            title={`No Check-In or Vitals Logged Yet for ${astronaut.fullName}`}
            description="Start a quick daily crew check-in or load the simulated 14-day demo mission dataset to inspect health trends, alerts, and longitudinal vitals."
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

        {/* Active Alerts Compact Tray (accessible toggle when non-critical alerts exist) */}
        {assessment.alerts.length > 0 && !assessment.escalationRequired && (
          <div className="rounded-2xl border border-[#CA8A04]/25 bg-[#FFFBEB] px-4 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[#CA8A04]" aria-hidden="true" />
                <span className="text-xs font-medium text-[#92400E]">
                  {assessment.alerts.length} System Observation{assessment.alerts.length === 1 ? '' : 's'} Active:
                </span>
                <span className="hidden truncate text-xs text-[var(--arogya-text-secondary)] sm:inline">
                  {assessment.alerts[0].title}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAlertsTrayOpen((prev) => !prev)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#1E3A5F] hover:text-[var(--arogya-text-primary)]"
              >
                <span>{alertsTrayOpen ? 'Hide Findings' : 'View Findings'}</span>
                {alertsTrayOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>

            {alertsTrayOpen && (
              <ul className="mt-3 divide-y divide-[var(--arogya-border)] border-t border-[var(--arogya-border)] pt-2 text-xs">
                {assessment.alerts.map((al) => (
                  <li key={al.id} className="py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[var(--arogya-text-primary)]">{al.title}</span>
                      <span className="font-mono-tabular text-[10px] uppercase text-[#CA8A04]">
                        {al.severity}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[var(--arogya-text-secondary)]">{al.rationale}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* MAIN HERO AREA: Two Columns
            LEFT: 3D astronaut scene (borderless, over the page backdrop with a local dark scrim)
            RIGHT: metric cards (recorded or simulated) + Mission Strip */}
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-5">
          <div className="order-2 flex lg:order-1 lg:col-span-5 xl:col-span-6">
            {/* Borderless and background-less: the astronaut floats straight on the page backdrop. */}
            <div className="relative flex w-full flex-col">
              <div className="relative z-10 flex flex-1 flex-col">
                <Suspense
                  fallback={
                    <div
                      className="flex h-[420px] items-center justify-center text-xs text-slate-200 sm:h-[500px] xl:h-[560px]"
                      role="status"
                      aria-label="Loading astronaut 3D model"
                    >
                      Loading 3D EVA Astronaut...
                    </div>
                  }
                >
                  <Small3DAstronautPreview
                    status={assessment.overallStatus}
                    astronautName={astronaut.fullName}
                  />
                </Suspense>
              </div>

              <div className="absolute bottom-3 right-3 z-20 hidden sm:block">
                <BackdropMotionControl />
              </div>
            </div>
          </div>

          {/* Main Hero Right: metric cards + Mission Time Strip */}
          <div className="order-1 space-y-4 lg:order-2 lg:col-span-7 xl:col-span-6">
            {dataMode === 'recorded' ? (
              <DashboardMetricGrid
                astronaut={astronaut}
                latestVital={latestVital}
                latestCheckIn={latestCheckIn}
                vitalsWindow={vitals14d}
                checkInsWindow={checkIns14d}
                missionDay={mission.currentDay}
                dataQuality={assessment.dataQuality}
              />
            ) : (
              <SimulatedTelemetryPanel astronaut={astronaut} latestCheckIn={latestCheckIn} />
            )}

            <DashboardMissionStrip mission={mission} />
          </div>
        </div>

        {/* BOTTOM ROW: Aligned Panels
            LEFT: recorded history chart or the short simulated live window
            RIGHT: Crew Profile & Today's Check-In Status */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
          <div className="lg:col-span-7 xl:col-span-7">
            {dataMode === 'recorded' ? (
              <DashboardVitalsOverview vitalsWindow={vitals14d} />
            ) : (
              <SimulatedTelemetryChart points={simulatedPoints} />
            )}
          </div>
          <div className="lg:col-span-5 xl:col-span-5">
            <DashboardProfileTodayCard
              astronaut={astronaut}
              assessment={assessment}
              latestCheckIn={latestCheckIn}
              missionDay={mission.currentDay}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
