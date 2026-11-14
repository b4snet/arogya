import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Activity, RotateCcw } from 'lucide-react';
import { useActiveAssessment } from '../hooks/useActiveAssessment';
import { useArogyaStore } from '../store/useArogyaStore';
import { Button, EmptyState } from '../components/ui';
import { VideoBackground } from '../components/dashboard/VideoBackground';
import { AstronautSelector } from '../components/dashboard/AstronautSelector';
import { HealthReadinessCard } from '../components/dashboard/HealthReadinessCard';
import { ActiveAlerts } from '../components/dashboard/ActiveAlerts';
import { NextBestAction } from '../components/dashboard/NextBestAction';
import { MissionProgressWidget } from '../components/dashboard/MissionProgressWidget';
import {
  CheckInStatusCard,
  MiniTrendGrid,
} from '../components/dashboard/DashboardWidgets';
import { DashboardVitalsChart } from '../components/dashboard/DashboardVitalsChart';

const Small3DAstronautPreview = lazy(() =>
  import('../components/dashboard/Small3DAstronautPreview').then((module) => ({
    default: module.Small3DAstronautPreview,
  }))
);

export function DashboardPage() {
  const { astronaut, mission, vitals14d, checkIns14d, assessment } =
    useActiveAssessment();
  const resetDemoData = useArogyaStore((s) => s.resetDemoData);

  const latestCheckIn = checkIns14d[checkIns14d.length - 1];
  const latestVital = vitals14d[vitals14d.length - 1];
  const hasNoCrewData = checkIns14d.length === 0 && vitals14d.length === 0;

  return (
    <div className="relative min-h-full">
      {/* Muted, lazy-loaded, reduced-motion-safe video background only on Dashboard */}
      <VideoBackground />

      <div className="relative z-10 mx-auto max-w-[1600px] space-y-5 p-4 sm:p-6">
        {/* Crew Selector & Demo Mission Reset */}
        <AstronautSelector id="dashboard-crew-selector" variant="bar" showDemoReset />

        {hasNoCrewData && (
          <EmptyState
            icon={<Activity className="h-5 w-5" />}
            title={`No Check-In or Vitals Logged Yet for ${astronaut.fullName}`}
            description="Start a quick daily crew check-in or load the simulated 14-day demo mission dataset to inspect health trends, alerts, and 3D organ surveillance."
            action={
              <Link
                to="/check-in"
                className="inline-flex min-h-[40px] items-center rounded-lg bg-[#22D3EE] px-4 text-xs font-semibold text-[#060B14] transition-colors hover:bg-[#38BDF8]"
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

        {/* Main 3-Column Mission-Control Grid (360px priority-first -> 1280px+ 3-col) */}
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
          {/* Left Column: Crew Identity + Overall Readiness Score, Active Alerts, Next Best Action */}
          <div className="order-1 space-y-4 xl:col-span-4">
            <HealthReadinessCard assessment={assessment} astronaut={astronaut} />
            <ActiveAlerts assessment={assessment} />
            <NextBestAction assessment={assessment} />
          </div>

          {/* Center Column: Compact Interactive 3D Astronaut Preview (ordered after check-in on mobile) */}
          <div className="order-3 xl:order-2 xl:col-span-4">
            <Suspense
              fallback={
                <div
                  className="h-[310px] rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface)] sm:h-[340px] xl:h-[370px]"
                  role="status"
                  aria-label="Loading astronaut preview"
                />
              }
            >
              <Small3DAstronautPreview
                status={assessment.overallStatus}
                astronautName={astronaut.fullName}
              />
            </Suspense>
          </div>

          {/* Right Column: Today's Check-In Status + Daily Indicator Summaries */}
          <div className="order-2 space-y-4 xl:order-3 xl:col-span-4">
            <CheckInStatusCard
              latestCheckIn={latestCheckIn}
              missionDay={mission.currentDay}
            />
            <MiniTrendGrid
              vitals14d={vitals14d}
              checkIns14d={checkIns14d}
              astronaut={astronaut}
            />
          </div>
        </div>

        {/* Bottom Row: 14-Day Trend Chart & Mission Progress */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <DashboardVitalsChart vitals14d={vitals14d} />
          </div>
          <div className="xl:col-span-5">
            <MissionProgressWidget
              mission={mission}
              astronaut={astronaut}
              latestVital={latestVital}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
