import type { CheckIn, TelemetrySource, VitalReading } from '../types';
import type { NasaCmpDataset } from '../data/nasaOsd575';
import { buildNasaAnalyteCoverage } from '../data/researchLibrary';
import {
  computeObservationWindow,
  countObservedDays,
  describeWindowCoverage,
  filterByObservationWindow,
  type ObservationWindowDays,
} from '../utils/observationWindow';
import { summarizeTrend, type TrendSummary } from './missionStatus';
import { CLINICAL_THRESHOLDS, REFERENCE_RANGE_DISCLAIMER } from './thresholds';

export interface MissionWindowSummary {
  windowDays: ObservationWindowDays;
  startDay: number;
  endDay: number;
  coveredDays: number;
  recordedDays: number;
  coverageNotice: string | null;
}

export interface CardiovascularMetric {
  latest: number | null;
  observedInWindow: number;
  trend: TrendSummary;
  referenceRange: string;
}

export interface BloodPressureMetric {
  systolic: number | null;
  diastolic: number | null;
  observedInWindow: number;
  trend: TrendSummary;
  referenceRange: string;
}

export interface CardiovascularOverview {
  window: MissionWindowSummary;
  hasRecordedVitals: boolean;
  latestDay: number | null;
  latestTimestampIso: string | null;
  latestSourceLabel: string | null;
  heartRate: CardiovascularMetric;
  spo2: CardiovascularMetric;
  bloodPressure: BloodPressureMetric;
  missingChannels: string[];
  referenceDisclaimer: string;
}

export interface MusculoskeletalOverview {
  window: MissionWindowSummary;
  hasData: boolean;
  exerciseDays: number;
  exerciseAdherencePercent: number;
  totalExerciseMinutes: number;
  averageExerciseMinutes: number;
  resistanceSessions: number;
  totalResistanceMinutes: number;
  averagePainScore: number | null;
  latestPainScore: number | null;
  highestPainScore: number | null;
}

export interface SleepRecoveryOverview {
  window: MissionWindowSummary;
  hasData: boolean;
  averageSleepHours: number | null;
  latestSleepHours: number | null;
  sleepTargetHours: number;
  averageSleepQuality: number | null;
  averageFatigueLevel: number | null;
  averageStressLevel: number | null;
  averageMoodScore: number | null;
  averageCognitiveFocus: number | null;
}

export interface NutritionHydrationOverview {
  window: MissionWindowSummary;
  hasData: boolean;
  averageHydrationLiters: number | null;
  latestHydrationLiters: number | null;
  hydrationTargetLiters: number;
  averageCaloriesKcal: number | null;
  calorieTargetKcal: number;
  averageProteinGrams: number | null;
}

export interface MissionResearchContextCard {
  analyteId: string;
  label: string;
  unit: string;
  subjectCount: number;
  sampleCount: number;
  observedCount: number;
  missingCount: number;
  minValue: number | null;
  maxValue: number | null;
  rangeLabel: string;
}

const TELEMETRY_SOURCE_LABELS: Record<TelemetrySource, string> = {
  manual_entry: 'Manual Crew Entry',
  device_ble: 'BLE Medical Device',
  spacecraft_bus: 'Spacecraft Telemetry Bus',
  cabin_sensor_mock: 'Cabin Environmental Sensor',
  wearable_mock: 'Wearable Biometric Suite',
};

const CARDIOVASCULAR_REFERENCE = {
  heartRate: `${CLINICAL_THRESHOLDS.generalRestingHrMin}–${CLINICAL_THRESHOLDS.generalRestingHrMax} bpm general adult resting band`,
  spo2: `≥ ${CLINICAL_THRESHOLDS.generalSpo2Min}% general adult band`,
  bloodPressure: `${CLINICAL_THRESHOLDS.generalSystolicMin}–${CLINICAL_THRESHOLDS.generalSystolicMax} / ${CLINICAL_THRESHOLDS.generalDiastolicMin}–${CLINICAL_THRESHOLDS.generalDiastolicMax} mmHg general adult band`,
} as const;

const RECORDED_TREND_THRESHOLDS = {
  heartRateBpm: 3,
  spo2Percent: 0.5,
  systolicBpMmHg: 4,
} as const;

export const DEFAULT_MISSION_RESEARCH_ANALYTES = [
  'glucose',
  'sodium',
  'creatinine',
  'albumin',
] as const;

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function present(values: Array<number | null | undefined>): number[] {
  return values.filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value)
  );
}

function round(value: number, digits = 0): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function formatValue(value: number, digits = 2): string {
  return Number.isInteger(value) ? String(value) : String(round(value, digits));
}

function buildWindowSummary<T extends { missionDay: number }>(
  items: T[],
  missionDay: number,
  windowDays: ObservationWindowDays
): { summary: MissionWindowSummary; windowItems: T[] } {
  const window = computeObservationWindow(missionDay, windowDays);
  const windowItems = filterByObservationWindow(items, window);
  const recordedDays = countObservedDays(windowItems);

  return {
    summary: {
      windowDays,
      startDay: window.startDay,
      endDay: window.endDay,
      coveredDays: window.coveredDays,
      recordedDays,
      coverageNotice: describeWindowCoverage(window, recordedDays),
    },
    windowItems,
  };
}

/** One check-in per mission day keeps repeated submissions from overweighting an average. */
function uniqueCheckInDays(checkIns: CheckIn[]): CheckIn[] {
  const byDay = new Map<number, CheckIn>();
  [...checkIns]
    .sort((a, b) => a.missionDay - b.missionDay)
    .forEach((checkIn) => byDay.set(checkIn.missionDay, checkIn));
  return [...byDay.values()];
}

function latestCheckIn(checkIns: CheckIn[]): CheckIn | null {
  return uniqueCheckInDays(checkIns).at(-1) ?? null;
}

export function formatVitalSourceLabel(source: TelemetrySource | null | undefined): string | null {
  return source ? TELEMETRY_SOURCE_LABELS[source] ?? null : null;
}

export function buildCardiovascularOverview(
  vitals: VitalReading[],
  missionDay: number,
  windowDays: ObservationWindowDays = 7
): CardiovascularOverview {
  const upToMissionDay = vitals.filter((reading) => reading.missionDay <= missionDay);
  const sortedAll = [...upToMissionDay].sort((a, b) => a.missionDay - b.missionDay);
  const latest = sortedAll.at(-1) ?? null;
  const { summary, windowItems } = buildWindowSummary(upToMissionDay, missionDay, windowDays);

  const windowHeartRates = present(windowItems.map((reading) => reading.heartRateBpm));
  const windowSpo2 = present(windowItems.map((reading) => reading.spo2Percent));
  const windowSystolic = present(windowItems.map((reading) => reading.systolicBpMmHg));

  const missingChannels: string[] = [];
  if (latest?.heartRateBpm == null) missingChannels.push('heart rate');
  if (latest?.spo2Percent == null) missingChannels.push('SpO₂');
  if (latest?.systolicBpMmHg == null || latest?.diastolicBpMmHg == null) {
    missingChannels.push('blood pressure');
  }

  return {
    window: summary,
    hasRecordedVitals: sortedAll.length > 0,
    latestDay: latest?.missionDay ?? null,
    latestTimestampIso: latest?.timestampIso ?? null,
    latestSourceLabel: formatVitalSourceLabel(latest?.source),
    heartRate: {
      latest: latest?.heartRateBpm ?? null,
      observedInWindow: windowHeartRates.length,
      trend: summarizeTrend(windowHeartRates, RECORDED_TREND_THRESHOLDS.heartRateBpm),
      referenceRange: CARDIOVASCULAR_REFERENCE.heartRate,
    },
    spo2: {
      latest: latest?.spo2Percent ?? null,
      observedInWindow: windowSpo2.length,
      trend: summarizeTrend(windowSpo2, RECORDED_TREND_THRESHOLDS.spo2Percent),
      referenceRange: CARDIOVASCULAR_REFERENCE.spo2,
    },
    bloodPressure: {
      systolic: latest?.systolicBpMmHg ?? null,
      diastolic: latest?.diastolicBpMmHg ?? null,
      observedInWindow: windowSystolic.length,
      trend: summarizeTrend(windowSystolic, RECORDED_TREND_THRESHOLDS.systolicBpMmHg),
      referenceRange: CARDIOVASCULAR_REFERENCE.bloodPressure,
    },
    missingChannels,
    referenceDisclaimer: REFERENCE_RANGE_DISCLAIMER,
  };
}

export function buildMusculoskeletalOverview(
  checkIns: CheckIn[],
  missionDay: number,
  windowDays: ObservationWindowDays = 7
): MusculoskeletalOverview {
  const { summary, windowItems } = buildWindowSummary(checkIns, missionDay, windowDays);
  const days = uniqueCheckInDays(windowItems);
  const exerciseDays = days.filter((checkIn) => checkIn.exerciseCompleted).length;
  const totalExerciseMinutes = days.reduce((sum, checkIn) => sum + checkIn.exerciseMinutes, 0);
  const resistanceSessions = days.filter(
    (checkIn) => checkIn.resistanceTrainingCompleted
  ).length;
  const totalResistanceMinutes = days.reduce(
    (sum, checkIn) =>
      sum + (checkIn.resistanceMinutes ?? (checkIn.resistanceTrainingCompleted ? 30 : 0)),
    0
  );
  const painScores = days.map((checkIn) => checkIn.painScore);
  const latest = latestCheckIn(days);

  return {
    window: summary,
    hasData: days.length > 0,
    exerciseDays,
    exerciseAdherencePercent:
      days.length > 0 ? Math.round((exerciseDays / days.length) * 100) : 0,
    totalExerciseMinutes,
    averageExerciseMinutes: round(totalExerciseMinutes / Math.max(1, days.length)),
    resistanceSessions,
    totalResistanceMinutes,
    averagePainScore: average(painScores),
    latestPainScore: latest?.painScore ?? null,
    highestPainScore: painScores.length > 0 ? Math.max(...painScores) : null,
  };
}

export function buildSleepRecoveryOverview(
  checkIns: CheckIn[],
  missionDay: number,
  sleepTargetHours: number,
  windowDays: ObservationWindowDays = 7
): SleepRecoveryOverview {
  const { summary, windowItems } = buildWindowSummary(checkIns, missionDay, windowDays);
  const days = uniqueCheckInDays(windowItems);
  const latest = latestCheckIn(days);

  return {
    window: summary,
    hasData: days.length > 0,
    averageSleepHours: average(days.map((checkIn) => checkIn.sleepHours)),
    latestSleepHours: latest?.sleepHours ?? null,
    sleepTargetHours,
    averageSleepQuality: average(days.map((checkIn) => checkIn.sleepQuality)),
    averageFatigueLevel: average(days.map((checkIn) => checkIn.fatigueLevel)),
    averageStressLevel: average(days.map((checkIn) => checkIn.stressLevel)),
    averageMoodScore: average(days.map((checkIn) => checkIn.moodScore)),
    averageCognitiveFocus: average(days.map((checkIn) => checkIn.cognitiveFocus)),
  };
}

export function buildNutritionHydrationOverview(
  checkIns: CheckIn[],
  missionDay: number,
  targets: { hydrationTargetLiters: number; calorieTargetKcal: number },
  windowDays: ObservationWindowDays = 7
): NutritionHydrationOverview {
  const { summary, windowItems } = buildWindowSummary(checkIns, missionDay, windowDays);
  const days = uniqueCheckInDays(windowItems);
  const latest = latestCheckIn(days);

  return {
    window: summary,
    hasData: days.length > 0,
    averageHydrationLiters: average(days.map((checkIn) => checkIn.hydrationLiters)),
    latestHydrationLiters: latest?.hydrationLiters ?? null,
    hydrationTargetLiters: targets.hydrationTargetLiters,
    averageCaloriesKcal: average(days.map((checkIn) => checkIn.caloriesKcal)),
    calorieTargetKcal: targets.calorieTargetKcal,
    averageProteinGrams: average(days.map((checkIn) => checkIn.proteinGrams)),
  };
}

/**
 * OSD-575 context cards are deliberately analysis-only: they summarize archived
 * Inspiration4 research observations and never join to crew records or mission days.
 */
export function buildMissionResearchContextCards(
  dataset: NasaCmpDataset,
  analyteIds: readonly string[] = DEFAULT_MISSION_RESEARCH_ANALYTES
): MissionResearchContextCard[] {
  const coverage = buildNasaAnalyteCoverage(dataset);

  return analyteIds.flatMap((analyteId) => {
    const analyte = dataset.analytes.find((item) => item.id === analyteId);
    if (!analyte) return [];

    const coverageRow = coverage.find((row) => row.id === analyteId);
    const values = dataset.samples
      .map((sample) => sample.results[analyteId]?.value)
      .filter(
        (value): value is number => typeof value === 'number' && Number.isFinite(value)
      );
    const minValue = values.length > 0 ? Math.min(...values) : null;
    const maxValue = values.length > 0 ? Math.max(...values) : null;

    return [
      {
        analyteId,
        label: analyte.label,
        unit: analyte.unit,
        subjectCount: coverageRow?.subjectCount ?? 0,
        sampleCount: dataset.samples.length,
        observedCount: coverageRow?.observedCount ?? 0,
        missingCount: coverageRow?.missingCount ?? 0,
        minValue,
        maxValue,
        rangeLabel:
          minValue == null || maxValue == null
            ? 'No observed values'
            : `${formatValue(minValue)}–${formatValue(maxValue)} ${analyte.unit}`,
      },
    ];
  });
}
