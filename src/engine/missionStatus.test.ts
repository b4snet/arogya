import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { CheckIn } from '../types';
import {
  buildSimulatedVitalsSummary,
  formatSimulatedElapsed,
  summarizeCheckInAdherence,
  summarizeTrend,
} from './missionStatus';

function makeCheckIn(id: string, missionDay: number, astronautId = 'AST-01'): CheckIn {
  return {
    id,
    astronautId,
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
  };
}

test('trend direction compares early and late halves and stays neutral near the threshold', () => {
  assert.deepEqual(summarizeTrend([60, 62, 70, 72], 2), {
    direction: 'rising',
    label: 'Rising',
    delta: 10,
  });
  assert.deepEqual(summarizeTrend([80, 78, 70, 68], 2), {
    direction: 'falling',
    label: 'Falling',
    delta: -10,
  });
  assert.equal(summarizeTrend([60, 61, 60, 61], 2).direction, 'stable');
  assert.equal(summarizeTrend([60], 2).direction, 'insufficient');
  assert.equal(summarizeTrend([], 0.3).label, 'Not enough samples');
});

test('simulated vitals use the latest sample while blood pressure stays intermittent', () => {
  const summary = buildSimulatedVitalsSummary(
    [
      { tick: 1, tMs: 1000, heartRateBpm: 60, spo2Percent: 98.2, scenario: 'exercise' },
      { tick: 2, tMs: 2000, heartRateBpm: 64, spo2Percent: 97.9, scenario: 'exercise' },
      { tick: 3, tMs: 3000, heartRateBpm: 72, spo2Percent: 97.5, scenario: 'exercise' },
      { tick: 4, tMs: 4000, heartRateBpm: 76, spo2Percent: 97.2, scenario: 'exercise' },
    ],
    [{ tick: 4, tMs: 4000, systolicBpMmHg: 124, diastolicBpMmHg: 80 }]
  );

  assert.equal(summary.heartRateBpm, 76);
  assert.equal(summary.spo2Percent, 97.2);
  assert.equal(summary.systolicBpMmHg, 124);
  assert.equal(summary.diastolicBpMmHg, 80);
  assert.equal(summary.elapsedSeconds, 4);
  assert.equal(summary.heartRateTrend.direction, 'rising');
  assert.equal(summary.spo2Trend.direction, 'falling');
  assert.equal(summary.bloodPressureTrend.direction, 'insufficient');

  const withoutCuff = buildSimulatedVitalsSummary([], []);
  assert.equal(withoutCuff.heartRateBpm, null);
  assert.equal(withoutCuff.systolicBpMmHg, null);
  assert.equal(withoutCuff.elapsedSeconds, 0);
});

test('elapsed simulated time is mm:ss and clamps invalid input', () => {
  assert.equal(formatSimulatedElapsed(0), '0:00');
  assert.equal(formatSimulatedElapsed(65), '1:05');
  assert.equal(formatSimulatedElapsed(843), '14:03');
  assert.equal(formatSimulatedElapsed(-5), '0:00');
});

test('check-in adherence counts distinct observed mission days and clamps to mission start', () => {
  const checkIns = [
    makeCheckIn('a', 8),
    makeCheckIn('b', 9),
    makeCheckIn('c', 9),
    makeCheckIn('d', 10),
    makeCheckIn('other', 10, 'AST-02'),
  ];

  const sevenDays = summarizeCheckInAdherence(checkIns, 10, 7);
  assert.equal(sevenDays.windowStartDay, 4);
  assert.equal(sevenDays.expectedDays, 7);
  assert.equal(sevenDays.recordedDays, 3);
  assert.equal(sevenDays.percent, 43);
  assert.equal(sevenDays.label, '3 of 7 mission days (43%)');

  const thirtyDays = summarizeCheckInAdherence(checkIns, 5, 30);
  assert.equal(thirtyDays.windowStartDay, 1);
  assert.equal(thirtyDays.expectedDays, 5);
  assert.equal(thirtyDays.recordedDays, 0);
  assert.equal(thirtyDays.percent, 0);

  const singleDay = summarizeCheckInAdherence([makeCheckIn('e', 5)], 5, 1);
  assert.equal(singleDay.label, '1 of 1 mission day (100%)');
});
