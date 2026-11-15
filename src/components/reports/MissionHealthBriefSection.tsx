import {
  AlertTriangle,
  BookOpen,
  CalendarRange,
  ExternalLink,
  Info,
  Lock,
  ShieldAlert,
  Sun,
} from 'lucide-react';
import type {
  MissionHealthBrief,
  MissionHealthBriefConfidenceLevel,
  MissionHealthBriefScope,
  MissionHealthBriefShareItem,
} from '../../types';
import { MissionSourceBadge } from '../mission/MissionSourceBadge';

const CONFIDENCE_STYLES: Record<
  MissionHealthBriefConfidenceLevel,
  { label: string; className: string }
> = {
  high: {
    label: 'High confidence',
    className: 'border-[var(--arogya-success-border)] bg-[var(--arogya-success-soft)]',
  },
  moderate: {
    label: 'Moderate confidence',
    className: 'border-[var(--arogya-caution-border)] bg-[var(--arogya-caution-soft)]',
  },
  low: {
    label: 'Low confidence',
    className: 'border-[var(--arogya-warning-border)] bg-[var(--arogya-warning-soft)]',
  },
};

const ESCALATION_STYLES = {
  urgent: 'border-[var(--arogya-critical-border)] bg-[var(--arogya-critical-soft)] text-[var(--arogya-critical-text)]',
  review: 'border-[var(--arogya-caution-border)] bg-[var(--arogya-caution-soft)] text-[var(--arogya-caution-text)]',
  none: 'border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] text-[var(--arogya-text-secondary)]',
} as const;

function ShareRow({ item }: { item: MissionHealthBriefShareItem }) {
  const included = item.disposition === 'include';
  return (
    <li
      data-brief-share={item.disposition}
      className="flex items-start gap-1.5 text-[10px] leading-relaxed text-[var(--arogya-text-primary)]"
    >
      {included ? (
        <span
          className="mt-0.5 inline-flex shrink-0 items-center rounded-full border border-[var(--arogya-success-border)] bg-[var(--arogya-success-soft)] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-[var(--arogya-success-text)]"
        >
          Include
        </span>
      ) : (
        <span className="mt-0.5 inline-flex shrink-0 items-center gap-0.5 rounded-full border border-[var(--arogya-warning-border)] bg-[var(--arogya-warning-soft)] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-[var(--arogya-warning-text)]">
          <Lock className="h-2.5 w-2.5" aria-hidden="true" />
          Withhold
        </span>
      )}
      <span className="min-w-0 flex-1">{item.text}</span>
      {item.source === 'private' ? (
        <span
          data-brief-source="private"
          className="mt-0.5 inline-flex shrink-0 items-center rounded-full border border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-[var(--arogya-text-secondary)]"
        >
          Private
        </span>
      ) : (
        <MissionSourceBadge source={item.source} className="mt-0.5 shrink-0" />
      )}
    </li>
  );
}

function ScopeBlock({ scope }: { scope: MissionHealthBriefScope }) {
  const confidence = CONFIDENCE_STYLES[scope.confidence.level];
  const ScopeIcon = scope.id === 'daily' ? Sun : CalendarRange;

  return (
    <div
      data-brief-scope={scope.id}
      className="brief-scope print-report-card rounded-lg border border-[var(--arogya-border)] bg-white p-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[var(--arogya-border)] bg-[var(--arogya-bg)]">
            <ScopeIcon className="h-3.5 w-3.5 text-[var(--arogya-info)]" aria-hidden="true" />
          </span>
          <div>
            <h4 className="text-xs font-bold text-[#1E3A5F]">{scope.scopeLabel}</h4>
            <p className="text-[10px] text-[var(--arogya-text-muted)]">{scope.windowLabel}</p>
          </div>
        </div>
        <span
          data-brief-confidence={scope.confidence.level}
          className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--arogya-text-primary)] ${confidence.className}`}
        >
          {confidence.label}
        </span>
      </div>

      <p
        role="note"
        className={`mt-2 rounded-md border px-2 py-1.5 text-[10px] leading-relaxed text-[var(--arogya-text-primary)] ${confidence.className}`}
      >
        <span className="font-semibold">Confidence: {scope.confidence.label}.</span>{' '}
        {scope.confidence.note}
        {scope.confidence.gaps.length > 0 && (
          <>
            {' '}
            {scope.confidence.gaps.length} data gap
            {scope.confidence.gaps.length === 1 ? ' is' : 's are'} listed under “What data is
            missing”.
          </>
        )}
      </p>

      <div className={`mt-2 rounded-md border px-2 py-1.5 text-[10px] leading-relaxed ${ESCALATION_STYLES[scope.escalation.level]}`}>
        <p className="flex items-start gap-1.5 font-semibold">
          {scope.escalation.level === 'urgent' ? (
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          ) : (
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          )}
          <span>{scope.escalation.title}</span>
        </p>
        <p className="mt-0.5 pl-5">{scope.escalation.detail}</p>
        {scope.escalation.reasons.length > 0 && (
          <ul className="mt-1 list-disc space-y-0.5 pl-8">
            {scope.escalation.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-2.5 space-y-2">
        {scope.sections.map((section) => (
          <div
            key={section.id}
            data-brief-section={section.id}
            className="print-avoid-break"
          >
            <h5 className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--arogya-text-secondary)]">
              {section.title}
            </h5>
            {section.entries.length > 0 ? (
              <ul className="mt-0.5 space-y-1">
                {section.entries.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-start gap-1.5 text-[10px] leading-relaxed text-[var(--arogya-text-primary)]"
                  >
                    <span
                      className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[var(--arogya-text-muted)]"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">{entry.text}</span>
                    <span className="mt-0.5 flex shrink-0 flex-wrap justify-end gap-0.5">
                      {[...new Set(entry.sources.map((source) => source.source))].map((source) => (
                        <MissionSourceBadge key={source} source={source} />
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--arogya-text-muted)]">
                {section.emptyText}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="print-avoid-break mt-2.5 rounded-md border border-[var(--arogya-border)] bg-[var(--arogya-bg)] p-2">
        <h5 className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--arogya-text-secondary)]">
          <Lock className="h-3 w-3" aria-hidden="true" />
          What to share with medical support
        </h5>
        <ul className="mt-1 space-y-1">
          {scope.share.map((item, index) => (
            <ShareRow key={`${scope.id}-share-${index}`} item={item} />
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * Printable Mission Health Brief.
 *
 * Every entry carries its own source badge, so recorded evidence, simulated telemetry
 * (withheld) and bundled research context (background only) cannot be read as one pool.
 */
export function MissionHealthBriefSection({ brief }: { brief: MissionHealthBrief }) {
  return (
    <section
      aria-labelledby="mission-health-brief-heading"
      className="mt-5 space-y-3 border-t border-[var(--arogya-border)] pt-4"
    >
      <div className="print-avoid-break">
        <h3
          id="mission-health-brief-heading"
          className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#1E3A5F]"
        >
          Mission health brief
        </h3>
        <p className="mt-1 text-[10px] leading-relaxed text-[var(--arogya-text-secondary)]">
          A concise daily and weekly synthesis of recorded observations. Simulated demonstration
          telemetry and NASA research context are labelled; neither is used as crew evidence or in
          the confidence level.
        </p>
      </div>

      <div className="brief-scope-grid grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
        <ScopeBlock scope={brief.daily} />
        <ScopeBlock scope={brief.weekly} />
      </div>

      <div className="print-avoid-break grid grid-cols-1 gap-2 rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-bg)] p-2.5 md:grid-cols-3">
        <div className="flex items-start gap-1.5">
          <MissionSourceBadge source="recorded" className="mt-0.5 shrink-0" />
          <p className="text-[10px] leading-relaxed text-[var(--arogya-text-secondary)]">
            {brief.sources.recorded}
          </p>
        </div>
        <div className="flex items-start gap-1.5">
          <MissionSourceBadge source="simulated" className="mt-0.5 shrink-0" />
          <p className="text-[10px] leading-relaxed text-[var(--arogya-text-secondary)]">
            {brief.sources.simulated}
          </p>
        </div>
        <div className="flex items-start gap-1.5">
          <MissionSourceBadge source="research" className="mt-0.5 shrink-0" />
          <p className="text-[10px] leading-relaxed text-[var(--arogya-text-secondary)]">
            {brief.sources.research}
          </p>
        </div>
      </div>

      {brief.researchReferences.length > 0 && (
        <div className="print-avoid-break space-y-1">
          <h4 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--arogya-text-secondary)]">
            <BookOpen className="h-3.5 w-3.5 text-[var(--arogya-info)]" aria-hidden="true" />
            Research context (not crew data)
          </h4>
          <ul className="space-y-0.5">
            {brief.researchReferences.map((reference) => (
              <li key={reference.id} className="flex flex-wrap items-baseline gap-1.5 text-[10px]">
                <MissionSourceBadge source="research" className="shrink-0" />
                <a
                  href={reference.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open NASA source: ${reference.title}`}
                  className="inline-flex items-center gap-1 font-semibold text-[#5B21B6] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F] focus-visible:ring-offset-2"
                >
                  {reference.title}
                  <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
                </a>
                <span className="text-[var(--arogya-text-muted)]">{reference.organization}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="print-avoid-break space-y-1 border-t border-[var(--arogya-border)] pt-2">
        <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-[var(--arogya-text-secondary)]">
          <Lock className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
          <span>{brief.privacyNote}</span>
        </p>
        <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-[var(--arogya-text-muted)]">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
          <span>{brief.disclaimer}</span>
        </p>
      </div>
    </section>
  );
}
