import type { ReportRangeCategory, ReportReferenceMatrixRow } from '../../engine/reportSnapshot';
import { RANGE_CATEGORY_LABELS } from '../../engine/reportSnapshot';

const CATEGORY_STYLES: Record<ReportRangeCategory, string> = {
  laboratory_reference_interval: 'border-[#1E3A5F]/30 bg-[#1E3A5F]/8 text-[#1E3A5F]',
  clinical_decision_threshold: 'border-[var(--arogya-critical-border)] bg-[var(--arogya-critical-soft)] text-[var(--arogya-critical-text)]',
  personal_baseline: 'border-[var(--arogya-info-border)] bg-[var(--arogya-info-soft)] text-[var(--arogya-info)]',
  behavioral_target: 'border-[var(--arogya-caution-border)] bg-[var(--arogya-caution-soft)] text-[var(--arogya-caution-text)]',
  demonstration_threshold: 'border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] text-[var(--arogya-text-secondary)]',
};

const CATEGORY_ORDER: ReportRangeCategory[] = [
  'laboratory_reference_interval',
  'clinical_decision_threshold',
  'personal_baseline',
  'behavioral_target',
  'demonstration_threshold',
];

export function ReportReferenceMatrix({ rows }: { rows: ReportReferenceMatrixRow[] }) {
  return (
    <div className="space-y-3">
      {/* Legend: the five categories are deliberately distinct, never conflated */}
      <ul className="flex flex-wrap gap-1.5 text-[10px]">
        {CATEGORY_ORDER.map((category) => (
          <li
            key={category}
            className={`rounded border px-1.5 py-0.5 font-semibold ${CATEGORY_STYLES[category]}`}
          >
            {RANGE_CATEGORY_LABELS[category]}
          </li>
        ))}
      </ul>

      <div className="report-table-scroll overflow-x-auto">
      <table className="report-table w-full min-w-[680px] border-collapse text-left text-xs">
        <caption className="sr-only">
          Reference-range and escalation matrix distinguishing laboratory reference intervals,
          clinical decision thresholds, personal baselines, behavioral targets, and demonstration
          thresholds, with the source that applies to each row.
        </caption>
        <thead>
          <tr className="border-y border-[var(--arogya-border-strong)] bg-[var(--arogya-surface-elevated)] text-[10px] uppercase tracking-wider text-[var(--arogya-text-secondary)]">
            <th scope="col" className="px-2 py-2 font-semibold">Parameter</th>
            <th scope="col" className="px-2 py-2 font-semibold">Range / target</th>
            <th scope="col" className="px-2 py-2 font-semibold">Category</th>
            <th scope="col" className="px-2 py-2 font-semibold">Source</th>
            <th scope="col" className="px-2 py-2 font-semibold">Applicability</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--arogya-border)]">
          {rows.map((row) => (
            <tr key={row.id} className="align-top break-inside-avoid">
              <th scope="row" className="px-2 py-2 font-medium text-[var(--arogya-text-primary)]">
                {row.parameter}
              </th>
              <td className="px-2 py-2 font-mono-tabular text-[var(--arogya-text-primary)]">
                {row.rangeText}
              </td>
              <td className="px-2 py-2">
                <span
                  className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-semibold ${CATEGORY_STYLES[row.category]}`}
                >
                  {row.categoryLabel}
                </span>
              </td>
              <td className="px-2 py-2 text-[10px] text-[var(--arogya-text-secondary)]">
                {row.sourceLabel}
                {row.sourceUrl && (
                  <>
                    {' '}
                    <a
                      href={row.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2"
                    >
                      reference
                    </a>
                  </>
                )}
              </td>
              <td className="px-2 py-2 text-[10px] text-[var(--arogya-text-secondary)]">
                {row.applicability}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <p className="text-[10px] leading-relaxed text-[var(--arogya-text-muted)]">
        Where a laboratory reference interval is not configured in this project, the row says so and
        is flagged for review rather than filled with an unverified range. A flag is a comparison
        against a band, never a diagnosis.
      </p>
    </div>
  );
}
