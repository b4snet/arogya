import assert from 'node:assert/strict';
import { beforeEach, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import type { CheckIn, VitalReading } from '../../types';
import { SEED_ASTRONAUTS } from '../../data/astronauts';
import type { SimulatedSample } from '../../utils/simulatedTelemetry';
import { RecoveryReadinessPanel } from './RecoveryReadinessPanel';

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

const points: SimulatedSample[] = [
  { tick: 1, tMs: 1000, heartRateBpm: 60, spo2Percent: 98.2, scenario: 'exercise' },
  { tick: 2, tMs: 2000, heartRateBpm: 64, spo2Percent: 97.9, scenario: 'exercise' },
  { tick: 3, tMs: 3000, heartRateBpm: 68, spo2Percent: 97.6, scenario: 'exercise' },
  { tick: 4, tMs: 4000, heartRateBpm: 76, spo2Percent: 97.2, scenario: 'exercise' },
];

const fallingPoints: SimulatedSample[] = [
  { tick: 1, tMs: 1000, heartRateBpm: 76, spo2Percent: 97.2, scenario: 'exercise' },
  { tick: 2, tMs: 2000, heartRateBpm: 72, spo2Percent: 97.5, scenario: 'exercise' },
  { tick: 3, tMs: 3000, heartRateBpm: 68, spo2Percent: 97.8, scenario: 'exercise' },
  { tick: 4, tMs: 4000, heartRateBpm: 64, spo2Percent: 98.1, scenario: 'exercise' },
];

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

function poorWeek(): CheckIn[] {
  return [1, 2, 3, 4, 5, 6, 7].map((day) =>
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

const healthyWeek = [1, 2, 3, 4, 5, 6, 7].map((day) => makeCheckIn(day));
const healthyVitals = [1, 2, 3, 4, 5, 6, 7].map((day) => makeVital(day));

function renderPanel({
  checkIns = healthyWeek,
  vitals = healthyVitals,
  escalationRequired = false,
  escalationReasons = [],
}: {
  checkIns?: CheckIn[];
  vitals?: VitalReading[];
  escalationRequired?: boolean;
  escalationReasons?: string[];
} = {}) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <RecoveryReadinessPanel
        astronaut={astronaut}
        missionDay={7}
        checkIns={checkIns}
        vitals={vitals}
        escalationRequired={escalationRequired}
        escalationReasons={escalationReasons}
      />
    </MemoryRouter>
  );
}

beforeEach(() => {
  simulationState.current.astronautId = null;
  simulationState.current.points = [];
});

test('panel renders the band, explained factors, sources, and separated simulated trend', () => {
  simulationState.current.astronautId = astronaut.id;
  simulationState.current.points = points;

  const html = renderPanel();

  assert.match(html, /aria-labelledby="recovery-readiness-heading"/);
  assert.match(html, /Recovery readiness/);
  assert.match(html, /data-mission-source="recorded"/);
  assert.match(html, /data-mission-source="simulated"/);
  assert.match(html, /Recovery band/);
  assert.match(html, /Ready/);
  assert.match(html, /100\/100/);
  assert.match(html, /100%/);

  assert.match(html, /What contributed/);
  assert.match(html, /Factor points = score × weight/);
  assert.match(html, /Check-in adherence/);
  assert.match(html, /Sleep regularity/);
  assert.match(html, /Exercise adherence/);
  assert.match(html, /Hydration &amp; nutrition entries/);
  assert.match(html, /Workload &amp; fatigue self-report/);
  assert.match(html, /Recorded vitals coverage/);
  assert.match(html, />Recorded</);
  assert.match(html, />Simulated</);
  assert.match(html, />Research context</);
  assert.doesNotMatch(html, />Derived</);
  assert.doesNotMatch(html, />Target</);
  assert.match(html, /bedtime and wake time are not recorded/i);
  assert.match(html, /app-derived estimates, not measured intake/i);
  assert.match(html, /Missing data:/);
  assert.match(html, /All six factors were scored/);
  assert.match(html, /Evidence coverage/);
  assert.match(html, /Monitor 60–79/);

  assert.match(html, /Simulated recovery trend/);
  assert.match(html, /Excluded from band/);
  assert.match(html, /76/);
  assert.match(html, /Rising/);
  assert.match(html, /scenario: Exercise/);
  assert.match(html, /cannot change the readiness band/);

  assert.match(html, /Escalation pathway/);
  assert.match(html, /No configured recovery-review pattern met/);
  assert.match(html, /three consecutive recorded days below 6 h sleep/);
  assert.match(html, /A single observation does not trigger/);
  assert.match(html, /href="\/check-in"/);
  assert.match(html, /href="\/vitals"/);
  assert.match(html, /href="\/mission"/);
  assert.match(html, /href="\/reports"/);
  assert.match(html, /href="\/research"/);
  assert.match(html, /role="group" aria-label="Recovery observation window"/);
  assert.match(html, /aria-pressed="true"[^>]*>7d</);
  assert.match(html, /aria-pressed="false"[^>]*>14d</);
  assert.doesNotMatch(html, />30d</);
  assert.match(html, /monitoring support, not a medical diagnosis/i);
  assert.doesNotMatch(html, /diagnosed with|clinical validation|live sensor/i);
});

test('panel shows unscored missing data honestly and withholds another crew’s simulation', () => {
  simulationState.current.astronautId = 'AST-02';
  simulationState.current.points = points;

  const html = renderPanel({ checkIns: [], vitals: [] });

  assert.match(html, /Not scored/);
  assert.match(html, /No check-ins were recorded/);
  assert.match(html, /no factor was assumed normal/i);
  assert.match(html, /No recorded vitals were available either/i);
  assert.match(html, /Missing/);
  assert.match(html, /No recorded sleep entries/);
  assert.match(html, /No recorded vitals in this window/);
  assert.match(html, /different crew profile; its values are withheld/);
  assert.doesNotMatch(html, />76</);
  assert.doesNotMatch(html, /Rising/);
  assert.doesNotMatch(html, /href="\/reports\?escalate=1"/);
});

test('an urgent recorded escalation forces the rest band and exposes the escalation brief', () => {
  const html = renderPanel({
    escalationRequired: true,
    escalationReasons: ['Chest pain recorded.'],
  });

  assert.match(html, /Rest and recover/);
  assert.match(html, /Follow mission medical escalation procedures now/);
  assert.match(html, /Chest pain recorded\./);
  assert.match(html, /set to Rest and recover because a recorded safety escalation applies/);
  assert.match(html, /href="\/reports\?escalate=1"/);
  assert.match(html, /Open escalation brief/);
});

test('panel updates when recorded check-ins or the simulation state change', () => {
  simulationState.current.astronautId = astronaut.id;
  simulationState.current.points = points;

  const readyHtml = renderPanel();
  const restHtml = renderPanel({ checkIns: poorWeek() });

  assert.match(readyHtml, />Ready</);
  assert.match(readyHtml, /Rising/);
  assert.match(readyHtml, /76/);
  assert.match(restHtml, /Rest and recover/);
  assert.match(restHtml, /Prioritize recovery/);

  simulationState.current.points = fallingPoints;
  const fallingHtml = renderPanel();

  assert.match(fallingHtml, />Ready</);
  assert.match(fallingHtml, /Falling/);
  assert.match(fallingHtml, /64/);
});
