import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { CheckIn, VitalReading } from '../types';
import { SEED_ASTRONAUTS } from '../data/astronauts';
import { NASA_CMP_DATASET } from '../data/researchLibrary';
import {
  buildCardiovascularOverview,
  buildMissionResearchContextCards,
  buildMusculoskeletalOverview,
  buildNutritionHydrationOverview,
  buildSleepRecoveryOverview,
} from './missionHealthPanels';

const astronaut = SEED_ASTRONAUTS[0];

function makeVital(missionDay: number, overrides: Partial<VitalReading> = {}): VitalReading {
  return {
    id: `vital-${missionDay}`,
    astronautId: astronaut.id,
    missionDay,
    timestampIso: `2026-11-${String(missionDay).padStart(2, '0')}T08:00:00.000Z`,
    source: 'wearable_mock',
    heartRateBpm: 64,
    hrvMs: 48,
    systolicBpMmHg: 118,
    diastolicBpMmHg: 76,
    spo2Percent: 98,
    respiratoryRateBpm: 14,
    bodyTempC: 36.7,
    bloodGlucoseMgDl: 90,
    dailyRadiationMsv: 0.5,
    cumulativeRadiationMsv: 7,
    bodyMassKg: 74.5,
    ...overrides,
  };
}

function makeCheckIn(
  missionDay: number,
  overrides: Partial<CheckIn> = {}
): CheckIn {
  return {
    id: `check-in-${missionDay}-${overrides.id ?? 'base'}`,
    astronautId: astronaut.id,
    missionDay,
    timestampIso: `2026-11-${String(missionDay).padStart(2, '0')}T08:00:00.000Z`,
    sleepHours: 7,
    sleepQuality: 4,
    moodScore: 4,
    stressLevel: 2,
    cognitiveFocus: 4,
    fatigueLevel: 2,
    hydrationLiters: 2,
    caloriesKcal: 2200,
    proteinGrams: 90,
    exerciseMinutes: 30,
    exerciseCompleted: true,
    resistanceTrainingCompleted: false,
    painScore: 0,
    symptoms: ['none'],
    crewNotes: '',
    syncedToGround: false,
    ...overrides,
  };
}

test('cardiovascular overview keeps the latest recorded reading, window trends, and reference context', () => {
  const heartRates = [60, 62, 64, 66, 70, 74, 78];
  const vitals = [6, 7, 8, 9, 10, 11, 12, 13, 14].map((day, index) =>
    makeVital(day, {
      heartRateBpm: day < 8 ? 58 : heartRates[index - 2],
      spo2Percent: 98 - (day - 8) * 0.25,
      systolicBpMmHg: 112 + (day - 8) * 2,
      diastolicBpMmHg: 74 + (day - 8),
    })
  );

  const overview = buildCardiovascularOverview(vitals, 14, 7);

  assert.equal(overview.window.startDay, 8);
  assert.equal(overview.window.endDay, 14);
  assert.equal(overview.window.recordedDays, 7);
  assert.equal(overview.window.coverageNotice, null);
  assert.equal(overview.hasRecordedVitals, true);
  assert.equal(overview.latestDay, 14);
  assert.equal(overview.latestSourceLabel, 'Wearable Biometric Suite');
  assert.equal(overview.heartRate.latest, 78);
  assert.equal(overview.heartRate.observedInWindow, 7);
  assert.equal(overview.heartRate.trend.direction, 'rising');
  assert.match(overview.heartRate.referenceRange, /50–90 bpm/);
  assert.equal(overview.spo2.trend.direction, 'falling');
  assert.match(overview.spo2.referenceRange, /≥ 95%/);
  assert.equal(overview.bloodPressure.systolic, 124);
  assert.equal(overview.bloodPressure.diastolic, 80);
  assert.equal(overview.bloodPressure.trend.direction, 'rising');
  assert.match(overview.bloodPressure.referenceRange, /95–130 \/ 60–85 mmHg/);
  assert.deepEqual(overview.missingChannels, []);
  assert.match(overview.referenceDisclaimer, /general adult educational ranges/);
  assert.match(overview.referenceDisclaimer, /does not diagnose/);
});

test('cardiovascular overview reports missing channels and clamps oversized windows without imputing', () => {
  const vitals = [
    makeVital(1, {
      heartRateBpm: 70,
      spo2Percent: null,
      systolicBpMmHg: null,
      diastolicBpMmHg: null,
    }),
    makeVital(2, {
      heartRateBpm: 72,
      spo2Percent: null,
      systolicBpMmHg: null,
      diastolicBpMmHg: null,
    }),
    makeVital(9, { heartRateBpm: 90 }),
  ];

  const overview = buildCardiovascularOverview(vitals, 5, 30);

  assert.equal(overview.window.startDay, 1);
  assert.equal(overview.window.coveredDays, 5);
  assert.equal(overview.window.recordedDays, 2);
  assert.equal(
    overview.window.coverageNotice,
    '30-day window selected; 2 days of observations available.'
  );
  assert.equal(overview.latestDay, 2);
  assert.equal(overview.heartRate.latest, 72);
  assert.equal(overview.heartRate.trend.direction, 'stable');
  assert.deepEqual(overview.missingChannels, ['SpO₂', 'blood pressure']);
  assert.equal(overview.bloodPressure.systolic, null);
  assert.equal(overview.spo2.latest, null);
});

test('check-in panels deduplicate mission days and report an honest empty state', () => {
  const checkIns = [
    makeCheckIn(6, { sleepHours: 5 }),
    makeCheckIn(8, {
      exerciseMinutes: 30,
      exerciseCompleted: true,
      resistanceTrainingCompleted: true,
      resistanceMinutes: 20,
      painScore: 2,
      sleepHours: 7,
      sleepQuality: 4,
      fatigueLevel: 2,
      stressLevel: 2,
      hydrationLiters: 2,
      caloriesKcal: 2200,
      proteinGrams: 90,
    }),
    makeCheckIn(9, {
      id: 'day-9',
      exerciseMinutes: 20,
      exerciseCompleted: false,
      painScore: 4,
      sleepHours: 6,
      sleepQuality: 3,
      fatigueLevel: 3,
      stressLevel: 3,
      hydrationLiters: 1.5,
      caloriesKcal: 1800,
      proteinGrams: 80,
    }),
    makeCheckIn(10, {
      id: 'day-10-first',
      exerciseMinutes: 60,
      exerciseCompleted: true,
      painScore: 0,
      sleepHours: 8,
      sleepQuality: 5,
      fatigueLevel: 1,
      stressLevel: 1,
      hydrationLiters: 2.5,
      caloriesKcal: 2600,
      proteinGrams: 100,
    }),
    makeCheckIn(10, {
      id: 'day-10-latest',
      exerciseMinutes: 10,
      exerciseCompleted: false,
      resistanceTrainingCompleted: false,
      painScore: 1,
      sleepHours: 8,
      sleepQuality: 5,
      fatigueLevel: 1,
      stressLevel: 1,
      hydrationLiters: 2.5,
      caloriesKcal: 2600,
      proteinGrams: 100,
    }),
  ];

  const musculoskeletal = buildMusculoskeletalOverview(checkIns, 14, 7);
  assert.equal(musculoskeletal.window.startDay, 8);
  assert.equal(musculoskeletal.window.recordedDays, 3);
  assert.equal(musculoskeletal.hasData, true);
  assert.equal(musculoskeletal.exerciseDays, 1);
  assert.equal(musculoskeletal.exerciseAdherencePercent, 33);
  assert.equal(musculoskeletal.totalExerciseMinutes, 60);
  assert.equal(musculoskeletal.averageExerciseMinutes, 20);
  assert.equal(musculoskeletal.resistanceSessions, 1);
  assert.equal(musculoskeletal.totalResistanceMinutes, 20);
  assert.equal(musculoskeletal.latestPainScore, 1);
  assert.equal(musculoskeletal.highestPainScore, 4);
  assert.equal(musculoskeletal.averagePainScore, (2 + 4 + 1) / 3);

  const sleep = buildSleepRecoveryOverview(checkIns, 14, astronaut.baseline.sleepTargetHours, 7);
  assert.equal(sleep.averageSleepHours, 7);
  assert.equal(sleep.latestSleepHours, 8);
  assert.equal(sleep.averageSleepQuality, 4);
  assert.equal(sleep.averageFatigueLevel, 2);
  assert.equal(sleep.averageStressLevel, 2);
  assert.equal(sleep.sleepTargetHours, 7.5);

  const nutrition = buildNutritionHydrationOverview(
    checkIns,
    14,
    {
      hydrationTargetLiters: astronaut.baseline.hydrationTargetLiters,
      calorieTargetKcal: astronaut.baseline.calorieTargetKcal,
    },
    7
  );
  assert.equal(nutrition.averageHydrationLiters, 2);
  assert.equal(nutrition.latestHydrationLiters, 2.5);
  assert.equal(nutrition.averageCaloriesKcal, 2200);
  assert.equal(nutrition.averageProteinGrams, 90);
  assert.equal(nutrition.hydrationTargetLiters, 2.5);
  assert.equal(nutrition.calorieTargetKcal, 2650);

  const empty = buildMusculoskeletalOverview([], 3, 7);
  assert.equal(empty.hasData, false);
  assert.equal(empty.window.recordedDays, 0);
  assert.equal(empty.latestPainScore, null);
  assert.equal(empty.averagePainScore, null);
  assert.equal(empty.window.coverageNotice, '7-day window selected; 0 days of observations available.');

  const emptySleep = buildSleepRecoveryOverview([], 3, 7.5, 7);
  assert.equal(emptySleep.hasData, false);
  assert.equal(emptySleep.averageSleepHours, null);
  assert.equal(emptySleep.latestSleepHours, null);
});

test('research context cards summarize only bundled OSD-575 observations', () => {
  const cards = buildMissionResearchContextCards(NASA_CMP_DATASET);

  assert.deepEqual(
    cards.map((card) => card.analyteId),
    ['glucose', 'sodium', 'creatinine', 'albumin']
  );

  const glucose = cards[0];
  assert.equal(glucose.label, 'Glucose');
  assert.equal(glucose.unit, 'mg/dL');
  assert.equal(glucose.subjectCount, 4);
  assert.equal(glucose.sampleCount, 28);
  assert.equal(glucose.observedCount, 28);
  assert.equal(glucose.missingCount, 0);
  assert.equal(glucose.minValue, 36);
  assert.equal(glucose.maxValue, 103);
  assert.equal(glucose.rangeLabel, '36–103 mg/dL');

  for (const card of cards) {
    assert.equal(card.observedCount + card.missingCount, card.sampleCount);
    assert.ok(card.subjectCount <= 4);
  }

  assert.deepEqual(buildMissionResearchContextCards(NASA_CMP_DATASET, ['not-an-analyte']), []);
});
