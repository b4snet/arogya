import type { VitalReading } from '../types';

function isoForDay(day: number): string {
  const base = new Date('2026-10-31T08:00:00Z');
  base.setUTCDate(base.getUTCDate() + (day - 1));
  return base.toISOString();
}

// AST-01: Commander Aarav Sharma — Steady nominal 14-day baseline
const sharmaVitals: VitalReading[] = Array.from({ length: 14 }, (_, idx) => {
  const day = idx + 1;
  return {
    id: `VIT-01-D${day}`,
    astronautId: 'AST-01',
    missionDay: day,
    timestampIso: isoForDay(day),
    source: 'wearable_mock',
    heartRateBpm: 61 + (day % 4),
    hrvMs: 58 + (day % 5),
    systolicBpMmHg: 115 + (day % 4),
    diastolicBpMmHg: 73 + (day % 3),
    spo2Percent: day === 9 ? 97 : 98,
    respiratoryRateBpm: 14 + (day % 2),
    bodyTempC: 36.7,
    bloodGlucoseMgDl: 89 + (day % 6),
    dailyRadiationMsv: Number((0.46 + (day % 3) * 0.04).toFixed(2)),
    cumulativeRadiationMsv: Number((day * 0.49).toFixed(2)),
    bodyMassKg: Number((74.5 - (day % 3) * 0.1).toFixed(1)),
  };
});

// AST-02: Flight Engineer Maya Patel — Sleep debt + gradual HR & BP drift (Days 11-14)
// Includes an intentional missing reading (Day 11 bloodGlucoseMgDl = null, Day 7 bodyMassKg = null) to demonstrate missing-data safety
const patelVitals: VitalReading[] = Array.from({ length: 14 }, (_, idx) => {
  const day = idx + 1;
  const drift = day >= 11 ? (day - 10) * 3 : 0;
  return {
    id: `VIT-02-D${day}`,
    astronautId: 'AST-02',
    missionDay: day,
    timestampIso: isoForDay(day),
    source: 'wearable_mock',
    heartRateBpm: 66 + (day % 3) + drift,
    hrvMs: Math.max(30, 52 - (day >= 11 ? (day - 10) * 4 : 0)),
    systolicBpMmHg: day >= 13 ? 136 : 118 + (day >= 11 ? 8 : day % 3),
    diastolicBpMmHg: day >= 13 ? 86 : 76 + (day >= 11 ? 4 : day % 2),
    spo2Percent: day >= 13 ? 96 : 98,
    respiratoryRateBpm: day >= 12 ? 18 : 15,
    bodyTempC: day >= 13 ? 37.0 : 36.8,
    bloodGlucoseMgDl: day === 11 ? null : 93 + (day >= 12 ? 16 : day % 5),
    dailyRadiationMsv: Number((0.48 + (day % 3) * 0.05).toFixed(2)),
    cumulativeRadiationMsv: Number((day * 0.51).toFixed(2)),
    bodyMassKg: day === 7 ? null : Number((61.2 - (day >= 11 ? (day - 10) * 0.25 : 0)).toFixed(1)),
  };
});

// AST-03: Mission Specialist Daniel Kim — Post-EVA radiation bump (Day 10) + mild glucose & SpO2 watch
const kimVitals: VitalReading[] = Array.from({ length: 14 }, (_, idx) => {
  const day = idx + 1;
  const isPostEva = day === 10 || day === 11;
  const isLateWatch = day >= 12;
  const dailyRad =
    day === 10 ? 1.48 : day === 11 ? 1.26 : Number((0.48 + (day % 2) * 0.05).toFixed(2));
  const cumRad =
    day <= 9 ? day * 0.49 : day === 10 ? 5.89 : day === 11 ? 7.15 : 7.15 + (day - 11) * 0.52;
  return {
    id: `VIT-03-D${day}`,
    astronautId: 'AST-03',
    missionDay: day,
    timestampIso: isoForDay(day),
    source: 'wearable_mock',
    heartRateBpm: 64 + (isPostEva ? 10 : isLateWatch ? 8 : day % 3),
    hrvMs: 54 - (isLateWatch ? 10 : 0),
    systolicBpMmHg: 114 + (isLateWatch ? 10 : day % 3),
    diastolicBpMmHg: 72 + (isLateWatch ? 5 : day % 2),
    spo2Percent: day === 14 ? 94 : isLateWatch ? 95 : 99,
    respiratoryRateBpm: isLateWatch ? 21 : 15 + (day % 2),
    bodyTempC: 36.8,
    bloodGlucoseMgDl: day === 14 ? 138 : isLateWatch ? 128 : 88 + (day % 4),
    dailyRadiationMsv: dailyRad,
    cumulativeRadiationMsv: Number(cumRad.toFixed(2)),
    bodyMassKg: Number((78.0 - (day >= 10 ? 0.3 : 0) - (day % 2) * 0.1).toFixed(1)),
  };
});

export const SEED_VITALS_BY_ASTRONAUT: Record<string, VitalReading[]> = {
  'AST-01': sharmaVitals,
  'AST-02': patelVitals,
  'AST-03': kimVitals,
};
