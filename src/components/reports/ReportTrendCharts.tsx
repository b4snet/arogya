import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ReportTrendSeries } from '../../engine/reportSnapshot';

/** Shared by rendering and tests so chart gaps are checked against the actual plotted rows. */
export function toReportChartData(series: ReportTrendSeries) {
  return series.points.map((point) => ({ label: point.label, value: point.value }));
}

interface ReportTrendChartsProps {
  series: ReportTrendSeries[];
  startDay: number;
  endDay: number;
}

/**
 * Recorded trend graphs for the report window. Days with no observation stay `null`, so a gap
 * in the record is drawn as a gap and never as a fabricated value. Synthetic demonstration
 * streams are excluded: these series read only the report's immutable recorded snapshot.
 */
export function ReportTrendCharts({ series, startDay, endDay }: ReportTrendChartsProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {series.map((item) => {
          const recorded = item.points.filter((point) => point.value != null).length;
          const chartData = toReportChartData(item);

          return (
            <figure
              key={item.id}
              className="report-chart break-inside-avoid rounded-lg border border-[var(--arogya-border)] bg-white p-3"
            >
              <figcaption className="flex flex-wrap items-baseline justify-between gap-1">
                <span className="text-[11px] font-semibold text-[var(--arogya-text-primary)]">
                  {item.title}
                </span>
                <span className="font-mono-tabular text-[10px] text-[var(--arogya-text-muted)]">
                  {item.unit} · D{startDay}–D{endDay} · {recorded} recorded
                </span>
              </figcaption>

              <div
                className="mt-1.5 h-32 w-full"
                role="img"
                aria-label={`${item.title} trend in ${item.unit} from mission day ${startDay} to ${endDay}, based on ${recorded} recorded observations. Missing days are shown as gaps.`}
              >
                {recorded === 0 ? (
                  <div className="flex h-full items-center justify-center border border-dashed border-[var(--arogya-border)] text-[10px] text-[var(--arogya-text-muted)]">
                    No recorded values in this window
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis
                        dataKey="label"
                        stroke="#64748B"
                        fontSize={9}
                        tickLine={false}
                        interval="preserveStartEnd"
                        minTickGap={10}
                      />
                      <YAxis
                        stroke="#64748B"
                        fontSize={9}
                        tickLine={false}
                        domain={['auto', 'auto']}
                        width={40}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          borderColor: '#CBD5E1',
                          borderRadius: '6px',
                          fontSize: '11px',
                          color: '#0F172A',
                        }}
                        formatter={(value) => [`${value} ${item.unit}`, item.title]}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        name={`${item.title} (${item.unit})`}
                        stroke="#1E3A5F"
                        strokeWidth={2}
                        dot={{ r: 2, fill: '#1E3A5F' }}
                        connectNulls={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              <p className="mt-1 text-[9px] leading-snug text-[var(--arogya-text-muted)]">
                Source: {item.sourceLabel}
              </p>
            </figure>
          );
        })}
      </div>

      <p className="text-[10px] leading-relaxed text-[var(--arogya-text-muted)]">
        Recorded observations only. The simulated demonstration stream is excluded from
        reports, and days without a reading are left as gaps rather than interpolated.
      </p>
    </div>
  );
}
