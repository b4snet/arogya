import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { Astronaut, CheckIn, VitalReading } from '../types';
import type { SimulatedSample } from '../utils/simulatedTelemetry';
import {
  buildRecoveryReadiness,
  buildSimulatedRecoveryTrend,
  RECOVERY_FACTOR_WEIGHTS,
} from './recoveryReadiness';

const astronaut: Astronaut = {
  id: 'AST-01',
  callSign: 'Aster',
  fullName: 'Test Astronaut',
  role: 'Commander',
  missionId: 'TEST-MISSION',
  age: 40,
  bloodType: 'O+',
  evaHoursTotal: 0,
  baseline: {
    restingHeartRateBpm: 60,
    systolicBpMmHg: 118,
    diastolicBpMmHg: 76,
    spo2Percent: 98,
    bodyTempC: 36.6,
    fastingGlucoseMgDl: 90,
    sleepTargetHours: 7.5,
    exerciseTargetMinutes: 60,
    resistanceTargetSessionsPerWeek: 5,
    hydrationTargetLiters: 2.5,
    calorieTargetKcal: 2650,
    radiationBudgetMsv: 100,
  },
  focusNotes: 'Test fixture',
};

function makeCheckIn(missionDay: number, overrides: Partial<CheckIn> = {}): CheckIn {
  return {
    id: `checkin-${missionDay}`,
    astronautId: 'AST-01',
    missionDay,
    timestampIso: `2026-11-${String(missionDay).padStart(2, '0')}T08:00:00.000Z`,
    sleepHours: 7.5,
    sleepQuality: 5,
    moodScore: 5,
    stressLevel: 1,
    cognitiveFocus: 5,
    fatigueLevel: 1,
    hydrationLiters: 2.5,
    caloriesKcal: 2650,
    proteinGrams: 95,
    exerciseMinutes: 60,
    exerciseCompleted: true,
    resistanceTrainingCompleted: true,
    painScore: 0,
    symptoms: ['none'],
    crewNotes: '',
    syncedToGround: false,
    ...overrides,
  };
}

function makeVital(missionDay: number, overrides: Partial<VitalReading> = {}): VitalReading {
  return {
    id: `vital-${missionDay}`,
    astronautId: 'AST-01',
    missionDay,
    timestampIso: `2026-11-${String(missionDay).padStart(2, '0')}T07:00:00.000Z`,
    source: 'wearable_mock',
    heartRateBpm: 60,
    hrvMs: 55,
    systolicBpMmHg: 118,
    diastolicBpMmHg: 76,
    spo2Percent: 98,
    respiratoryRateBpm: 14,
    bodyTempC: 36.6,
    bloodGlucoseMgDl: 90,
    dailyRadiationMsv: 0.4,
    cumulativeRadiationMsv: 2,
    ...overrides,
  };
}

function daysRange(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, index) => from + index);
}

function fullWindow(): CheckIn[] {
  return daysRange(1, 7).map((day) => makeCheckIn(day));
}

function fullVitals(): VitalReading[] {
  return daysRange(1, 7).map((day) => makeVital(day));
}

function poorWeek(): CheckIn[] {
  return daysRange(1, 7).map((day) =>
    makeCheckIn(day, {
      sleepHours: 5.5,
      sleepQuality: 2,
      moodScore: 2,
      stressLevel: 4,
      cognitiveFocus: 2,
      fatigueLevel: 4,
      hydrationLiters: 1.5,
      caloriesKcal: 1800,
      exerciseMinutes: 20,
      exerciseCompleted: false,
      resistanceTrainingCompleted: false,
    })
  );
}

const simulatedPoints: SimulatedSample[] = [
  { tick: 1, tMs: 1000, heartRateBpm: 60, spo2Percent: 98.2, scenario: 'exercise' },
  { tick: 2, tMs: 2000, heartRateBpm: 64, spo2Percent: 97.9, scenario: 'exercise' },
  { tick: 3, tMs: 3000, heartRateBpm: 68, spo2Percent: 97.6, scenario: 'exercise' },
  { tick: 4, tMs: 4000, heartRateBpm: 76, spo2Percent: 97.2, scenario: 'exercise' },
];

const fallingSimulatedPoints: SimulatedSample[] = [
  { tick: 1, tMs: 1000, heartRateBpm: 76, spo2Percent: 97.2, scenario: 'exercise' },
  { tick: 2, tMs: 2000, heartRateBpm: 72, spo2Percent: 97.5, scenario: 'exercise' },
  { tick: 3, tMs: 3000, heartRateBpm: 68, spo2Percent: 97.8, scenario: 'exercise' },
  { tick: 4, tMs: 4000, heartRateBpm: 64, spo2Percent: 98.1, scenario: 'exercise' },
];

test('healthy recorded week reaches Ready with six scored, explained factors', () => {
  const result = buildRecoveryReadiness({
    astronaut,
    checkIns: fullWindow(),
    missionDay: 7,
    vitals: fullVitals(),
  });

  assert.equal(result.band, 'ready');
  assert.equal(result.bandLabel, 'Ready');
  assert.equal(result.score, 100);
  assert.equal(result.dayCoveragePercent, 100);
  assert.equal(result.evidenceCoveragePercent, 100);
  assert.deepEqual(result.missingDays, []);
  assert.equal(result.factors.length, 6);
  assert.ok(result.factors.every((factor) => factor.status === 'scored'));
  assert.ok(result.factors.every((factor) => factor.inputs.length > 0));
  assert.ok(
    result.factors.every((factor) => factor.inputs.some((input) => input.source === 'recorded'))
  );
  assert.equal(result.weakestFactorId, 'check_in_adherence');
  assert.equal(result.escalation.level, 'none');
  assert.equal(result.escalation.action, 'none');
  assert.equal(result.simulatedTrend.available, false);
  assert.equal(result.simulatedTrend.includedInBand, false);
  assert.match(result.disclaimer, /monitoring support, not a medical diagnosis/i);
  assert.match(result.missingDataNote, /All six factors/);
  assert.doesNotMatch(result.recommendation, /diagnos/i);
});

test('sleep regularity discloses duration-only variation and a planning reference', () => {
  const result = buildRecoveryReadiness({
    astronaut,
    checkIns: fullWindow(),
    missionDay: 7,
    vitals: fullVitals(),
  });
  const sleep = result.factors.find((factor) => factor.id === 'sleep_regularity');

  assert.ok(sleep);
  assert.match(sleep.summary, /night-to-night/);
  assert.ok(
    sleep.inputs.some((input) => /bedtime and wake time are not recorded/i.test(input.note ?? ''))
  );
  assert.match(sleep.caveat ?? '', /mission planning baseline, not a clinical prescription/i);
  assert.ok(sleep.inputs.every((input) => input.source === 'recorded'));
});

test('nutrition is entry presence only; app-derived energy is disclosed and not scored', () => {
  const result = buildRecoveryReadiness({
    astronaut,
    checkIns: fullWindow(),
    missionDay: 7,
    vitals: fullVitals(),
  });
  const hydration = result.factors.find(
    (factor) => factor.id === 'hydration_nutrition_entries'
  );

  assert.ok(hydration);
  assert.match(hydration.caveat ?? '', /entry presence only/i);
  assert.match(hydration.caveat ?? '', /app-derived estimates, not measured intake/i);
  assert.match(hydration.caveat ?? '', /not used as adequacy evidence/i);
  assert.ok(hydration.inputs.every((input) => input.source === 'recorded'));
  assert.ok(!hydration.inputs.some((input) => input.label === 'Energy value'));
});

test('no check-ins produces an honest unscored Monitor state with no imputed days', () => {
  const result = buildRecoveryReadiness({
    astronaut,
    checkIns: [],
    missionDay: 5,
    vitals: [],
  });

  assert.equal(result.score, null);
  assert.equal(result.band, 'monitor');
  assert.equal(result.dayCoveragePercent, 0);
  assert.equal(result.evidenceCoveragePercent, 0);
  assert.deepEqual(result.missingDays, [1, 2, 3, 4, 5]);
  assert.equal(result.factors.length, 6);
  assert.ok(result.factors.every((factor) => factor.status === 'missing'));
  assert.ok(result.factors.every((factor) => factor.missingReason != null));
  assert.match(result.missingDataNote, /no factor was assumed normal/i);
  assert.match(result.missingDataNote, /No recorded vitals were available either/i);
  assert.match(result.recommendation, /record a daily check-in/i);
  assert.equal(result.weakestFactorId, null);
  assert.equal(result.escalation.level, 'none');
});

test('vitals alone never produce a readiness band without check-ins', () => {
  const result = buildRecoveryReadiness({
    astronaut,
    checkIns: [],
    missionDay: 7,
    vitals: fullVitals(),
  });

  assert.equal(result.score, null);
  assert.equal(result.band, 'monitor');
  assert.equal(result.evidenceCoveragePercent, 10);
  assert.equal(
    result.factors.find((factor) => factor.id === 'recorded_vitals')?.status,
    'scored'
  );
  assert.match(
    result.missingDataNote,
    /a readiness band is not produced without check-ins/i
  );
  assert.match(result.recommendation, /Record a daily check-in/i);
});

test('missing days are listed, never imputed, and reduce day coverage', () => {
  const result = buildRecoveryReadiness({
    astronaut,
    checkIns: [makeCheckIn(5), makeCheckIn(6), makeCheckIn(7)],
    missionDay: 7,
    vitals: [makeVital(5), makeVital(6), makeVital(7)],
  });

  assert.equal(result.window.startDay, 1);
  assert.equal(result.window.coveredDays, 7);
  assert.equal(result.window.recordedDays, 3);
  assert.deepEqual(result.missingDays, [1, 2, 3, 4]);
  assert.equal(result.dayCoveragePercent, 43);
  assert.match(result.missingDataNote, /not imputed/i);
});

test('7 and 14 day windows use elapsed mission days and report coverage', () => {
  const checkIns = daysRange(1, 10).map((day) => makeCheckIn(day));
  const vitals = daysRange(1, 10).map((day) => makeVital(day));

  const sevenDays = buildRecoveryReadiness({
    astronaut,
    checkIns,
    vitals,
    missionDay: 10,
    windowDays: 7,
  });
  const fourteenDays = buildRecoveryReadiness({
    astronaut,
    checkIns,
    vitals,
    missionDay: 10,
    windowDays: 14,
  });

  assert.equal(sevenDays.window.startDay, 4);
  assert.equal(sevenDays.window.endDay, 10);
  assert.equal(sevenDays.window.coveredDays, 7);
  assert.equal(fourteenDays.window.startDay, 1);
  assert.equal(fourteenDays.window.coveredDays, 10);
  assert.equal(fourteenDays.window.requestedDays, 14);
  assert.match(fourteenDays.window.coverageNotice ?? '', /14-day window selected/i);
});

test('a 14-day request is clamped to elapsed mission days', () => {
  const result = buildRecoveryReadiness({
    astronaut,
    checkIns: daysRange(1, 5).map((day) => makeCheckIn(day)),
    missionDay: 5,
    windowDays: 14,
  });

  assert.equal(result.window.requestedDays, 14);
  assert.equal(result.window.startDay, 1);
  assert.equal(result.window.coveredDays, 5);
  assert.match(result.window.coverageNotice ?? '', /14-day window selected/i);
});

test('one recorded night marks sleep partial instead of inventing variability', () => {
  const result = buildRecoveryReadiness({
    astronaut,
    checkIns: [makeCheckIn(7)],
    missionDay: 7,
    vitals: [makeVital(7)],
  });
  const sleep = result.factors.find((factor) => factor.id === 'sleep_regularity');

  assert.ok(sleep);
  assert.equal(sleep.status, 'partial');
  assert.match(sleep.missingReason ?? '', /at least two recorded nights/i);
  assert.match(result.missingDataNote, /at least two recorded nights/i);
});

test('a moderate recorded week lands in the Monitor band without escalation', () => {
  const moderateDays = daysRange(1, 7).map((day, index) =>
    makeCheckIn(day, {
      sleepHours: 6,
      sleepQuality: 2,
      exerciseMinutes: 30,
      exerciseCompleted: index < 3,
      resistanceTrainingCompleted: index === 0,
      hydrationLiters: 1.8,
      fatigueLevel: 3,
      stressLevel: 3,
      cognitiveFocus: 3,
      moodScore: 3,
    })
  );
  const result = buildRecoveryReadiness({
    astronaut,
    checkIns: moderateDays,
    missionDay: 7,
    vitals: fullVitals(),
  });

  assert.equal(result.band, 'monitor');
  assert.equal(result.bandLabel, 'Monitor');
  assert.ok(result.score != null && result.score >= 60 && result.score < 80);
  assert.equal(result.evidenceCoveragePercent, 100);
  assert.equal(result.weakestFactorId, 'exercise_adherence');
  assert.match(result.recommendation, /Focus first on exercise adherence/);
  assert.equal(result.escalation.level, 'none');
  assert.match(result.bandReason, /within the Monitor band/i);
});

test('conflicting inputs stay separate and one bad observation does not escalate', () => {
  const mixedDays = fullWindow().map((checkIn) =>
    checkIn.missionDay === 7
      ? makeCheckIn(7, { fatigueLevel: 5, stressLevel: 5 })
      : checkIn
  );
  const result = buildRecoveryReadiness({
    astronaut,
    checkIns: mixedDays,
    missionDay: 7,
    vitals: fullVitals(),
  });
  const sleep = result.factors.find((factor) => factor.id === 'sleep_regularity');
  const workload = result.factors.find((factor) => factor.id === 'workload_fatigue');

  assert.ok(sleep && workload);
  assert.equal(sleep.score, 100);
  assert.ok(workload.score != null && workload.score < sleep.score);
  assert.equal(result.escalation.level, 'none');
  assert.equal(result.escalation.reasons.length, 0);
  assert.equal(result.escalation.action, 'none');
});

test('recorded vitals are scored separately and simulated samples cannot fill a gap', () => {
  const withVitals = buildRecoveryReadiness({
    astronaut,
    checkIns: fullWindow(),
    missionDay: 7,
    vitals: fullVitals(),
  });
  const withoutVitals = buildRecoveryReadiness({
    astronaut,
    checkIns: fullWindow(),
    missionDay: 7,
    vitals: [],
    simulated: { points: simulatedPoints, sessionAstronautId: 'AST-01' },
  });
  const withVitalsFactor = withVitals.factors.find(
    (factor) => factor.id === 'recorded_vitals'
  );
  const withoutVitalsFactor = withoutVitals.factors.find(
    (factor) => factor.id === 'recorded_vitals'
  );

  assert.ok(withVitalsFactor && withoutVitalsFactor);
  assert.equal(withVitalsFactor.status, 'scored');
  assert.equal(withVitalsFactor.score, 100);
  assert.match(withVitalsFactor.summary, /Wearable Biometric Suite/);
  assert.ok(withVitalsFactor.inputs.every((input) => input.source === 'recorded'));
  assert.equal(withoutVitalsFactor.status, 'missing');
  assert.match(withoutVitalsFactor.missingReason ?? '', /simulated samples are excluded/i);
  assert.equal(withoutVitals.evidenceCoveragePercent, 90);
  assert.match(withoutVitals.missingDataNote, /No recorded vitals/i);
  assert.equal(withoutVitals.simulatedTrend.available, true);
  assert.equal(withoutVitals.simulatedTrend.includedInBand, false);
});

test('a single recorded vital day is partial, not a full evidence base', () => {
  const result = buildRecoveryReadiness({
    astronaut,
    checkIns: fullWindow(),
    missionDay: 7,
    vitals: [makeVital(7)],
  });
  const vitals = result.factors.find((factor) => factor.id === 'recorded_vitals');

  assert.ok(vitals);
  assert.equal(vitals.status, 'partial');
  assert.match(vitals.missingReason ?? '', /Only one recorded vital day/i);
  assert.match(result.missingDataNote, /Only one recorded vital day/i);
});

test('a poor recorded week lands in Rest and recover with a review escalation', () => {
  const result = buildRecoveryReadiness({
    astronaut,
    checkIns: poorWeek(),
    missionDay: 7,
    vitals: fullVitals(),
  });

  assert.equal(result.band, 'rest');
  assert.equal(result.bandLabel, 'Rest and recover');
  assert.ok(result.score != null && result.score < 60);
  assert.equal(result.evidenceCoveragePercent, 100);
  assert.equal(result.escalation.level, 'review');
  assert.equal(result.escalation.action, 'review_report');
  assert.equal(result.escalation.reasons.length, 2);
  assert.match(result.escalation.detail, /not a diagnosis/i);
  assert.match(result.recommendation, /Prioritize recovery/);
});

test('a recorded safety escalation always forces the Rest band', () => {
  const result = buildRecoveryReadiness({
    astronaut,
    checkIns: fullWindow(),
    missionDay: 7,
    vitals: fullVitals(),
    escalation: {
      required: true,
      reasons: ['Chest pain recorded.', 'Chest pain recorded.'],
    },
  });

  assert.equal(result.band, 'rest');
  assert.equal(result.escalation.level, 'urgent');
  assert.equal(result.escalation.action, 'escalation_report');
  assert.match(result.bandReason, /set to Rest and recover because a recorded safety escalation/i);
  assert.equal(result.escalation.reasons.length, 1);
  assert.equal(result.escalation.reasons[0], 'Chest pain recorded.');
  assert.match(result.escalation.detail, /Notify the Crew Medical Lead/);
  assert.doesNotMatch(result.escalation.detail, /Chest pain recorded/);
  assert.match(result.recommendation, /Follow mission medical escalation procedures now/);
});

test('weights and points are transparent and sum to the weighted score', () => {
  const result = buildRecoveryReadiness({
    astronaut,
    checkIns: fullWindow(),
    missionDay: 7,
    vitals: fullVitals(),
  });

  for (const factor of result.factors) {
    assert.equal(factor.weight, RECOVERY_FACTOR_WEIGHTS[factor.id]);
    assert.ok(factor.score != null);
    assert.equal(
      factor.points,
      Math.round(((factor.score * factor.weight) / 100) * 10) / 10
    );
  }
  const totalWeight = result.factors.reduce((sum, factor) => sum + factor.weight, 0);
  assert.equal(totalWeight, 100);
  assert.equal(result.factors.length, 6);
});

test('source separation keeps simulated values out of every readiness factor', () => {
  const result = buildRecoveryReadiness({
    astronaut,
    checkIns: fullWindow(),
    missionDay: 7,
    vitals: fullVitals(),
    simulated: { points: simulatedPoints, sessionAstronautId: 'AST-01' },
  });
  const inputSources = new Set(
    result.factors.flatMap((factor) => factor.inputs.map((input) => input.source))
  );

  assert.deepEqual([...inputSources], ['recorded']);
  assert.equal(result.simulatedTrend.available, true);
  assert.equal(result.simulatedTrend.includedInBand, false);
  assert.match(result.simulatedTrend.detail, /not a recovery measurement/i);
});

test('readiness bands respond to check-in changes while simulation cannot move the band', () => {
  const ready = buildRecoveryReadiness({
    astronaut,
    checkIns: fullWindow(),
    missionDay: 7,
    vitals: fullVitals(),
    simulated: { points: simulatedPoints, sessionAstronautId: 'AST-01' },
  });
  const rest = buildRecoveryReadiness({
    astronaut,
    checkIns: poorWeek(),
    missionDay: 7,
    vitals: fullVitals(),
    simulated: { points: simulatedPoints, sessionAstronautId: 'AST-01' },
  });
  const falling = buildRecoveryReadiness({
    astronaut,
    checkIns: fullWindow(),
    missionDay: 7,
    vitals: fullVitals(),
    simulated: { points: fallingSimulatedPoints, sessionAstronautId: 'AST-01' },
  });

  assert.equal(ready.band, 'ready');
  assert.equal(rest.band, 'rest');
  assert.notEqual(ready.score, rest.score);
  assert.equal(falling.band, ready.band);
  assert.equal(falling.score, ready.score);
  assert.equal(ready.simulatedTrend.directionLabel, 'Rising');
  assert.equal(falling.simulatedTrend.directionLabel, 'Falling');
  assert.equal(ready.simulatedTrend.latestHeartRateBpm, 76);
  assert.equal(falling.simulatedTrend.latestHeartRateBpm, 64);
});

test('simulated trend is labeled, astronaut-scoped, and never changes the band', () => {
  const base = buildRecoveryReadiness({
    astronaut,
    checkIns: fullWindow(),
    missionDay: 7,
    vitals: fullVitals(),
  });
  const withSimulated = buildRecoveryReadiness({
    astronaut,
    checkIns: fullWindow(),
    missionDay: 7,
    vitals: fullVitals(),
    simulated: { points: simulatedPoints, sessionAstronautId: 'AST-01' },
  });

  assert.equal(withSimulated.score, base.score);
  assert.equal(withSimulated.band, base.band);
  assert.equal(withSimulated.simulatedTrend.available, true);
  assert.equal(withSimulated.simulatedTrend.includedInBand, false);
  assert.equal(withSimulated.simulatedTrend.direction, 'rising');
  assert.equal(withSimulated.simulatedTrend.directionLabel, 'Rising');
  assert.equal(withSimulated.simulatedTrend.scenarioLabel, 'Exercise');
  assert.equal(withSimulated.simulatedTrend.latestHeartRateBpm, 76);
  assert.equal(withSimulated.simulatedTrend.sampleCount, 4);
  assert.deepEqual(withSimulated.simulatedTrend.series, [60, 64, 68, 76]);
  assert.match(withSimulated.simulatedTrend.detail, /not a recovery measurement/i);
});

test('simulated trend is withheld for another astronaut or an unassigned session', () => {
  const mismatched = buildSimulatedRecoveryTrend(simulatedPoints, {
    astronautId: 'AST-01',
    sessionAstronautId: 'AST-02',
  });
  assert.equal(mismatched.available, false);
  assert.equal(mismatched.sampleCount, 0);
  assert.match(mismatched.detail, /different crew profile/i);

  const unassigned = buildSimulatedRecoveryTrend(simulatedPoints, {
    astronautId: 'AST-01',
    sessionAstronautId: null,
  });
  assert.equal(unassigned.available, false);
  assert.match(unassigned.detail, /no crew assignment/i);
});
