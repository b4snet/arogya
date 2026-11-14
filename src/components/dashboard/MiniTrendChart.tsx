import type { LucideIcon } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import { Card } from '../ui';

export interface MiniTrendPoint {
  day: string;
  v: number | null;
}

interface MiniTrendChartProps {
  label: string;
  value: string;
  unit?: string;
  targetHint?: string;
  icon: LucideIcon;
  color: string;
  data: MiniTrendPoint[];
  isMissing?: boolean;
}

export function MiniTrendChart({
  label,
  value,
  unit = '',
  targetHint,
  icon: Icon,
  color,
  data,
  isMissing = false,
}: MiniTrendChartProps) {
  const numericPoints = data.filter((d) => typeof d.v === 'number' && !Number.isNaN(d.v));
  const hasTrendData = numericPoints.length >= 2;
  const accessibleSummary = `${label}: latest ${value}${
    targetHint ? `, ${targetHint}` : ''
  }. ${
    hasTrendData
      ? `7-day trend with ${numericPoints.length} logged days.`
      : 'Insufficient 7-day trend points.'
  }`;

  return (
    <Card padding="sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-[var(--arogya-text-secondary)]">
          {label}
        </span>
        <Icon className="h-3.5 w-3.5 shrink-0" style={{ color }} aria-hidden="true" />
      </div>

      <div className="mt-1.5 flex items-baseline justify-between gap-2">
        <p
          className={`font-mono-tabular text-lg font-semibold ${
            isMissing ? 'text-[#FACC15]' : 'text-[var(--arogya-text-primary)]'
          }`}
        >
          {value}
        </p>
        {targetHint && (
          <span className="font-mono-tabular text-[11px] text-[var(--arogya-text-secondary)]">
            {targetHint}
          </span>
        )}
      </div>

      <div
        role="img"
        aria-label={accessibleSummary}
        className="mt-2 h-10 w-full"
      >
        {hasTrendData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0D1522',
                  borderColor: 'rgba(255,255,255,0.16)',
                  borderRadius: '6px',
                  fontSize: '11px',
                  padding: '4px 8px',
                  color: '#E6EDF6',
                }}
                formatter={(val) => [`${val}${unit ? ` ${unit}` : ''}`, label]}
                labelFormatter={(l) => `Sol ${String(l)}`}
              />
              <Line
                type="monotone"
                dataKey="v"
                name={label}
                stroke={color}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded border border-dashed border-[var(--arogya-border)] text-[11px] text-[var(--arogya-text-secondary)]">
            Awaiting 7-day trend data
          </div>
        )}
      </div>
    </Card>
  );
}
