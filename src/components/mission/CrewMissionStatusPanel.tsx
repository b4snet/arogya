import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ClipboardCheck,
  Compass,
  HeartPulse,
  Minus,
  Timer,
  Wind,
} from 'lucide-react';
import type { Alert, Astronaut, CheckIn } from '../../types';
import type { MissionPhaseTimelineItem } from '../../engine/missionPhases';
import {
  buildSimulatedVitalsSummary,
  formatSimulatedElapsed,
  summarizeCheckInAdherence,
  type SimulatedVitalsSummary,
  type TrendSummary,
} from '../../engine/missionStatus';
import {
  getSimulationScenario,
} from '../../utils/simulatedTelemetry';
import type { ObservationWindowDays } from '../../utils/observationWindow';
import { useSimulatedTelemetryStore } from '../../store/useSimulatedTelemetryStore';
import type { SimulationStatus } from '../../store/useSimulatedTelemetryStore';
import { AstronautAvatar, Card, CardHeader } from '../ui';
import { MissionSourceBadge } from './MissionSourceBadge';

const SIMULATION_STATUS_META: Record<
  SimulationStatus,
  { label: string; detail: string; className: string }
> = {
  idle: {
    label: 'No active session',
    detail: 'The scenario below is the next available selection.',
    className: 'border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] text-[var(--arogya-text-secondary)]',
  },
  running: {
    label: 'Running',
    detail: 'Sampling once per simulated second in this browser tab.',
    className: 'border-[#B45309]/30 bg-[#FFFBEB] text-[#92400E]',
  },
  paused: {
    label: 'Paused',
    detail: 'No samples accumulate while paused; the buffer is retained.',
    className: 'border-[#CA8A04]/30 bg-[#FFFBEB] text-[#92400E]',
  },
  completed: {
    label: 'Completed',
    detail: 'The selected simulated duration was reached; the buffer is retained.',
    className: 'border-[#1E3A5F]/25 bg-[#EFF6FF] text-[#1E3A5F]',
  },
};

const ADHERENCE_WINDOWS: ObservationWindowDays[] = [7, 14, 30];

function TrendBadge({ trend, metric }: { trend: TrendSummary; metric: string }) {
  if (trend.direction === 'insufficient') {
    return (
      <span className="text-[10px] font-medium text-[var(--arogya-text-muted)]">
        Not enough samples for a trend
      </span>
    );
  }

  const Icon =
    trend.direction === 'rising' ? ArrowUpRight : trend.direction === 'falling' ? ArrowDownRight : Minus;

  return (
    <span
      aria-label={`Simulated ${metric} trend: ${trend.label}`}
      className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--arogya-text-secondary)]"
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      <span>{trend.label}</span>
    </span>
  );
}

function StatusTile({
  label,
  value,
  detail,
  source,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  source: 'simulated' | 'recorded';
  icon: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--arogya-text-secondary)]">
          {icon}
          <span>{label}</span>
        </p>
        <MissionSourceBadge source={source} />
      </div>
      <p className="mt-1.5 break-words text-sm font-semibold text-[var(--arogya-text-primary)]">{value}</p>
      <p className="mt-0.5 break-words text-[11px] leading-relaxed text-[var(--arogya-text-muted)]">{detail}</p>
    </div>
  );
}

function VitalTile({
  label,
  value,
  unit,
  detail,
  trend,
  metric,
  icon,
}: {
  label: string;
  value: string;
  unit: string;
  detail?: string;
  trend: TrendSummary;
  metric: string;
  icon: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-[#B45309]/25 bg-[#FFFBEB] p-3">
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-[#78350F]">
          {icon}
          <span>{label}</span>
        </p>
        <MissionSourceBadge source="simulated" />
      </div>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-1">
        <span className="font-mono-tabular text-xl font-bold tracking-tight text-[#78350F]">{value}</span>
        <span className="text-[11px] font-medium text-[#92400E]">{unit}</span>
      </div>
      <div className="mt-1">
        <TrendBadge trend={trend} metric={metric} />
      </div>
      {detail && (
        <p className="mt-1 break-words text-[10px] leading-relaxed text-[#92400E]">{detail}</p>
      )}
    </div>
  );
}

function VitalsGrid({ summary }: { summary: SimulatedVitalsSummary }) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
      <VitalTile
        label="Heart rate"
        value={summary.heartRateBpm == null ? '—' : String(summary.heartRateBpm)}
        unit="bpm"
        trend={summary.heartRateTrend}
        metric="heart rate"
        icon={<HeartPulse className="h-3.5 w-3.5" aria-hidden="true" />}
      />
      <VitalTile
        label="SpO₂"
        value={summary.spo2Percent == null ? '—' : summary.spo2Percent.toFixed(1)}
        unit="%"
        trend={summary.spo2Trend}
        metric="oxygen saturation"
        icon={<Wind className="h-3.5 w-3.5" aria-hidden="true" />}
      />
      <VitalTile
        label="Blood pressure"
        value={
          summary.systolicBpMmHg == null || summary.diastolicBpMmHg == null
            ? '—'
            : `${summary.systolicBpMmHg}/${summary.diastolicBpMmHg}`
        }
        unit="mmHg"
        trend={summary.bloodPressureTrend}
        metric="blood pressure"
        icon={<Activity className="h-3.5 w-3.5" aria-hidden="true" />}
        detail={
          summary.systolicBpMmHg == null
            ? 'Awaiting the first intermittent cuff sample.'
            : 'Intermittent cuff sample; not a continuous measurement.'
        }
      />
    </div>
  );
}

export function CrewMissionStatusPanel({
  astronaut,
  missionDay,
  transitDurationDays,
  currentPhase,
  checkIns,
  alerts,
}: {
  astronaut: Astronaut;
  missionDay: number;
  transitDurationDays: number;
  currentPhase: MissionPhaseTimelineItem;
  checkIns: CheckIn[];
  alerts: Alert[];
}) {
  const [adherenceWindow, setAdherenceWindow] = useState<ObservationWindowDays>(7);

  const points = useSimulatedTelemetryStore((state) => state.points);
  const bpSamples = useSimulatedTelemetryStore((state) => state.bpSamples);
  const scenario = useSimulatedTelemetryStore((state) => state.scenario);
  const status = useSimulatedTelemetryStore((state) => state.status);
  const simulationAstronautId = useSimulatedTelemetryStore((state) => state.astronautId);

  const scenarioDefinition = getSimulationScenario(scenario);
  const statusMeta = SIMULATION_STATUS_META[status];
  const summary = useMemo(
    () => buildSimulatedVitalsSummary(points, bpSamples),
    [points, bpSamples]
  );
  const adherence = useMemo(
    () => summarizeCheckInAdherence(checkIns, missionDay, adherenceWindow),
    [checkIns, missionDay, adherenceWindow]
  );

  const hasOwnSession = simulationAstronautId === astronaut.id && points.length > 0;
  const sessionBelongsToOtherCrew =
    simulationAstronautId !== null && simulationAstronautId !== astronaut.id;
  const hasUnassignedSession = simulationAstronautId === null && points.length > 0;
  const isAnomalyScenario = scenario === 'synthetic_anomaly';
  const statusView = sessionBelongsToOtherCrew
    ? {
        label: 'Other crew session',
        detail:
          'A simulation session is attached to a different crew profile; these values are withheld.',
        className:
          'border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] text-[var(--arogya-text-secondary)]',
      }
    : hasUnassignedSession
    ? {
        label: 'Unassigned session',
        detail:
          'A simulation stream has no crew assignment; these values are withheld until it is assigned.',
        className:
          'border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] text-[var(--arogya-text-secondary)]',
      }
    : statusMeta;

  return (
    <Card padding="md" className="min-w-0 space-y-5">
      <CardHeader
        title="Crew Mission Status"
        subtitle="Selected crew member, simulated scenario, and recorded adherence"
        action={
          <span
            role="status"
            aria-live="polite"
            data-simulation-state={status}
            className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusView.className}`}
          >
            {statusView.label}
          </span>
        }
      />

      <div className="flex flex-col gap-3 rounded-xl border border-[var(--arogya-border)] bg-[var(--arogya-bg)] p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <AstronautAvatar
            astronautId={astronaut.id}
            fullName={astronaut.fullName}
            size="md"
            active
          />
          <div className="min-w-0">
            <p className="break-words text-sm font-semibold text-[var(--arogya-text-primary)]">
              {astronaut.fullName}
            </p>
            <p className="break-words text-xs text-[var(--arogya-text-secondary)]">
              {astronaut.callSign} · {astronaut.role}
            </p>
          </div>
        </div>
        <span className="self-start rounded-full border border-[var(--arogya-border-strong)] bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--arogya-text-secondary)] sm:self-center">
          Selected crew
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatusTile
          label="Current mission phase"
          value={currentPhase.label}
          detail={`${currentPhase.elapsedLabel}. Simulated transit scope only.`}
          source="simulated"
          icon={<Compass className="h-3.5 w-3.5" aria-hidden="true" />}
        />
        <StatusTile
          label="Simulation scenario"
          value={scenarioDefinition.label}
          detail={statusView.detail}
          source="simulated"
          icon={<Activity className="h-3.5 w-3.5" aria-hidden="true" />}
        />
        <StatusTile
          label="Mission day"
          value={`Day ${missionDay} of ${transitDurationDays}`}
          detail="Simulated outbound transit; the wider mission profile is planned context."
          source="simulated"
          icon={<CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />}
        />
        <StatusTile
          label="Elapsed simulated time"
          value={hasOwnSession ? formatSimulatedElapsed(summary.elapsedSeconds) : '—'}
          detail={
            hasOwnSession
              ? 'Elapsed time in the current in-memory session.'
              : 'No simulation session is attached to this crew profile.'
          }
          source="simulated"
          icon={<Timer className="h-3.5 w-3.5" aria-hidden="true" />}
        />
      </div>

      {hasOwnSession && isAnomalyScenario && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-2 rounded-lg border border-[#CA8A04]/30 bg-[#FFFBEB] px-3 py-2 text-xs text-[#92400E]"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            Synthetic anomaly scenario active — an interface test, not a clinical alarm.
          </span>
          <MissionSourceBadge source="simulated" />
        </div>
      )}

      <div className="space-y-3 border-t border-[var(--arogya-border)] pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--arogya-text-secondary)]">
            Latest simulated vitals
          </h3>
          <MissionSourceBadge source="simulated" />
        </div>

        {hasOwnSession ? (
          <VitalsGrid summary={summary} />
        ) : (
          <div className="rounded-lg border border-dashed border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] p-3 text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
            {sessionBelongsToOtherCrew ? (
              <p>
                A simulation session belongs to another crew profile. Values are withheld so
                simulation streams are not mixed between astronauts.
              </p>
            ) : hasUnassignedSession ? (
              <p>
                A simulation stream has no crew assignment. Values are withheld until a crew
                profile owns the session.
              </p>
            ) : (
              <p>
                No simulation session is active for this crew profile. Start one from the{' '}
                <Link
                  to="/"
                  className="font-semibold text-[var(--arogya-info)] underline decoration-[var(--arogya-info)]/40 underline-offset-2 hover:decoration-[var(--arogya-info)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F] focus-visible:ring-offset-2 rounded-sm"
                >
                  Dashboard simulation controls
                </Link>
                .
              </p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 border-t border-[var(--arogya-border)] pt-4 sm:grid-cols-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--arogya-text-secondary)]">
              Active alerts
            </h3>
            <MissionSourceBadge source="recorded" />
          </div>
          {alerts.length === 0 ? (
            <p className="mt-2 text-xs text-[var(--arogya-text-secondary)]">
              No active recorded assessment flags.
            </p>
          ) : (
            <>
              <ul className="mt-2 space-y-2">
                {alerts.slice(0, 3).map((alert) => (
                  <li
                    key={alert.id}
                    className="rounded-lg border border-[var(--arogya-caution-border)] bg-[var(--arogya-caution-soft)] px-2.5 py-2"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-1.5">
                      <span className="min-w-0 break-words text-[11px] font-semibold text-[var(--arogya-caution-text)]">
                        {alert.title}
                      </span>
                      <span className="font-mono-tabular text-[10px] uppercase text-[var(--arogya-caution-text)]">
                        {alert.severity}
                      </span>
                    </div>
                    <p className="mt-0.5 break-words text-[10px] leading-relaxed text-[var(--arogya-text-secondary)]">
                      {alert.rationale}
                    </p>
                  </li>
                ))}
              </ul>
              {alerts.length > 3 && (
                <p className="mt-2 text-[10px] text-[var(--arogya-text-muted)]">
                  {alerts.length - 3} more recorded flag{alerts.length - 3 === 1 ? '' : 's'} in{' '}
                  <Link
                    to="/reports"
                    className="font-semibold text-[var(--arogya-info)] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F] focus-visible:ring-offset-2 rounded-sm"
                  >
                    Reports
                  </Link>
                  .
                </p>
              )}
            </>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--arogya-text-secondary)]">
              Check-in adherence
            </h3>
            <MissionSourceBadge source="recorded" />
          </div>

          <div
            role="group"
            aria-label="Check-in adherence period"
            className="mt-2 inline-flex items-center gap-1 rounded-lg border border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] p-1"
          >
            {ADHERENCE_WINDOWS.map((days) => {
              const active = adherenceWindow === days;
              return (
                <button
                  key={days}
                  type="button"
                  onClick={() => setAdherenceWindow(days)}
                  aria-pressed={active}
                  className={`min-h-[32px] rounded-md px-2.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F] focus-visible:ring-offset-2 ${
                    active
                      ? 'bg-[#1E3A5F] text-white'
                      : 'text-[var(--arogya-text-secondary)] hover:text-[var(--arogya-text-primary)]'
                  }`}
                >
                  {days}d
                </button>
              );
            })}
          </div>

          <p className="mt-2 break-words text-xs font-semibold text-[var(--arogya-text-primary)]">
            {adherence.label}
          </p>
          <p className="mt-0.5 break-words text-[10px] leading-relaxed text-[var(--arogya-text-muted)]">
            Mission day {adherence.windowStartDay}
            {adherence.windowStartDay === adherence.windowEndDay
              ? ''
              : `–${adherence.windowEndDay}`}
            . Recorded check-ins are browser-local.
          </p>
          <Link
            to="/check-in"
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--arogya-info)] underline decoration-[var(--arogya-info)]/40 underline-offset-2 hover:decoration-[var(--arogya-info)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F] focus-visible:ring-offset-2 rounded-sm"
          >
            <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Open Check-In
          </Link>
        </div>
      </div>

      <p
        role="note"
        className="border-t border-[var(--arogya-border)] pt-3 text-[10px] leading-relaxed text-[var(--arogya-text-muted)]"
      >
        Simulated values are in-memory demonstrations and never enter recorded vitals, reports,
        or Drive exports. Recorded check-ins and flags are browser-local. This panel does not imply
        live astronaut monitoring, real sensors, or diagnosis.
      </p>
    </Card>
  );
}
