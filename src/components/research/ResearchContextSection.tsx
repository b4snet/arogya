import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, ExternalLink } from 'lucide-react';
import type {
  ResearchAnalyteObservation,
  ResearchContextCard,
  ResearchSurface,
} from '../../types';
import {
  RESEARCH_CONTEXT_SECTION_NOTE,
  buildResearchContextCardsForSurface,
} from '../../engine/researchContext';
import { MissionSourceBadge } from '../mission/MissionSourceBadge';

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function formatObservationRange(observation: ResearchAnalyteObservation): string {
  if (observation.minimum == null || observation.maximum == null) return 'Range not supplied';
  return `${formatNumber(observation.minimum)}–${formatNumber(observation.maximum)} ${observation.unit}`;
}

function ObservationList({ observations }: { observations: ResearchAnalyteObservation[] }) {
  return (
    <dl className="mt-1.5 space-y-1">
      {observations.map((observation) => (
        <div
          key={observation.analyteId}
          className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5"
        >
          <dt className="text-[10px] text-[var(--arogya-text-secondary)]">{observation.label}</dt>
          <dd className="font-mono-tabular text-[10px] font-semibold text-[var(--arogya-text-primary)]">
            {formatObservationRange(observation)}
            <span className="ml-1 font-sans text-[9px] font-normal text-[var(--arogya-text-muted)]">
              · {observation.observedCount}/{observation.sampleCount} samples
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function DatasetProvenance({ card }: { card: ResearchContextCard }) {
  if (!card.dataset) return null;
  return (
    <p className="text-[9px] leading-relaxed text-[var(--arogya-text-muted)]">
      Source: {card.dataset.studyId} Version {card.dataset.version} · DOI{' '}
      <span className="font-mono">{card.dataset.doi}</span> · License {card.dataset.license} ·{' '}
      <a
        href={card.dataset.officialUrl}
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-2 hover:text-[var(--arogya-info)]"
      >
        NASA OSDR
      </a>
    </p>
  );
}

export function ResearchContextCardView({
  card,
  compact = false,
}: {
  card: ResearchContextCard;
  compact?: boolean;
}) {
  return (
    <article
      data-research-area={card.id}
      className={`print-avoid-break flex min-w-0 flex-col rounded-lg border border-[#6B21A8]/20 bg-[var(--arogya-surface)] ${
        compact ? 'gap-2 p-3' : 'gap-2.5 p-3.5'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h4 className="text-sm font-semibold leading-snug text-[var(--arogya-text-primary)]">
          {card.label}
        </h4>
        <MissionSourceBadge source="research" />
      </div>

      <div>
        <p className="text-[9px] font-semibold uppercase tracking-wide text-[#6B21A8]">
          Why it matters in spaceflight
        </p>
        <p className="mt-0.5 break-words text-[11px] leading-relaxed text-[var(--arogya-text-secondary)]">
          {card.whyItMatters}
        </p>
      </div>

      {card.observations.length > 0 ? (
        <div className="rounded-md border border-[#6B21A8]/15 bg-[#FAF5FF] p-2">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-[#6B21A8]">
              Bundled OSD-575 context
            </p>
            <span className="text-[9px] text-[var(--arogya-text-muted)]">Archived source observations</span>
          </div>
          <ObservationList observations={card.observations} />
          <p className="mt-1.5 break-words text-[9px] leading-relaxed text-[var(--arogya-text-muted)]">
            {card.datasetNote}
          </p>
        </div>
      ) : (
        <p className="rounded-md border border-[var(--arogya-border)] bg-[var(--arogya-bg)] p-2 text-[10px] leading-relaxed text-[var(--arogya-text-muted)]">
          {card.datasetNote}
        </p>
      )}

      {card.references.length > 0 && (
        <ul className="space-y-1.5">
          {card.references.map((reference) => (
            <li key={reference.id} className="min-w-0">
              <a
                href={reference.url}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open NASA source: ${reference.title}`}
                className="inline-flex items-start gap-1 break-words text-[10px] font-semibold leading-snug text-[#5B21B6] underline underline-offset-2 hover:text-[#4C1D95]"
              >
                {reference.title}
                <ExternalLink className="mt-0.5 h-2.5 w-2.5 shrink-0" aria-hidden="true" />
              </a>
              <p className="text-[9px] leading-relaxed text-[var(--arogya-text-muted)]">
                {reference.organization} · {reference.topic}
              </p>
              {!compact && (
                <p className="mt-0.5 break-words text-[9px] leading-relaxed text-[var(--arogya-text-secondary)]">
                  {reference.summary}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <p
        role="note"
        className="rounded-md border border-[var(--arogya-warning-border)] bg-[var(--arogya-warning-soft)] px-2 py-1.5 text-[9px] leading-relaxed text-[var(--arogya-warning-text)]"
      >
        {card.crewDataNote}
      </p>

      <div className="mt-auto flex flex-wrap items-end justify-between gap-2 border-t border-[var(--arogya-border)] pt-2">
        <div className="min-w-0">
          <DatasetProvenance card={card} />
          <p className="text-[9px] text-[var(--arogya-text-muted)]">
            {card.observations.length > 0 ? 'Research observation' : 'NASA reference context'} · not
            crew data
          </p>
        </div>
        <Link
          to={card.researchHref}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[#6B21A8]/25 bg-[#FAF5FF] px-2 py-1 text-[9px] font-semibold text-[#6B21A8] hover:bg-white"
        >
          Research Context
          <ArrowRight className="h-2.5 w-2.5" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

export function ResearchContextEvidence({ card }: { card: ResearchContextCard }) {
  return (
    <div
      data-research-area={card.id}
      className="mt-2 rounded-md border border-[#6B21A8]/20 bg-[#FAF5FF] p-2"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <MissionSourceBadge source="research" />
        <span className="text-[9px] font-semibold uppercase tracking-wide text-[#6B21A8]">
          OSD-575 research context · not crew data
        </span>
      </div>
      {card.observations.length > 0 ? (
        <>
          <ObservationList observations={card.observations} />
          <p className="mt-1 break-words text-[9px] leading-relaxed text-[var(--arogya-text-muted)]">
            {card.datasetNote}
          </p>
        </>
      ) : (
        <p className="mt-1 break-words text-[9px] leading-relaxed text-[var(--arogya-text-muted)]">
          {card.datasetNote}
        </p>
      )}
      <div className="mt-1.5 flex flex-wrap items-end justify-between gap-2 border-t border-[#6B21A8]/15 pt-1.5">
        <DatasetProvenance card={card} />
        <Link
          to={card.researchHref}
          className="inline-flex items-center gap-1 text-[9px] font-semibold text-[#6B21A8] underline underline-offset-2 hover:text-[#4C1D95]"
        >
          Research Context
          <ArrowRight className="h-2.5 w-2.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

export function ResearchContextSection({
  surface,
  cards,
  title = 'Research context',
  subtitle = 'NASA OSD-575 archived observations and NASA Human Research Program references. Background only — never this crew member’s data.',
  headingId,
  compact = false,
  className = '',
}: {
  surface?: ResearchSurface;
  cards?: ResearchContextCard[];
  title?: string;
  subtitle?: string;
  headingId?: string;
  compact?: boolean;
  className?: string;
}) {
  const resolvedCards = cards ?? (surface ? buildResearchContextCardsForSurface(surface) : []);
  if (resolvedCards.length === 0) return null;
  const id = headingId ?? 'research-context-heading';
  const Heading = compact ? 'h3' : 'h2';

  return (
    <section
      aria-labelledby={id}
      data-research-context-surface={surface ?? 'custom'}
      className={
        compact
          ? `space-y-3 ${className}`
          : `space-y-3 rounded-[var(--radius-lg)] border border-[var(--arogya-border)] bg-[var(--arogya-surface)] p-4 arogya-elevation-1 sm:p-5 ${className}`
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Heading
              id={id}
              className={`${compact ? 'arogya-h3' : 'arogya-h2'} font-semibold text-[var(--arogya-text-primary)]`}
            >
              {title}
            </Heading>
            <MissionSourceBadge source="research" />
          </div>
          <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-[var(--arogya-text-secondary)]">
            {subtitle}
          </p>
        </div>
        <Link
          to="/research"
          className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[var(--arogya-border-strong)] bg-white px-2.5 text-[10px] font-semibold text-[var(--arogya-text-primary)] hover:bg-[var(--arogya-bg)]"
        >
          <BookOpen className="h-3 w-3 text-[var(--arogya-info)]" aria-hidden="true" />
          Research Context page
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {resolvedCards.map((card) => (
          <ResearchContextCardView key={card.id} card={card} compact={compact} />
        ))}
      </div>

      <p className="text-[9px] leading-relaxed text-[var(--arogya-text-muted)]">
        {RESEARCH_CONTEXT_SECTION_NOTE}
      </p>
    </section>
  );
}
