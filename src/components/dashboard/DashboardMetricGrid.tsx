import type { ReactNode } from 'react';
import { Activity, Droplets, Heart, Moon } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, YAxis } from 'recharts';
import type { Astronaut, CheckIn, VitalReading } from '../../types';
import type { DataQualitySummary } from '../../types/healthAssessment';

/**
 * Formats the observation that produced a metric. The label is always derived from the
 * exact record shown, never from a page-wide "latest" timestamp.
 */
function formatObservation(
  timestampIso: string | undefined,
  observedMissionDay: number | undefined,
  currentMissionDay: number
): { label: string; isStale: boolean } | null {
  if (observedMissionDay == null) return null;

  const dayAge = currentMissionDay - observedMissionDay;
  const time =
    timestampIso != null && Number.isFinite(new Date(timestampIso).getTime())
      ? new Date(timestampIso).toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
        })
      : null;

  if (dayAge > 0) {
    return {
      label: `Sol ${observedMissionDay}${time ? ` · ${time}` : ''} · ${dayAge}d old`,
      isStale: true,
    };
  }

  return {
    label: `Sol ${observedMissionDay}${time ? ` · ${time}` : ''} · today`,
    isStale: false,
  };
}

interface MetricCardProps {
  label: string;
  value: string;
  unit: string;
  icon: ReactNode;
  accentColor: string;
  baselineHint: string;
  sparklineData?: Array<{ day: number; val: number | null }>;
  isMissing?: boolean;
  observation?: { label: string; isStale: boolean } | null;
}

function MetricCard({
  label,
  value,
  unit,
  icon,
  accentColor,
  baselineHint,
  sparklineData,
  isMissing,
  observation,
}: MetricCardProps) {
  const numericPoints = (sparklineData ?? []).filter(
    (p): p is { day: number; val: number } => typeof p.val === 'number' && !Number.isNaN(p.val)
  );
  const hasSparkline = numericPoints.length >= 2;

  return (
    <div className="relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/55 p-3 shadow-[0_12px_32px_-16px_rgba(15,23,42,0.45)] backdrop-blur-md transition-colors hover:bg-white/70 sm:p-4">
      {/* Icon + metric identity */}
      <div className="flex min-w-0 items-center gap-2">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--arogya-border)]"
          style={{ backgroundColor: `${accentColor}0D`, color: accentColor }}
          aria-hidden="true"
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold tracking-wide text-[var(--arogya-text-primary)]">
            {label}
          </p>
          <p className="truncate text-[11px] text-[var(--arogya-text-muted)]">{baselineHint}</p>
        </div>
      </div>

      {/* Value */}
      <div className="mt-2 flex items-baseline gap-1.5">
        <span
          className={`font-mono-tabular text-xl font-bold tracking-tight sm:text-2xl ${
            isMissing ? 'text-[var(--arogya-warning-text)]' : 'text-[var(--arogya-text-primary)]'
          }`}
        >
          {value}
        </span>
        {!isMissing && unit && (
          <span className="font-mono-tabular text-xs font-medium text-[var(--arogya-text-muted)]">
            {unit}
          </span>
        )}
      </div>

      {/* Observation context for THIS metric only */}
      <p
        className={`mt-0.5 truncate font-mono-tabular text-[10px] leading-tight ${
          isMissing || observation?.isStale
            ? 'text-[var(--arogya-warning-text)]'
            : 'text-[var(--arogya-text-muted)]'
        }`}
      >
        {isMissing ? 'No reading recorded' : observation?.label ?? 'Observation time unavailable'}
      </p>

      {/* Sparkline or missing placeholder */}
      <div className="mt-1.5 h-7 w-full" aria-hidden="true">
        {hasSparkline ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparklineData}>
              <YAxis domain={['dataMin', 'dataMax']} hide />
              <Line
                type="monotone"
                dataKey="val"
                stroke={accentColor}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center border-t border-dashed border-[var(--arogya-border)] text-[10px] text-[var(--arogya-text-muted)]">
            {isMissing ? 'No telemetry recorded' : 'Awaiting trend baseline'}
          </div>
        )}
      </div>
    </div>
  );
}

interface DashboardMetricGridProps {
  astronaut: Astronaut;
  latestVital?: VitalReading;
  latestCheckIn?: CheckIn;
  vitalsWindow: VitalReading[];
  checkInsWindow: CheckIn[];
  missionDay: number;
  dataQuality: DataQualitySummary;
}

export function DashboardMetricGrid({
  astronaut,
  latestVital,
  latestCheckIn,
  vitalsWindow,
  checkInsWindow,
  missionDay,
  dataQuality,
}: DashboardMetricGridProps) {
  // 1. Heart Rate (actual latest vital reading that supplies the shown value)
  const hrVal = latestVital?.heartRateBpm;
  const hrObservation = formatObservation(latestVital?.timestampIso, latestVital?.missionDay, missionDay);
  const hrSparkline = vitalsWindow.slice(-7).map((v) => ({
    day: v.missionDay,
    val: v.heartRateBpm ?? null,
  }));

  // 2. Blood Pressure (same reading as the displayed systolic/diastolic pair)
  const sysVal = latestVital?.systolicBpMmHg;
  const diaVal = latestVital?.diastolicBpMmHg;
  const bpValStr =
    sysVal != null && diaVal != null
      ? `${sysVal}/${diaVal}`
      : sysVal != null
      ? `${sysVal}/--`
      : 'MISSING';
  const bpObservation = formatObservation(latestVital?.timestampIso, latestVital?.missionDay, missionDay);
  const bpSparkline = vitalsWindow.slice(-7).map((v) => ({
    day: v.missionDay,
    val: v.systolicBpMmHg ?? null,
  }));

  // 3. Oxygen Saturation (same reading as the displayed SpO2)
  const spo2Val = latestVital?.spo2Percent;
  const spo2Observation = formatObservation(latestVital?.timestampIso, latestVital?.missionDay, missionDay);
  const spo2Sparkline = vitalsWindow.slice(-7).map((v) => ({
    day: v.missionDay,
    val: v.spo2Percent ?? null,
  }));

  // 4. Sleep (from the most recent check-in, which is the sleep period that was recorded)
  const sleepHours = latestCheckIn?.sleepHours;
  const sleepObservation = formatObservation(
    latestCheckIn?.timestampIso,
    latestCheckIn?.missionDay,
    missionDay
  );
  const sleepSparkline = checkInsWindow.slice(-7).map((c) => ({
    day: c.missionDay,
    val: c.sleepHours ?? null,
  }));

  const completenessTierLabel =
    dataQuality.qualityTier === 'complete'
      ? 'Complete'
      : dataQuality.qualityTier === 'partial'
      ? 'Partial'
      : 'Insufficient';

  return (
    <div className="space-y-2">
      {/* Overall telemetry completeness — shown once, never fabricated per metric */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-0.5">
        <p className="text-[11px] text-[var(--arogya-text-secondary)]">
          Telemetry completeness:{' '}
          <span className="font-mono-tabular font-semibold text-[var(--arogya-text-primary)]">
            {dataQuality.completenessPercent}%
          </span>{' '}
          <span className="text-[var(--arogya-text-muted)]">({completenessTierLabel} · 14-day window)</span>
        </p>
        <p className="text-[10px] text-[var(--arogya-text-muted)]">
          {dataQuality.hasTodayVitals ? 'Vitals today' : 'No vitals today'} ·{' '}
          {dataQuality.hasTodayCheckIn ? 'check-in today' : 'no check-in today'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* 1. Heart Rate Card */}
        <MetricCard
          label="Heart Rate"
          value={hrVal != null ? String(hrVal) : 'MISSING'}
          unit="bpm"
          icon={<Heart className="h-4 w-4" />}
          accentColor="#DC2626"
          baselineHint={`Base ${astronaut.baseline.restingHeartRateBpm} bpm`}
          sparklineData={hrSparkline}
          isMissing={hrVal == null}
          observation={hrObservation}
        />

        {/* 2. Blood Pressure Card */}
        <MetricCard
          label="Blood Pressure"
          value={bpValStr}
          unit="mmHg"
          icon={<Activity className="h-4 w-4" />}
          accentColor="#1E3A5F"
          baselineHint={`Base ${astronaut.baseline.systolicBpMmHg}/${astronaut.baseline.diastolicBpMmHg}`}
          sparklineData={bpSparkline}
          isMissing={sysVal == null && diaVal == null}
          observation={bpObservation}
        />

        {/* 3. Oxygen Saturation Card */}
        <MetricCard
          label="Oxygen Saturation"
          value={spo2Val != null ? String(spo2Val) : 'MISSING'}
          unit="%"
          icon={<Droplets className="h-4 w-4" />}
          accentColor="#0891B2"
          baselineHint={`Base ${astronaut.baseline.spo2Percent}%`}
          sparklineData={spo2Sparkline}
          isMissing={spo2Val == null}
          observation={spo2Observation}
        />

        {/* 4. Sleep Hours Card */}
        <MetricCard
          label="Sleep Duration"
          value={sleepHours != null ? sleepHours.toFixed(1) : 'MISSING'}
          unit="hours"
          icon={<Moon className="h-4 w-4" />}
          accentColor="#7C3AED"
          baselineHint={`Target ${astronaut.baseline.sleepTargetHours.toFixed(1)} h`}
          sparklineData={sleepSparkline}
          isMissing={sleepHours == null}
          observation={sleepObservation}
        />
      </div>
    </div>
  );
}
