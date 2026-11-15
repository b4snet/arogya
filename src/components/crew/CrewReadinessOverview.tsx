import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ClipboardCheck,
  Dumbbell,
  Gauge,
  Info,
  Minus,
  Moon,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type {
  Astronaut,
  CheckIn,
  CrewMetricId,
  CrewMemberReadiness,
  CrewMetricSummary,
  CrewReadiness,
  CrewReadinessWindowDays,
  CrewTrendSummary,
  Mission,
  RecoveryBand,
  VitalReading,
} from '../../types';
import {
  buildCrewReadiness,
  CREW_READINESS_WINDOW_OPTIONS,
} from '../../engine/crewReadiness';
import { AstronautAvatar, StatusPill, type StatusTone } from '../ui';
import { MissionSourceBadge } from '../mission/MissionSourceBadge';

const BAND_ORDER: RecoveryBand[] = ['ready', 'monitor', 'rest'];

const BAND_LABELS: Record<RecoveryBand, string> = {
  ready: 'Ready',
  monitor: 'Monitor',
  rest: 'Rest & recover',
};

const BAND_STYLES: Record<RecoveryBand, string> = {
  ready: 'border-[var(--arogya-success-border)] bg-[var(--arogya-success-soft)]',
  monitor: 'border-[var(--arogya-warning-border)] bg-[var(--arogya-warning-soft)]',
  rest: 'border-[var(--arogya-caution-border)] bg-[var(--arogya-caution-soft)]',
};

const BAND_BAR_COLORS: Record<RecoveryBand, string> = {
  ready: 'var(--arogya-success-text)',
  monitor: 'var(--arogya-warning-text)',
  rest: 'var(--arogya-caution-text)',
};

const METRIC_ICONS: Record<CrewMetricId, typeof ClipboardCheck> = {
  check_in_completion: ClipboardCheck,
  sleep_regularity: Moon,
  exercise_adherence: Dumbbell,
  workload_fatigue: Gauge,
};

interface CrewReadinessOverviewProps {
  astronauts: Astronaut[];
  checkInsByAstronaut: Record<string, CheckIn[]>;
  vitalsByAstronaut: Record<string, VitalReading[]>;
  mission: Mission;
  activeAstronautId: string;
  onFocusAstronaut: (astronautId: string) => void;
}

function bandTone(member: CrewMemberReadiness): StatusTone {
  if (member.escalationLevel === 'urgent') return 'critical';
  if (member.band === 'ready') return 'success';
  if (member.band === 'monitor') return 'warning';
  if (member.band === 'rest') return 'caution';
  return 'warning';
}

function TrendBadge({ trend }: { trend: CrewTrendSummary }) {
  const Icon =
    trend.direction === 'improving'
      ? ArrowUpRight
      : trend.direction === 'worsening'
        ? ArrowDownRight
        : Minus;
  const tone =
    trend.direction === 'improving'
      ? 'text-[var(--arogya-success-text)]'
      : trend.direction === 'worsening'
        ? 'text-[var(--arogya-caution-text)]'
        : 'text-[var(--arogya-text-muted)]';

  return (
    <span
      aria-label={`Crew trend: ${trend.label}`}
      className={`inline-flex items-center gap-1 text-[10px] font-semibold ${tone}`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      <span>{trend.label}</span>
    </span>
  );
}

function MetricTile({ metric }: { metric: CrewMetricSummary }) {
  const Icon = METRIC_ICONS[metric.id];
  return (
    <article
      data-crew-metric={metric.id}
      className="min-w-0 rounded-xl border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-3.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <h3 className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--arogya-text-secondary)]">
          <Icon className="h-3.5 w-3.5 text-[var(--arogya-info)]" aria-hidden="true" />
          <span>{metric.label}</span>
        </h3>
        <MissionSourceBadge source="recorded" />
      </div>

      <div className="mt-1.5 flex flex-wrap items-baseline gap-1">
        <span className="font-mono-tabular text-xl font-semibold tracking-tight text-[var(--arogya-text-primary)]">
          {metric.score == null ? '—' : metric.score}
        </span>
        <span className="text-[11px] font-medium text-[var(--arogya-text-secondary)]">
          {metric.score == null ? 'Not scored' : '/100'}
        </span>
        <span className="ml-auto text-[10px] text-[var(--arogya-text-muted)]">
          {metric.membersWithEvidence} of {metric.memberCount} members
        </span>
      </div>

      <p className="mt-1 break-words text-[11px] leading-relaxed text-[var(--arogya-text-secondary)]">
        {metric.summary}
      </p>

      <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-[var(--arogya-border)] pt-2">
        <TrendBadge trend={metric.trend} />
        <span className="min-w-0 flex-1 break-words text-[10px] leading-relaxed text-[var(--arogya-text-muted)]">
          {metric.trend.detail}
        </span>
      </div>

      <p className="mt-1.5 break-words text-[10px] leading-relaxed text-[var(--arogya-text-muted)]">
        {metric.caveat}
      </p>
    </article>
  );
}

function DataGapItem({ gap }: { gap: CrewReadiness['dataGaps'][number] }) {
  return (
    <li className="rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-bg)] px-2.5 py-2">
      <p className="break-words text-[11px] font-semibold text-[var(--arogya-text-primary)]">
        {gap.label}
      </p>
      <p className="mt-0.5 break-words text-[10px] leading-relaxed text-[var(--arogya-text-secondary)]">
        {gap.detail}
      </p>
    </li>
  );
}

function MemberCard({
  member,
  active,
  onFocus,
}: {
  member: CrewMemberReadiness;
  active: boolean;
  onFocus: () => void;
}) {
  return (
    <article
      data-crew-member={member.astronautId}
      data-crew-band={member.band ?? 'unscored'}
      className={`min-w-0 rounded-xl border p-3.5 ${
        active
          ? 'border-[#1E3A5F] bg-[var(--arogya-selected-bg)]'
          : 'border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)]'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <AstronautAvatar
            astronautId={member.astronautId}
            fullName={member.fullName}
            size="sm"
            active={active}
          />
          <div className="min-w-0">
            <p className="break-words text-sm font-semibold text-[var(--arogya-text-primary)]">
              {member.fullName}
            </p>
            <p className="break-words text-[11px] text-[var(--arogya-text-secondary)]">
              {member.callSign} · {member.role}
            </p>
          </div>
        </div>
        {active && (
          <span className="shrink-0 rounded-full border border-[var(--arogya-border-strong)] bg-white px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--arogya-text-secondary)]">
            Focused
          </span>
        )}
      </div>

      <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-2">
        <StatusPill tone={bandTone(member)} label={member.bandLabel} />
        <span className="font-mono-tabular text-sm font-semibold text-[var(--arogya-text-primary)]">
          {member.score == null ? 'Not scored' : `${member.score}/100`}
        </span>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--arogya-bg)]">
        <div
          className="h-full rounded-full"
          style={{
            width: `${member.dayCoveragePercent}%`,
            backgroundColor: member.band ? BAND_BAR_COLORS[member.band] : 'var(--arogya-border-strong)',
          }}
        />
      </div>
      <p className="mt-1 text-[10px] text-[var(--arogya-text-muted)]">
        Day coverage {member.dayCoveragePercent}% · {member.recordedDays} of{' '}
        {member.coveredDays} days with a check-in
      </p>

      <p className="mt-1.5 break-words text-[10px] leading-relaxed text-[var(--arogya-text-secondary)]">
        {member.bandReason}
      </p>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--arogya-border)] pt-2">
        <span
          className={`text-[10px] font-medium ${
            member.openAlertCount > 0
              ? 'text-[var(--arogya-caution-text)]'
              : 'text-[var(--arogya-text-muted)]'
          }`}
        >
          {member.openAlertCount > 0
            ? `${member.openAlertCount} recorded flag${member.openAlertCount === 1 ? '' : 's'}`
            : 'No recorded flags'}
          {member.escalationLevel === 'urgent' ? ' · escalation flagged' : ''}
        </span>
        <button
          type="button"
          onClick={onFocus}
          aria-pressed={active}
          className="min-h-8 rounded-lg border border-[var(--arogya-border-strong)] bg-white px-2.5 text-[10px] font-semibold text-[var(--arogya-text-secondary)] transition-colors hover:text-[var(--arogya-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F] focus-visible:ring-offset-2"
        >
          {active ? 'Focused' : `Focus ${member.callSign}`}
        </button>
      </div>
    </article>
  );
}

function SectionHeading({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--arogya-text-secondary)]">
        {children}
      </h3>
      {action}
    </div>
  );
}

export function CrewReadinessOverview({
  astronauts,
  checkInsByAstronaut,
  vitalsByAstronaut,
  mission,
  activeAstronautId,
  onFocusAstronaut,
}: CrewReadinessOverviewProps) {
  const [windowDays, setWindowDays] = useState<CrewReadinessWindowDays>(7);

  const readiness = useMemo(
    () =>
      buildCrewReadiness({
        astronauts,
        checkInsByAstronaut,
        vitalsByAstronaut,
        mission,
        windowDays,
      }),
    [astronauts, checkInsByAstronaut, vitalsByAstronaut, mission, windowDays]
  );

  const visibleGaps = readiness.dataGaps.slice(0, 6);
  const remainingGaps = readiness.dataGaps.slice(6);
  const nonZeroSeverities = (['red', 'orange', 'yellow', 'green'] as const).filter(
    (severity) => readiness.alerts.bySeverity[severity] > 0
  );

  return (
    <section
      aria-labelledby="crew-readiness-heading"
      className="rounded-[var(--radius-lg)] border border-[var(--arogya-border)] bg-[var(--arogya-surface)] p-4 arogya-elevation-1 sm:p-5"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="crew-readiness-heading"
              className="arogya-h2 font-semibold text-[var(--arogya-text-primary)]"
            >
              Crew readiness overview
            </h2>
            <MissionSourceBadge source="recorded" />
          </div>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
            A crew-wide view built only from recorded check-ins and vitals. Readiness bands are
            monitoring support, not medical clearance, diagnosis, or a prediction.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] leading-relaxed text-[var(--arogya-text-muted)]">
            <span className="inline-flex items-center gap-1">
              <MissionSourceBadge source="recorded" /> check-ins and vitals
            </span>
            <span className="inline-flex items-center gap-1">
              <MissionSourceBadge source="simulated" /> excluded from every crew metric
            </span>
            <span className="inline-flex items-center gap-1">
              <MissionSourceBadge source="research" /> context only, not used
            </span>
          </div>
          <p className="mt-1.5 text-[10px] text-[var(--arogya-text-muted)]">
            Window: Day {readiness.window.startDay}–{readiness.window.endDay} ·{' '}
            {readiness.window.coveredDays} mission day
            {readiness.window.coveredDays === 1 ? '' : 's'}. Trends compare the two halves of
            this window.
          </p>
        </div>

        <div
          role="group"
          aria-label="Crew readiness observation window"
          className="flex flex-wrap items-center gap-1.5"
        >
          <span className="text-[11px] font-medium text-[var(--arogya-text-secondary)]">
            Window
          </span>
          {CREW_READINESS_WINDOW_OPTIONS.map((days) => (
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

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {BAND_ORDER.map((band) => (
          <div key={band} className={`rounded-lg border p-2.5 ${BAND_STYLES[band]}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--arogya-text-secondary)]">
              {BAND_LABELS[band]}
            </p>
            <p className="font-mono-tabular text-lg font-semibold text-[var(--arogya-text-primary)]">
              {readiness.bandCounts[band]}
            </p>
            <p className="text-[10px] text-[var(--arogya-text-muted)]">
              of {readiness.memberCount} crew
            </p>
          </div>
        ))}
        <div className="rounded-lg border border-dashed border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--arogya-text-secondary)]">
            Not scored
          </p>
          <p className="font-mono-tabular text-lg font-semibold text-[var(--arogya-text-primary)]">
            {readiness.bandCounts.unscored}
          </p>
          <p className="text-[10px] text-[var(--arogya-text-muted)]">
            of {readiness.memberCount} crew
          </p>
        </div>
      </div>
      <p className="mt-1.5 text-[10px] leading-relaxed text-[var(--arogya-text-muted)]">
        {readiness.bandedCount} of {readiness.memberCount} crew members have a band. A band
        requires recorded check-ins, and coverage below 60% caps a member at Monitor. Monitoring
        support only.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {readiness.metrics.map((metric) => (
          <MetricTile key={metric.id} metric={metric} />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-start gap-2 rounded-xl border border-[var(--arogya-info-border)] bg-[var(--arogya-bg)] p-3">
        <ShieldCheck
          className="mt-0.5 h-4 w-4 shrink-0 text-[var(--arogya-info)]"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--arogya-text-secondary)]">
            Crew-level next step
          </p>
          <p className="mt-0.5 break-words text-xs leading-relaxed text-[var(--arogya-text-primary)]">
            {readiness.crewRecommendation}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-3.5">
          <SectionHeading action={<MissionSourceBadge source="recorded" />}>
            Open alerts
          </SectionHeading>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
            <span className="font-mono-tabular text-2xl font-semibold text-[var(--arogya-text-primary)]">
              {readiness.alerts.openCount}
            </span>
            <span className="text-[11px] text-[var(--arogya-text-secondary)]">
              active recorded flag{readiness.alerts.openCount === 1 ? '' : 's'}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-[var(--arogya-text-secondary)]">
            {readiness.alerts.membersWithAlerts} of {readiness.memberCount} crew members flagged ·{' '}
            <span
              className={
                readiness.alerts.escalatingMembers > 0
                  ? 'font-semibold text-[var(--arogya-caution-text)]'
                  : ''
              }
            >
              {readiness.alerts.escalatingMembers} require
              {readiness.alerts.escalatingMembers === 1 ? 's' : ''} escalation review
            </span>
          </p>
          {nonZeroSeverities.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {nonZeroSeverities.map((severity) => (
                <span
                  key={severity}
                  className="rounded-full border border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] px-2 py-0.5 font-mono-tabular text-[10px] font-semibold uppercase text-[var(--arogya-text-secondary)]"
                >
                  {severity} {readiness.alerts.bySeverity[severity]}
                </span>
              ))}
            </div>
          )}
          <p className="mt-2 break-words text-[10px] leading-relaxed text-[var(--arogya-text-muted)]">
            {readiness.alerts.detail}
          </p>
          <Link
            to="/reports"
            className="mt-2 inline-flex min-h-8 items-center text-[10px] font-semibold text-[var(--arogya-info)] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F] focus-visible:ring-offset-2 rounded-sm"
          >
            Review recorded reports
          </Link>
        </div>

        <div className="min-w-0 rounded-xl border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-3.5">
          <SectionHeading action={<MissionSourceBadge source="recorded" />}>
            Data gaps
          </SectionHeading>
          <p className="mt-2 text-[11px] leading-relaxed text-[var(--arogya-text-secondary)]">
            {readiness.dataGapNote}
          </p>
          {readiness.dataGaps.length === 0 ? (
            <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-[var(--arogya-success-border)] bg-[var(--arogya-success-soft)] px-2.5 py-2 text-[10px] leading-relaxed text-[var(--arogya-success-text)]">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                Every crew member has recorded evidence for this window. Simulated streams were
                not needed and were not used.
              </span>
            </p>
          ) : (
            <>
              <ul className="mt-2 space-y-2">
                {visibleGaps.map((gap) => (
                  <DataGapItem key={gap.id} gap={gap} />
                ))}
              </ul>
              {remainingGaps.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-[10px] font-semibold text-[var(--arogya-info)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F] focus-visible:ring-offset-2">
                    Show {remainingGaps.length} more gap
                    {remainingGaps.length === 1 ? '' : 's'}
                  </summary>
                  <ul className="mt-2 space-y-2">
                    {remainingGaps.map((gap) => (
                      <DataGapItem key={gap.id} gap={gap} />
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </div>
      </div>

      <div className="mt-4 border-t border-[var(--arogya-border)] pt-4">
        <SectionHeading action={<MissionSourceBadge source="recorded" />}>
          Individual readiness bands
        </SectionHeading>
        <p className="mt-1 max-w-3xl text-[10px] leading-relaxed text-[var(--arogya-text-muted)]">
          Monitoring support only — never clinical clearance. Private crew notes and free-text
          check-in details are excluded; only band, recorded-data coverage, and open-flag counts
          appear here.
        </p>

        {readiness.members.length === 0 ? (
          <div className="mt-2 flex items-start gap-2 rounded-lg border border-dashed border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] p-3 text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
            <Users className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>No crew profiles are loaded, so no individual readiness band can be shown.</span>
          </div>
        ) : (
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {readiness.members.map((member) => (
              <MemberCard
                key={member.astronautId}
                member={member}
                active={member.astronautId === activeAstronautId}
                onFocus={() => onFocusAstronaut(member.astronautId)}
              />
            ))}
          </div>
        )}
      </div>

      <div
        role="note"
        className="mt-4 space-y-1.5 border-t border-[var(--arogya-border)] pt-3 text-[10px] leading-relaxed text-[var(--arogya-text-muted)]"
      >
        <p className="flex items-start gap-1.5">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--arogya-info)]" aria-hidden="true" />
          <span>
            <span className="font-semibold text-[var(--arogya-text-secondary)]">Privacy:</span>{' '}
            {readiness.privacyNote}
          </span>
        </p>
        <p className="flex items-start gap-1.5">
          <AlertTriangle
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--arogya-text-muted)]"
            aria-hidden="true"
          />
          <span>
            <span className="font-semibold text-[var(--arogya-text-secondary)]">Sources:</span>{' '}
            {readiness.sourceNote}
          </span>
        </p>
        <p>{readiness.disclaimer}</p>
      </div>
    </section>
  );
}
