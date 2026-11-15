import assert from 'node:assert/strict';
import { test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import type { CheckIn } from '../../types';
import { SEED_ASTRONAUTS } from '../../data/astronauts';
import { CountermeasureCoachPanel } from './CountermeasureCoachPanel';

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

function renderPanel({
  checkIns = healthyWeek(),
  missionDay = 7,
}: {
  checkIns?: CheckIn[];
  missionDay?: number;
} = {}) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <CountermeasureCoachPanel
        astronaut={astronaut}
        missionDay={missionDay}
        checkIns={checkIns}
      />
    </MemoryRouter>
  );
}

test('panel renders six transparent countermeasures with actions, sources, and research context', () => {
  const html = renderPanel();

  assert.match(html, /aria-labelledby="countermeasure-coach-heading"/);
  assert.match(html, /Countermeasure coach/);
  assert.match(html, /Daily mission-health actions for Commander Aarav Sharma/);
  assert.match(html, /educational planning support, not medical advice/i);

  assert.match(html, /Exercise adherence &amp; planned activity/);
  assert.match(html, /Sleep schedule &amp; recovery/);
  assert.match(html, /Hydration gaps/);
  assert.match(html, /Nutrition logging gaps/);
  assert.match(html, /Workload &amp; recovery balance/);
  assert.match(html, /Check-in completion/);

  assert.match(html, />On track</);
  assert.match(html, /Suggested next step/);
  assert.match(html, /Continue the planned aerobic and resistance cadence/);
  assert.match(html, /All six countermeasure areas are on track/);
  assert.match(html, /Planning reference:/);
  assert.match(html, /60 aerobic min\/day/);
  assert.match(html, /5 resistance sessions\/week/);

  assert.match(html, /data-coach-source="recorded"/);
  assert.match(html, /data-coach-source="research"/);
  assert.match(html, /Recorded inputs/);
  assert.match(html, /NASA research reference/);
  assert.match(html, /NASA hazard framework/);
  assert.match(html, /Why this matters, NASA context &amp; sources/);
  assert.match(html, /Risk of Orthostatic Intolerance/);
  assert.match(html, /Risk of Adverse Cognitive or Behavioral Conditions/);

  assert.match(html, /href="\/check-in"/);
  assert.match(html, /href="\/research"/);
  assert.doesNotMatch(html, /data-coach-source="simulated"/);
  assert.doesNotMatch(html, /trained on NASA|NASA endorsement/i);
  assert.doesNotMatch(html, /diagnosed with|treatment plan|clinical validation|dosage/i);
});

test('a poor recorded week highlights the focus card and review actions', () => {
  const html = renderPanel({ checkIns: poorWeek() });

  assert.match(html, />Review</);
  assert.match(html, /Focus today/);
  assert.match(html, /Today’s suggested focus: Exercise adherence &amp; planned activity/);
  assert.match(html, /Consider reviewing your sleep schedule/);
  assert.match(html, /Review hydration logging/);
  assert.match(html, /Consider planning a recovery block/);
  assert.doesNotMatch(html, /All six countermeasure areas are on track/);
});

test('no recorded data renders missing states without invented values', () => {
  const html = renderPanel({ checkIns: [] });

  assert.equal((html.match(/>Missing data</g) ?? []).length, 6);
  assert.match(html, /Complete today’s check-in first/);
  assert.match(html, /No recorded data/);
  assert.match(html, /No recorded hydration entries in this window/);
  assert.match(html, /No recorded nutrition entries in this window/);
  assert.match(html, /No check-in is recorded for Sol 7|No check-ins were recorded/);
  assert.match(html, /No value was assumed/);
  assert.match(html, /Complete today’s check-in to establish a recorded baseline/);
  assert.doesNotMatch(html, /2\.5 L\/day average vs/);
  assert.doesNotMatch(html, />On track</);
});

test('a missing current-day check-in stays explicit while recent context remains visible', () => {
  const html = renderPanel({ checkIns: healthyWeek(7), missionDay: 8 });

  assert.match(html, /First action/);
  assert.match(html, /Complete today’s check-in first/);
  assert.match(html, /No check-in is recorded for Sol 8/);
  assert.match(html, /Today not recorded/);
  assert.match(html, /Today’s check-in is not recorded; recent window values are shown/);
  assert.match(html, /Continue the planned aerobic and resistance cadence/);
  assert.match(html, /1 of 7 mission days/);
});

test('partial sleep evidence is disclosed rather than rounded up', () => {
  const html = renderPanel({ checkIns: [makeCheckIn(7)] });

  assert.match(html, /Partial evidence/);
  assert.match(html, /one recorded night/i);
  assert.match(html, /Today’s suggested focus: Sleep schedule &amp; recovery/);
});

test('hydration and nutrition research gaps are stated without fabricated support', () => {
  const html = renderPanel();

  assert.match(html, /No hydration-intake study is bundled/);
  assert.match(html, /No nutrition-specific NASA research excerpt is bundled/);
  assert.match(html, /does not infer intake adequacy/);
  assert.match(html, /context only/);
});

test('panel keeps accessible headings, details, and source-labeled research links', () => {
  const html = renderPanel();

  for (const id of [
    'exercise',
    'sleep',
    'hydration',
    'nutrition',
    'workload',
    'check_in',
  ]) {
    assert.match(html, new RegExp(`aria-labelledby="countermeasure-${id}-heading"`));
    assert.match(html, new RegExp(`id="countermeasure-${id}-heading"`));
  }
  assert.equal((html.match(/<details/g) ?? []).length, 6);
  assert.equal((html.match(/<summary/g) ?? []).length, 6);
  assert.match(html, /aria-label="Open NASA source:/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noreferrer"/);
  assert.match(html, /focus-visible:ring-2/);
});
