import assert from 'node:assert/strict';
import { beforeEach, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import type { CheckIn, VitalReading } from '../../types';
import { SEED_ASTRONAUTS } from '../../data/astronauts';
import type { SimulatedSample } from '../../utils/simulatedTelemetry';
import { MissionHealthPanels } from './MissionHealthPanels';

const { simulationState } = vi.hoisted(() => ({
  simulationState: {
    current: {
      astronautId: null as string | null,
      points: [] as unknown[],
      bpSamples: [] as unknown[],
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
  { tick: 3, tMs: 3000, heartRateBpm: 72, spo2Percent: 97.5, scenario: 'exercise' },
  { tick: 4, tMs: 4000, heartRateBpm: 76, spo2Percent: 97.2, scenario: 'exercise' },
];

const bpSamples = [
  { tick: 3, tMs: 3000, systolicBpMmHg: 118, diastolicBpMmHg: 76 },
  { tick: 4, tMs: 4000, systolicBpMmHg: 124, diastolicBpMmHg: 80 },
];

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

const vitals = [
  makeVital(8, { heartRateBpm: 60, spo2Percent: 98 }),
  makeVital(9, { heartRateBpm: 64, spo2Percent: 97.8 }),
  makeVital(10, { heartRateBpm: 68, spo2Percent: 97.6 }),
  makeVital(14, {
    heartRateBpm: 78,
    spo2Percent: 96.4,
    systolicBpMmHg: null,
    diastolicBpMmHg: null,
  }),
];

const checkIns = [
  makeCheckIn(8, { exerciseMinutes: 30, exerciseCompleted: true, painScore: 1 }),
  makeCheckIn(9, { exerciseMinutes: 45, exerciseCompleted: true, painScore: 2 }),
  makeCheckIn(10, { exerciseMinutes: 15, exerciseCompleted: false, painScore: 0 }),
];

function renderPanels() {
  return renderToStaticMarkup(
    <MemoryRouter>
      <MissionHealthPanels
        astronaut={astronaut}
        missionDay={14}
        vitals={vitals}
        checkIns={checkIns}
      />
    </MemoryRouter>
  );
}

beforeEach(() => {
  simulationState.current.astronautId = null;
  simulationState.current.points = [];
  simulationState.current.bpSamples = [];
});

test('panels separate recorded, simulated, and research sources and expose honest missing data', () => {
  simulationState.current.astronautId = astronaut.id;
  simulationState.current.points = points;
  simulationState.current.bpSamples = bpSamples;

  const html = renderPanels();

  assert.match(html, /Mission health panels/);
  assert.match(html, /Cardiovascular overview/);
  assert.match(html, /Musculoskeletal overview/);
  assert.match(html, /Sleep and recovery overview/);
  assert.match(html, /Nutrition and hydration overview/);
  assert.match(html, /NASA research context/);

  assert.match(html, /data-mission-source="recorded"/);
  assert.match(html, /data-mission-source="simulated"/);
  assert.match(html, /data-mission-source="research"/);
  assert.match(html, /Recorded observations/);
  assert.match(html, /Latest: Day 14/);
  assert.match(html, /Wearable Biometric Suite/);
  assert.match(html, />78</);
  assert.match(html, /96\.4/);
  assert.match(html, /Not recorded/);
  assert.match(html, /Missing in the latest recorded reading:/);
  assert.match(html, /blood pressure/);
  assert.match(html, /50–90 bpm general adult resting band/);
  assert.match(html, /general adult educational ranges/);

  assert.match(html, /Active simulated stream/);
  assert.match(html, /0:04/);
  assert.match(html, /76(?:<!-- -->)?\s*<span/);
  assert.match(html, /97\.2/);
  assert.match(html, /124\/80/);
  assert.match(html, /never written into vitals, reports, or exports/);

  assert.match(html, /2 of 3/);
  assert.match(html, /Self-reported check-in data; not a diagnostic assessment/);
  assert.match(html, /Simulated scenarios do not\s+model musculoskeletal observations/);

  assert.match(html, /Research context only/);
  assert.match(html, /not the\s+selected astronaut/);
  assert.match(html, /do not represent the current mission phase/);
  assert.match(html, /36–103 mg\/dL/);
  assert.match(html, /28 samples/);

  assert.match(html, /href="\/vitals"/);
  assert.match(html, /href="\/check-in"/);
  assert.match(html, /href="\/research"/);
  assert.match(html, /role="group" aria-label="Health observation window"/);
  assert.match(html, /aria-pressed="true"[^>]*>7d</);
  assert.match(html, /aria-pressed="false"[^>]*>30d</);
  assert.match(html, /aria-labelledby="mission-health-panels-heading"/);
  assert.match(html, /focus-visible:ring-2/);

  assert.doesNotMatch(html, /diagnosed with|clinical validation|live sensor/i);
});

test('panels show missing-data states and withhold another crew member’s simulation', () => {
  simulationState.current.astronautId = 'AST-02';
  simulationState.current.points = points;
  simulationState.current.bpSamples = bpSamples;

  const html = renderToStaticMarkup(
    <MemoryRouter>
      <MissionHealthPanels astronaut={astronaut} missionDay={14} vitals={[]} checkIns={[]} />
    </MemoryRouter>
  );

  assert.match(html, /No recorded vitals yet/);
  assert.match(html, /No recorded check-ins in the selected window/);
  assert.match(html, /No recorded sleep or recovery check-ins/);
  assert.match(html, /No recorded nutrition or hydration check-ins/);
  assert.match(html, /different crew profile; its values are withheld here/);
  assert.doesNotMatch(html, /Elapsed/);
  assert.doesNotMatch(html, /124\/80/);

  assert.match(html, /data-mission-source="research"/);
  assert.match(html, /Open Research Context/);
});

test('an unassigned simulation stream is withheld from every crew view', () => {
  simulationState.current.astronautId = null;
  simulationState.current.points = points;
  simulationState.current.bpSamples = bpSamples;

  const html = renderPanels();

  assert.match(html, /no crew assignment; its values are withheld here/);
  assert.doesNotMatch(html, /Elapsed/);
  assert.doesNotMatch(html, /124\/80/);
});
