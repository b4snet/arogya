import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, ArrowRight } from 'lucide-react';
import type { VitalReading } from '../../types';

type MetricTab = 'heartRate' | 'bloodPressure' | 'spo2';

interface DashboardVitalsOverviewProps {
  vitalsWindow: VitalReading[];
}

export function DashboardVitalsOverview({ vitalsWindow }: DashboardVitalsOverviewProps) {
  const [activeTab, setActiveTab] = useState<MetricTab>('heartRate');

  const chartData = vitalsWindow.map((v) => ({
    day: `D${v.missionDay}`,
    heartRate: v.heartRateBpm ?? null,
    systolic: v.systolicBpMmHg ?? null,
    diastolic: v.diastolicBpMmHg ?? null,
    spo2: v.spo2Percent ?? null,
  }));

  const latest = vitalsWindow[vitalsWindow.length - 1];

  const getActiveTabMeta = () => {
    switch (activeTab) {
      case 'heartRate':
        return {
          title: 'Heart Rate',
          unit: 'bpm',
          color: '#DC2626',
          currentVal: latest?.heartRateBpm != null ? `${latest.heartRateBpm} bpm` : 'MISSING',
        };
      case 'bloodPressure':
        return {
          title: 'Blood Pressure',
          unit: 'mmHg',
          color: '#1E3A5F',
          currentVal:
            latest?.systolicBpMmHg != null && latest?.diastolicBpMmHg != null
              ? `${latest.systolicBpMmHg}/${latest.diastolicBpMmHg} mmHg`
              : 'MISSING',
        };
      case 'spo2':
        return {
          title: 'Oxygen Saturation',
          unit: '%',
          color: '#0891B2',
          currentVal: latest?.spo2Percent != null ? `${latest.spo2Percent}%` : 'MISSING',
        };
    }
  };

  const meta = getActiveTabMeta();

  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-[var(--arogya-border)] bg-white p-4 shadow-sm sm:p-5">
      {/* Header and Metric Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--arogya-border)] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--arogya-border)] bg-[#1E3A5F]/8 text-[#1E3A5F]">
            <Activity className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-[var(--arogya-text-primary)]">Vitals Overview</h3>
            <p className="text-[11px] text-[var(--arogya-text-muted)]">
              Recorded observations · 14-day history · Latest:{' '}
              <span className="font-mono-tabular font-semibold text-[var(--arogya-text-primary)]">{meta.currentVal}</span>
            </p>
          </div>
        </div>

        {/* Metric Selector Tabs */}
        <div className="flex items-center gap-1 rounded-xl border border-[var(--arogya-border)] bg-[var(--arogya-bg)] p-1">
          <button
            type="button"
            onClick={() => setActiveTab('heartRate')}
            aria-pressed={activeTab === 'heartRate'}
            className={`min-w-[74px] rounded-lg px-2.5 py-1 text-center text-xs font-medium transition-colors ${
              activeTab === 'heartRate'
                ? 'bg-white text-[#DC2626] shadow-sm'
                : 'text-[var(--arogya-text-secondary)] hover:text-[var(--arogya-text-primary)]'
            }`}
          >
            Heart Rate
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bloodPressure')}
            aria-pressed={activeTab === 'bloodPressure'}
            className={`min-w-[74px] rounded-lg px-2.5 py-1 text-center text-xs font-medium transition-colors ${
              activeTab === 'bloodPressure'
                ? 'bg-white text-[#1E3A5F] shadow-sm'
                : 'text-[var(--arogya-text-secondary)] hover:text-[var(--arogya-text-primary)]'
            }`}
          >
            Pressure
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('spo2')}
            aria-pressed={activeTab === 'spo2'}
            className={`min-w-[74px] rounded-lg px-2.5 py-1 text-center text-xs font-medium transition-colors ${
              activeTab === 'spo2'
                ? 'bg-white text-[#0891B2] shadow-sm'
                : 'text-[var(--arogya-text-secondary)] hover:text-[var(--arogya-text-primary)]'
            }`}
          >
            SpO₂
          </button>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="mt-3 h-44 w-full sm:h-48" aria-label={`Chart showing ${meta.title} in ${meta.unit}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.8} />
            <XAxis
              dataKey="day"
              stroke="#94A3B8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#E2E8F0' }}
            />
            <YAxis
              stroke="#94A3B8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#E2E8F0' }}
              domain={['auto', 'auto']}
              unit={meta.unit === '%' ? '%' : ''}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                borderColor: '#CBD5E1',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#0F172A',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />

            {activeTab === 'heartRate' && (
              <Line
                type="monotone"
                dataKey="heartRate"
                name="Heart Rate (bpm)"
                stroke="#DC2626"
                strokeWidth={2}
                dot={{ r: 2, fill: '#DC2626' }}
                connectNulls={false}
              />
            )}

            {activeTab === 'bloodPressure' && (
              <>
                <Line
                  type="monotone"
                  dataKey="systolic"
                  name="Systolic BP (mmHg)"
                  stroke="#1E3A5F"
                  strokeWidth={2}
                  dot={{ r: 2, fill: '#1E3A5F' }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="diastolic"
                  name="Diastolic BP (mmHg)"
                  stroke="#64748B"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  dot={{ r: 2, fill: '#64748B' }}
                  connectNulls={false}
                />
              </>
            )}

            {activeTab === 'spo2' && (
              <Line
                type="monotone"
                dataKey="spo2"
                name="SpO₂ (%)"
                stroke="#0891B2"
                strokeWidth={2}
                dot={{ r: 2, fill: '#0891B2' }}
                connectNulls={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Footer link to full vitals page */}
      <div className="mt-2 flex items-center justify-between pt-2 text-[11px] text-[var(--arogya-text-muted)]">
        <span>Gaps represent unmeasured observation days (never coerced to normal).</span>
        <Link
          to="/vitals"
          className="inline-flex items-center gap-1 font-medium text-[#1E3A5F] transition-colors hover:text-[#2D4A6F]"
        >
          <span>Full Vitals Analytics</span>
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
