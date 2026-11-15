import type { Astronaut } from '../../types';
import {
  Activity,
  AlertTriangle,
  Brain,
  CheckCircle2,
  ClipboardList,
  Clock,
  Dumbbell,
  Gauge,
  Moon,
  Pause,
  Play,
  RotateCcw,
  Timer,
} from 'lucide-react';
import {
  useSimulatedTelemetryStore,
  type SimulationSessionAudit,
  type SimulationStatus,
  type SimulationTimelineEvent,
} from '../../store/useSimulatedTelemetryStore';
import {
  SIMULATION_DURATIONS_MINUTES,
  SIMULATION_SCENARIOS,
  SIMULATION_SPEEDS,
  hashSeed,
  getSimulationScenario,
  type SimulationScenarioId,
} from '../../utils/simulatedTelemetry';

const STATUS_META: Record<SimulationStatus, { label: string; className: string }> = {
  idle: {
    label: 'Ready',
    className: 'border-slate-300 bg-slate-100 text-slate-700',
  },
  running: {
    label: 'Running',
    className: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  },
  paused: {
    label: 'Paused',
    className: 'border-amber-300 bg-amber-50 text-amber-800',
  },
  completed: {
    label: 'Complete',
    className: 'border-sky-300 bg-sky-50 text-sky-800',
  },
};

const SCENARIO_ICONS: Record<SimulationScenarioId, typeof Activity> = {
  nominal: Activity,
  exercise: Dumbbell,
  sleep: Moon,
  high_workload: Brain,
  synthetic_anomaly: AlertTriangle,
};

const SESSION_STATUS_LABEL: Record<SimulationSessionAudit['status'], string> = {
  running: 'Running',
  paused: 'Paused',
  completed: 'Complete',
  reset: 'Reset',
};

function formatSimClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatStartTime(startedAtMs: number): string {
  return new Date(startedAtMs).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function describeMarkers(session: SimulationSessionAudit): string {
  return session.events
    .slice(-6)
    .map((event) => event.label)
    .join(' → ');
}

function EventTimeline({ events }: { events: SimulationTimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-[var(--arogya-border-strong)] bg-white/60 px-3 py-4 text-xs text-[var(--arogya-text-secondary)]">
        No simulation events yet. Start a session, switch scenarios, or reset to populate the
        timeline.
      </p>
    );
  }

  return (
    <ol className="space-y-1.5" aria-label="Simulation event timeline, most recent first">
      {[...events]
        .reverse()
        .slice(0, 8)
        .map((event) => (
          <li
            key={event.id}
            className="flex items-start gap-2 rounded-md border border-[var(--arogya-border)] bg-white/80 px-2.5 py-1.5"
          >
            <span
              aria-hidden="true"
              className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                event.type === 'scenario' ? 'bg-[#B45309]' : 'bg-[#1E3A5F]'
              }`}
            />
            <time
              dateTime={event.atIso}
              className="font-mono-tabular w-10 shrink-0 text-[11px] text-[var(--arogya-text-muted)]"
            >
              {formatSimClock(event.simulatedSecond)}
            </time>
            <span className="min-w-0 text-[11px] leading-snug text-[var(--arogya-text-primary)]">
              {event.label}
            </span>
          </li>
        ))}
    </ol>
  );
}

interface MissionSimulationControlPanelProps {
  astronaut: Astronaut;
}

/**
 * Explicit control surface for the deterministic demonstration stream. Every action is
 * in-memory only; no simulated value or audit marker is written into recorded observations,
 * assessments, reports, or the bundled NASA research data.
 */
export function MissionSimulationControlPanel({
  astronaut,
}: MissionSimulationControlPanelProps) {
  const status = useSimulatedTelemetryStore((s) => s.status);
  const scenario = useSimulatedTelemetryStore((s) => s.scenario);
  const speed = useSimulatedTelemetryStore((s) => s.speed);
  const durationMinutes = useSimulatedTelemetryStore((s) => s.durationMinutes);
  const points = useSimulatedTelemetryStore((s) => s.points);
  const sessions = useSimulatedTelemetryStore((s) => s.sessions);
  const timeline = useSimulatedTelemetryStore((s) => s.timeline);
  const startedAtMs = useSimulatedTelemetryStore((s) => s.startedAtMs);

  const startSimulation = useSimulatedTelemetryStore((s) => s.startSimulation);
  const pauseSimulation = useSimulatedTelemetryStore((s) => s.pauseSimulation);
  const resumeSimulation = useSimulatedTelemetryStore((s) => s.resumeSimulation);
  const resetSimulation = useSimulatedTelemetryStore((s) => s.resetSimulation);
  const setSimulationScenario = useSimulatedTelemetryStore((s) => s.setSimulationScenario);
  const setSimulationSpeed = useSimulatedTelemetryStore((s) => s.setSimulationSpeed);
  const setSimulationDuration = useSimulatedTelemetryStore((s) => s.setSimulationDuration);

  const latest = points[points.length - 1];
  const elapsedSeconds = latest?.tick ?? 0;
  const durationSeconds = durationMinutes * 60;
  const progressPercent = Math.min(100, Math.round((elapsedSeconds / durationSeconds) * 100));
  const active = status === 'running' || status === 'paused';
  const canReset = status !== 'idle' || points.length > 0;
  const scenarioDefinition = getSimulationScenario(scenario);
  const statusMeta = STATUS_META[status];

  const handleStart = () => {
    startSimulation({
      seed: hashSeed(astronaut.id),
      baseHeartRateBpm: astronaut.baseline.restingHeartRateBpm,
      baseSpo2Percent: astronaut.baseline.spo2Percent,
      baseSystolicBpMmHg: astronaut.baseline.systolicBpMmHg,
      baseDiastolicBpMmHg: astronaut.baseline.diastolicBpMmHg,
      astronautId: astronaut.id,
    });
  };

  return (
    <section
      aria-labelledby="mission-simulation-heading"
      data-simulation-status={status}
      data-simulation-scenario={scenario}
      data-simulation-speed={speed}
      data-simulation-duration-minutes={durationMinutes}
      data-simulation-elapsed-seconds={elapsedSeconds}
      className="rounded-xl border border-[#B45309]/35 bg-[#FFFBEB] p-4 shadow-sm sm:p-5"
    >
      <div className="flex flex-col gap-3 border-b border-[#B45309]/25 pb-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#B45309]/30 bg-white text-[#B45309]">
            <Activity className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#92400E]">
              Simulated demonstration · scenario engine
            </p>
            <h2
              id="mission-simulation-heading"
              className="arogya-h2 text-[var(--arogya-text-primary)]"
            >
              Mission Simulation Control Panel
            </h2>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[#78350F]">
              <strong className="font-semibold">Training/demo only.</strong> Not live astronaut
              monitoring, real sensor telemetry, model training, or clinical validation. Simulated
              values and this audit trail are generated in this browser only and are excluded from
              recorded observations, medical reports, and the separate NASA OSD-575 research
              context.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-[#B45309]/35 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#92400E]">
            Simulated — demo only
          </span>
          <span
            role="status"
            aria-live="polite"
            className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold ${statusMeta.className}`}
          >
            {status === 'completed' ? (
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Timer className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>{statusMeta.label}</span>
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#92400E]">
              Session transport
            </p>
            <div
              role="group"
              aria-label="Simulation transport controls"
              className="mt-1.5 flex flex-wrap items-center gap-2"
            >
              <button
                type="button"
                onClick={handleStart}
                disabled={active}
                className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg bg-[#1E3A5F] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-[#2D4A6F] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Start</span>
              </button>
              <button
                type="button"
                onClick={pauseSimulation}
                disabled={status !== 'running'}
                className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg border border-[var(--arogya-border-strong)] bg-white px-3.5 text-xs font-medium text-[var(--arogya-text-primary)] transition-colors hover:bg-[var(--arogya-bg)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Pause</span>
              </button>
              <button
                type="button"
                onClick={resumeSimulation}
                disabled={status !== 'paused'}
                className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg border border-[var(--arogya-border-strong)] bg-white px-3.5 text-xs font-medium text-[var(--arogya-text-primary)] transition-colors hover:bg-[var(--arogya-bg)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Resume</span>
              </button>
              <button
                type="button"
                onClick={resetSimulation}
                disabled={!canReset}
                className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg border border-[var(--arogya-border-strong)] bg-white px-3.5 text-xs font-medium text-[var(--arogya-text-primary)] transition-colors hover:bg-[var(--arogya-bg)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          <div>
            <p
              id="simulation-scenario-label"
              className="text-[11px] font-semibold uppercase tracking-wider text-[#92400E]"
            >
              Scenario
            </p>
            <div
              role="group"
              aria-labelledby="simulation-scenario-label"
              className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2"
            >
              {SIMULATION_SCENARIOS.map((definition) => {
                const Icon = SCENARIO_ICONS[definition.id];
                const selected = scenario === definition.id;
                return (
                  <button
                    key={definition.id}
                    type="button"
                    onClick={() => setSimulationScenario(definition.id)}
                    aria-pressed={selected}
                    title={definition.description}
                    className={`flex min-h-[40px] items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                      selected
                        ? 'border-[#1E3A5F] bg-[#1E3A5F] text-white'
                        : 'border-[var(--arogya-border-strong)] bg-white text-[var(--arogya-text-primary)] hover:bg-[var(--arogya-bg)]'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="min-w-0">{definition.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-[#78350F]">
              {scenarioDefinition.description} Scenario changes are recorded in the event timeline
              and audit trail.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p
                id="simulation-speed-label"
                className="text-[11px] font-semibold uppercase tracking-wider text-[#92400E]"
              >
                Speed
              </p>
              <div
                role="group"
                aria-labelledby="simulation-speed-label"
                className="mt-1.5 flex flex-wrap items-center gap-1.5"
              >
                {SIMULATION_SPEEDS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSimulationSpeed(option)}
                    aria-pressed={speed === option}
                    className={`inline-flex min-h-[36px] min-w-[54px] items-center justify-center gap-1 rounded-lg border px-2.5 text-xs font-semibold transition-colors ${
                      speed === option
                        ? 'border-[#1E3A5F] bg-[#1E3A5F] text-white'
                        : 'border-[var(--arogya-border-strong)] bg-white text-[var(--arogya-text-primary)] hover:bg-[var(--arogya-bg)]'
                    }`}
                  >
                    <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
                    {`${option}×`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p
                id="simulation-duration-label"
                className="text-[11px] font-semibold uppercase tracking-wider text-[#92400E]"
              >
                Duration
              </p>
              <div
                role="group"
                aria-labelledby="simulation-duration-label"
                className="mt-1.5 flex flex-wrap items-center gap-1.5"
              >
                {SIMULATION_DURATIONS_MINUTES.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSimulationDuration(option)}
                    aria-pressed={durationMinutes === option}
                    className={`inline-flex min-h-[36px] min-w-[58px] items-center justify-center gap-1 rounded-lg border px-2.5 text-xs font-semibold transition-colors ${
                      durationMinutes === option
                        ? 'border-[#1E3A5F] bg-[#1E3A5F] text-white'
                        : 'border-[var(--arogya-border-strong)] bg-white text-[var(--arogya-text-primary)] hover:bg-[var(--arogya-bg)]'
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    {`${option} min`}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="text-[11px] text-[#78350F]">
            Speed changes the demonstration clock rate; duration changes apply immediately and are
            recorded. Blood pressure remains an intermittent cuff sample every 30 simulated seconds
            or on demand.
          </p>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-[#B45309]/25 bg-white/80 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#92400E]">
                  Simulated session
                </p>
                <p className="mt-0.5 text-sm font-semibold text-[var(--arogya-text-primary)]">
                  {scenarioDefinition.label} · {speed}× · {durationMinutes} min
                </p>
              </div>
              <span className="font-mono-tabular rounded-md border border-[var(--arogya-border)] bg-[var(--arogya-bg)] px-2 py-1 text-xs font-semibold text-[var(--arogya-text-primary)]">
                {formatSimClock(elapsedSeconds)} / {formatSimClock(durationSeconds)}
              </span>
            </div>

            <div
              role="progressbar"
              aria-label="Simulated session progress"
              aria-valuemin={0}
              aria-valuemax={durationSeconds}
              aria-valuenow={Math.min(elapsedSeconds, durationSeconds)}
              aria-valuetext={`${formatSimClock(elapsedSeconds)} of ${formatSimClock(
                durationSeconds
              )} simulated`}
              className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#B45309]/15"
            >
              <div
                className="h-full rounded-full bg-[#B45309]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-[var(--arogya-border)] pt-2.5 text-[11px]">
              <div>
                <dt className="text-[var(--arogya-text-muted)]">Start time</dt>
                <dd className="font-mono-tabular text-[var(--arogya-text-primary)]">
                  {startedAtMs != null ? formatStartTime(startedAtMs) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--arogya-text-muted)]">State</dt>
                <dd className="font-medium text-[var(--arogya-text-primary)]">{statusMeta.label}</dd>
              </div>
              <div>
                <dt className="text-[var(--arogya-text-muted)]">Simulated HR</dt>
                <dd className="font-mono-tabular text-[var(--arogya-text-primary)]">
                  {latest ? `${latest.heartRateBpm} bpm` : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--arogya-text-muted)]">Simulated SpO₂</dt>
                <dd className="font-mono-tabular text-[var(--arogya-text-primary)]">
                  {latest ? `${latest.spo2Percent.toFixed(1)}%` : '—'}
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#92400E]">
                Event timeline
              </p>
              <span className="text-[10px] text-[var(--arogya-text-muted)]">
                Simulated clock · latest first
              </span>
            </div>
            <div className="mt-1.5">
              <EventTimeline events={timeline} />
            </div>
          </div>
        </div>
      </div>

      <details className="mt-4 rounded-lg border border-[#B45309]/25 bg-white/70 px-3 py-2">
        <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[var(--arogya-text-primary)]">
          <ClipboardList className="h-3.5 w-3.5 text-[#B45309]" aria-hidden="true" />
          <span>{`Simulation audit trail · ${sessions.length} ${
            sessions.length === 1 ? 'session' : 'sessions'
          }`}</span>
        </summary>
        <p className="mt-2 text-[11px] leading-relaxed text-[var(--arogya-text-secondary)]">
          In-memory only. Records scenario, start time, duration, speed, and event markers. Never
          included in recorded observations, assessments, reports, or NASA research data.
        </p>

        {sessions.length === 0 ? (
          <p className="mt-2 rounded-md border border-dashed border-[var(--arogya-border-strong)] px-3 py-3 text-xs text-[var(--arogya-text-secondary)]">
            No sessions recorded yet.
          </p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-[11px]">
              <caption className="sr-only">
                In-memory simulation audit trail with scenario, start time, duration, speed,
                status, and event markers for each session.
              </caption>
              <thead>
                <tr className="border-b border-[var(--arogya-border)] text-[10px] font-semibold uppercase tracking-wider text-[var(--arogya-text-secondary)]">
                  <th scope="col" className="py-1.5 pr-3">Scenario</th>
                  <th scope="col" className="py-1.5 pr-3">Start time</th>
                  <th scope="col" className="py-1.5 pr-3">Duration</th>
                  <th scope="col" className="py-1.5 pr-3">Speed</th>
                  <th scope="col" className="py-1.5 pr-3">Status</th>
                  <th scope="col" className="py-1.5">Event markers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--arogya-border)] text-[var(--arogya-text-primary)]">
                {[...sessions].reverse().map((session) => (
                  <tr key={session.id} className="align-top">
                    <th scope="row" className="py-2 pr-3 font-semibold">
                      {getSimulationScenario(session.scenario).label}
                    </th>
                    <td className="py-2 pr-3 font-mono-tabular text-[var(--arogya-text-secondary)]">
                      {formatStartTime(session.startedAtMs)}
                    </td>
                    <td className="py-2 pr-3 font-mono-tabular">
                      {session.durationMinutes} min
                    </td>
                    <td className="py-2 pr-3 font-mono-tabular">{`${session.speed}×`}</td>
                    <td className="py-2 pr-3">{SESSION_STATUS_LABEL[session.status]}</td>
                    <td className="py-2 text-[var(--arogya-text-secondary)]">
                      {describeMarkers(session)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </details>
    </section>
  );
}
