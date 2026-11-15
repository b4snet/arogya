import assert from 'node:assert/strict';
import { beforeEach, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { CheckIn, VitalReading } from '../../types';
import { SEED_ASTRONAUTS } from '../../data/astronauts';
import { RecoveryReadinessSummary } from './RecoveryReadinessSummary';

const { simulationState } = vi.hoisted(() => ({
  simulationState: {
    current: {
      astronautId: null as string | null,
      points: [] as unknown[],
    },
  },
}));

vi.mock('../../store/useSimulatedTelemetryStore', () => ({
  useSimulatedTelemetryStore: (
    selector: (state: typeof simulationState.current) => unknown
  ) => selector(simulationState.current),
}));

const astronaut = SEED_ASTRONAUTS[0];

function makeCheckIn(missionDay: number): CheckIn {
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
  };
}

function makeVital(missionDay: number): VitalReading {
  return {
    id: `vital-${missionDay}`,
    astronautId: astronaut.id,
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
  };
}

const healthyWeek = [1, 2, 3, 4, 5, 6, 7].map(makeCheckIn);
const healthyVitals = [1, 2, 3, 4, 5, 6, 7].map(makeVital);

function renderSummary({
  checkIns = healthyWeek,
  vitals = healthyVitals,
  escalationRequired = false,
}: {
  checkIns?: CheckIn[];
  vitals?: VitalReading[];
  escalationRequired?: boolean;
} = {}) {
  return renderToStaticMarkup(
    <RecoveryReadinessSummary
      astronaut={astronaut}
      missionDay={7}
      checkIns={checkIns}
      vitals={vitals}
      escalationRequired={escalationRequired}
      escalationReasons={escalationRequired ? ['Chest pain recorded.'] : []}
    />
  );
}

beforeEach(() => {
  simulationState.current.astronautId = null;
  simulationState.current.points = [];
});

test('summary states today’s readiness band, coverage, and links to the detailed panel', () => {
  const html = renderSummary();

  assert.match(html, /id="today-readiness-heading"/);
  assert.match(html, /Today’s recovery readiness/);
  assert.match(html, /100\s*<span[^>]*>\s*\/100/);
  assert.match(html, />Ready</);
  assert.match(html, /Day coverage/);
  assert.match(html, /Evidence/);
  assert.match(html, /href="#recovery-readiness"/);
  assert.match(html, /Review detail/);
  assert.doesNotMatch(html, /diagnosed with|clinical clearance is granted/i);
});

test('summary reports unscored readiness honestly when no observations exist', () => {
  const html = renderSummary({ checkIns: [], vitals: [] });

  assert.match(html, /Not scored/);
  assert.match(html, /No check-ins were recorded/);
  assert.match(html, /0%/);
  assert.doesNotMatch(html, /\/100/);
});

test('summary flags the review pathway when an escalation is recorded', () => {
  const html = renderSummary({ escalationRequired: true });

  assert.match(html, /Review pathway/);
  assert.match(html, /Rest and recover/);
});
