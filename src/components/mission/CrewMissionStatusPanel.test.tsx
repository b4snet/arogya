import assert from 'node:assert/strict';
import { beforeEach, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import type { Alert, CheckIn } from '../../types';
import { SEED_ASTRONAUTS } from '../../data/astronauts';
import { buildMissionPhaseTimeline } from '../../engine/missionPhases';
import type { SimulatedSample } from '../../utils/simulatedTelemetry';
import { CrewMissionStatusPanel } from './CrewMissionStatusPanel';

const { simulationState } = vi.hoisted(() => ({
  simulationState: {
    current: {
      status: 'idle' as string,
      scenario: 'nominal' as string,
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
const transitPhase = buildMissionPhaseTimeline({
  transitDay: 14,
  transitDurationDays: 260,
}).phases.find((phase) => phase.id === 'transit')!;

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

const alert: Alert = {
  id: 'alert-1',
  systemId: 'cardiovascular',
  organTarget: 'heart',
  severity: 'yellow',
  escalationRequired: false,
  title: 'Recorded cardiovascular flag',
  rationale: 'A recorded demonstration value sits outside the general reference band.',
  recommendedAction: 'Review the recorded observation in Reports.',
};

function makeCheckIn(id: string, missionDay: number): CheckIn {
  return {
    id,
    astronautId: astronaut.id,
    missionDay,
    timestampIso: '2026-11-14T08:00:00.000Z',
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

function renderPanel() {
  return renderToStaticMarkup(
    <MemoryRouter>
      <CrewMissionStatusPanel
        astronaut={astronaut}
        missionDay={14}
        transitDurationDays={260}
        currentPhase={transitPhase}
        checkIns={[makeCheckIn('c1', 8), makeCheckIn('c2', 9), makeCheckIn('c3', 10)]}
        alerts={[alert]}
      />
    </MemoryRouter>
  );
}

beforeEach(() => {
  simulationState.current.status = 'idle';
  simulationState.current.scenario = 'nominal';
  simulationState.current.astronautId = null;
  simulationState.current.points = [];
  simulationState.current.bpSamples = [];
});

test('own simulated session exposes values with explicit simulated and recorded badges', () => {
  simulationState.current.status = 'running';
  simulationState.current.scenario = 'synthetic_anomaly';
  simulationState.current.astronautId = astronaut.id;
  simulationState.current.points = points;
  simulationState.current.bpSamples = bpSamples;

  const html = renderPanel();

  assert.match(html, /Crew Mission Status/);
  assert.match(html, new RegExp(astronaut.fullName));
  assert.match(html, /data-simulation-state="running"/);
  assert.match(html, /data-mission-source="simulated"/);
  assert.match(html, /data-mission-source="recorded"/);
  assert.match(html, /Current mission phase/);
  assert.match(html, /Transit day 14 of 260 simulated/);
  assert.match(html, /Synthetic anomaly/);
  assert.match(html, /Synthetic anomaly scenario active — an interface test, not a clinical alarm/);
  assert.match(html, /Day 14 of 260/);
  assert.match(html, /0:04/);
  assert.match(html, />76</);
  assert.match(html, /97\.2/);
  assert.match(html, /124\/80/);
  assert.match(html, /Simulated heart rate trend: Rising/);
  assert.match(html, /Recorded cardiovascular flag/);
  assert.match(html, /3 of 7 mission days \(43%\)/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /focus-visible:ring-2/);
  assert.match(html, /never enter recorded vitals, reports,\s+or Drive exports/);
  assert.doesNotMatch(html, /real sensor readings|diagnosed with/i);
});

test('a session owned by another crew profile never exposes its values here', () => {
  simulationState.current.status = 'running';
  simulationState.current.scenario = 'exercise';
  simulationState.current.astronautId = 'AST-OTHER';
  simulationState.current.points = points;
  simulationState.current.bpSamples = bpSamples;

  const html = renderPanel();

  assert.match(html, /Other crew session/);
  assert.match(html, /Values are withheld so\s+simulation streams are not mixed between astronauts/);
  assert.doesNotMatch(html, />Running</);
  assert.doesNotMatch(html, /97\.2/);
  assert.doesNotMatch(html, /124\/80/);
  assert.doesNotMatch(html, /Simulated heart rate trend/);
});

test('idle state explains that no session is attached and still labels recorded sections', () => {
  const html = renderPanel();

  assert.match(html, /No active session/);
  assert.match(html, /No simulation session is active for this crew profile/);
  assert.match(html, /Latest simulated vitals/);
  assert.match(html, /data-mission-source="recorded"/);
  assert.match(html, /Active alerts/);
  assert.match(html, /Check-in adherence/);
  assert.doesNotMatch(html, /data-mission-source="research"/);
});
