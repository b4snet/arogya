import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChevronDown,
  ClipboardCheck,
  FileText,
  HeartPulse,
  Info,
  Orbit,
  ShieldAlert,
} from 'lucide-react';
import type {
  Astronaut,
  CheckIn,
  RecoveryBand,
  RecoveryFactor,
  RecoveryInputSource,
  RecoveryReadiness,
  RecoveryWindowDays,
  VitalReading,
} from '../../types';
import {
  buildRecoveryReadiness,
  RECOVERY_WINDOW_OPTIONS,
} from '../../engine/recoveryReadiness';
import { useSimulatedTelemetryStore } from '../../store/useSimulatedTelemetryStore';
import { StatusPill, type StatusTone } from '../ui';
import { MissionSourceBadge } from '../mission/MissionSourceBadge';
import { ResearchContextSection } from '../research/ResearchContextSection';

interface RecoveryReadinessPanelProps {
  astronaut: Astronaut;
  missionDay: number;
  checkIns: CheckIn[];
  vitals: VitalReading[];
  escalationRequired: boolean;
  escalationReasons: string[];
}

const BAND_STYLES: Record<RecoveryBand, string> = {
  ready: 'border-[var(--arogya-success-border)] bg-[var(--arogya-success-soft)]',
  monitor: 'border-[var(--arogya-warning-border)] bg-[var(--arogya-warning-soft)]',
  rest: 'border-[var(--arogya-caution-border)] bg-[var(--arogya-caution-soft)]',
};

const INPUT_SOURCE_META: Record<
  RecoveryInputSource,
  { label: string; title: string; className: string }
> = {
  recorded: {
    label: 'Recorded',
    title: 'Daily crew check-in or recorded vitals',
    className: 'border-[#1E3A5F]/25 bg-[#EFF6FF] text-[#1E3A5F]',
  },
  simulated: {
    label: 'Simulated',
    title: 'In-memory demonstration stream; excluded from the band',
    className: 'border-[#B45309]/30 bg-[#FFFBEB] text-[#92400E]',
  },
  research: {
    label: 'Research context',
    title: 'NASA OSD-575 reference context; not crew data and not used in this band',
    className: 'border-[#6B21A8]/25 bg-[#FAF5FF] text-[#6B21A8]',
  },
};

function InputSourceBadge({ source }: { source: RecoveryInputSource }) {
  const meta = INPUT_SOURCE_META[source];
  return (
    <span
      title={meta.title}
      className={`inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

function factorTone(score: number | null): StatusTone {
  if (score == null) return 'warning';
  if (score >= 80) return 'success';
  if (score >= 60) return 'warning';
  return 'caution';
}

function factorBarColor(score: number | null): string {
  if (score == null) return 'var(--arogya-border-strong)';
  if (score >= 80) return 'var(--arogya-success-text)';
  if (score >= 60) return 'var(--arogya-warning-text)';
  return 'var(--arogya-caution-text)';
}

function bandTone(readiness: RecoveryReadiness): StatusTone {
  if (readiness.escalation.level === 'urgent') return 'critical';
  if (readiness.band === 'ready') return 'success';
  if (readiness.band === 'monitor') return 'warning';
  return 'caution';
}

function FactorRow({
  factor,
  defaultOpen,
  isWeakest,
}: {
  factor: RecoveryFactor;
  defaultOpen: boolean;
  isWeakest: boolean;
}) {
  const tone = factorTone(factor.score);

  return (
    <details
      open={defaultOpen}
      className="group rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)]"
    >
      <summary className="flex min-h-12 cursor-pointer list-none flex-wrap items-center justify-between gap-2 rounded-lg p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F] focus-visible:ring-offset-2">
        <div className="min-w-0 flex-1 basis-40">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-semibold text-[var(--arogya-text-primary)]">
              {factor.label}
            </span>
            {isWeakest && (
              <span className="rounded-full border border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--arogya-text-secondary)]">
                Weakest
              </span>
            )}
          </div>
          <p className="mt-0.5 break-words text-[11px] leading-relaxed text-[var(--arogya-text-secondary)]">
            {factor.summary}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="text-right">
            <span className="block font-mono-tabular text-sm font-semibold text-[var(--arogya-text-primary)]">
              {factor.score == null ? 'Missing' : `${factor.score}/100`}
            </span>
            <span className="block font-mono-tabular text-[10px] text-[var(--arogya-text-muted)]">
              weight {factor.weight}% ·{' '}
              {factor.points == null ? 'no points' : `+${factor.points.toFixed(1)} pts`}
            </span>
          </span>
          <StatusPill
            tone={tone}
            label={
              factor.status === 'scored'
                ? 'Scored'
                : factor.status === 'partial'
                  ? 'Partial'
                  : 'Missing'
            }
          />
          <ChevronDown
            className="h-4 w-4 shrink-0 text-[var(--arogya-text-muted)] group-open:rotate-180"
            aria-hidden="true"
          />
        </div>
      </summary>

      <div className="border-t border-[var(--arogya-border)] px-3 pb-3 pt-2.5">
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--arogya-bg)]"
          role="presentation"
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${factor.score ?? 0}%`,
              backgroundColor: factorBarColor(factor.score),
            }}
          />
        </div>

        {factor.caveat && (
          <p className="mt-2 break-words text-[10px] leading-relaxed text-[var(--arogya-text-muted)]">
            {factor.caveat}
          </p>
        )}

        {factor.status === 'missing' && factor.missingReason ? (
          <p className="mt-2 break-words text-xs leading-relaxed text-[var(--arogya-warning-text)]">
            {factor.missingReason} No value was assumed.
          </p>
        ) : (
          <>
            {factor.missingReason && (
              <p className="mt-2 break-words text-[11px] leading-relaxed text-[var(--arogya-warning-text)]">
                Partial evidence: {factor.missingReason}
              </p>
            )}
            <dl className="mt-2 space-y-2">
              {factor.inputs.map((input) => (
                <div
                  key={`${factor.id}-${input.label}`}
                  className="rounded-md border border-[var(--arogya-border)] bg-[var(--arogya-surface)] p-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <dt className="text-[11px] font-medium text-[var(--arogya-text-secondary)]">
                      {input.label}
                    </dt>
                    <InputSourceBadge source={input.source} />
                  </div>
                  <dd className="mt-0.5 font-mono-tabular text-xs font-semibold text-[var(--arogya-text-primary)]">
                    {input.value}
                  </dd>
                  {input.note && (
                    <dd className="mt-0.5 break-words text-[10px] leading-relaxed text-[var(--arogya-text-muted)]">
                      {input.note}
                    </dd>
                  )}
                </div>
              ))}
            </dl>
          </>
        )}

        <p className="mt-2 break-words text-[11px] leading-relaxed text-[var(--arogya-text-secondary)]">
          <span className="font-semibold text-[var(--arogya-text-primary)]">
            Cautious next step:
          </span>{' '}
          {factor.recommendation}
        </p>
      </div>
    </details>
  );
}

function TrendSparkline({ series }: { series: number[] }) {
  if (series.length < 2) return null;

  const width = 240;
  const height = 56;
  const padding = 4;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const points = series
    .map((value, index) => {
      const x = padding + (index / (series.length - 1)) * (width - padding * 2);
      const y = height - padding - ((value - min) / span) * (height - padding * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const last = points.split(' ')[points.split(' ').length - 1].split(',');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-14 w-full"
      role="img"
      aria-label={`Simulated heart-rate trace with ${series.length} samples, from ${series[0]} to ${series[series.length - 1]} bpm`}
    >
      <polyline
        points={points}
        fill="none"
        stroke="#B45309"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill="#B45309" />
    </svg>
  );
}

function RecoveryLink({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon: typeof ClipboardCheck;
}) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-10 items-center justify-between gap-2 rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] px-3 text-xs font-semibold text-[var(--arogya-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F] focus-visible:ring-offset-2"
    >
      <span className="inline-flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-[var(--arogya-info)]" aria-hidden="true" />
        {label}
      </span>
      <ArrowRight className="h-3 w-3 shrink-0" aria-hidden="true" />
    </Link>
  );
}

export function RecoveryReadinessPanel({
  astronaut,
  missionDay,
  checkIns,
  vitals,
  escalationRequired,
  escalationReasons,
}: RecoveryReadinessPanelProps) {
  const [windowDays, setWindowDays] = useState<RecoveryWindowDays>(7);
  const simulatedPoints = useSimulatedTelemetryStore((state) => state.points);
  const simulatedAstronautId = useSimulatedTelemetryStore((state) => state.astronautId);

  const readiness = useMemo(
    () =>
      buildRecoveryReadiness({
        astronaut,
        checkIns,
        missionDay,
        vitals,
        windowDays,
        escalation: {
          required: escalationRequired,
          reasons: escalationReasons,
        },
        simulated: {
          points: simulatedPoints,
          sessionAstronautId: simulatedAstronautId,
        },
      }),
    [
      astronaut,
      checkIns,
      missionDay,
      vitals,
      windowDays,
      escalationRequired,
      escalationReasons,
      simulatedPoints,
      simulatedAstronautId,
    ]
  );

  const trend = readiness.simulatedTrend;
  const escalationPathway = readiness.escalation;
  const escalationClass =
    escalationPathway.level === 'urgent'
      ? 'border-[#DC2626]/40 bg-[#FEF2F2]'
      : escalationPathway.level === 'review'
        ? 'border-[#CA8A04]/30 bg-[#FFFBEB]'
        : 'border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)]';
  const escalationText =
    escalationPathway.level === 'urgent'
      ? 'text-[#DC2626]'
      : escalationPathway.level === 'review'
        ? 'text-[#92400E]'
        : 'text-[var(--arogya-text-primary)]';

  return (
    <section
      id="recovery-readiness"
      aria-labelledby="recovery-readiness-heading"
      className="scroll-mt-20 rounded-[var(--radius-lg)] border border-[var(--arogya-border)] bg-[var(--arogya-surface)] p-4 arogya-elevation-1 sm:p-5"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="recovery-readiness-heading"
              className="arogya-h2 font-semibold text-[var(--arogya-text-primary)]"
            >
              Recovery readiness
            </h2>
            <MissionSourceBadge source="recorded" />
          </div>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
            A transparent summary for {astronaut.fullName} built from recorded check-ins and
            vitals. The band is decision support, not a diagnosis or clinical clearance.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] leading-relaxed text-[var(--arogya-text-muted)]">
            <span className="inline-flex items-center gap-1">
              <InputSourceBadge source="recorded" /> check-ins and vitals
            </span>
            <span className="inline-flex items-center gap-1">
              <InputSourceBadge source="simulated" /> demo stream, never scored
            </span>
            <span className="inline-flex items-center gap-1">
              <InputSourceBadge source="research" /> reference only, not scored
              <Link
                to="/research"
                className="font-semibold text-[#6B21A8] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F] focus-visible:ring-offset-2"
              >
                Research
              </Link>
            </span>
          </div>
        </div>

        <div
          role="group"
          aria-label="Recovery observation window"
          className="flex flex-wrap items-center gap-1.5"
        >
          <span className="text-[11px] font-medium text-[var(--arogya-text-secondary)]">
            Window
          </span>
          {RECOVERY_WINDOW_OPTIONS.map((days) => (
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

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="min-w-0 space-y-4 lg:col-span-7">
          <div className={`rounded-xl border p-4 ${BAND_STYLES[readiness.band]}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="arogya-label text-[11px] font-semibold text-[var(--arogya-text-secondary)]">
                  Recovery band
                </p>
                <div className="mt-1 flex flex-wrap items-baseline gap-2">
                  <StatusPill
                    tone={bandTone(readiness)}
                    label={readiness.bandLabel}
                    size="md"
                  />
                  <span className="font-mono-tabular text-xl font-semibold text-[var(--arogya-text-primary)]">
                    {readiness.score == null ? 'Not scored' : `${readiness.score}/100`}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-right">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--arogya-text-secondary)]">
                    Day coverage
                  </p>
                  <p className="font-mono-tabular text-lg font-semibold text-[var(--arogya-text-primary)]">
                    {readiness.dayCoveragePercent}%
                  </p>
                </div>
                <div title="Share of factor weight backed by recorded data. Missing factors lower this.">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--arogya-text-secondary)]">
                    Evidence coverage
                  </p>
                  <p className="font-mono-tabular text-lg font-semibold text-[var(--arogya-text-primary)]">
                    {readiness.evidenceCoveragePercent}%
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-2 break-words text-xs leading-relaxed text-[var(--arogya-text-primary)]">
              {readiness.bandReason}
            </p>
            <p className="mt-1.5 break-words text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
              <span className="font-semibold text-[var(--arogya-text-primary)]">
                Cautious next step:
              </span>{' '}
              {readiness.recommendation}
            </p>
            <p className="mt-2 break-words text-[10px] leading-relaxed text-[var(--arogya-text-muted)]">
              Window: Day {readiness.window.startDay}–{readiness.window.endDay} ·{' '}
              {readiness.window.coveredDays} mission day
              {readiness.window.coveredDays === 1 ? '' : 's'} ·{' '}
              {readiness.window.recordedDays} with a check-in.
              {readiness.window.coverageNotice
                ? ` ${readiness.window.coverageNotice}`
                : ''}
            </p>
          </div>

          <div>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--arogya-text-secondary)]">
                  What contributed
                </h3>
                <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--arogya-text-muted)]">
                  Factor points = score × weight. The band score is the weighted mean of scored
                  factors only; missing factors are excluded, never assumed normal.
                </p>
              </div>
              <span className="text-right text-[10px] text-[var(--arogya-text-muted)]">
                Ready ≥ 80 · Monitor 60–79 · Rest &lt; 60 · Ready needs ≥ 60% day coverage
              </span>
            </div>

            <div className="mt-2 space-y-2">
              {readiness.factors.map((factor) => (
                <FactorRow
                  key={factor.id}
                  factor={factor}
                  defaultOpen={factor.id === readiness.weakestFactorId}
                  isWeakest={factor.id === readiness.weakestFactorId}
                />
              ))}
            </div>
          </div>

          <div
            role="note"
            className="rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-bg)] p-3"
          >
            <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-[var(--arogya-text-secondary)]">
              <Info
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--arogya-info)]"
                aria-hidden="true"
              />
              <span>
                <span className="font-semibold text-[var(--arogya-text-primary)]">
                  Missing data:
                </span>{' '}
                {readiness.missingDataNote}
              </span>
            </p>
          </div>
        </div>

        <div className="min-w-0 space-y-4 lg:col-span-5">
          <div className="rounded-xl border border-[#B45309]/25 bg-[#FFFBEB] p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[#78350F]">
                  Simulated recovery trend
                </h3>
                <MissionSourceBadge source="simulated" />
              </div>
              <span className="rounded-full border border-[#B45309]/30 bg-white/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#92400E]">
                Excluded from band
              </span>
            </div>

            {trend.available ? (
              <>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-[#B45309]/20 bg-white/60 p-2">
                    <p className="text-[10px] font-medium text-[#78350F]">Simulated heart rate</p>
                    <p className="font-mono-tabular text-lg font-semibold text-[#78350F]">
                      {trend.latestHeartRateBpm ?? '—'}{' '}
                      <span className="text-[10px] font-normal text-[#92400E]">bpm</span>
                    </p>
                  </div>
                  <div className="rounded-lg border border-[#B45309]/20 bg-white/60 p-2">
                    <p className="text-[10px] font-medium text-[#78350F]">Simulated SpO₂</p>
                    <p className="font-mono-tabular text-lg font-semibold text-[#78350F]">
                      {trend.latestSpo2Percent == null
                        ? '—'
                        : trend.latestSpo2Percent.toFixed(1)}{' '}
                      <span className="text-[10px] font-normal text-[#92400E]">%</span>
                    </p>
                  </div>
                </div>

                <div className="mt-2 rounded-lg border border-[#B45309]/20 bg-white/60 p-2">
                  <TrendSparkline series={trend.series} />
                </div>

                <p className="mt-2 break-words text-[11px] leading-relaxed text-[#78350F]">
                  <span className="font-semibold">{trend.directionLabel}</span>
                  {trend.scenarioLabel ? ` · scenario: ${trend.scenarioLabel}` : ''} ·{' '}
                  {trend.sampleCount} sample{trend.sampleCount === 1 ? '' : 's'}
                </p>
                <p className="mt-1 break-words text-[10px] leading-relaxed text-[#92400E]">
                  {trend.detail}
                </p>
              </>
            ) : (
              <p className="mt-2 break-words text-xs leading-relaxed text-[#78350F]">
                {trend.detail}
              </p>
            )}

            <p className="mt-2 break-words text-[10px] leading-relaxed text-[#92400E]">
              In-memory demonstration stream sampled in this browser tab. It is never written to
              recorded vitals, reports, or exports, and it cannot change the readiness band.
            </p>
          </div>

          <div className={`rounded-xl border p-3.5 ${escalationClass}`}>
            <div className="flex flex-wrap items-center gap-2">
              <ShieldAlert
                className={`h-4 w-4 shrink-0 ${escalationText}`}
                aria-hidden="true"
              />
              <h3 className={`text-xs font-semibold uppercase tracking-wide ${escalationText}`}>
                Escalation pathway
              </h3>
            </div>
            <p className={`mt-1.5 text-sm font-semibold ${escalationText}`}>
              {escalationPathway.title}
            </p>
            {escalationPathway.reasons.length > 0 && (
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[11px] leading-relaxed text-[var(--arogya-text-secondary)]">
                {escalationPathway.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            )}
            <p className="mt-1.5 break-words text-[11px] leading-relaxed text-[var(--arogya-text-secondary)]">
              {escalationPathway.detail}
            </p>
            <p className="mt-1.5 break-words text-[10px] leading-relaxed text-[var(--arogya-text-muted)]">
              Checks only three consecutive recorded days below 6 h sleep, three consecutive
              days with fatigue 4 or higher, or a safety escalation already recorded by the
              health engine. A single observation does not trigger this review prompt.
            </p>
            {escalationPathway.action !== 'none' && (
              <Link
                to={
                  escalationPathway.action === 'escalation_report'
                    ? '/reports?escalate=1'
                    : '/reports'
                }
                className={`mt-2 inline-flex min-h-10 items-center gap-1.5 rounded-lg text-xs font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F] focus-visible:ring-offset-2 ${escalationText}`}
              >
                {escalationPathway.action === 'escalation_report'
                  ? 'Open escalation brief'
                  : 'Review recorded findings in Reports'}
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            )}
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--arogya-text-secondary)]">
              Check the recorded detail
            </h3>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <RecoveryLink to="/check-in" label="Daily Check-In" icon={ClipboardCheck} />
              <RecoveryLink to="/vitals" label="Vitals" icon={HeartPulse} />
              <RecoveryLink to="/mission" label="Mission" icon={Orbit} />
              <RecoveryLink to="/reports" label="Reports" icon={FileText} />
            </div>
          </div>

          <p className="break-words text-[10px] leading-relaxed text-[var(--arogya-text-muted)]">
            {readiness.disclaimer}
          </p>
        </div>
      </div>

      <div className="mt-4 border-t border-[var(--arogya-border)] pt-4">
        <ResearchContextSection
          surface="recovery"
          compact
          headingId="recovery-research-context-heading"
          title="Research context for recovery areas"
          subtitle="NASA OSD-575 archived observations and NASA HRP references for these recovery areas. Background only — never this crew member’s data."
        />
      </div>
    </section>
  );
}
