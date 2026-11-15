import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity } from 'lucide-react';
import { useSimulatedTelemetryStore } from '../../store/useSimulatedTelemetryStore';
import {
  SIMULATED_LIVE_LABEL,
  SIMULATED_WINDOW_SECONDS,
  type SimulatedSample,
} from '../../utils/simulatedTelemetry';

function clockLabel(tMs: number): string {
  return new Date(tMs).toLocaleTimeString(undefined, {
    minute: '2-digit',
    second: '2-digit',
  });
}

function windowOffsetLabel(tMs: number, latestTMs: number): string {
  const secondsAgo = Math.round((latestTMs - tMs) / 1000);
  return secondsAgo <= 0 ? 'now' : `-${secondsAgo}s`;
}

interface SimulatedTelemetryChartProps {
  points: SimulatedSample[];
}

/**
 * Rolling demonstration window. This is a short live-demo trace, deliberately kept visually
 * and textually separate from the multi-day historical charts above/below it.
 */
export function SimulatedTelemetryChart({ points }: SimulatedTelemetryChartProps) {
  const latestTMs = points[points.length - 1]?.tMs ?? 0;

  const chartData = points.map((point) => ({
    t: windowOffsetLabel(point.tMs, latestTMs),
    clock: clockLabel(point.tMs),
    heartRateBpm: point.heartRateBpm,
    spo2Percent: point.spo2Percent,
  }));

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-[#B45309]/35 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--arogya-border)] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--arogya-border)] bg-[#B45309]/10 text-[#B45309]">
            <Activity className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-[var(--arogya-text-primary)]">
              Simulated live window
            </h3>
            <p className="text-[11px] text-[var(--arogya-text-muted)]">
              Rolling last {SIMULATED_WINDOW_SECONDS}&nbsp;s · not a historical day-range chart
            </p>
          </div>
        </div>

        <span className="rounded-md border border-[#B45309]/35 bg-[#FFFBEB] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#92400E]">
          {SIMULATED_LIVE_LABEL}
        </span>
      </div>

      <div
        className="mt-3 h-48 w-full sm:h-52"
        role="img"
        aria-label={`Simulated demonstration trend over the last ${SIMULATED_WINDOW_SECONDS} seconds. Not patient measurements.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.8} />
            <XAxis
              dataKey="t"
              stroke="#94A3B8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#E2E8F0' }}
              minTickGap={24}
            />
            <YAxis
              yAxisId="left"
              stroke="#DC2626"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#E2E8F0' }}
              domain={['auto', 'auto']}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#0891B2"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#E2E8F0' }}
              domain={[94, 100]}
              unit="%"
            />
            <Tooltip
              labelFormatter={(label, payload) => {
                const clock = payload?.[0]?.payload?.clock;
                return clock ? `${label} · ${clock}` : String(label);
              }}
              contentStyle={{
                backgroundColor: '#FFFFFF',
                borderColor: '#CBD5E1',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#0F172A',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="heartRateBpm"
              name="Simulated HR (bpm)"
              stroke="#DC2626"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="spo2Percent"
              name="Simulated SpO₂ (%)"
              stroke="#0891B2"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-2 border-t border-[var(--arogya-border)] pt-2 text-[11px] text-[var(--arogya-text-muted)]">
        {points.length} of {SIMULATED_WINDOW_SECONDS} rolling samples · buffer is bounded, so older
        demonstration points are discarded rather than stored.
      </p>
    </div>
  );
}
