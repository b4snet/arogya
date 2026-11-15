import type { CheckIn } from '../types';
import {
  computeObservationWindow,
  countObservedDays,
  filterByObservationWindow,
} from '../utils/observationWindow';
import type { SimulatedBpSample, SimulatedSample } from '../utils/simulatedTelemetry';

export type MissionDataSource = 'simulated' | 'recorded' | 'research';
export type TrendDirection = 'rising' | 'falling' | 'stable' | 'insufficient';

export interface TrendSummary {
  direction: TrendDirection;
  label: string;
  delta: number | null;
}

export interface SimulatedVitalsSummary {
  heartRateBpm: number | null;
  spo2Percent: number | null;
  systolicBpMmHg: number | null;
  diastolicBpMmHg: number | null;
  elapsedSeconds: number;
  heartRateTrend: TrendSummary;
  spo2Trend: TrendSummary;
  bloodPressureTrend: TrendSummary;
}

export interface CheckInAdherenceSummary {
  windowDays: number;
  windowStartDay: number;
  windowEndDay: number;
  recordedDays: number;
  expectedDays: number;
  percent: number;
  label: string;
}

const TREND_LABELS: Record<TrendDirection, string> = {
  rising: 'Rising',
  falling: 'Falling',
  stable: 'Stable',
  insufficient: 'Not enough samples',
};

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Compares the early and late halves of the current rolling window so one noisy
 * second cannot be presented as a meaningful direction.
 */
export function summarizeTrend(values: number[], threshold: number): TrendSummary {
  const finiteValues = values.filter((value) => Number.isFinite(value));
  if (finiteValues.length < 2) {
    return { direction: 'insufficient', label: TREND_LABELS.insufficient, delta: null };
  }

  const half = Math.max(1, Math.floor(finiteValues.length / 2));
  const delta = average(finiteValues.slice(-half)) - average(finiteValues.slice(0, half));
  const direction: TrendDirection =
    delta >= threshold ? 'rising' : delta <= -threshold ? 'falling' : 'stable';

  return { direction, label: TREND_LABELS[direction], delta };
}

export function formatSimulatedElapsed(totalSeconds: number): string {
  const bounded = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(bounded / 60);
  const seconds = bounded % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function buildSimulatedVitalsSummary(
  points: SimulatedSample[],
  bpSamples: SimulatedBpSample[]
): SimulatedVitalsSummary {
  const latestPoint = points[points.length - 1];
  const latestBp = bpSamples[bpSamples.length - 1];

  return {
    heartRateBpm: latestPoint?.heartRateBpm ?? null,
    spo2Percent: latestPoint?.spo2Percent ?? null,
    systolicBpMmHg: latestBp?.systolicBpMmHg ?? null,
    diastolicBpMmHg: latestBp?.diastolicBpMmHg ?? null,
    elapsedSeconds: latestPoint?.tick ?? 0,
    heartRateTrend: summarizeTrend(
      points.map((point) => point.heartRateBpm),
      2
    ),
    spo2Trend: summarizeTrend(
      points.map((point) => point.spo2Percent),
      0.3
    ),
    bloodPressureTrend: summarizeTrend(
      bpSamples.map((sample) => sample.systolicBpMmHg),
      3
    ),
  };
}

export function summarizeCheckInAdherence(
  checkIns: CheckIn[],
  missionDay: number,
  windowDays = 7
): CheckInAdherenceSummary {
  const window = computeObservationWindow(missionDay, windowDays);
  const recordedDays = countObservedDays(filterByObservationWindow(checkIns, window));
  const expectedDays = window.coveredDays;
  const percent = expectedDays > 0 ? Math.round((recordedDays / expectedDays) * 100) : 0;
  const dayLabel = expectedDays === 1 ? 'mission day' : 'mission days';

  return {
    windowDays: window.requestedDays,
    windowStartDay: window.startDay,
    windowEndDay: window.endDay,
    recordedDays,
    expectedDays,
    percent,
    label: `${recordedDays} of ${expectedDays} ${dayLabel} (${percent}%)`,
  };
}
