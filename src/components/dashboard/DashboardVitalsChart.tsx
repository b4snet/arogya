import { Link } from 'react-router-dom';
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
import { RotateCcw } from 'lucide-react';
import type { Vitals } from '../../types';
import { useArogyaStore } from '../../store/useArogyaStore';
import { Button, ChartContainer } from '../ui';

export function DashboardVitalsChart({ vitals14d }: { vitals14d: Vitals[] }) {
  const resetDemoData = useArogyaStore((s) => s.resetDemoData);
  const chartData = vitals14d.map((v) => ({
    day: `D${v.missionDay}`,
    heartRate: v.heartRateBpm,
    spo2: v.spo2Percent,
    systolic: v.systolicBpMmHg,
  }));

  const latest = vitals14d[vitals14d.length - 1];
  const ariaSummary = latest
    ? `14-day vitals trend chart. Latest Mission Day ${latest.missionDay}: Heart rate ${
        latest.heartRateBpm ?? 'missing'
      } bpm, Systolic BP ${latest.systolicBpMmHg ?? 'missing'} mmHg, Oxygen saturation ${
        latest.spo2Percent ?? 'missing'
      } percent.`
    : '14-day vitals trend chart with no readings recorded.';

  return (
    <ChartContainer
      title="14-Day Vitals Overview"
      subtitle="Left axis: Heart Rate (bpm) & Systolic BP (mmHg) · Right axis: SpO₂ (%)"
      isEmpty={chartData.length === 0}
      emptyMessage="No vitals logged yet in this mission window. Record a reading or load the demo mission dataset."
      emptyAction={
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link
            to="/vitals"
            className="inline-flex min-h-[34px] items-center rounded-lg bg-[#22D3EE] px-3 text-xs font-semibold text-[#060B14] transition-colors hover:bg-[#38BDF8]"
          >
            Log Vitals
          </Link>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
            onClick={resetDemoData}
          >
            Load Demo Mission
          </Button>
        </div>
      }
      heightClass="h-56"
    >
      <div role="img" aria-label={ariaSummary} className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="day"
              stroke="#94A3B8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="left"
              stroke="#94A3B8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
              unit=" "
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#22D3EE"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              domain={[88, 100]}
              unit="%"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0D1522',
                borderColor: 'rgba(255,255,255,0.16)',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#E6EDF6',
              }}
              formatter={(value, name) => {
                if (name === 'SpO₂ (%)') return [`${value}%`, name];
                if (name === 'Heart Rate (bpm)') return [`${value} bpm`, name];
                return [`${value} mmHg`, name];
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="heartRate"
              name="Heart Rate (bpm)"
              stroke="#EF4444"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="systolic"
              name="Systolic BP (mmHg)"
              stroke="#38BDF8"
              strokeWidth={1.8}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="spo2"
              name="SpO₂ (%)"
              stroke="#22D3EE"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
}
