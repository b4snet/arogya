import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BookOpen,
  ChevronDown,
  ClipboardCheck,
  Droplets,
  Dumbbell,
  ExternalLink,
  Info,
  Moon,
  Target,
  Utensils,
} from 'lucide-react';
import type {
  Astronaut,
  CheckIn,
  CountermeasureId,
  CountermeasureItem,
  CountermeasureStatus,
  RecoveryInputSource,
} from '../../types';
import {
  buildCountermeasureCoach,
  COUNTERMEASURE_COACH_WINDOW_DAYS,
} from '../../engine/countermeasureCoach';
import { buildCountermeasureResearchContext } from '../../engine/researchContext';
import { ResearchContextEvidence } from '../research/ResearchContextSection';
import { StatusPill, type StatusTone } from '../ui';

interface CountermeasureCoachPanelProps {
  astronaut: Astronaut;
  missionDay: number;
  checkIns: CheckIn[];
}

const ITEM_ICONS: Record<CountermeasureId, typeof Dumbbell> = {
  exercise: Dumbbell,
  sleep: Moon,
  hydration: Droplets,
  nutrition: Utensils,
  workload: Activity,
  check_in: ClipboardCheck,
};

const STATUS_TONE: Record<CountermeasureStatus, StatusTone> = {
  on_track: 'success',
  review: 'caution',
  missing: 'warning',
};

const STATUS_BORDER: Record<CountermeasureStatus, string> = {
  on_track: 'border-l-[var(--arogya-success-border)]',
  review: 'border-l-[var(--arogya-caution-border)]',
  missing: 'border-l-[var(--arogya-warning-border)]',
};

const SOURCE_META: Record<
  RecoveryInputSource,
  { label: string; title: string; className: string }
> = {
  recorded: {
    label: 'Recorded',
    title: 'Daily crew check-in; browser-local recorded observation',
    className: 'border-[#1E3A5F]/25 bg-[#EFF6FF] text-[#1E3A5F]',
  },
  simulated: {
    label: 'Simulated',
    title: 'In-memory demonstration stream; not used by the coach',
    className: 'border-[#B45309]/30 bg-[#FFFBEB] text-[#92400E]',
  },
  research: {
    label: 'Research context',
    title: 'Bundled NASA reference context; not crew data and not used as an input',
    className: 'border-[#6B21A8]/25 bg-[#FAF5FF] text-[#6B21A8]',
  },
};

function SourceBadge({
  source,
  label,
}: {
  source: RecoveryInputSource;
  label?: string;
}) {
  const meta = SOURCE_META[source];
  return (
    <span
      data-coach-source={source}
      title={meta.title}
      className={`inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${meta.className}`}
    >
      {label ?? meta.label}
    </span>
  );
}

function CountermeasureCard({
  item,
  isFocus,
}: {
  item: CountermeasureItem;
  isFocus: boolean;
}) {
  const Icon = ITEM_ICONS[item.id];
  const headingId = `countermeasure-${item.id}-heading`;

  return (
    <article
      aria-labelledby={headingId}
      className={`flex min-w-0 flex-col rounded-xl border border-l-4 border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-3.5 ${STATUS_BORDER[item.status]}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-bg)]">
            <Icon className="h-4 w-4 text-[var(--arogya-info)]" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3
                id={headingId}
                className="text-sm font-semibold leading-snug text-[var(--arogya-text-primary)]"
              >
                {item.label}
              </h3>
              {isFocus && (
                <span className="rounded-full border border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--arogya-text-secondary)]">
                  Focus today
                </span>
              )}
            </div>
          </div>
        </div>
        <StatusPill tone={STATUS_TONE[item.status]} label={item.statusLabel} />
      </div>

      <p className="mt-2 break-words text-xs leading-relaxed text-[var(--arogya-text-primary)]">
        {item.currentStatus}
      </p>

      {item.plannedTarget && (
        <p className="mt-1.5 flex items-start gap-1.5 break-words text-[10px] leading-relaxed text-[var(--arogya-text-muted)]">
          <Target className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-semibold text-[var(--arogya-text-secondary)]">
              Planning reference:
            </span>{' '}
            {item.plannedTarget}
          </span>
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-[var(--arogya-text-muted)]">
        {item.dataSources.length > 0 ? (
          <span className="inline-flex items-center gap-1">
            <SourceBadge source="recorded" />
            {item.dataSources.length} recorded input
            {item.dataSources.length === 1 ? '' : 's'}
          </span>
        ) : (
          <span className="font-semibold text-[var(--arogya-warning-text)]">No recorded data</span>
        )}
        {item.researchContext.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <SourceBadge source="research" />
            {item.researchContext.length} NASA reference
            {item.researchContext.length === 1 ? '' : 's'}
          </span>
        )}
        {!item.todayRecorded && item.id !== 'check_in' && (
          <span className="rounded-full border border-[var(--arogya-border)] bg-[var(--arogya-bg)] px-1.5 py-0.5 font-semibold text-[var(--arogya-text-secondary)]">
            Today not recorded
          </span>
        )}
      </div>

      <div className="mt-2.5 rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-bg)] p-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--arogya-text-secondary)]">
          Suggested next step
        </p>
        <p className="mt-1 break-words text-[11px] leading-relaxed text-[var(--arogya-text-primary)]">
          {item.suggestedAction}
        </p>
      </div>

      {item.missingDataNote && (
        <p className="mt-2 flex items-start gap-1.5 break-words text-[10px] leading-relaxed text-[var(--arogya-warning-text)]">
          <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-semibold">Missing data:</span>{' '}
            {item.missingDataNote}
          </span>
        </p>
      )}

      <details className="group mt-2.5 rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface)]">
        <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-[var(--arogya-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F] focus-visible:ring-offset-2">
          <span className="inline-flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-[var(--arogya-info)]" aria-hidden="true" />
            Why this matters, NASA context &amp; sources
          </span>
          <ChevronDown
            className="h-3.5 w-3.5 shrink-0 text-[var(--arogya-text-muted)] group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>

        <div className="border-t border-[var(--arogya-border)] px-2.5 pb-2.5 pt-2">
          <p className="break-words text-[11px] leading-relaxed text-[var(--arogya-text-secondary)]">
            {item.whyItMatters}
          </p>

          {item.researchContext.length > 0 ? (
            <div className="mt-2 space-y-2">
              {item.researchContext.map((context) => (
                <div
                  key={context.id}
                  className="rounded-md border border-[#6B21A8]/20 bg-[#FAF5FF] p-2"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <SourceBadge source="research" />
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-[#6B21A8]">
                      {context.kind === 'reference'
                        ? 'NASA research reference'
                        : 'NASA hazard framework'}
                    </span>
                  </div>
                  <a
                    href={context.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open NASA source: ${context.title}`}
                    className="mt-1 inline-flex items-start gap-1 break-words text-[11px] font-semibold leading-snug text-[#5B21B6] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F] focus-visible:ring-offset-2"
                  >
                    {context.title}
                    <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                  </a>
                  <p className="mt-0.5 break-words text-[10px] text-[var(--arogya-text-secondary)]">
                    {context.organization} · {context.topic}
                  </p>
                  <p className="mt-1 break-words text-[10px] leading-relaxed text-[var(--arogya-text-secondary)]">
                    {context.summary}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 break-words rounded-md border border-[var(--arogya-border)] bg-[var(--arogya-bg)] p-2 text-[10px] leading-relaxed text-[var(--arogya-text-muted)]">
              {item.researchGapNote ??
                'No bundled NASA research excerpt is specific to this countermeasure.'}
            </p>
          )}

          {item.researchContext.length > 0 && item.researchGapNote && (
            <p className="mt-2 break-words text-[10px] leading-relaxed text-[var(--arogya-text-muted)]">
              {item.researchGapNote}
            </p>
          )}

          <ResearchContextEvidence card={buildCountermeasureResearchContext(item.id)} />

          {item.dataSources.length > 0 && (
            <div className="mt-2">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-[var(--arogya-text-muted)]">
                Recorded inputs
              </p>
              <dl className="mt-1 space-y-1.5">
                {item.dataSources.map((source) => (
                  <div
                    key={`${item.id}-${source.label}`}
                    className="rounded-md border border-[var(--arogya-border)] bg-[var(--arogya-bg)] p-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <dt className="text-[10px] font-medium text-[var(--arogya-text-secondary)]">
                        {source.label}
                      </dt>
                      <SourceBadge source={source.source} />
                    </div>
                    <dd className="mt-0.5 break-words font-mono-tabular text-[11px] font-semibold text-[var(--arogya-text-primary)]">
                      {source.value}
                    </dd>
                    {source.note && (
                      <dd className="mt-0.5 break-words text-[9px] leading-relaxed text-[var(--arogya-text-muted)]">
                        {source.note}
                      </dd>
                    )}
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </details>
    </article>
  );
}

export function CountermeasureCoachPanel({
  astronaut,
  missionDay,
  checkIns,
}: CountermeasureCoachPanelProps) {
  const plan = useMemo(
    () =>
      buildCountermeasureCoach({
        astronaut,
        checkIns,
        missionDay,
        windowDays: COUNTERMEASURE_COACH_WINDOW_DAYS,
      }),
    [astronaut, checkIns, missionDay]
  );

  return (
    <section
      aria-labelledby="countermeasure-coach-heading"
      className="rounded-[var(--radius-lg)] border border-[var(--arogya-border)] bg-[var(--arogya-surface)] p-4 arogya-elevation-1 sm:p-5"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="countermeasure-coach-heading"
              className="arogya-h2 font-semibold text-[var(--arogya-text-primary)]"
            >
              Countermeasure coach
            </h2>
            <SourceBadge source="recorded" label="Recorded entries" />
            <SourceBadge source="research" label="NASA context" />
          </div>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
            Daily mission-health actions for {astronaut.fullName}. Six countermeasure areas are
            built from recorded check-ins; NASA references provide context only. This is
            educational planning support, not medical advice.
          </p>
        </div>
        <p className="shrink-0 text-[10px] leading-relaxed text-[var(--arogya-text-muted)]">
          Recent {plan.window.requestedDays}-day window · Day {plan.window.startDay}–
          {plan.window.endDay}
          <br />
          {plan.window.recordedDays} of {plan.window.coveredDays} mission day
          {plan.window.coveredDays === 1 ? '' : 's'} with a check-in
        </p>
      </div>

      <div className="mt-3 rounded-xl border border-[var(--arogya-border)] bg-[var(--arogya-bg)] p-3">
        <div className="flex items-start gap-2">
          <Target className="mt-0.5 h-4 w-4 shrink-0 text-[var(--arogya-info)]" aria-hidden="true" />
          <div>
            <p className="text-[11px] font-semibold text-[var(--arogya-text-primary)]">
              {plan.todayCheckInComplete ? 'Daily focus' : 'First action'}
            </p>
            <p className="mt-0.5 break-words text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
              {plan.summary}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {plan.items.map((item) => (
          <CountermeasureCard
            key={item.id}
            item={item}
            isFocus={item.id === plan.focusItemId}
          />
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-2 rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-bg)] p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-1.5 break-words text-[10px] leading-relaxed text-[var(--arogya-text-secondary)]">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--arogya-info)]" aria-hidden="true" />
          <span>{plan.disclaimer}</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/check-in"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#1E3A5F] px-3 text-[11px] font-semibold text-white transition-colors hover:bg-[#2D4A6F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F] focus-visible:ring-offset-2"
          >
            Complete today’s check-in
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
          <Link
            to="/research"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--arogya-border-strong)] bg-white px-3 text-[11px] font-semibold text-[var(--arogya-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F] focus-visible:ring-offset-2"
          >
            Research context
          </Link>
        </div>
      </div>

      {plan.window.coverageNotice && (
        <p className="mt-2 text-[10px] leading-relaxed text-[var(--arogya-text-muted)]">
          {plan.window.coverageNotice}
        </p>
      )}
    </section>
  );
}
