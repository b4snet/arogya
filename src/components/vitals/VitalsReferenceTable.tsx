import { HelpCircle, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, StatusPill, healthStatusToTone } from '../ui';
import {
  VITALS_REFERENCE_TABLE_NOTE,
  type VitalReferenceRow,
  type VitalsTrendDirection,
} from '../../engine/vitalsReference';

function TrendBadge({
  direction,
  label,
}: {
  direction: VitalsTrendDirection;
  label: string;
}) {
  const Icon =
    direction === 'rising'
      ? TrendingUp
      : direction === 'falling'
      ? TrendingDown
      : direction === 'stable'
      ? Minus
      : HelpCircle;

  const toneClass =
    direction === 'rising'
      ? 'text-[#38BDF8]'
      : direction === 'falling'
      ? 'text-[#FACC15]'
      : direction === 'stable'
      ? 'text-[var(--arogya-text-secondary)]'
      : 'text-[var(--arogya-text-muted)]';

  return (
    <span className={`inline-flex items-center gap-1.5 font-mono-tabular text-xs ${toneClass}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

function RowStatusBadge({ row }: { row: VitalReferenceRow }) {
  if (row.status === 'missing') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-[var(--arogya-border-strong)] bg-white/[0.04] px-2 py-0.5 text-xs font-medium text-[var(--arogya-text-secondary)]">
        <HelpCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>Missing</span>
      </span>
    );
  }
  return <StatusPill tone={healthStatusToTone(row.status)} label={row.statusLabel} />;
}

export function VitalsReferenceTable({
  rows,
  astronautName,
}: {
  rows: VitalReferenceRow[];
  astronautName: string;
}) {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="border-b border-[var(--arogya-border)] px-4 py-4 sm:px-6">
        <h2 className="arogya-h2 text-[var(--arogya-text-primary)]">
          Biometric Reference-Range & Escalation Matrix
        </h2>
        <p className="mt-1 text-xs text-[var(--arogya-text-secondary)]">
          Comparing latest readings for {astronautName} separately against general adult educational ranges and personal pre-flight baselines.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1160px] border-collapse text-left text-xs">
          <caption className="sr-only">
            Reference-range comparison table for {astronautName} showing latest value, unit, general adult reference range, personal baseline, trend direction, status, explanation, recommended action, and escalation threshold.
          </caption>
          <thead>
            <tr className="border-b border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] text-[11px] font-semibold text-[var(--arogya-text-secondary)]">
              <th scope="col" className="px-4 py-3">Vital Sign</th>
              <th scope="col" className="px-3 py-3">Latest Value</th>
              <th scope="col" className="px-3 py-3">Unit</th>
              <th scope="col" className="px-3 py-3">General Adult Range</th>
              <th scope="col" className="px-3 py-3">Personal Baseline</th>
              <th scope="col" className="px-3 py-3">Trend Direction</th>
              <th scope="col" className="px-3 py-3">Status</th>
              <th scope="col" className="min-w-[210px] px-3 py-3">Explanation</th>
              <th scope="col" className="min-w-[190px] px-3 py-3">Recommended Action</th>
              <th scope="col" className="min-w-[180px] px-4 py-3">Escalation Threshold</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--arogya-border)]">
            {rows.map((row) => {
              const isMissing = row.latestNumeric === null;
              return (
                <tr
                  key={row.id}
                  className="align-top transition-colors hover:bg-white/[0.02]"
                >
                  <th
                    scope="row"
                    className="px-4 py-3.5 font-semibold text-[var(--arogya-text-primary)]"
                  >
                    {row.name}
                  </th>
                  <td
                    className={`px-3 py-3.5 font-mono-tabular font-semibold whitespace-nowrap ${
                      isMissing ? 'text-[#FACC15]' : 'text-[var(--arogya-text-primary)]'
                    }`}
                  >
                    {row.latestFormatted}
                  </td>
                  <td className="px-3 py-3.5 font-mono-tabular text-[var(--arogya-text-secondary)] whitespace-nowrap">
                    {row.unit}
                  </td>
                  <td className="px-3 py-3.5 font-mono-tabular text-[var(--arogya-text-secondary)]">
                    {row.generalReferenceRange}
                  </td>
                  <td className="px-3 py-3.5 font-mono-tabular text-[#38BDF8]">
                    {row.personalBaseline}
                  </td>
                  <td className="px-3 py-3.5 whitespace-nowrap">
                    <TrendBadge direction={row.trendDirection} label={row.trendLabel} />
                  </td>
                  <td className="px-3 py-3.5 whitespace-nowrap">
                    <RowStatusBadge row={row} />
                  </td>
                  <td className="px-3 py-3.5 leading-relaxed text-[var(--arogya-text-secondary)]">
                    {row.explanation}
                  </td>
                  <td className="px-3 py-3.5 leading-relaxed text-[var(--arogya-text-primary)]">
                    {row.recommendedAction}
                  </td>
                  <td className="px-4 py-3.5 leading-relaxed font-mono-tabular text-[11px] text-[#FB923C]">
                    {row.escalationThreshold}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mandatory Cautious Reference-Range Note */}
      <div className="border-t border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] px-4 py-3.5 sm:px-6">
        <p className="text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
          {VITALS_REFERENCE_TABLE_NOTE}
        </p>
      </div>
    </Card>
  );
}
