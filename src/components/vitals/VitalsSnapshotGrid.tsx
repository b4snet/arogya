import { useState } from 'react';
import {
  ChevronDown,
  Droplets,
  Gauge,
  HeartPulse,
  Minus,
  Radiation,
  Scale,
  Thermometer,
  TrendingDown,
  TrendingUp,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import type {
  VitalReferenceRow,
  VitalRowStatus,
  VitalsTrendDirection,
} from '../../engine/vitalsReference';

const VITAL_ICONS: Record<VitalReferenceRow['id'], LucideIcon> = {
  resting_hr: HeartPulse,
  systolic_bp: Gauge,
  diastolic_bp: Gauge,
  body_temp: Thermometer,
  blood_glucose: Droplets,
  body_mass: Scale,
  radiation: Radiation,
  spo2: Wind,
};

const STATUS_COLORS: Record<VitalRowStatus, string> = {
  green: '#16A34A',
  yellow: '#CA8A04',
  orange: '#EA580C',
  red: '#DC2626',
  missing: '#64748B',
};

function TrendIcon({ direction }: { direction: VitalsTrendDirection }) {
  const Icon =
    direction === 'rising'
      ? TrendingUp
      : direction === 'falling'
      ? TrendingDown
      : Minus;
  return <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
      <span className="shrink-0 text-[var(--arogya-text-muted)]">{label}</span>
      <span className="font-mono-tabular text-[var(--arogya-text-primary)] sm:text-right">
        {value}
      </span>
    </div>
  );
}

export function VitalsSnapshotGrid({
  rows,
  timeWindow,
  latestSampleLabel,
}: {
  rows: VitalReferenceRow[];
  timeWindow: number;
  latestSampleLabel: string;
}) {
  const [expandedId, setExpandedId] = useState<VitalReferenceRow['id'] | null>(null);

  return (
    <section aria-labelledby="current-vitals-heading" className="space-y-3">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="current-vitals-heading" className="arogya-h2 text-[var(--arogya-text-primary)]">
            Current Vital Signs Snapshot
          </h2>
          <p className="mt-0.5 text-xs text-[var(--arogya-text-secondary)]">
            Select a card to reveal its personal baseline, general range, and trend.
          </p>
        </div>
        <span className="w-fit rounded-md border border-[var(--arogya-border)] bg-[var(--arogya-surface)] px-2 py-1 font-mono-tabular text-[11px] text-[var(--arogya-text-secondary)]">
          Latest sample: {latestSampleLabel}
        </span>
      </div>

      <ul className="grid grid-cols-2 items-start gap-3 lg:grid-cols-4">
        {rows.map((row) => {
          const Icon = VITAL_ICONS[row.id];
          const isMissing = row.latestNumeric === null;
          const isOpen = expandedId === row.id;
          const accent = STATUS_COLORS[row.status];

          return (
            <li
              key={row.id}
              className="overflow-hidden rounded-xl border border-[var(--arogya-border)] bg-[var(--arogya-surface)] shadow-sm transition-shadow hover:shadow-md"
              style={{ borderTop: `2px solid ${accent}` }}
            >
              <button
                type="button"
                onClick={() => setExpandedId(isOpen ? null : row.id)}
                aria-expanded={isOpen}
                aria-controls={`vital-detail-${row.id}`}
                aria-label={`${row.name}: ${
                  isMissing ? 'not recorded' : `${row.latestValue} ${row.unit}`
                }, ${row.statusLabel}. ${isOpen ? 'Hide' : 'Show'} baseline and reference details.`}
                className="w-full p-3 text-left"
              >
                <div className="flex items-center justify-between gap-2">
                  <Icon className="h-4 w-4 shrink-0" style={{ color: accent }} aria-hidden="true" />
                  <span
                    className="inline-flex min-w-0 items-center gap-1 text-[10px] font-semibold"
                    style={{ color: accent }}
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: accent }}
                      aria-hidden="true"
                    />
                    <span className="truncate">{row.statusLabel}</span>
                  </span>
                </div>

                <p className="mt-2 text-[11px] font-medium leading-tight text-[var(--arogya-text-secondary)]">
                  {row.name.replace(' (if available)', '')}
                </p>

                <div className="mt-1.5 flex flex-wrap items-baseline gap-x-1">
                  <span
                    className={`font-mono-tabular text-[26px] font-semibold leading-none ${
                      isMissing
                        ? 'text-[var(--arogya-text-muted)]'
                        : 'text-[var(--arogya-text-primary)]'
                    }`}
                  >
                    {isMissing ? '—' : row.latestValue}
                  </span>
                  <span className="font-mono-tabular text-[11px] text-[var(--arogya-text-secondary)]">
                    {isMissing ? 'Not recorded' : row.unit}
                  </span>
                </div>

                <div className="mt-2.5 flex items-center justify-between gap-1 border-t border-[var(--arogya-border)] pt-2 text-[10px] text-[var(--arogya-text-muted)]">
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <TrendIcon direction={row.trendDirection} />
                    <span className="truncate">{row.trendLabel}</span>
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </div>
              </button>

              {isOpen && (
                <div
                  id={`vital-detail-${row.id}`}
                  className="space-y-1.5 border-t border-[var(--arogya-border)] bg-[var(--arogya-bg)] px-3 pb-3 pt-2.5 text-[11px]"
                >
                  <DetailRow label="Personal baseline" value={row.personalBaseline} />
                  <DetailRow label="General adult ref" value={row.generalReferenceRange} />
                  <DetailRow label={`Trend (${timeWindow}d)`} value={row.trendLabel} />
                  {!isMissing && row.status !== 'green' && (
                    <p className="border-t border-[var(--arogya-border)] pt-2 leading-snug text-[var(--arogya-text-secondary)]">
                      {row.explanation}
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <p className="text-[11px] text-[var(--arogya-text-muted)]">
        Standard biological units · Decision support only, not a diagnosis.
      </p>
    </section>
  );
}
