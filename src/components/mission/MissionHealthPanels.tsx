import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bone,
  Droplets,
  Dumbbell,
  HeartPulse,
  Minus,
  Moon,
  Salad,
  Utensils,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import type { Astronaut, CheckIn, VitalReading } from '../../types';
import {
  NASA_CMP_DATASET,
  summarizeNasaCmpDataset,
} from '../../data/researchLibrary';
import {
  buildCardiovascularOverview,
  buildMissionResearchContextCards,
  buildMusculoskeletalOverview,
  buildNutritionHydrationOverview,
  buildSleepRecoveryOverview,
} from '../../engine/missionHealthPanels';
import {
  buildSimulatedVitalsSummary,
  formatSimulatedElapsed,
  type TrendSummary,
} from '../../engine/missionStatus';
import {
  OBSERVATION_WINDOW_OPTIONS,
  type ObservationWindowDays,
} from '../../utils/observationWindow';
import { useSimulatedTelemetryStore } from '../../store/useSimulatedTelemetryStore';
import { Card } from '../ui';
import { MissionSourceBadge } from './MissionSourceBadge';

interface MissionHealthPanelsProps {
  astronaut: Astronaut;
  missionDay: number;
  vitals: VitalReading[];
  checkIns: CheckIn[];
}

function HealthCardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1 basis-48">
        <h2 className="arogya-h2 break-words font-semibold text-[var(--arogya-text-primary)]">
          {title}
        </h2>
        <p className="mt-0.5 text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
          {subtitle}
        </p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

function formatIsoDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function trimmed(value: number, digits = 1): string {
  return String(Math.round(value * 10 ** digits) / 10 ** digits);
}

function TrendLine({ trend, metric }: { trend: TrendSummary; metric: string }) {
  if (trend.direction === 'insufficient') {
    return (
      <p className="mt-1 text-[10px] leading-relaxed text-[var(--arogya-text-muted)]">
        Trend unavailable — fewer than two observations in this window.
      </p>
    );
  }

  const Icon =
    trend.direction === 'rising'
      ? ArrowUpRight
      : trend.direction === 'falling'
        ? ArrowDownRight
        : Minus;
  const delta =
    trend.delta == null
      ? ''
      : ` (${trend.delta > 0 ? '+' : ''}${trimmed(trend.delta)})`;

  return (
    <p
      aria-label={`${metric} trend: ${trend.label}`}
      className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--arogya-text-secondary)]"
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      <span>
        {trend.label}
        {delta}
      </span>
    </p>
  );
}

function MetricTile({
  label,
  value,
  unit,
  detail,
  missing,
  reference,
  trend,
  trendMetric,
  icon: Icon,
}: {
  label: string;
  value: string;
  unit?: string;
  detail?: string;
  missing?: boolean;
  reference?: string;
  trend?: TrendSummary;
  trendMetric?: string;
  icon: LucideIcon;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--arogya-text-secondary)]">
        <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--arogya-info)]" aria-hidden="true" />
        <span>{label}</span>
      </p>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-1">
        <span
          className={
            missing
              ? 'break-words text-sm font-semibold text-[var(--arogya-warning-text)]'
              : 'break-words font-mono-tabular text-xl font-semibold text-[var(--arogya-text-primary)]'
          }
        >
          {value}
        </span>
        {unit && !missing && (
          <span className="text-[11px] font-medium text-[var(--arogya-text-muted)]">{unit}</span>
        )}
      </div>
      {detail && (
        <p className="mt-0.5 break-words text-[10px] leading-relaxed text-[var(--arogya-text-muted)]">
          {detail}
        </p>
      )}
      {trend && trendMetric && <TrendLine trend={trend} metric={trendMetric} />}
      {reference && (
        <p className="mt-1 break-words text-[10px] leading-relaxed text-[var(--arogya-text-muted)]">
          Reference: {reference}
        </p>
      )}
    </div>
  );
}

function PanelLink({ to, children }: { to: string; children: string }) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-10 items-center gap-1 rounded-lg text-xs font-semibold text-[var(--arogya-text-primary)] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F] focus-visible:ring-offset-2"
    >
      {children}
      <ArrowRight className="h-3 w-3" aria-hidden="true" />
    </Link>
  );
}

function CoverageLine({
  window,
  noun,
}: {
  window: {
    startDay: number;
    endDay: number;
    coveredDays: number;
    recordedDays: number;
    coverageNotice: string | null;
  };
  noun: string;
}) {
  return (
    <p className="break-words text-[11px] leading-relaxed text-[var(--arogya-text-muted)]">
      Window: Day {window.startDay}–{window.endDay} · {window.coveredDays} mission day
      {window.coveredDays === 1 ? '' : 's'} · {window.recordedDays} day
      {window.recordedDays === 1 ? '' : 's'} with {noun}.
      {window.coverageNotice ? ` ${window.coverageNotice}` : ''}
    </p>
  );
}

function EmptyRecordedState({
  message,
  detail,
  to,
  cta,
}: {
  message: string;
  detail: string;
  to: string;
  cta: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] p-4">
      <p className="text-sm font-semibold text-[var(--arogya-text-primary)]">{message}</p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--arogya-text-secondary)]">{detail}</p>
      <div className="mt-2">
        <PanelLink to={to}>{cta}</PanelLink>
      </div>
    </div>
  );
}

function SimulatedSummary({ astronautId }: { astronautId: string }) {
  const points = useSimulatedTelemetryStore((state) => state.points);
  const bpSamples = useSimulatedTelemetryStore((state) => state.bpSamples);
  const simulationAstronautId = useSimulatedTelemetryStore((state) => state.astronautId);

  const summary = useMemo(
    () => buildSimulatedVitalsSummary(points, bpSamples),
    [points, bpSamples]
  );
  const hasOwnSession = simulationAstronautId === astronautId && points.length > 0;
  const belongsToOtherCrew =
    simulationAstronautId !== null && simulationAstronautId !== astronautId;
  const isUnassigned = simulationAstronautId === null && points.length > 0;

  if (!hasOwnSession && (belongsToOtherCrew || isUnassigned)) {
    return (
      <div className="rounded-lg border border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] p-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--arogya-text-secondary)]">
            Active simulated stream
          </h3>
          <MissionSourceBadge source="simulated" />
        </div>
        <p className="mt-2 text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
          {belongsToOtherCrew
            ? 'A simulation stream is attached to a different crew profile; its values are withheld here.'
            : 'A simulation stream has no crew assignment; its values are withheld here.'}
        </p>
      </div>
    );
  }

  if (!hasOwnSession) {
    return (
      <div className="rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-bg)] p-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--arogya-text-secondary)]">
            Active simulated stream
          </h3>
          <MissionSourceBadge source="simulated" />
        </div>
        <p className="mt-2 text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
          No active simulated session. Start one from the Dashboard simulation controls; simulated
          values never enter recorded vitals, reports, or Drive exports.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#B45309]/25 bg-[#FFFBEB] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#78350F]">
            Active simulated stream
          </h3>
          <MissionSourceBadge source="simulated" />
        </div>
        <span className="font-mono-tabular text-[11px] font-semibold text-[#92400E]">
          Elapsed {formatSimulatedElapsed(summary.elapsedSeconds)}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <div className="min-w-0 rounded-lg border border-[#B45309]/20 bg-white/60 p-2.5">
          <p className="text-[11px] font-medium text-[#78350F]">Heart rate</p>
          <p className="mt-1 font-mono-tabular text-lg font-semibold text-[#78350F]">
            {summary.heartRateBpm == null ? '—' : summary.heartRateBpm}{' '}
            <span className="text-[10px] font-normal text-[#92400E]">bpm</span>
          </p>
          <TrendLine trend={summary.heartRateTrend} metric="Simulated heart rate" />
        </div>
        <div className="min-w-0 rounded-lg border border-[#B45309]/20 bg-white/60 p-2.5">
          <p className="text-[11px] font-medium text-[#78350F]">SpO₂</p>
          <p className="mt-1 font-mono-tabular text-lg font-semibold text-[#78350F]">
            {summary.spo2Percent == null ? '—' : summary.spo2Percent.toFixed(1)}{' '}
            <span className="text-[10px] font-normal text-[#92400E]">%</span>
          </p>
          <TrendLine trend={summary.spo2Trend} metric="Simulated oxygen saturation" />
        </div>
        <div className="min-w-0 rounded-lg border border-[#B45309]/20 bg-white/60 p-2.5">
          <p className="text-[11px] font-medium text-[#78350F]">Blood pressure</p>
          <p className="mt-1 font-mono-tabular text-lg font-semibold text-[#78350F]">
            {summary.systolicBpMmHg == null || summary.diastolicBpMmHg == null
              ? '—'
              : `${summary.systolicBpMmHg}/${summary.diastolicBpMmHg}`}{' '}
            <span className="text-[10px] font-normal text-[#92400E]">mmHg</span>
          </p>
          <TrendLine trend={summary.bloodPressureTrend} metric="Simulated blood pressure" />
        </div>
      </div>
      <p className="mt-2 break-words text-[10px] leading-relaxed text-[#92400E]">
        In-memory demonstration stream sampled in this browser tab. It is shown separately from
        recorded observations and is never written into vitals, reports, or exports.
      </p>
    </div>
  );
}

export function MissionHealthPanels({
  astronaut,
  missionDay,
  vitals,
  checkIns,
}: MissionHealthPanelsProps) {
  const [windowDays, setWindowDays] = useState<ObservationWindowDays>(7);

  const cardiovascular = useMemo(
    () => buildCardiovascularOverview(vitals, missionDay, windowDays),
    [vitals, missionDay, windowDays]
  );
  const musculoskeletal = useMemo(
    () => buildMusculoskeletalOverview(checkIns, missionDay, windowDays),
    [checkIns, missionDay, windowDays]
  );
  const sleep = useMemo(
    () =>
      buildSleepRecoveryOverview(
        checkIns,
        missionDay,
        astronaut.baseline.sleepTargetHours,
        windowDays
      ),
    [checkIns, missionDay, astronaut.baseline.sleepTargetHours, windowDays]
  );
  const nutrition = useMemo(
    () =>
      buildNutritionHydrationOverview(
        checkIns,
        missionDay,
        {
          hydrationTargetLiters: astronaut.baseline.hydrationTargetLiters,
          calorieTargetKcal: astronaut.baseline.calorieTargetKcal,
        },
        windowDays
      ),
    [
      checkIns,
      missionDay,
      astronaut.baseline.hydrationTargetLiters,
      astronaut.baseline.calorieTargetKcal,
      windowDays,
    ]
  );

  const researchSummary = useMemo(() => summarizeNasaCmpDataset(NASA_CMP_DATASET), []);
  const researchCards = useMemo(
    () => buildMissionResearchContextCards(NASA_CMP_DATASET),
    []
  );

  const latestTimestamp = formatIsoDate(cardiovascular.latestTimestampIso);
  const latestLabel =
    cardiovascular.latestDay == null
      ? 'No recorded vitals yet'
      : `Latest: Day ${cardiovascular.latestDay}${
          latestTimestamp ? ` · ${latestTimestamp}` : ''
        }${cardiovascular.latestSourceLabel ? ` · ${cardiovascular.latestSourceLabel}` : ''}`;

  const bp = cardiovascular.bloodPressure;
  const bloodPressureValue =
    bp.systolic == null || bp.diastolic == null
      ? 'Not recorded'
      : `${bp.systolic}/${bp.diastolic}`;

  return (
    <section aria-labelledby="mission-health-panels-heading" className="min-w-0 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h2
            id="mission-health-panels-heading"
            className="text-lg font-semibold text-[var(--arogya-text-primary)]"
          >
            Mission health panels
          </h2>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
            Recorded observations for {astronaut.fullName} ({astronaut.callSign}) remain separate
            from the in-memory simulation stream and from archived NASA research context. The
            selected window applies only to recorded vitals and check-in summaries.
          </p>
        </div>
        <div
          role="group"
          aria-label="Health observation window"
          className="flex flex-wrap items-center gap-1.5"
        >
          <span className="text-[11px] font-medium text-[var(--arogya-text-secondary)]">
            Observation window
          </span>
          {OBSERVATION_WINDOW_OPTIONS.map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setWindowDays(days)}
              aria-pressed={windowDays === days}
              className={`min-h-9 rounded-lg border px-2.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F] focus-visible:ring-offset-2 ${
                windowDays === days
                  ? 'border-[#1E3A5F] bg-[#1E3A5F] text-white'
                  : 'border-[var(--arogya-border-strong)] bg-white text-[var(--arogya-text-secondary)] hover:bg-[var(--arogya-bg)]'
              }`}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-3">
        <Card padding="md" className="min-w-0 space-y-4 xl:col-span-3">
          <HealthCardHeader
            title="Cardiovascular overview"
            subtitle="Latest recorded heart rate, oxygen saturation, and blood pressure with a separate simulated stream"
            action={<PanelLink to="/vitals">Open Vitals</PanelLink>}
          />

          <div className="min-w-0 space-y-3 rounded-lg border border-[var(--arogya-border)] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--arogya-text-secondary)]">
                Recorded observations
              </h3>
              <MissionSourceBadge source="recorded" />
              <span className="break-words text-[11px] text-[var(--arogya-text-muted)]">
                {latestLabel}
              </span>
            </div>
            <CoverageLine window={cardiovascular.window} noun="recorded vitals" />

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <MetricTile
                label="Heart rate"
                value={
                  cardiovascular.heartRate.latest == null
                    ? 'Not recorded'
                    : String(cardiovascular.heartRate.latest)
                }
                unit="bpm"
                missing={cardiovascular.heartRate.latest == null}
                detail={`${cardiovascular.heartRate.observedInWindow} observation${
                  cardiovascular.heartRate.observedInWindow === 1 ? '' : 's'
                } in this window`}
                trend={cardiovascular.heartRate.trend}
                trendMetric="Recorded heart rate"
                reference={cardiovascular.heartRate.referenceRange}
                icon={HeartPulse}
              />
              <MetricTile
                label="SpO₂"
                value={
                  cardiovascular.spo2.latest == null
                    ? 'Not recorded'
                    : cardiovascular.spo2.latest.toFixed(1)
                }
                unit="%"
                missing={cardiovascular.spo2.latest == null}
                detail={`${cardiovascular.spo2.observedInWindow} observation${
                  cardiovascular.spo2.observedInWindow === 1 ? '' : 's'
                } in this window`}
                trend={cardiovascular.spo2.trend}
                trendMetric="Recorded oxygen saturation"
                reference={cardiovascular.spo2.referenceRange}
                icon={Wind}
              />
              <MetricTile
                label="Blood pressure"
                value={bloodPressureValue}
                unit="mmHg"
                missing={bp.systolic == null || bp.diastolic == null}
                detail={
                  bp.systolic == null || bp.diastolic == null
                    ? 'Systolic and diastolic cuff values are required for a reading.'
                    : `${bp.observedInWindow} cuff reading${
                        bp.observedInWindow === 1 ? '' : 's'
                      } in this window`
                }
                trend={bp.trend}
                trendMetric="Recorded systolic blood pressure"
                reference={bp.referenceRange}
                icon={Activity}
              />
            </div>

            {cardiovascular.missingChannels.length > 0 && (
              <p
                role="note"
                className="rounded-md border border-[var(--arogya-warning-border)] bg-[var(--arogya-warning-soft)] px-2.5 py-2 text-[11px] leading-relaxed text-[var(--arogya-warning-text)]"
              >
                Missing in the latest recorded reading:{' '}
                {cardiovascular.missingChannels.join(', ')}. Missing channels are shown explicitly
                and are not treated as normal.
              </p>
            )}

            {!cardiovascular.hasRecordedVitals && (
              <p className="text-[11px] leading-relaxed text-[var(--arogya-text-secondary)]">
                No recorded vitals exist for this crew member yet. Use the Vitals page to add a
                manual reading; simulated values are not substituted here.
              </p>
            )}

            <p className="break-words text-[10px] leading-relaxed text-[var(--arogya-text-muted)]">
              {cardiovascular.referenceDisclaimer}
            </p>
          </div>

          <SimulatedSummary astronautId={astronaut.id} />
        </Card>

        <Card padding="md" className="min-w-0 space-y-3">
          <HealthCardHeader
            title="Musculoskeletal overview"
            subtitle="Recorded countermeasures and pain self-report"
            action={<PanelLink to="/check-in">Open Check-In</PanelLink>}
          />
          <CoverageLine window={musculoskeletal.window} noun="recorded check-ins" />

          {musculoskeletal.hasData ? (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <MetricTile
                label="Exercise adherence"
                value={`${musculoskeletal.exerciseDays} of ${musculoskeletal.window.recordedDays}`}
                unit="days"
                detail={`${musculoskeletal.exerciseAdherencePercent}% of recorded check-in days`}
                icon={Dumbbell}
              />
              <MetricTile
                label="Aerobic minutes"
                value={String(musculoskeletal.totalExerciseMinutes)}
                unit="min"
                detail={`Average ${musculoskeletal.averageExerciseMinutes} min per recorded day`}
                icon={Activity}
              />
              <MetricTile
                label="Resistance sessions"
                value={String(musculoskeletal.resistanceSessions)}
                unit="sessions"
                detail={`${musculoskeletal.totalResistanceMinutes} min recorded`}
                icon={Bone}
              />
              <MetricTile
                label="Pain self-report"
                value={
                  musculoskeletal.latestPainScore == null
                    ? 'Not recorded'
                    : `${musculoskeletal.latestPainScore}/10`
                }
                missing={musculoskeletal.latestPainScore == null}
                detail={
                  musculoskeletal.averagePainScore == null
                    ? 'No pain scores recorded in this window.'
                    : `Average ${trimmed(musculoskeletal.averagePainScore)}/10 · highest ${
                        musculoskeletal.highestPainScore
                      }/10`
                }
                icon={Bone}
              />
            </div>
          ) : (
            <EmptyRecordedState
              message={`No recorded check-ins in the selected window for ${astronaut.fullName}.`}
              detail="Musculoskeletal observations are never inferred from the cardiovascular simulation stream."
              to="/check-in"
              cta="Record a check-in"
            />
          )}

          <p className="break-words text-[10px] leading-relaxed text-[var(--arogya-text-muted)]">
            Self-reported check-in data; not a diagnostic assessment. Simulated scenarios do not
            model musculoskeletal observations.
          </p>
        </Card>

        <Card padding="md" className="min-w-0 space-y-3">
          <HealthCardHeader
            title="Sleep and recovery overview"
            subtitle="Recorded sleep, fatigue, stress, mood, and focus self-reports"
            action={<PanelLink to="/check-in">Open Check-In</PanelLink>}
          />
          <CoverageLine window={sleep.window} noun="recorded check-ins" />

          {sleep.hasData ? (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <MetricTile
                label="Average sleep"
                value={
                  sleep.averageSleepHours == null
                    ? 'Not recorded'
                    : sleep.averageSleepHours.toFixed(1)
                }
                unit="h"
                detail={`Latest ${sleep.latestSleepHours ?? 'missing'} h · personal target ${
                  sleep.sleepTargetHours
                } h`}
                icon={Moon}
              />
              <MetricTile
                label="Sleep quality"
                value={
                  sleep.averageSleepQuality == null
                    ? 'Not recorded'
                    : trimmed(sleep.averageSleepQuality)
                }
                unit="/ 5"
                detail="Recorded 1–5 quality scale"
                icon={Moon}
              />
              <MetricTile
                label="Fatigue"
                value={
                  sleep.averageFatigueLevel == null
                    ? 'Not recorded'
                    : trimmed(sleep.averageFatigueLevel)
                }
                unit="/ 5"
                detail="Recorded 1–5 scale; higher is more fatigue"
                icon={Activity}
              />
              <MetricTile
                label="Stress"
                value={
                  sleep.averageStressLevel == null
                    ? 'Not recorded'
                    : trimmed(sleep.averageStressLevel)
                }
                unit="/ 5"
                detail={`Mood ${trimmed(sleep.averageMoodScore ?? 0)}/5 · focus ${trimmed(
                  sleep.averageCognitiveFocus ?? 0
                )}/5`}
                icon={HeartPulse}
              />
            </div>
          ) : (
            <EmptyRecordedState
              message={`No recorded sleep or recovery check-ins in the selected window for ${astronaut.fullName}.`}
              detail="Sleep and recovery are not generated by the cardiovascular simulation stream."
              to="/check-in"
              cta="Record a check-in"
            />
          )}

          <p className="break-words text-[10px] leading-relaxed text-[var(--arogya-text-muted)]">
            Self-reported check-in data; the sleep target is the astronaut&apos;s personal planning
            baseline, not a clinical prescription.
          </p>
        </Card>

        <Card padding="md" className="min-w-0 space-y-3">
          <HealthCardHeader
            title="Nutrition and hydration overview"
            subtitle="Recorded intake compared with personal planning targets"
            action={<PanelLink to="/check-in">Open Check-In</PanelLink>}
          />
          <CoverageLine window={nutrition.window} noun="recorded check-ins" />

          {nutrition.hasData ? (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <MetricTile
                label="Hydration"
                value={
                  nutrition.averageHydrationLiters == null
                    ? 'Not recorded'
                    : nutrition.averageHydrationLiters.toFixed(1)
                }
                unit="L/day"
                detail={`Latest ${nutrition.latestHydrationLiters ?? 'missing'} L · target ${
                  nutrition.hydrationTargetLiters
                } L`}
                icon={Droplets}
              />
              <MetricTile
                label="Calories"
                value={
                  nutrition.averageCaloriesKcal == null
                    ? 'Not recorded'
                    : String(Math.round(nutrition.averageCaloriesKcal))
                }
                unit="kcal/day"
                detail={`Personal planning target ${nutrition.calorieTargetKcal} kcal`}
                icon={Utensils}
              />
              <MetricTile
                label="Protein"
                value={
                  nutrition.averageProteinGrams == null
                    ? 'Not recorded'
                    : String(Math.round(nutrition.averageProteinGrams))
                }
                unit="g/day"
                detail="Recorded intake across unique check-in days"
                icon={Salad}
              />
              <MetricTile
                label="Recorded days"
                value={String(nutrition.window.recordedDays)}
                unit="days"
                detail="Unique mission days with a recorded check-in"
                icon={Activity}
              />
            </div>
          ) : (
            <EmptyRecordedState
              message={`No recorded nutrition or hydration check-ins in the selected window for ${astronaut.fullName}.`}
              detail="Nutrition and hydration are not generated by the cardiovascular simulation stream."
              to="/check-in"
              cta="Record a check-in"
            />
          )}

          <p className="break-words text-[10px] leading-relaxed text-[var(--arogya-text-muted)]">
            Self-reported intake; targets are personal planning baselines and do not constitute
            dietary or clinical advice.
          </p>
        </Card>

        <Card padding="md" className="min-w-0 space-y-4 xl:col-span-3">
          <HealthCardHeader
            title="NASA research context"
            subtitle="Bundled OSD-575 Inspiration4 serum CMP · archived research, not crew telemetry"
            action={<PanelLink to="/research">Open Research Context</PanelLink>}
          />

          <div
            role="note"
            className="rounded-lg border border-[#6B21A8]/25 bg-[#FAF5FF] p-3 text-[11px] leading-relaxed text-[#6B21A8]"
          >
            <p className="font-semibold">Research context only</p>
            <p className="mt-1">
              These pseudonymous study observations are not the selected astronaut, do not
              represent the current mission phase, and are not used to calculate any Arogya
              assessment or alert.
            </p>
            <p className="mt-1">
              {researchSummary.subjectCount} source subjects · {researchSummary.sampleCount} samples
              · {researchSummary.analyteCount} analytes ·{' '}
              {researchSummary.missingMeasurementCount} missing measurements left missing.
            </p>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {researchCards.map((card) => (
              <article
                key={card.analyteId}
                className="min-w-0 rounded-lg border border-[#6B21A8]/20 bg-[#FAF5FF]/60 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <h3 className="min-w-0 break-words text-sm font-semibold text-[var(--arogya-text-primary)]">
                    {card.label}
                  </h3>
                  <MissionSourceBadge source="research" />
                </div>
                <p className="mt-1.5 break-words font-mono-tabular text-sm font-semibold text-[var(--arogya-text-primary)]">
                  {card.rangeLabel}
                </p>
                <p className="mt-0.5 break-words text-[10px] leading-relaxed text-[var(--arogya-text-secondary)]">
                  {card.observedCount} of {card.sampleCount} samples observed ·{' '}
                  {card.subjectCount} source subject{card.subjectCount === 1 ? '' : 's'}
                </p>
                <p className="mt-0.5 break-words text-[10px] leading-relaxed text-[var(--arogya-text-muted)]">
                  {card.missingCount} missing value{card.missingCount === 1 ? '' : 's'} left missing;
                  values are not interpreted.
                </p>
              </article>
            ))}
          </div>

          <p className="break-words text-[10px] leading-relaxed text-[var(--arogya-text-muted)]">
            Bundled NASA OSDR source data is reviewed in Research Context with provenance,
            source intervals, and relative sample labels. No live NASA connection is used and no
            participant linkage is attempted.
          </p>
        </Card>
      </div>
    </section>
  );
}
