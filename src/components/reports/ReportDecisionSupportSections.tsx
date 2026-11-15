import { AlertTriangle, BookOpen, ExternalLink, ShieldAlert } from 'lucide-react';
import type {
  CountermeasureCoachPlan,
  CountermeasureItem,
  RecoveryBand,
  RecoveryReadiness,
  RecoveryFactorStatus,
  ReportDataGap,
  ReportExecutiveSummary,
  ReportReferenceContext,
  ReportTrendItem,
} from '../../types';
import { REPORT_DECISION_DISCLAIMER } from '../../engine/reportDecisionSupport';
import { MissionSourceBadge } from '../mission/MissionSourceBadge';

const BAND_STYLES: Record<RecoveryBand, string> = {
  ready: 'border-[var(--arogya-success-border)] bg-[var(--arogya-success-soft)]',
  monitor: 'border-[var(--arogya-warning-border)] bg-[var(--arogya-warning-soft)]',
  rest: 'border-[var(--arogya-caution-border)] bg-[var(--arogya-caution-soft)]',
};

const FACTOR_STATUS_LABELS: Record<RecoveryFactorStatus, string> = {
  scored: 'Scored',
  partial: 'Partial',
  missing: 'Missing',
};

const COUNTERMEASURE_STATUS_STYLES: Record<CountermeasureItem['status'], string> = {
  on_track:
    'border-[var(--arogya-success-border)] bg-[var(--arogya-success-soft)] text-[var(--arogya-success-text)]',
  review:
    'border-[var(--arogya-caution-border)] bg-[var(--arogya-caution-soft)] text-[var(--arogya-caution-text)]',
  missing:
    'border-[var(--arogya-warning-border)] bg-[var(--arogya-warning-soft)] text-[var(--arogya-warning-text)]',
};

const TREND_LABEL: Record<ReportTrendItem['direction'], string> = {
  improving: 'Improving',
  worsening: 'Worsening',
  stable: 'Stable',
  insufficient: 'Insufficient data',
};

function ReportSectionHeading({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="print-avoid-break flex flex-wrap items-center gap-2">
      <h3 id={id} className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#1E3A5F]">
        {children}
      </h3>
      <MissionSourceBadge source="recorded" />
    </div>
  );
}

export function ReportExecutiveSummarySection({
  summary,
}: {
  summary: ReportExecutiveSummary;
}) {
  return (
    <section aria-labelledby="report-executive-summary-heading" className="mt-5 space-y-2">
      <ReportSectionHeading id="report-executive-summary-heading">
        Executive summary
      </ReportSectionHeading>
      <div className="print-report-card rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-3">
        <p className="text-xs font-semibold text-[var(--arogya-text-primary)]">
          {summary.headline}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-[var(--arogya-text-secondary)]">
          {summary.overview}
        </p>

        <ul className="mt-2 grid grid-cols-1 gap-x-5 gap-y-1 text-[11px] leading-relaxed text-[var(--arogya-text-primary)] md:grid-cols-2">
          {summary.keyPoints.map((point) => (
            <li key={point} className="flex items-start gap-1.5">
              <span
                className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[var(--arogya-text-muted)]"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">{point}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-2 grid grid-cols-1 gap-1 border-t border-[var(--arogya-border)] pt-2 text-[10px] leading-relaxed md:grid-cols-2">
          <div>
            <dt className="font-semibold uppercase tracking-wider text-[var(--arogya-text-secondary)]">
              Data confidence
            </dt>
            <dd className="text-[var(--arogya-text-primary)]">{summary.confidenceLine}</dd>
          </div>
          <div>
            <dt className="font-semibold uppercase tracking-wider text-[var(--arogya-text-secondary)]">
              Review timing
            </dt>
            <dd className="text-[var(--arogya-text-primary)]">{summary.reviewPrompt}</dd>
          </div>
          <div className="md:col-span-2">
            <dt className="font-semibold uppercase tracking-wider text-[var(--arogya-text-secondary)]">
              Escalation
            </dt>
            <dd className="text-[var(--arogya-text-primary)]">{summary.escalationLine}</dd>
          </div>
        </dl>

        <p className="mt-2 text-[10px] leading-relaxed text-[var(--arogya-text-muted)]">
          {REPORT_DECISION_DISCLAIMER}
        </p>
      </div>
    </section>
  );
}

export function ReportRecoverySection({ recovery }: { recovery: RecoveryReadiness }) {
  return (
    <section aria-labelledby="report-recovery-heading" className="mt-5 space-y-2">
      <ReportSectionHeading id="report-recovery-heading">
        Recovery readiness result
      </ReportSectionHeading>

      <div
        className={`print-report-card rounded-lg border p-3 ${BAND_STYLES[recovery.band]}`}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-sm font-bold text-[var(--arogya-text-primary)]">
            {recovery.bandLabel}
          </p>
          <span className="font-mono-tabular text-xs font-semibold text-[var(--arogya-text-primary)]">
            {recovery.score == null ? 'Not scored' : `${recovery.score}/100`}
          </span>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-[var(--arogya-text-primary)]">
          {recovery.bandReason}
        </p>
        <p className="mt-1 font-mono-tabular text-[10px] text-[var(--arogya-text-secondary)]">
          {recovery.window.recordedDays} of {recovery.window.coveredDays} recorded mission days ·{' '}
          {recovery.dayCoveragePercent}% day coverage · {recovery.evidenceCoveragePercent}% of factor
          weight backed by recorded data · {recovery.window.requestedDays}-day decision window
        </p>
      </div>

      <div className="report-table-scroll overflow-x-auto rounded-lg border border-[var(--arogya-border)]">
        <table className="report-table w-full min-w-[520px] border-collapse text-left text-[11px]">
          <caption className="sr-only">
            Recorded recovery factors, scores, weights, and data status.
          </caption>
          <thead>
            <tr className="bg-[var(--arogya-surface-elevated)] text-[10px] uppercase tracking-wider text-[var(--arogya-text-secondary)]">
              <th scope="col" className="px-2.5 py-1.5 font-semibold">Factor</th>
              <th scope="col" className="px-2.5 py-1.5 font-semibold">Score</th>
              <th scope="col" className="px-2.5 py-1.5 font-semibold">Weight</th>
              <th scope="col" className="px-2.5 py-1.5 font-semibold">Points</th>
              <th scope="col" className="px-2.5 py-1.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--arogya-border)]">
            {recovery.factors.map((factor) => (
              <tr key={factor.id} className="align-top break-inside-avoid">
                <th scope="row" className="px-2.5 py-1.5 font-medium text-[var(--arogya-text-primary)]">
                  {factor.label}
                </th>
                <td className="px-2.5 py-1.5 font-mono-tabular text-[var(--arogya-text-secondary)]">
                  {factor.score ?? '—'}
                </td>
                <td className="px-2.5 py-1.5 font-mono-tabular text-[var(--arogya-text-secondary)]">
                  {factor.weight}
                </td>
                <td className="px-2.5 py-1.5 font-mono-tabular text-[var(--arogya-text-secondary)]">
                  {factor.points ?? '—'}
                </td>
                <td className="px-2.5 py-1.5 text-[var(--arogya-text-secondary)]">
                  {FACTOR_STATUS_LABELS[factor.status]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="print-avoid-break space-y-1">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--arogya-text-secondary)]">
          Factor explanations
        </h4>
        <ul className="list-disc space-y-1 pl-4 text-[11px] leading-relaxed text-[var(--arogya-text-primary)]">
          {recovery.factors.map((factor) => (
            <li key={factor.id}>
              <span className="font-medium">{factor.label}:</span> {factor.summary}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-[11px] leading-relaxed text-[var(--arogya-text-primary)]">
        <span className="font-semibold">Missing data:</span> {recovery.missingDataNote}
      </p>
      <p className="text-[11px] leading-relaxed text-[var(--arogya-text-primary)]">
        <span className="font-semibold">Recorded-data recommendation:</span>{' '}
        {recovery.recommendation}
      </p>

      <div
        className={`print-avoid-break rounded-md border px-2.5 py-2 text-[11px] leading-relaxed ${
          recovery.escalation.level === 'urgent'
            ? 'border-[var(--arogya-critical-border)] bg-[var(--arogya-critical-soft)] text-[var(--arogya-critical-text)]'
            : 'border-[var(--arogya-border)] bg-[var(--arogya-bg)] text-[var(--arogya-text-secondary)]'
        }`}
      >
        <p className="flex items-start gap-1.5 font-semibold">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{recovery.escalation.title}</span>
        </p>
        <p className="mt-0.5 pl-5">{recovery.escalation.detail}</p>
        {recovery.escalation.reasons.length > 0 && (
          <ul className="mt-1 list-disc space-y-0.5 pl-8">
            {recovery.escalation.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-[10px] leading-relaxed text-[var(--arogya-text-muted)]">
        {recovery.disclaimer} Simulated demonstration streams are excluded from this section.
      </p>
    </section>
  );
}

export function ReportCountermeasureSection({
  plan,
}: {
  plan: CountermeasureCoachPlan;
}) {
  const focusItem = plan.items.find((item) => item.id === plan.focusItemId);
  return (
    <section aria-labelledby="report-countermeasures-heading" className="mt-5 space-y-2">
      <ReportSectionHeading id="report-countermeasures-heading">
        Countermeasure adherence
      </ReportSectionHeading>
      <p className="text-[11px] leading-relaxed text-[var(--arogya-text-secondary)]">
        {plan.summary} Status reflects whether the planned countermeasure was recorded; it is an
        adherence view, not a fitness or treatment assessment.
      </p>

      <div className="report-table-scroll overflow-x-auto rounded-lg border border-[var(--arogya-border)]">
        <table className="report-table w-full min-w-[560px] border-collapse text-left text-[11px]">
          <caption className="sr-only">
            Recorded countermeasure adherence and planning references.
          </caption>
          <thead>
            <tr className="bg-[var(--arogya-surface-elevated)] text-[10px] uppercase tracking-wider text-[var(--arogya-text-secondary)]">
              <th scope="col" className="px-2.5 py-1.5 font-semibold">Area</th>
              <th scope="col" className="px-2.5 py-1.5 font-semibold">Status</th>
              <th scope="col" className="px-2.5 py-1.5 font-semibold">Recorded status</th>
              <th scope="col" className="px-2.5 py-1.5 font-semibold">Planning reference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--arogya-border)]">
            {plan.items.map((item) => (
              <tr key={item.id} className="align-top break-inside-avoid">
                <th scope="row" className="px-2.5 py-1.5 font-medium text-[var(--arogya-text-primary)]">
                  {item.label}
                </th>
                <td className="px-2.5 py-1.5">
                  <span
                    className={`inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${COUNTERMEASURE_STATUS_STYLES[item.status]}`}
                  >
                    {item.statusLabel}
                  </span>
                </td>
                <td className="px-2.5 py-1.5 text-[var(--arogya-text-secondary)]">
                  {item.currentStatus}
                </td>
                <td className="px-2.5 py-1.5 text-[var(--arogya-text-secondary)]">
                  {item.plannedTarget ?? 'No fixed planning reference'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="print-avoid-break rounded-md border border-[var(--arogya-border)] bg-[var(--arogya-bg)] p-2.5 text-[11px] leading-relaxed">
        <p className="font-semibold text-[var(--arogya-text-primary)]">
          {focusItem ? `Suggested planning focus: ${focusItem.label}` : 'Suggested planning focus'}
        </p>
        <p className="mt-0.5 text-[var(--arogya-text-secondary)]">
          {focusItem
            ? focusItem.suggestedAction
            : 'All six countermeasure areas have recorded data and are on track; continue the current cadence.'}
        </p>
        <p className="mt-1 text-[10px] text-[var(--arogya-text-muted)]">{plan.disclaimer}</p>
      </div>
    </section>
  );
}

export function ReportTrendsReferenceSection({
  trends,
  references,
}: {
  trends: ReportTrendItem[];
  references: ReportReferenceContext[];
}) {
  return (
    <section aria-labelledby="report-trends-context-heading" className="mt-5 space-y-2">
      <ReportSectionHeading id="report-trends-context-heading">
        Trends and reference context
      </ReportSectionHeading>
      <p className="text-[10px] leading-relaxed text-[var(--arogya-text-secondary)]">
        Trends compare the report window with the crew member&apos;s personal planning baseline.
        Personal references are organizational planning targets, not clinical prescriptions.
        Simulated streams are excluded.
      </p>

      {trends.length > 0 && (
        <div className="report-table-scroll overflow-x-auto rounded-lg border border-[var(--arogya-border)]">
          <table className="report-table w-full min-w-[520px] border-collapse text-left text-[11px]">
            <caption className="sr-only">
              Recorded period trends compared with the crew member&apos;s personal baseline.
            </caption>
            <thead>
              <tr className="bg-[var(--arogya-surface-elevated)] text-[10px] uppercase tracking-wider text-[var(--arogya-text-secondary)]">
                <th scope="col" className="px-2.5 py-1.5 font-semibold">Metric</th>
                <th scope="col" className="px-2.5 py-1.5 font-semibold">Period summary</th>
                <th scope="col" className="px-2.5 py-1.5 font-semibold">vs personal baseline</th>
                <th scope="col" className="px-2.5 py-1.5 font-semibold">Direction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--arogya-border)]">
              {trends.map((trend) => (
                <tr key={trend.metric} className="align-top break-inside-avoid">
                  <th scope="row" className="px-2.5 py-1.5 font-medium text-[var(--arogya-text-primary)]">
                    {trend.metric}
                  </th>
                  <td className="px-2.5 py-1.5 text-[var(--arogya-text-secondary)]">
                    {trend.periodSummary}
                  </td>
                  <td className="px-2.5 py-1.5 text-[var(--arogya-text-secondary)]">
                    {trend.baselineComparison}
                  </td>
                  <td className="px-2.5 py-1.5 font-medium text-[var(--arogya-text-primary)]">
                    {TREND_LABEL[trend.direction]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="print-avoid-break space-y-1 rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-bg)] p-2.5">
        <h4 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--arogya-text-secondary)]">
          <BookOpen className="h-3.5 w-3.5 text-[var(--arogya-info)]" aria-hidden="true" />
          Research context — not crew data
        </h4>
        {references.length > 0 ? (
          <ul className="space-y-1">
            {references.map((reference) => (
              <li key={reference.id} className="flex flex-wrap items-baseline gap-1.5 text-[10px]">
                <MissionSourceBadge source="research" className="shrink-0" />
                <a
                  href={reference.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open NASA source: ${reference.title}`}
                  className="inline-flex items-center gap-1 font-semibold text-[#5B21B6] underline underline-offset-2"
                >
                  {reference.title}
                  <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
                </a>
                <span className="text-[var(--arogya-text-muted)]">{reference.organization}</span>
                <span className="text-[var(--arogya-text-secondary)]">
                  Used for: {reference.usedFor}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[10px] leading-relaxed text-[var(--arogya-text-muted)]">
            No bundled research reference applies to the recorded countermeasure areas in this
            report.
          </p>
        )}
        <p className="text-[10px] leading-relaxed text-[var(--arogya-text-muted)]">
          Research references describe background only. They are not this crew member&apos;s
          measurements and never set confidence or the recovery band.
        </p>
      </div>
    </section>
  );
}

export function ReportDataGapsSection({
  gaps,
  completenessPercent,
  dataQualityNote,
}: {
  gaps: ReportDataGap[];
  completenessPercent?: number;
  dataQualityNote?: string;
}) {
  return (
    <section aria-labelledby="report-data-gaps-heading" className="mt-5 space-y-2">
      <ReportSectionHeading id="report-data-gaps-heading">Data gaps</ReportSectionHeading>
      <p className="text-[11px] leading-relaxed text-[var(--arogya-text-secondary)]">
        Missing values are not imputed, treated as normal, or replaced with simulated data.
        {completenessPercent != null
          ? ` Telemetry completeness: ${completenessPercent}%.`
          : ''}
        {dataQualityNote ? ` ${dataQualityNote}` : ''}
      </p>

      {gaps.length > 0 ? (
        <ul className="print-avoid-break space-y-1.5 rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-bg)] p-2.5">
          {gaps.map((gap) => (
            <li key={gap.id} className="flex items-start gap-1.5 text-[11px] leading-relaxed">
              <AlertTriangle
                className="mt-0.5 h-3 w-3 shrink-0 text-[var(--arogya-warning-text)]"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 text-[var(--arogya-text-primary)]">
                <span className="font-semibold">{gap.label}:</span> {gap.detail}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-[var(--arogya-success-border)] bg-[var(--arogya-success-soft)] px-2.5 py-2 text-[11px] leading-relaxed text-[var(--arogya-success-text)]">
          No recorded data gaps were identified in this report window. All six recovery factors
          were scored from recorded data.
        </p>
      )}
    </section>
  );
}
