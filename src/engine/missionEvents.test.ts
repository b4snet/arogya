import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { CheckIn, Report } from '../types';
import { buildMissionPhaseTimeline } from './missionPhases';
import {
  buildMissionEventFeed,
  type MissionPhaseChangeInput,
  type MissionSimulationTimelineInput,
} from './missionEvents';

const transitPhase = buildMissionPhaseTimeline({
  transitDay: 14,
  transitDurationDays: 260,
}).phases.find((phase) => phase.id === 'transit')!;

function makeCheckIn(id: string, missionDay: number, astronautId: string): CheckIn {
  return {
    id,
    astronautId,
    missionDay,
    timestampIso: `2026-11-15T0${missionDay % 10}:00:00.000Z`,
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

function makeReport(
  id: string,
  astronautId: string,
  createdAtIso: string,
  format: Report['format'] = 'daily_summary'
): Report {
  return {
    id,
    astronautId,
    missionDay: 14,
    createdAtIso,
    format,
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
}

function simulationEvent(
  overrides: Partial<MissionSimulationTimelineInput> &
    Pick<MissionSimulationTimelineInput, 'id' | 'type' | 'atIso'>,
  astronautId: string | null = 'AST-01'
): MissionSimulationTimelineInput {
  return {
    label: 'Session event',
    simulatedSecond: 0,
    scenario: 'nominal',
    astronautId,
    ...overrides,
  };
}

function baseInput(overrides: Partial<Parameters<typeof buildMissionEventFeed>[0]> = {}) {
  return {
    astronautId: 'AST-01',
    simulationEvents: [],
    phaseChanges: [],
    checkIns: [],
    reports: [],
    research: {
      phaseId: transitPhase.id,
      phaseLabel: transitPhase.label,
      research: transitPhase.research,
    },
    researchRetrievedAtIso: '2026-11-01T00:00:00.000Z',
    limit: 50,
    ...overrides,
  };
}

test('lifecycle, scenario, and synthetic anomaly events are labelled and newest first', () => {
  const simulationEvents: MissionSimulationTimelineInput[] = [
    simulationEvent({
      id: 's1',
      type: 'start',
      atIso: '2026-11-15T10:00:00.000Z',
      simulatedSecond: 0,
    }),
    simulationEvent({
      id: 's2',
      type: 'scenario',
      atIso: '2026-11-15T10:05:00.000Z',
      label: 'Scenario → Exercise',
      scenario: 'exercise',
      simulatedSecond: 300,
    }),
    simulationEvent({
      id: 's3',
      type: 'scenario',
      atIso: '2026-11-15T10:10:00.000Z',
      label: 'Scenario → Synthetic anomaly',
      scenario: 'synthetic_anomaly',
      simulatedSecond: 600,
    }),
    simulationEvent({
      id: 's4',
      type: 'pause',
      atIso: '2026-11-15T10:12:00.000Z',
      simulatedSecond: 720,
    }),
    simulationEvent({
      id: 's5',
      type: 'resume',
      atIso: '2026-11-15T10:15:00.000Z',
      simulatedSecond: 720,
    }),
    simulationEvent({
      id: 's6',
      type: 'reset',
      atIso: '2026-11-15T10:20:00.000Z',
      simulatedSecond: 900,
    }),
  ];

  const feed = buildMissionEventFeed(baseInput({ simulationEvents }));

  assert.equal(feed.events[0].description, 'Simulated session reset; in-memory samples cleared.');
  assert.equal(feed.events[1].description, 'Simulated session resumed.');
  assert.equal(feed.events[2].description, 'Simulated session paused.');
  const simulationOnly = feed.events.filter((event) => event.source === 'simulated');
  assert.equal(simulationOnly.length, 6);
  assert.ok(simulationOnly.every((event) => event.link === '/'));
  assert.equal(feed.events.find((event) => event.source === 'research')?.source, 'research');

  const anomaly = feed.events.find((event) => event.kind === 'anomaly');
  assert.ok(anomaly);
  assert.equal(anomaly.typeLabel, 'Synthetic anomaly');
  assert.match(anomaly.description, /not a diagnosis or clinical alarm/i);

  const exercise = feed.events.find((event) => event.id === 'sim-s2');
  assert.equal(exercise?.description, 'Simulation scenario changed to Exercise.');
  assert.equal(feed.events.at(-1)?.id, 'research-transit-2026-11-01T00:00:00.000Z');
});

test('an unassigned idle scenario selection still reaches the feed, but unassigned lifecycle events do not', () => {
  const feed = buildMissionEventFeed(
    baseInput({
      simulationEvents: [
        simulationEvent(
          {
            id: 'setting',
            type: 'scenario',
            atIso: '2026-11-15T09:00:00.000Z',
            label: 'Scenario → Sleep',
            scenario: 'sleep',
          },
          null
        ),
        simulationEvent(
          {
            id: 'orphan-start',
            type: 'start',
            atIso: '2026-11-15T09:05:00.000Z',
          },
          null
        ),
      ],
    })
  );

  const scenario = feed.events.find((event) => event.id === 'sim-setting');
  assert.ok(scenario);
  assert.equal(scenario.description, 'Simulation scenario changed to Sleep.');
  assert.equal(scenario.source, 'simulated');
  assert.equal(feed.events.some((event) => event.id === 'sim-orphan-start'), false);
});

test('check-in and report events stay scoped to the selected astronaut', () => {
  const feed = buildMissionEventFeed(
    baseInput({
      checkIns: [
        makeCheckIn('a1', 14, 'AST-01'),
        makeCheckIn('a2', 13, 'AST-01'),
        makeCheckIn('b1', 14, 'AST-02'),
      ],
      reports: [
        makeReport('r1', 'AST-01', '2026-11-15T12:00:00.000Z'),
        makeReport('r2', 'AST-02', '2026-11-15T12:30:00.000Z'),
      ],
    })
  );

  const checkInEvents = feed.events.filter((event) => event.kind === 'check-in');
  assert.equal(checkInEvents.length, 2);
  assert.ok(checkInEvents.every((event) => event.source === 'recorded'));
  assert.ok(checkInEvents.every((event) => event.link === '/check-in'));

  const reportEvents = feed.events.filter((event) => event.kind === 'report');
  assert.equal(reportEvents.length, 1);
  assert.equal(
    reportEvents[0].description,
    'Daily summary generated for mission day 14 (Last 14 days).'
  );
  assert.equal(reportEvents[0].link, '/reports');

  assert.doesNotMatch(JSON.stringify(feed.events), /AST-02/);
});

test('phase changes and research context are explicit, sourced, and linkable', () => {
  const phaseChanges: MissionPhaseChangeInput[] = [
    {
      id: 'phase-1',
      atIso: '2026-11-15T11:00:00.000Z',
      previousLabel: 'Earth orbit',
      nextLabel: 'Transit',
    },
  ];

  const feed = buildMissionEventFeed(baseInput({ phaseChanges }));
  const phaseEvent = feed.events.find((event) => event.kind === 'phase');
  const researchEvent = feed.events.find((event) => event.source === 'research');

  assert.equal(
    phaseEvent?.description,
    'Mission phase changed from Earth orbit to Transit. Simulated transit context only.'
  );
  assert.equal(phaseEvent?.source, 'simulated');

  assert.ok(researchEvent);
  assert.equal(researchEvent.typeLabel, 'Research context');
  assert.equal(researchEvent.timestampIso, '2026-11-01T00:00:00.000Z');
  assert.match(researchEvent.description, /no bundled sample for Transit/i);
  assert.match(researchEvent.description, /not this crew/i);
  assert.equal(researchEvent.link, '/research');
});

test('the feed keeps the newest events within the requested limit', () => {
  const feed = buildMissionEventFeed(
    baseInput({
      simulationEvents: [
        simulationEvent({
          id: 'old',
          type: 'start',
          atIso: '2026-11-15T09:00:00.000Z',
        }),
        simulationEvent({
          id: 'new',
          type: 'complete',
          atIso: '2026-11-15T10:00:00.000Z',
          simulatedSecond: 300,
        }),
      ],
      checkIns: [
        {
          ...makeCheckIn('c1', 14, 'AST-01'),
          timestampIso: '2026-11-15T11:00:00.000Z',
        },
      ],
      limit: 3,
    })
  );

  assert.equal(feed.events.length, 3);
  assert.equal(feed.totalCount, 4);
  assert.equal(feed.truncated, true);
  assert.equal(feed.events[0].kind, 'check-in');
  assert.equal(feed.events[1].id, 'sim-new');
  assert.equal(feed.events[2].id, 'sim-old');
});
