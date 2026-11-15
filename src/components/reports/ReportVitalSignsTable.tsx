import type { ReportVitalRow } from '../../engine/reportSnapshot';

const FLAG_CLASSES: Record<ReportVitalRow['flag'], string> = {
  within: 'border-[var(--arogya-success-border)] bg-[var(--arogya-success-soft)] text-[var(--arogya-success-text)]',
  above: 'border-[var(--arogya-caution-border)] bg-[var(--arogya-caution-soft)] text-[var(--arogya-caution-text)]',
  below: 'border-[var(--arogya-caution-border)] bg-[var(--arogya-caution-soft)] text-[var(--arogya-caution-text)]',
  unavailable: 'border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] text-[var(--arogya-text-secondary)]',
};

export function ReportVitalSignsTable({ rows }: { rows: ReportVitalRow[] }) {
  return (
    <div className="report-table-scroll overflow-x-auto">
    <table className="report-table w-full min-w-[640px] border-collapse text-left text-xs">
      <caption className="sr-only">
        Current vital signs snapshot with canonical units, reference range or target, flag, and
        measurement method for each recorded value.
      </caption>
      <thead>
        <tr className="border-y border-[var(--arogya-border-strong)] bg-[var(--arogya-surface-elevated)] text-[10px] uppercase tracking-wider text-[var(--arogya-text-secondary)]">
          <th scope="col" className="px-2 py-2 font-semibold">Test</th>
          <th scope="col" className="px-2 py-2 text-right font-semibold">Result</th>
          <th scope="col" className="px-2 py-2 font-semibold">Unit</th>
          <th scope="col" className="px-2 py-2 font-semibold">Reference range / target</th>
          <th scope="col" className="px-2 py-2 font-semibold">Flag</th>
          <th scope="col" className="px-2 py-2 font-semibold">Method</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--arogya-border)]">
        {rows.map((row) => (
          <tr key={row.id} className="align-top break-inside-avoid">
            <th scope="row" className="px-2 py-2 font-medium text-[var(--arogya-text-primary)]">
              <span className="block">{row.test}</span>
              {row.observedLabel && (
                <span className="mt-0.5 block font-mono-tabular text-[10px] font-normal text-[var(--arogya-text-muted)]">
                  {row.observedLabel}
                </span>
              )}
            </th>
            <td
              className={`px-2 py-2 text-right font-mono-tabular font-semibold ${
                row.flag === 'unavailable'
                  ? 'text-[var(--arogya-text-muted)]'
                  : 'text-[var(--arogya-text-primary)]'
              }`}
            >
              {row.result}
            </td>
            <td className="px-2 py-2 text-[var(--arogya-text-secondary)]">{row.unit}</td>
            <td className="px-2 py-2 text-[var(--arogya-text-secondary)]">
              {row.reference}
              {row.context && (
                <span className="mt-0.5 block text-[10px] text-[var(--arogya-text-muted)]">
                  {row.context}
                </span>
              )}
            </td>
            <td className="px-2 py-2">
              <span
                className={`inline-block whitespace-nowrap rounded border px-1.5 py-0.5 text-[10px] font-semibold ${FLAG_CLASSES[row.flag]}`}
              >
                {row.flagLabel}
              </span>
            </td>
            <td className="px-2 py-2 text-[10px] text-[var(--arogya-text-secondary)]">
              {row.method}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
