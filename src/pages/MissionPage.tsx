import { useMemo } from 'react';
import {
  Activity,
  Calendar,
  Compass,
  Gauge,
  Radio,
  RotateCcw,
  ShieldAlert,
  Sun,
  Users,
  Wind,
} from 'lucide-react';
import { useActiveAssessment } from '../hooks/useActiveAssessment';
import { useArogyaStore } from '../store/useArogyaStore';
import { useDriveMedia } from '../hooks/useDriveMedia';
import { evaluateHealthAssessment } from '../engine/healthEngine';
import {
  DEFAULT_DURATION_DAYS,
  DEFAULT_MISSION_NAME,
  DEFAULT_VELOCITY_KMH,
  MISSION_SIMULATION_DISCLOSURE,
  calculateDurationFromDates,
  calculateMarsTransitTelemetry,
  formatDurationMmSs,
} from '../engine/missionOrbitEngine';
import { STATUS_META } from '../engine/thresholds';
import {
  AstronautAvatar,
  Button,
  Card,
  CardHeader,
  EmptyState,
  StatusPill,
  healthStatusToTone,
} from '../components/ui';
import { MarsTrajectoryMap } from '../components/mission/MarsTrajectoryMap';
import { MissionFlightScene } from '../components/mission/MissionFlightScene';
import { MissionPhaseTimeline } from '../components/mission/MissionPhaseTimeline';
import { CrewMissionStatusPanel } from '../components/mission/CrewMissionStatusPanel';
import { MissionEventFeed } from '../components/mission/MissionEventFeed';
import { MissionHealthPanels } from '../components/mission/MissionHealthPanels';
import { buildMissionPhaseTimeline } from '../engine/missionPhases';

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function toDateInputValue(iso?: string): string {
  const d = new Date(iso ?? '2026-11-01T00:00:00Z');
  if (Number.isNaN(d.getTime())) return '2026-11-01';
  return d.toISOString().slice(0, 10);
}

export function MissionPage() {
  const { astronaut, mission, vitals14d, assessment } = useActiveAssessment();
  const astronauts = useArogyaStore((s) => s.astronauts);
  const vitalsByAstronaut = useArogyaStore((s) => s.vitalsByAstronaut);
  const checkInsByAstronaut = useArogyaStore((s) => s.checkInsByAstronaut);
  const reports = useArogyaStore((s) => s.reports);
  const setActiveAstronaut = useArogyaStore((s) => s.setActiveAstronaut);
  const updateMissionSimulation = useArogyaStore((s) => s.updateMissionSimulation);
  const updateMissionEnvironment = useArogyaStore((s) => s.updateMissionEnvironment);
  const resetDemoData = useArogyaStore((s) => s.resetDemoData);
  const { allAssets, imageAssets, supplementaryFiles } = useDriveMedia();
  const activeCheckIns = useMemo(
    () => checkInsByAstronaut[astronaut.id] ?? [],
    [checkInsByAstronaut, astronaut.id]
  );

  const configuredVelocityKmH = mission.configuredVelocityKmH ?? DEFAULT_VELOCITY_KMH;
  const syncDayToCurrentDate = mission.syncDayToCurrentDate ?? false;

  const telemetry = useMemo(
    () =>
      calculateMarsTransitTelemetry({
        currentDay: mission.currentDay,
        totalPlannedDays: mission.totalPlannedDays,
        departureDateIso: mission.departureDateIso,
        configuredVelocityKmH,
        syncDayToCurrentDate,
      }),
    [
      mission.currentDay,
      mission.totalPlannedDays,
      mission.departureDateIso,
      configuredVelocityKmH,
      syncDayToCurrentDate,
    ]
  );

  const currentPhase = useMemo(() => {
    const timeline = buildMissionPhaseTimeline({
      transitDay: telemetry.missionDay,
      transitDurationDays: telemetry.totalDurationDays,
    });
    return (
      timeline.phases.find((phase) => phase.id === timeline.currentPhaseId) ??
      timeline.phases[0]
    );
  }, [telemetry.missionDay, telemetry.totalDurationDays]);

  const commitSimulationUpdate = (nextParams: {
    name?: string;
    currentDay?: number;
    totalPlannedDays?: number;
    departureDateIso?: string;
    arrivalDateIso?: string;
    configuredVelocityKmH?: number;
    syncDayToCurrentDate?: boolean;
  }) => {
    const nextSync = nextParams.syncDayToCurrentDate ?? syncDayToCurrentDate;
    const nextDeparture = nextParams.departureDateIso ?? mission.departureDateIso;
    const nextDuration =
      nextParams.arrivalDateIso && !nextParams.totalPlannedDays
        ? calculateDurationFromDates(
            nextDeparture ?? telemetry.departureDateIso,
            nextParams.arrivalDateIso
          )
        : nextParams.totalPlannedDays ?? mission.totalPlannedDays;

    const calc = calculateMarsTransitTelemetry({
      currentDay: nextParams.currentDay ?? mission.currentDay,
      totalPlannedDays: nextDuration,
      departureDateIso: nextDeparture,
      configuredVelocityKmH: nextParams.configuredVelocityKmH ?? configuredVelocityKmH,
      syncDayToCurrentDate: nextSync,
    });

    updateMissionSimulation({
      name: nextParams.name ?? mission.name,
      currentDay: calc.missionDay,
      totalPlannedDays: calc.totalDurationDays,
      departureDateIso: calc.departureDateIso,
      arrivalDateIso: calc.arrivalDateIso,
      configuredVelocityKmH: calc.spacecraftVelocityKmH,
      syncDayToCurrentDate: nextSync,
      phase: calc.phase,
      marsDistanceKm: calc.currentDistanceToMarsKm,
      earthDistanceKm: calc.currentDistanceFromEarthKm,
      remainingTravelDays: calc.remainingDays,
      oneWayLightDelaySec: calc.oneWayLightDelaySec,
    });
  };

  // Crew health overview across all crew members
  const crewOverview = useMemo(
    () =>
      astronauts.map((member) => {
        const memberVitals = vitalsByAstronaut[member.id] ?? [];
        const memberCheckIns = checkInsByAstronaut[member.id] ?? [];
        const evalResult = evaluateHealthAssessment(
          member,
          memberCheckIns,
          memberVitals,
          mission
        );
        return {
          member,
          assessment: evalResult,
        };
      }),
    [astronauts, vitalsByAstronaut, checkInsByAstronaut, mission]
  );

  // Radiation exposure and mission planning budget for active astronaut
  const latestVitals = [...vitals14d].sort((a, b) => a.missionDay - b.missionDay).at(-1);
  const recordedCumRadMsv = latestVitals?.cumulativeRadiationMsv ?? 0;
  const speMultiplier =
    mission.environment?.solarParticleAlert === 'storm_shelter'
      ? 3.2
      : mission.environment?.solarParticleAlert === 'elevated'
      ? 1.8
      : 1.0;
  const ambientRate = mission.environment?.ambientRadiationRateMsvPerDay ?? 0.49;
  const effectiveDailyRadRate = Number((ambientRate * speMultiplier).toFixed(2));
  const projectedTotalRadMsv = Number(
    (recordedCumRadMsv + telemetry.remainingDays * effectiveDailyRadRate).toFixed(1)
  );
  const budgetMsv = astronaut.baseline.radiationBudgetMsv;
  const currentBudgetPct = Math.min(100, Math.round((recordedCumRadMsv / budgetMsv) * 100));
  const projectedBudgetPct = Math.round((projectedTotalRadMsv / budgetMsv) * 100);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      {/* Explicit Simulation Disclosure Banner */}
      <div
        role="note"
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--arogya-info-border)] bg-[var(--arogya-bg)] px-4 py-2.5 text-xs text-[var(--arogya-text-secondary)]"
      >
        <span className="flex items-center gap-2 font-medium text-[var(--arogya-info)]">
          <Compass className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{MISSION_SIMULATION_DISCLOSURE}</span>
        </span>
        <span className="font-mono-tabular text-[11px] text-[var(--arogya-text-secondary)]">
          {telemetry.spacecraftVelocityKmH.toLocaleString()} km/h ({telemetry.spacecraftVelocityKmS.toFixed(2)} km/s)
        </span>
      </div>

      {/* Header & Day Controls */}
      <header className="flex flex-col justify-between gap-4 border-b border-[var(--arogya-border)] pb-5 lg:flex-row lg:items-end">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--arogya-text-secondary)]">
            <AstronautAvatar
              astronautId={astronaut.id}
              fullName={astronaut.fullName}
              size="xs"
              active
            />
            <span className="font-semibold text-[var(--arogya-text-primary)]">
              {astronaut.fullName} ({astronaut.callSign})
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">EVA {astronaut.evaHoursTotal.toFixed(1)} h</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">{mission.vehicleName}</span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-[var(--arogya-info)]">Phase: {telemetry.phase}</span>
          </div>
          <h1 className="arogya-display text-[var(--arogya-text-primary)]">
            {mission.name}
          </h1>
          <p className="max-w-3xl text-sm text-[var(--arogya-text-secondary)]">
            Mars transit planner modeling transfer distance, communication light-time delay, arrival countdown, radiation planning budget, habitat environment, and crew readiness.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            type="button"
            variant={syncDayToCurrentDate ? 'primary' : 'secondary'}
            size="sm"
            onClick={() =>
              commitSimulationUpdate({
                syncDayToCurrentDate: !syncDayToCurrentDate,
              })
            }
          >
            {syncDayToCurrentDate ? 'Date-Synced (Auto)' : 'Sync to Today'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              commitSimulationUpdate({
                syncDayToCurrentDate: false,
                currentDay: Math.max(1, telemetry.missionDay - 1),
              })
            }
            disabled={telemetry.missionDay <= 1}
          >
            -1 Day
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              commitSimulationUpdate({
                syncDayToCurrentDate: false,
                currentDay: Math.min(telemetry.totalDurationDays, telemetry.missionDay + 1),
              })
            }
            disabled={telemetry.missionDay >= telemetry.totalDurationDays}
          >
            +1 Day
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              commitSimulationUpdate({
                name: DEFAULT_MISSION_NAME,
                currentDay: 14,
                totalPlannedDays: DEFAULT_DURATION_DAYS,
                departureDateIso: '2026-11-01T00:00:00Z',
                configuredVelocityKmH: DEFAULT_VELOCITY_KMH,
                syncDayToCurrentDate: true,
              })
            }
            leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
          >
            Load Demo Mission
          </Button>
        </div>
      </header>

      {/* Primary mission visualization: full-width flight scene below the heading */}
      <MissionFlightScene telemetry={telemetry} vehicleName={mission.vehicleName} />

      <MissionPhaseTimeline
        transitDay={telemetry.missionDay}
        transitDurationDays={telemetry.totalDurationDays}
      />

      <div className="grid min-w-0 grid-cols-1 items-start gap-6 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-7">
          <CrewMissionStatusPanel
            astronaut={astronaut}
            missionDay={telemetry.missionDay}
            transitDurationDays={telemetry.totalDurationDays}
            currentPhase={currentPhase}
            checkIns={activeCheckIns}
            alerts={assessment.alerts}
          />
        </div>
        <div className="min-w-0 xl:col-span-5">
          <MissionEventFeed
            astronautId={astronaut.id}
            checkIns={activeCheckIns}
            reports={reports}
            currentPhase={currentPhase}
          />
        </div>
      </div>

      <MissionHealthPanels
        astronaut={astronaut}
        missionDay={telemetry.missionDay}
        vitals={vitals14d}
        checkIns={activeCheckIns}
      />

      {/* Transfer geometry (simplified model, not ephemeris) */}
      <Card padding="md">
        <CardHeader
          title="Transfer Geometry (simplified model)"
          subtitle="Sun-centered 2D projection of the simulated transfer ellipse — simplified geometry, not ephemeris state vectors"
        />
        <div className="mt-4">
          <MarsTrajectoryMap telemetry={telemetry} vehicleName={mission.vehicleName} />
        </div>
      </Card>

      {/* Simulated mission telemetry + planner controls */}
      <div className="grid grid-cols-1 gap-6">
        <Card padding="md" className="flex flex-col justify-between">
          <div>
            <CardHeader
              title="Transit Progress & Orbital Telemetry"
              subtitle={`Simulated mission telemetry · Phase: ${telemetry.phase}`}
              action={
                <span className="font-mono-tabular text-sm font-semibold text-[var(--arogya-info)]">
                  {telemetry.progressPercent}% Complete
                </span>
              }
            />

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 font-mono-tabular text-xs text-[var(--arogya-text-secondary)]">
                <span>Departure: {formatDateShort(telemetry.departureDateIso)}</span>
                <span>
                  Day {telemetry.missionDay} of {telemetry.totalDurationDays}
                </span>
                <span>Arrival: {formatDateShort(telemetry.arrivalDateIso)}</span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={Math.round(telemetry.progressPercent)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Simulated mission transit ${telemetry.progressPercent} percent elapsed`}
                className="h-2.5 w-full overflow-hidden rounded-full bg-white/10"
              >
                <div
                  className="h-full rounded-full bg-[#1E3A5F] transition-all duration-200"
                  style={{ width: `${telemetry.progressPercent}%` }}
                />
              </div>
            </div>

            {/* Key Widgets Grid: Mars Distance, Countdown, Velocity, One-Way & Round-Trip Comms Delay */}
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-3.5">
                <p className="text-xs text-[var(--arogya-text-secondary)]">Distance Traveled</p>
                <p className="mt-1 font-mono-tabular text-xl font-semibold text-[var(--arogya-text-primary)]">
                  {(telemetry.distanceTraveledKm / 1_000_000).toFixed(2)}{' '}
                  <span className="text-xs font-normal text-[var(--arogya-text-muted)]">M km</span>
                </p>
                <p className="mt-0.5 font-mono-tabular text-[11px] text-[var(--arogya-text-secondary)]">
                  of {(telemetry.totalTransferDistanceKm / 1_000_000).toFixed(1)}M km transfer
                </p>
              </div>

              <div className="rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-3.5">
                <p className="text-xs text-[var(--arogya-text-secondary)]">Mars Distance Widget</p>
                <p className="mt-1 font-mono-tabular text-xl font-semibold text-[var(--arogya-caution-text)]">
                  {(telemetry.currentDistanceToMarsKm / 1_000_000).toFixed(2)}{' '}
                  <span className="text-xs font-normal text-[var(--arogya-text-muted)]">M km</span>
                </p>
                <p className="mt-0.5 font-mono-tabular text-[11px] text-[var(--arogya-text-secondary)]">
                  Earth sep: {(telemetry.currentDistanceFromEarthKm / 1_000_000).toFixed(2)}M km
                </p>
              </div>

              <div className="rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-3.5">
                <p className="flex items-center gap-1.5 text-xs text-[var(--arogya-text-secondary)]">
                  <Calendar className="h-3.5 w-3.5 text-[var(--arogya-info)]" aria-hidden="true" />
                  <span>Arrival Countdown</span>
                </p>
                <p className="mt-1 font-mono-tabular text-xl font-semibold text-[var(--arogya-text-primary)]">
                  {telemetry.remainingDays}{' '}
                  <span className="text-xs font-normal text-[var(--arogya-text-muted)]">days</span>
                </p>
                <p className="mt-0.5 font-mono-tabular text-[11px] text-[var(--arogya-text-secondary)]">
                  {telemetry.remainingWeeks} weeks · {telemetry.remainingMonths} months
                </p>
              </div>

              <div className="rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-3.5">
                <p className="flex items-center gap-1.5 text-xs text-[var(--arogya-text-secondary)]">
                  <Gauge className="h-3.5 w-3.5 text-[var(--arogya-info)]" aria-hidden="true" />
                  <span>Spacecraft Velocity</span>
                </p>
                <p className="mt-1 font-mono-tabular text-xl font-semibold text-[var(--arogya-text-primary)]">
                  {telemetry.spacecraftVelocityKmH.toLocaleString()}{' '}
                  <span className="text-xs font-normal text-[var(--arogya-text-muted)]">km/h</span>
                </p>
                <p className="mt-0.5 font-mono-tabular text-[11px] text-[var(--arogya-text-secondary)]">
                  {telemetry.spacecraftVelocityKmS.toFixed(2)} km/s cruise speed
                </p>
              </div>

              <div className="rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-3.5">
                <p className="flex items-center gap-1.5 text-xs text-[var(--arogya-text-secondary)]">
                  <Radio className="h-3.5 w-3.5 text-[var(--arogya-info)]" aria-hidden="true" />
                  <span>One-Way Comms Delay</span>
                </p>
                <p className="mt-1 font-mono-tabular text-xl font-semibold text-[var(--arogya-info)]">
                  {formatDurationMmSs(telemetry.oneWayLightDelaySec)}
                </p>
                <p className="mt-0.5 font-mono-tabular text-[11px] text-[var(--arogya-text-secondary)]">
                  {telemetry.oneWayLightDelaySec} s at speed of light
                </p>
              </div>

              <div className="rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-3.5">
                <p className="flex items-center gap-1.5 text-xs text-[var(--arogya-text-secondary)]">
                  <Compass className="h-3.5 w-3.5 text-[var(--arogya-info)]" aria-hidden="true" />
                  <span>Round-Trip Comms Delay</span>
                </p>
                <p className="mt-1 font-mono-tabular text-xl font-semibold text-[var(--arogya-text-primary)]">
                  {formatDurationMmSs(telemetry.roundTripLightDelaySec)}
                </p>
                <p className="mt-0.5 font-mono-tabular text-[11px] text-[var(--arogya-text-secondary)]">
                  {telemetry.roundTripLightDelaySec} s Earth-Craft-Earth
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Configurable Planner Controls */}
          <div className="mt-5 border-t border-[var(--arogya-border)] pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--arogya-text-secondary)]">
              Configurable Mission Parameters
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label htmlFor="planner-name" className="block text-[11px] text-[var(--arogya-text-secondary)]">
                  Mission Name
                </label>
                <input
                  id="planner-name"
                  type="text"
                  value={mission.name}
                  onChange={(e) => commitSimulationUpdate({ name: e.target.value })}
                  className="mt-1 h-9 w-full rounded-lg border border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] px-2.5 text-xs text-[var(--arogya-text-primary)]"
                />
              </div>

              <div>
                <label htmlFor="planner-dep" className="block text-[11px] text-[var(--arogya-text-secondary)]">
                  Departure Date (UTC)
                </label>
                <input
                  id="planner-dep"
                  type="date"
                  value={toDateInputValue(telemetry.departureDateIso)}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    commitSimulationUpdate({
                      departureDateIso: `${e.target.value}T00:00:00Z`,
                    });
                  }}
                  className="mt-1 h-9 w-full rounded-lg border border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] px-2.5 font-mono-tabular text-xs text-[var(--arogya-text-primary)]"
                />
              </div>

              <div>
                <label htmlFor="planner-arr" className="block text-[11px] text-[var(--arogya-text-secondary)]">
                  Arrival Date (UTC)
                </label>
                <input
                  id="planner-arr"
                  type="date"
                  value={toDateInputValue(telemetry.arrivalDateIso)}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    commitSimulationUpdate({
                      arrivalDateIso: `${e.target.value}T00:00:00Z`,
                    });
                  }}
                  className="mt-1 h-9 w-full rounded-lg border border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] px-2.5 font-mono-tabular text-xs text-[var(--arogya-text-primary)]"
                />
              </div>

              <div>
                <label htmlFor="planner-vel" className="block text-[11px] text-[var(--arogya-text-secondary)]">
                  Velocity ({telemetry.spacecraftVelocityKmH.toLocaleString()} km/h)
                </label>
                <input
                  id="planner-vel"
                  type="number"
                  min={5000}
                  max={120000}
                  step={500}
                  value={telemetry.spacecraftVelocityKmH}
                  onChange={(e) =>
                    commitSimulationUpdate({
                      configuredVelocityKmH: Number(e.target.value) || DEFAULT_VELOCITY_KMH,
                    })
                  }
                  className="mt-1 h-9 w-full rounded-lg border border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] px-2.5 font-mono-tabular text-xs text-[var(--arogya-text-primary)]"
                />
              </div>

              <div>
                <label htmlFor="planner-day" className="block text-[11px] text-[var(--arogya-text-secondary)]">
                  Simulated Day (Sol {telemetry.missionDay}/{telemetry.totalDurationDays})
                </label>
                <input
                  id="planner-day"
                  type="range"
                  min={1}
                  max={telemetry.totalDurationDays}
                  step={1}
                  value={telemetry.missionDay}
                  onChange={(e) =>
                    commitSimulationUpdate({
                      syncDayToCurrentDate: false,
                      currentDay: Number(e.target.value),
                    })
                  }
                  className="mt-2.5 w-full accent-[#1E3A5F]"
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Radiation Exposure Widget & Crew Health Overview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card padding="md" className="space-y-4 lg:col-span-5">
          <CardHeader
            title="Radiation Exposure & Mission Budget"
            subtitle={`Simulated mission telemetry · ${astronaut.fullName} ALARA planning cap`}
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-3.5">
              <p className="text-[11px] text-[var(--arogya-text-secondary)]">Recorded Cumulative</p>
              <p className="mt-1 font-mono-tabular text-xl font-semibold text-[var(--arogya-text-primary)]">
                {recordedCumRadMsv.toFixed(2)}{' '}
                <span className="text-xs font-normal text-[var(--arogya-text-muted)]">mSv</span>
              </p>
              <p className="mt-0.5 font-mono-tabular text-[11px] text-[var(--arogya-text-secondary)]">
                {currentBudgetPct}% of {budgetMsv} mSv budget
              </p>
            </div>

            <div className="rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-3.5">
              <p className="text-[11px] text-[var(--arogya-text-secondary)]">Projected Transit Total</p>
              <p
                className={`mt-1 font-mono-tabular text-xl font-semibold ${
                  projectedBudgetPct >= 85 ? 'text-[var(--arogya-caution-text)]' : 'text-[var(--arogya-success-text)]'
                }`}
              >
                {projectedTotalRadMsv.toFixed(1)}{' '}
                <span className="text-xs font-normal text-[var(--arogya-text-muted)]">mSv</span>
              </p>
              <p className="mt-0.5 font-mono-tabular text-[11px] text-[var(--arogya-text-secondary)]">
                {projectedBudgetPct}% projected at {effectiveDailyRadRate} mSv/d
              </p>
            </div>
          </div>

          <div>
            <div className="mb-1 flex justify-between font-mono-tabular text-[11px] text-[var(--arogya-text-secondary)]">
              <span>Current ({recordedCumRadMsv.toFixed(1)} mSv)</span>
              <span>Projected ({projectedTotalRadMsv.toFixed(1)} / {budgetMsv} mSv)</span>
            </div>
            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-[#F97316]/40"
                style={{ width: `${Math.min(100, projectedBudgetPct)}%` }}
              />
              <div
                className="relative h-full rounded-full bg-[#1E3A5F]"
                style={{ width: `${currentBudgetPct}%` }}
              />
            </div>
          </div>

          <p className="text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
            Projection assumes current habitat shielding and{' '}
            {(mission.environment?.solarParticleAlert ?? 'quiet').replace('_', ' ')} solar particle status over the remaining {telemetry.remainingDays} days.
          </p>
        </Card>

        <Card padding="md" className="space-y-4 lg:col-span-7">
          <CardHeader
            title="Crew Health Overview"
            subtitle="Live decision-support status across all onboard astronauts (click to focus)"
            action={
              <span className="inline-flex items-center gap-1.5 text-xs text-[var(--arogya-text-secondary)]">
                <Users className="h-4 w-4 text-[var(--arogya-info)]" aria-hidden="true" />
                <span>{crewOverview.length} Crew</span>
              </span>
            }
          />

          {crewOverview.length === 0 ? (
            <EmptyState
              title="No Crew Profiles Loaded"
              description="Load the Demo Mission dataset to inspect crew readiness and simulated transit telemetry."
              action={
                <Button type="button" variant="primary" size="sm" onClick={resetDemoData}>
                  Load Demo Mission
                </Button>
              }
              compact
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {crewOverview.map(({ member, assessment: memberAssessment }) => {
                const isSelected = member.id === astronaut.id;
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setActiveAstronaut(member.id)}
                    className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition-colors ${
                      isSelected
                        ? 'border-[#1E3A5F] bg-[var(--arogya-selected-bg)]'
                        : 'border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] hover:border-white/25'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <AstronautAvatar
                            astronautId={member.id}
                            fullName={member.fullName}
                            status={memberAssessment.overallStatus}
                            size="sm"
                            active={isSelected}
                          />
                          <span className="font-mono-tabular text-[11px] font-semibold text-[var(--arogya-info)]">
                            {member.callSign}
                          </span>
                        </div>
                        <StatusPill tone={healthStatusToTone(memberAssessment.overallStatus)} />
                      </div>
                      <p className="mt-2 text-sm font-semibold text-[var(--arogya-text-primary)]">
                        {member.fullName}
                      </p>
                      <p className="text-xs text-[var(--arogya-text-secondary)]">
                        {member.role} · EVA {member.evaHoursTotal.toFixed(1)} h
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-[var(--arogya-border)] pt-2.5 font-mono-tabular text-xs">
                      <span className="text-[var(--arogya-text-primary)]">
                        Readiness {memberAssessment.overallReadinessScore}/100
                      </span>
                      <span
                        className={
                          memberAssessment.alerts.length > 0
                            ? 'text-[var(--arogya-caution-text)]'
                            : 'text-[var(--arogya-text-muted)]'
                        }
                      >
                        {memberAssessment.alerts.length} flag
                        {memberAssessment.alerts.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Habitat Environmental Status & Simulation Drills */}
      {mission.environment ? (
        <Card padding="md" className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Wind className="mt-0.5 h-5 w-5 shrink-0 text-[var(--arogya-info)]" aria-hidden="true" />
              <div>
                <h2 className="arogya-h2 text-[var(--arogya-text-primary)]">
                  Habitat Environmental Status & Simulation Controls
                </h2>
                <p className="mt-0.5 text-xs text-[var(--arogya-text-secondary)]">
                  Simulated mission telemetry · Adjust solar particle alert level or cabin pCO₂ to observe crew health-engine adaptation.
                </p>
              </div>
            </div>

            <div
              role="group"
              aria-label="Solar particle alert simulation"
              className="flex flex-wrap gap-2"
            >
              {(['quiet', 'elevated', 'storm_shelter'] as const).map((level) => {
                const active = mission.environment.solarParticleAlert === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => updateMissionEnvironment({ solarParticleAlert: level })}
                    aria-pressed={active}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                      active
                        ? level === 'quiet'
                          ? 'border-[var(--arogya-success-border)] bg-[var(--arogya-success-soft)] text-[var(--arogya-success-text)]'
                          : 'border-[var(--arogya-caution-border)] bg-[var(--arogya-caution-soft)] text-[var(--arogya-caution-text)]'
                        : 'border-[var(--arogya-border-strong)] bg-[var(--arogya-surface-elevated)] text-[var(--arogya-text-secondary)] hover:text-[var(--arogya-text-primary)]'
                    }`}
                  >
                    <Sun className="mr-1.5 inline h-3.5 w-3.5" aria-hidden="true" />
                    {level.replace('_', ' ')}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-3">
              <p className="text-[11px] text-[var(--arogya-text-secondary)]">Cabin Pressure</p>
              <p className="mt-1 font-mono-tabular text-base font-semibold text-[var(--arogya-text-primary)]">
                {mission.environment.cabinPressureKpa.toFixed(1)} kPa
              </p>
            </div>
            <div className="rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-3">
              <p className="text-[11px] text-[var(--arogya-text-secondary)]">Oxygen (O₂)</p>
              <p className="mt-1 font-mono-tabular text-base font-semibold text-[var(--arogya-text-primary)]">
                {mission.environment.cabinOxygenPercent.toFixed(1)}%
              </p>
            </div>
            <div className="rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-3">
              <p className="text-[11px] text-[var(--arogya-text-secondary)]">Cabin pCO₂</p>
              <p
                className={`mt-1 font-mono-tabular text-base font-semibold ${
                  mission.environment.cabinCo2MmHg > 3.0 ? 'text-[var(--arogya-warning-text)]' : 'text-[var(--arogya-text-primary)]'
                }`}
              >
                {mission.environment.cabinCo2MmHg.toFixed(1)} mmHg
              </p>
            </div>
            <div className="rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-3">
              <p className="text-[11px] text-[var(--arogya-text-secondary)]">Habitat Temp</p>
              <p className="mt-1 font-mono-tabular text-base font-semibold text-[var(--arogya-text-primary)]">
                {mission.environment.cabinTempC.toFixed(1)} °C
              </p>
            </div>
            <div className="rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-3">
              <p className="text-[11px] text-[var(--arogya-text-secondary)]">Humidity</p>
              <p className="mt-1 font-mono-tabular text-base font-semibold text-[var(--arogya-text-primary)]">
                {mission.environment.relativeHumidityPercent}%
              </p>
            </div>
            <div className="rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-3">
              <p className="text-[11px] text-[var(--arogya-text-secondary)]">Ambient Dose</p>
              <p className="mt-1 font-mono-tabular text-base font-semibold text-[var(--arogya-text-primary)]">
                {effectiveDailyRadRate.toFixed(2)} mSv/d
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--arogya-border)] pt-3">
            <div className="flex flex-1 items-center gap-3 min-w-[240px]">
              <label
                htmlFor="cabin-co2-slider"
                className="text-xs font-medium text-[var(--arogya-text-secondary)] whitespace-nowrap"
              >
                Simulate Cabin pCO₂ ({mission.environment.cabinCo2MmHg.toFixed(1)} mmHg):
              </label>
              <input
                id="cabin-co2-slider"
                type="range"
                min={1.8}
                max={5.0}
                step={0.1}
                value={mission.environment.cabinCo2MmHg}
                onChange={(e) =>
                  updateMissionEnvironment({ cabinCo2MmHg: Number(e.target.value) })
                }
                className="max-w-xs flex-1 accent-[#1E3A5F]"
              />
            </div>

            {mission.environment.solarParticleAlert !== 'quiet' && (
              <div className="flex items-center gap-2 text-xs text-[var(--arogya-caution-text)]">
                <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  SPE status {mission.environment.solarParticleAlert.replace('_', ' ')} active in health-assessment engine.
                </span>
              </div>
            )}
          </div>
        </Card>
      ) : (
        <EmptyState
          title="Environmental Telemetry Unavailable"
          description="Habitat pressure and atmospheric sensors are not reporting yet. Restore Demo Mission telemetry to inspect cabin conditions."
          action={
            <Button type="button" variant="primary" size="sm" onClick={resetDemoData}>
              Load Demo Mission
            </Button>
          }
          compact
        />
      )}

      {/* Drive Folder Attached Images & Supplementary Files */}
      <Card padding="md">
        <CardHeader
          title={`Synced Mission Drive Media & Attached Files (${allAssets.length})`}
          subtitle="Offline-cached mission documents, telemetry notes, and image assets from Google Drive"
          action={<Activity className="h-4 w-4 text-[var(--arogya-text-muted)]" aria-hidden="true" />}
        />

        {allAssets.length === 0 ? (
          <p className="mt-3 text-xs text-[var(--arogya-text-secondary)]">
            Use &ldquo;Connect Drive&rdquo; in the top bar to load models, mission documents, and imagery from Google Drive.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {imageAssets.length > 0 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {imageAssets.map((img) => (
                  <figure
                    key={img.id}
                    className="overflow-hidden rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-bg)]"
                  >
                    {img.objectUrl && (
                      <img
                        src={img.objectUrl}
                        alt={img.name}
                        referrerPolicy="no-referrer"
                        className="h-44 w-full object-cover"
                      />
                    )}
                    <figcaption className="px-3 py-2 text-xs text-[var(--arogya-text-secondary)]">
                      {img.name}
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}

            {supplementaryFiles.length > 0 && (
              <div className="space-y-2.5">
                {supplementaryFiles.map((file) => (
                  <div
                    key={file.id}
                    className="rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-[var(--arogya-text-primary)]">
                        {file.name}
                      </span>
                      {file.objectUrl && (
                        <a
                          href={file.objectUrl}
                          download={file.name}
                          className="text-xs font-medium text-[var(--arogya-info)] hover:underline"
                        >
                          Download
                        </a>
                      )}
                    </div>
                    {file.textPreview && (
                      <pre className="mt-2 max-h-36 overflow-y-auto whitespace-pre-wrap rounded bg-[var(--arogya-bg)] p-3 text-xs text-[var(--arogya-text-secondary)]">
                        {file.textPreview}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
