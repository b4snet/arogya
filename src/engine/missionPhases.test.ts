import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  MISSION_PHASE_DEFINITIONS,
  MISSION_PHASE_IDS,
  buildMissionPhaseTimeline,
  formatPhaseProfileWindow,
  getPhaseNavigationIndex,
} from './missionPhases.ts';

test('mission phase timeline keeps all seven phases in lifecycle order', () => {
  const timeline = buildMissionPhaseTimeline({ transitDay: 14, transitDurationDays: 260 });

  assert.deepEqual(
    timeline.phases.map((phase) => phase.id),
    [...MISSION_PHASE_IDS]
  );
  assert.equal(timeline.phases.length, 7);
  assert.equal(timeline.currentPhaseId, 'transit');
  assert.equal(timeline.profileTotalDays, 895);
});

test('transit day 14 marks pre-flight phases complete, transit current, and later phases upcoming', () => {
  const timeline = buildMissionPhaseTimeline({ transitDay: 14, transitDurationDays: 260 });
  const byId = Object.fromEntries(timeline.phases.map((phase) => [phase.id, phase]));

  assert.equal(byId['pre-launch'].status, 'completed');
  assert.equal(byId.launch.status, 'completed');
  assert.equal(byId['earth-orbit'].status, 'completed');
  assert.equal(byId.transit.status, 'active');
  assert.equal(byId['station-operations'].status, 'upcoming');
  assert.equal(byId.return.status, 'upcoming');
  assert.equal(byId['post-flight-recovery'].status, 'upcoming');

  assert.equal(byId.transit.elapsedLabel, 'Transit day 14 of 260 simulated');
  assert.equal(byId.transit.plannedDurationLabel, '260 days planned');
  assert.equal(byId['pre-launch'].elapsedLabel, 'Complete before transit day 1');
  assert.equal(byId.return.elapsedLabel, 'Not started');
});

test('profile windows are contiguous and cover the full planned mission', () => {
  const timeline = buildMissionPhaseTimeline({ transitDay: 14, transitDurationDays: 260 });
  const byId = Object.fromEntries(timeline.phases.map((phase) => [phase.id, phase]));

  assert.equal(formatPhaseProfileWindow(byId['pre-launch']), 'Profile days 1–30');
  assert.equal(formatPhaseProfileWindow(byId.launch), 'Profile day 31');
  assert.equal(formatPhaseProfileWindow(byId['earth-orbit']), 'Profile days 32–45');
  assert.equal(formatPhaseProfileWindow(byId.transit), 'Profile days 46–305');
  assert.equal(formatPhaseProfileWindow(byId['station-operations']), 'Profile days 306–605');
  assert.equal(formatPhaseProfileWindow(byId.return), 'Profile days 606–865');
  assert.equal(formatPhaseProfileWindow(byId['post-flight-recovery']), 'Profile days 866–895');

  for (let index = 1; index < timeline.phases.length; index += 1) {
    assert.equal(
      timeline.phases[index].profileStartDay,
      timeline.phases[index - 1].profileEndDay + 1
    );
  }
});

test('OSD-575 research context is direct only where bundled timepoints support it', () => {
  const timeline = buildMissionPhaseTimeline({ transitDay: 14, transitDurationDays: 260 });
  const byId = Object.fromEntries(timeline.phases.map((phase) => [phase.id, phase]));

  assert.equal(byId['pre-launch'].research.status, 'direct');
  assert.deepEqual(byId['pre-launch'].research.timepoints, ['L-92', 'L-44', 'L-3']);
  assert.equal(byId.launch.research.status, 'context-only');
  assert.equal(byId['earth-orbit'].research.status, 'context-only');
  assert.equal(byId.transit.research.status, 'not-represented');
  assert.equal(byId['station-operations'].research.status, 'not-represented');
  assert.equal(byId.return.research.status, 'context-only');
  assert.equal(byId['post-flight-recovery'].research.status, 'direct');
  assert.deepEqual(byId['post-flight-recovery'].research.timepoints, [
    'R+1',
    'R+45',
    'R+82',
    'R+194',
  ]);

  assert.equal(byId['pre-launch'].research.badgeLabel, 'Research observation');
  assert.match(byId.launch.research.detail, /no launch-day serum sample/i);
  assert.match(byId.transit.research.detail, /no Mars-transit serum samples/i);
});

test('every phase has cautious health context and explicit source labels', () => {
  for (const phase of MISSION_PHASE_DEFINITIONS) {
    assert.ok(phase.description.length > 40, `${phase.id} description`);
    assert.ok(phase.healthConsiderations.length >= 2, `${phase.id} health considerations`);
    assert.ok(phase.research.detail.length > 30, `${phase.id} research context`);
    assert.ok(phase.research.badgeLabel.length > 0, `${phase.id} research label`);

    const language = [
      phase.description,
      ...phase.healthConsiderations,
      phase.research.detail,
    ].join(' ');
    assert.doesNotMatch(language, /\b(?:diagnose|diagnosis|prescribe|dosage|treat this)\b/i);
  }
});

test('arrival day is labelled without pretending a later phase is simulated', () => {
  const timeline = buildMissionPhaseTimeline({ transitDay: 260, transitDurationDays: 260 });
  const transit = timeline.phases.find((phase) => phase.id === 'transit');

  assert.equal(transit?.status, 'active');
  assert.equal(transit?.elapsedLabel, 'Transit day 260 of 260 · arrival day');
  assert.equal(
    timeline.phases.find((phase) => phase.id === 'station-operations')?.status,
    'upcoming'
  );
});

test('invalid days are clamped and the simulation scope is stated explicitly', () => {
  const low = buildMissionPhaseTimeline({ transitDay: -10, transitDurationDays: 260 });
  const high = buildMissionPhaseTimeline({ transitDay: 999, transitDurationDays: 260 });
  const short = buildMissionPhaseTimeline({ transitDay: 1, transitDurationDays: 1 });

  assert.equal(low.transitDay, 1);
  assert.equal(high.transitDay, 260);
  assert.equal(short.transitDurationDays, 60);
  assert.match(low.simulatedScopeNote, /only the outbound transit segment is simulated/i);
  assert.match(low.simulatedScopeNote, /planned profile context/i);
});

test('roving keyboard navigation wraps and supports Home and End', () => {
  assert.equal(getPhaseNavigationIndex(0, 'ArrowRight', 7), 1);
  assert.equal(getPhaseNavigationIndex(6, 'ArrowRight', 7), 0);
  assert.equal(getPhaseNavigationIndex(0, 'ArrowLeft', 7), 6);
  assert.equal(getPhaseNavigationIndex(3, 'Home', 7), 0);
  assert.equal(getPhaseNavigationIndex(3, 'End', 7), 6);
  assert.equal(getPhaseNavigationIndex(3, 'Tab', 7), null);
  assert.equal(getPhaseNavigationIndex(3, 'ArrowRight', 0), null);
});
