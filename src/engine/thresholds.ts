import type { BodySystemId, HealthStatusLevel } from '../types';
import { HEALTH_CONTENT } from '../content/healthContent';

export const CLINICAL_THRESHOLDS = {
  // Demonstration bands only; these are not validated operational thresholds.
  generalRestingHrMin: 50,
  generalRestingHrMax: 90,
  generalSystolicMin: 95,
  generalSystolicMax: 130,
  generalDiastolicMin: 60,
  generalDiastolicMax: 85,
  generalSpo2Min: 95,
  spo2CriticalPercent: 92,
  generalRespRateMin: 12,
  generalRespRateMax: 20,
  generalTempMinC: 36.1,
  generalTempMaxC: 37.5,
  feverThresholdC: 38.0,
  highFeverThresholdC: 38.8,
  generalGlucoseMinMgDl: 70,
  generalGlucoseMaxMgDl: 125,
  glucoseElevatedMgDl: 140,
  glucoseCriticalHighMgDl: 200,
  glucoseCriticalLowMgDl: 60,
  cabinCo2WatchMmHg: 3.0,
  cabinCo2ElevatedMmHg: 4.0,

  // Personal Baseline Delta Thresholds
  hrDeltaYellowBpm: 12,
  hrDeltaOrangeBpm: 20,
  hrvDropYellowRatio: 0.22,
  sleepDeficitYellowHours: 1.0,
  sleepDeficitOrangeHours: 2.0,
  hydrationDeficitYellowRatio: 0.2,
  hydrationDeficitOrangeRatio: 0.35,
  calorieDeficitYellowRatio: 0.18,
  dailyRadiationWatchMsv: 1.2,
  dailyRadiationOrangeMsv: 2.0,
} as const;

export const PERSONAL_BASELINE_STANDARD_DEVIATIONS = {
  heartRateBpm: 5,
  systolicBpMmHg: 8,
  diastolicBpMmHg: 5,
  spo2Percent: 1.5,
  respiratoryRateBpm: 2,
  bodyTempC: 0.3,
  bloodGlucoseMgDl: 15,
  sleepHours: 1,
  hydrationLiters: 0.4,
  exerciseMinutes: 15,
  caloriesKcal: 300,
} as const;

export const SYSTEM_WEIGHTS: Record<BodySystemId, number> = {
  brain: 0.14,
  cardiovascular: 0.18,
  respiratory: 0.14,
  bone_muscle: 0.12,
  behavioral: 0.12,
  hydration: 0.10,
  nutrition: 0.10,
  radiation: 0.10,
};

export function statusFromScore(score: number): HealthStatusLevel {
  if (score >= 85) return 'green';
  if (score >= 70) return 'yellow';
  if (score >= 50) return 'orange';
  return 'red';
}

export function worstStatus(a: HealthStatusLevel, b: HealthStatusLevel): HealthStatusLevel {
  const rank: Record<HealthStatusLevel, number> = {
    green: 0,
    yellow: 1,
    orange: 2,
    red: 3,
  };
  return rank[a] >= rank[b] ? a : b;
}

export const STATUS_META: Record<
  HealthStatusLevel,
  {
    label: string;
    shortLabel: string;
    colorHex: string;
    badgeClass: string;
    textClass: string;
  }
> = {
  green: {
    label: 'Green · Nominal Baseline',
    shortLabel: 'Nominal',
    colorHex: '#22C55E',
    badgeClass: 'border-[#22C55E]/35 bg-[#22C55E]/10 text-[#4ADE80]',
    textClass: 'text-[#4ADE80]',
  },
  yellow: {
    label: 'Yellow · Monitor Drift',
    shortLabel: 'Monitor',
    colorHex: '#EAB308',
    badgeClass: 'border-[#EAB308]/35 bg-[#EAB308]/10 text-[#FACC15]',
    textClass: 'text-[#FACC15]',
  },
  orange: {
    label: 'Orange · Elevated Caution',
    shortLabel: 'Caution',
    colorHex: '#F97316',
    badgeClass: 'border-[#F97316]/40 bg-[#F97316]/12 text-[#FB923C]',
    textClass: 'text-[#FB923C]',
  },
  red: {
    label: 'Red · Medical Escalation',
    shortLabel: 'Escalate',
    colorHex: '#EF4444',
    badgeClass: 'border-[#EF4444]/45 bg-[#EF4444]/15 text-[#F87171]',
    textClass: 'text-[#F87171]',
  },
};

export const SAFETY_DISCLAIMER = HEALTH_CONTENT.disclaimers.trim();
export const REFERENCE_RANGE_DISCLAIMER =
  `Reference ranges are general educational references and may not apply to spaceflight, individual physiology, measurement conditions, or personal baselines. ${SAFETY_DISCLAIMER}`;
