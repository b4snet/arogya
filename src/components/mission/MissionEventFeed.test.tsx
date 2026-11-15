import assert from 'node:assert/strict';
import { beforeEach, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import type { CheckIn, Report } from '../../types';
import { SEED_ASTRONAUTS } from '../../data/astronauts';
import { buildMissionPhaseTimeline } from '../../engine/missionPhases';
import type { SimulationTimelineEvent } from '../../store/useSimulatedTelemetryStore';
import { MissionEventFeed } from './MissionEventFeed';

const { simulationState } = vi.hoisted(() => ({
  simulationState: {
    current: {
      timeline: [] as unknown[],
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

function timelineEvent(
  id: string,
  type: SimulationTimelineEvent['type'],
  atIso: string,
  astronautId: string | null,
  overrides: Partial<SimulationTimelineEvent> = {}
): SimulationTimelineEvent {
  return {
    id,
    type,
    label: 'Session event',
    atMs: Date.parse(atIso),
    atIso,
    simulatedSecond: 0,
    scenario: 'nominal',
    astronautId,
    ...overrides,
  };
}

function makeCheckIn(
  id: string,
  missionDay: number,
  astronautId: string,
  timestampIso: string
): CheckIn {
  return {
    id,
    astronautId,
    missionDay,
    timestampIso,
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

const report: Report = {
  id: 'report-1',
  astronautId: astronaut.id,
  missionDay: 14,
  createdAtIso: '2026-11-15T11:30:00.000Z',
  format: 'flight_surgeon_sbar',
  periodLabel: 'Last 14 days',
  readinessScoreAtGeneration: 82,
  overallStatus: 'green',
  escalationRequired: false,
  situation: 'Stable simulated transit context.',
  background: 'Browser-local demonstration record.',
  assessmentSummary: 'No simulated finding is a diagnosis.',
  recommendations: [],
  attachedVitalsWindowDays: 14,
  preparedForRole: 'Flight Surgeon',
  exportedOffline: false,
};

beforeEach(() => {
  simulationState.current.timeline = [];
});

test('feed merges lifecycle, anomaly, recorded, and research events newest first with sources', () => {
  simulationState.current.timeline = [
    timelineEvent('s1', 'start', '2026-11-15T10:00:00.000Z', astronaut.id),
    timelineEvent('s2', 'scenario', '2026-11-15T10:05:00.000Z', astronaut.id, {
      label: 'Scenario → Synthetic anomaly',
      scenario: 'synthetic_anomaly',
      simulatedSecond: 300,
    }),
    timelineEvent('s3', 'pause', '2026-11-15T10:20:00.000Z', astronaut.id, {
      simulatedSecond: 900,
    }),
    timelineEvent('other', 'scenario', '2026-11-15T10:10:00.000Z', 'AST-OTHER', {
      label: 'Scenario → Exercise',
      scenario: 'exercise',
    }),
  ];

  const html = renderToStaticMarkup(
    <MemoryRouter>
      <MissionEventFeed
        astronautId={astronaut.id}
        checkIns={[
          makeCheckIn('c1', 14, astronaut.id, '2026-11-15T11:00:00.000Z'),
          makeCheckIn('c2', 13, 'AST-OTHER', '2026-11-15T11:10:00.000Z'),
        ]}
        reports={[report]}
        currentPhase={transitPhase}
      />
    </MemoryRouter>
  );

  assert.match(html, /Mission Event Feed/);
  assert.match(html, /role="log"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /6 events/);
  assert.match(html, /data-mission-source="simulated"/);
  assert.match(html, /data-mission-source="recorded"/);
  assert.match(html, /data-mission-source="research"/);

  assert.match(html, /Flight-surgeon SBAR generated for mission day 14 \(Last 14 days\)\./);
  assert.match(html, /Check-in recorded for mission day 14\./);
  assert.match(html, /Simulated session paused\./);
  assert.match(html, /Synthetic anomaly scenario activated for interface testing/);
  assert.match(html, /no bundled sample for Transit/i);
  assert.match(html, /not this crew/i);
  assert.match(html, /sim clock 15:00/);
  assert.match(html, /href="\/reports"/);
  assert.match(html, /href="\/check-in"/);
  assert.match(html, /href="\/"/);
  assert.match(html, /href="\/research"/);
  assert.match(html, /Nothing is transmitted automatically\./);

  assert.doesNotMatch(html, /mission day 13/);
  assert.doesNotMatch(html, /Scenario → Exercise/);

  assert.ok(
    html.indexOf('Flight-surgeon SBAR generated') < html.indexOf('Check-in recorded'),
    'report should be newer than check-in'
  );
  assert.ok(
    html.indexOf('Check-in recorded') < html.indexOf('Simulated session paused'),
    'check-in should be newer than the paused lifecycle event'
  );
  assert.ok(
    html.indexOf('Simulated session paused') < html.indexOf('Synthetic anomaly scenario activated'),
    'pause should be newer than the anomaly scenario event'
  );
});
