import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { CheckIn } from '../types';
import { SEED_ASTRONAUTS } from '../data/astronauts';
import {
  buildCountermeasureCoach,
  COUNTERMEASURE_COACH_DISCLAIMER,
  COUNTERMEASURE_COACH_WINDOW_DAYS,
} from './countermeasureCoach';

const astronaut = SEED_ASTRONAUTS[0];

function makeCheckIn(missionDay: number, overrides: Partial<CheckIn> = {}): CheckIn {
  return {
    id: `check-in-${missionDay}`,
    astronautId: astronaut.id,
    missionDay,
    timestampIso: `2026-11-${String(missionDay).padStart(2, '0')}T08:00:00.000Z`,
    sleepHours: astronaut.baseline.sleepTargetHours,
    sleepQuality: 5,
    moodScore: 5,
    stressLevel: 1,
    cognitiveFocus: 5,
    fatigueLevel: 1,
    hydrationLiters: astronaut.baseline.hydrationTargetLiters,
    caloriesKcal: astronaut.baseline.calorieTargetKcal,
    proteinGrams: 95,
    exerciseMinutes: astronaut.baseline.exerciseTargetMinutes,
    exerciseCompleted: true,
    resistanceTrainingCompleted: true,
    painScore: 0,
    symptoms: ['none'],
    crewNotes: '',
    syncedToGround: false,
    ...overrides,
  };
}

function healthyWeek(missionDay = 7): CheckIn[] {
  return Array.from({ length: missionDay }, (_, index) => makeCheckIn(index + 1));
}

function poorWeek(): CheckIn[] {
  return healthyWeek().map((day) =>
    makeCheckIn(day.missionDay, {
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

function item(plan: ReturnType<typeof buildCountermeasureCoach>, id: string) {
  const found = plan.items.find((entry) => entry.id === id);
  assert.ok(found, `expected countermeasure ${id}`);
  return found;
}

test('healthy recorded week shows six on-track countermeasures and no forced focus', () => {
  const plan = buildCountermeasureCoach({
    astronaut,
    checkIns: healthyWeek(),
    missionDay: 7,
  });

  assert.equal(plan.items.length, 6);
  assert.equal(plan.window.requestedDays, COUNTERMEASURE_COACH_WINDOW_DAYS);
  assert.equal(plan.todayCheckInComplete, true);
  assert.equal(plan.focusItemId, null);
  assert.match(plan.summary, /All six countermeasure areas are on track/i);
  assert.equal(plan.disclaimer, COUNTERMEASURE_COACH_DISCLAIMER);
  assert.match(plan.disclaimer, /educational planning support, not medical advice/i);

  assert.deepEqual(
    plan.items.map((entry) => entry.label),
    [
      'Exercise adherence & planned activity',
      'Sleep schedule & recovery',
      'Hydration gaps',
      'Nutrition logging gaps',
      'Workload & recovery balance',
      'Check-in completion',
    ]
  );
  plan.items.forEach((entry) => {
    assert.equal(entry.status, 'on_track');
    assert.equal(entry.statusLabel, 'On track');
    assert.equal(entry.todayRecorded, true);
    assert.ok(entry.dataSources.length > 0);
    assert.ok(entry.dataSources.every((source) => source.source === 'recorded'));
  });
});

test('a poor recorded week flags review areas and focuses the lowest-scoring factor', () => {
  const plan = buildCountermeasureCoach({
    astronaut,
    checkIns: poorWeek(),
    missionDay: 7,
  });

  assert.equal(plan.todayCheckInComplete, true);
  assert.equal(plan.focusItemId, 'exercise');
  assert.match(plan.summary, /Today’s suggested focus: Exercise adherence & planned activity/i);
  assert.equal(item(plan, 'exercise').status, 'review');
  assert.equal(item(plan, 'sleep').status, 'review');
  assert.equal(item(plan, 'hydration').status, 'review');
  assert.equal(item(plan, 'workload').status, 'review');
  assert.equal(item(plan, 'nutrition').status, 'on_track');
  assert.equal(item(plan, 'check_in').status, 'on_track');
  assert.match(item(plan, 'sleep').suggestedAction, /Consider reviewing your sleep schedule/i);
  assert.match(item(plan, 'hydration').suggestedAction, /Review hydration logging/i);
  assert.doesNotMatch(
    JSON.stringify(plan),
    /diagnosed with|treatment plan|clinical validation|NASA endorses/i
  );
});

test('no recorded check-ins produces explicit missing states without assumed values', () => {
  const plan = buildCountermeasureCoach({
    astronaut,
    checkIns: [],
    missionDay: 7,
  });

  assert.equal(plan.todayCheckInComplete, false);
  assert.equal(plan.focusItemId, 'check_in');
  assert.match(plan.summary, /Complete today’s check-in first/i);
  plan.items.forEach((entry) => {
    assert.equal(entry.status, 'missing');
    assert.equal(entry.statusLabel, 'Missing data');
    assert.equal(entry.todayRecorded, false);
    assert.equal(entry.dataSources.length, 0);
    assert.ok(entry.missingDataNote);
  });
  assert.match(item(plan, 'check_in').suggestedAction, /Complete today’s check-in/i);
  assert.match(item(plan, 'exercise').currentStatus, /No value was assumed/i);
  assert.match(item(plan, 'hydration').currentStatus, /No recorded hydration entries/i);
});

test('a missing current-day check-in keeps recent context but focuses check-in completion', () => {
  const plan = buildCountermeasureCoach({
    astronaut,
    checkIns: healthyWeek(7),
    missionDay: 8,
  });

  assert.equal(plan.todayCheckInComplete, false);
  assert.equal(plan.focusItemId, 'check_in');
  assert.equal(item(plan, 'check_in').status, 'review');
  assert.match(item(plan, 'check_in').currentStatus, /No check-in is recorded for Sol 8/i);
  assert.match(item(plan, 'check_in').missingDataNote ?? '', /1 of 7 mission days/i);
  assert.equal(item(plan, 'exercise').status, 'on_track');
  assert.equal(item(plan, 'exercise').todayRecorded, false);
  assert.match(
    item(plan, 'exercise').missingDataNote ?? '',
    /Today’s check-in is not recorded/i
  );
  assert.match(item(plan, 'exercise').suggestedAction, /Continue the planned/i);
});

test('partial sleep evidence is labeled partial and cannot be presented as on track', () => {
  const plan = buildCountermeasureCoach({
    astronaut,
    checkIns: [makeCheckIn(7)],
    missionDay: 7,
  });

  const sleep = item(plan, 'sleep');
  assert.equal(sleep.status, 'review');
  assert.match(sleep.missingDataNote ?? '', /Partial evidence/i);
  assert.match(sleep.missingDataNote ?? '', /One recorded night/i);
  assert.equal(plan.focusItemId, 'sleep');
});

test('hydration gaps are reviewed from recorded values while nutrition stays on track', () => {
  const checkIns = healthyWeek().map((day) =>
    makeCheckIn(day.missionDay, { hydrationLiters: 1.5 })
  );
  const plan = buildCountermeasureCoach({ astronaut, checkIns, missionDay: 7 });

  const hydration = item(plan, 'hydration');
  assert.equal(hydration.status, 'review');
  assert.match(hydration.currentStatus, /1.5 L\/day average vs 2.5 L planning reference/i);
  assert.match(hydration.currentStatus, /80% of that reference/i);
  assert.match(hydration.suggestedAction, /Review hydration logging/i);
  assert.ok(hydration.dataSources.every((source) => source.source === 'recorded'));
  assert.match(hydration.plannedTarget ?? '', /2.5 L\/day planning reference/i);
  assert.equal(item(plan, 'nutrition').status, 'on_track');
  assert.equal(plan.focusItemId, 'hydration');
});

test('missing nutrition entries are shown as logging gaps without judging intake adequacy', () => {
  const checkIns = healthyWeek().map((day) =>
    makeCheckIn(day.missionDay, { caloriesKcal: 0, proteinGrams: 0 })
  );
  const plan = buildCountermeasureCoach({ astronaut, checkIns, missionDay: 7 });

  const nutrition = item(plan, 'nutrition');
  assert.equal(nutrition.status, 'review');
  assert.match(nutrition.currentStatus, /0 of 7 recorded days include a nutrition entry/i);
  assert.match(nutrition.suggestedAction, /Review nutrition logging/i);
  assert.match(nutrition.suggestedAction, /not used to judge intake adequacy/i);
  assert.match(nutrition.missingDataNote ?? '', /7 of 7 recorded days have no nutrition entry/i);
  assert.equal(nutrition.researchContext.length, 0);
  assert.match(nutrition.researchGapNote ?? '', /No nutrition-specific NASA research/i);
  assert.equal(plan.focusItemId, 'nutrition');
});

test('research context comes only from bundled NASA sources and is labeled research', () => {
  const plan = buildCountermeasureCoach({
    astronaut,
    checkIns: healthyWeek(),
    missionDay: 7,
  });

  const exerciseResearch = item(plan, 'exercise').researchContext;
  assert.ok(
    exerciseResearch.some((context) => context.id === 'nasa-hrp-cardio'),
    'expected bundled cardiovascular reference'
  );
  assert.ok(
    exerciseResearch.some((context) => context.id === 'hazard-gravity'),
    'expected bundled gravity hazard context'
  );
  assert.ok(exerciseResearch.every((context) => context.source === 'research'));

  const sleepResearch = item(plan, 'sleep').researchContext;
  assert.ok(sleepResearch.some((context) => context.id === 'nasa-hrp-bhpc'));
  assert.ok(sleepResearch.some((context) => context.id === 'hazard-isolation'));

  const hydration = item(plan, 'hydration');
  assert.ok(hydration.researchContext.some((context) => context.id === 'hazard-gravity'));
  assert.match(hydration.researchGapNote ?? '', /No hydration-intake study is bundled/i);

  assert.equal(item(plan, 'nutrition').researchContext.length, 0);
  assert.match(item(plan, 'nutrition').researchGapNote ?? '', /No nutrition-specific/i);
  assert.doesNotMatch(JSON.stringify(plan), /trained on NASA|NASA endorsement/i);
});

test('the coach uses a 14-day window when requested and reports real coverage', () => {
  const plan = buildCountermeasureCoach({
    astronaut,
    checkIns: healthyWeek(10),
    missionDay: 10,
    windowDays: 14,
  });

  assert.equal(plan.window.requestedDays, 14);
  assert.equal(plan.window.startDay, 1);
  assert.equal(plan.window.endDay, 10);
  assert.equal(plan.window.coveredDays, 10);
  assert.equal(plan.window.recordedDays, 10);
  assert.match(plan.window.coverageNotice ?? '', /14-day window selected; 10 days/i);
});

test('planned activity and source labels remain explicit, with no simulated inputs', () => {
  const plan = buildCountermeasureCoach({
    astronaut,
    checkIns: healthyWeek(),
    missionDay: 7,
  });

  const exercise = item(plan, 'exercise');
  assert.match(exercise.plannedTarget ?? '', /60 aerobic min\/day/i);
  assert.match(exercise.plannedTarget ?? '', /5 resistance sessions\/week/i);
  assert.ok(
    exercise.dataSources.some((source) => /Today’s exercise entry/.test(source.label))
  );
  const allSources = plan.items.flatMap((entry) => entry.dataSources);
  assert.ok(allSources.every((source) => source.source === 'recorded'));
  assert.ok(
    plan.items
      .flatMap((entry) => entry.researchContext)
      .every((context) => context.source === 'research')
  );
  assert.doesNotMatch(JSON.stringify(plan), /simulated/i);
});
