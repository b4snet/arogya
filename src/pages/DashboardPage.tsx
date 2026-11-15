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
import { DashboardVideoBackdrop } from '../components/dashboard/DashboardVideoBackdrop';
import { ConsoleTelemetryGrid } from '../components/dashboard/ConsoleTelemetryGrid';
import { MissionMonitorScene } from '../components/three/MissionMonitorScene';

export function DashboardPage() {
  const { astronaut, mission, vitals14d, checkIns14d, assessment } = useActiveAssessment();
  const resetDemoData = useArogyaStore((s) => s.resetDemoData);

  const [alertsTrayOpen, setAlertsTrayOpen] = useState(false);

  const hasNoCrewData = checkIns14d.length === 0 && vitals14d.length === 0;

  return (
    <div className="relative min-h-[calc(100vh-60px)] overflow-hidden bg-[#02060f] text-slate-100">
      <DashboardVideoBackdrop />

      <div className="relative z-10 mx-auto w-full max-w-[1680px] px-3 py-3 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
        <h1 className="sr-only">Mission Health Dashboard</h1>

        <div className="mb-3 flex flex-wrap items-end justify-between gap-2 px-1">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-300/80">
              ARES-7 · Mission control
            </p>
            <p className="mt-0.5 text-lg font-semibold tracking-tight text-white sm:text-xl">
              Crew health console
            </p>
          </div>
          <p className="font-mono-tabular text-[10px] text-slate-400">
            {astronaut.callSign} · Sol {mission.currentDay} · {mission.phase}
          </p>
        </div>

        {assessment.escalationRequired && (
          <div
            role="alert"
            className="mb-3 flex flex-col gap-3 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-300" aria-hidden="true" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-red-200">
                  Logged observations exceed an escalation threshold
                </p>
                <p className="mt-0.5 text-xs text-slate-300 sm:text-sm">
                  {assessment.escalationReasons[0] ??
                    'A logged deviation exceeds the configured safety boundary. Notify the Crew Medical Lead.'}
                </p>
              </div>
            </div>

            <Link
              to="/reports?escalate=1"
              className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-red-500 px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-red-400"
            >
              <span>Open escalation brief</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        )}

        {hasNoCrewData && (
          <div className="mb-3 flex flex-col gap-3 rounded-2xl border border-sky-300/15 bg-white/[0.045] p-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Activity className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-white">
                  No check-in or vitals logged yet for {astronaut.fullName}
                </p>
                <p className="mt-0.5 text-xs text-slate-300">
                  Log a daily check-in or load the demo mission dataset to review health trends in
                  the reports.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Link
                to="/check-in"
                className="inline-flex min-h-[36px] items-center rounded-lg bg-cyan-300 px-3 text-xs font-bold text-[#03141c] transition-colors hover:bg-cyan-200"
              >
                Start check-in
              </Link>
              <button
                type="button"
                onClick={resetDemoData}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/10"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Load demo mission
              </button>
            </div>
          </div>
        )}

        {assessment.alerts.length > 0 && !assessment.escalationRequired && (
          <div className="mb-3 rounded-2xl border border-amber-300/25 bg-amber-400/10 px-4 py-2.5 backdrop-blur-md">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
                <span className="truncate text-xs font-medium text-amber-100">
                  {assessment.alerts.length} logged observation
                  {assessment.alerts.length === 1 ? '' : 's'} flagged
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAlertsTrayOpen((prev) => !prev)}
                className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-sky-200 hover:text-white"
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
              <ul className="mt-3 divide-y divide-white/10 border-t border-white/10 pt-2 text-xs">
                {assessment.alerts.map((alert) => (
                  <li key={alert.id} className="py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-white">{alert.title}</span>
                      <span className="font-mono-tabular text-[10px] uppercase text-amber-300">
                        {alert.severity}
                      </span>
                    </div>
                    <p className="mt-0.5 text-slate-300">{alert.rationale}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-stretch">
          <div className="lg:col-span-7">
            <MissionMonitorScene
              status={assessment.overallStatus}
              astronautName={astronaut.fullName}
            />
          </div>
          <div className="lg:col-span-5">
            <ConsoleTelemetryGrid astronaut={astronaut} mission={mission} />
          </div>
        </div>

        <p className="mt-3 px-1 text-[10px] leading-relaxed text-slate-500">
          Simulated mission-control demonstration. Values are generated locally for interface
          testing and are not live NASA telemetry. Arogya is an independent prototype, not made,
          reviewed, or endorsed by NASA. Readiness and health content remain educational decision
          support, not medical advice.
        </p>
      </div>
    </div>
  );
}
