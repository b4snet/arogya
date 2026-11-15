import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { CheckIn, Mission } from '../types';
import { SEED_ASTRONAUTS } from '../data/astronauts';
import { SEED_MISSION } from '../data/missionData';
import { SEED_CHECKINS_BY_ASTRONAUT } from '../data/checkIns14Day';
import { SEED_VITALS_BY_ASTRONAUT } from '../data/vitals14Day';
import { buildCrewReadiness } from './crewReadiness';
import { evaluateHealthAssessment } from './healthEngine';

const missionDay7: Mission = { ...SEED_MISSION, currentDay: 7 };
const missionDay3: Mission = { ...SEED_MISSION, currentDay: 3 };

function makeCheckIn(
  astronautId: string,
  missionDay: number,
  overrides: Partial<CheckIn> = {}
): CheckIn {
  return {
    id: `checkin-${astronautId}-${missionDay}`,
    astronautId,
    missionDay,
    timestampIso: `2026-11-${String(missionDay).padStart(2, '0')}T08:00:00.000Z`,
    sleepHours: 7.5,
    sleepQuality: 5,
    moodScore: 5,
    stressLevel: 1,
    cognitiveFocus: 5,
    fatigueLevel: 1,
    hydrationLiters: 2.5,
    caloriesKcal: 2650,
    proteinGrams: 95,
    exerciseMinutes: 60,
    exerciseCompleted: true,
    resistanceTrainingCompleted: true,
    painScore: 0,
    symptoms: ['none'],
    crewNotes: 'Routine mission-day entry.',
    syncedToGround: false,
    ...overrides,
  };
}

function healthyWeek(astronautId: string): CheckIn[] {
  return [1, 2, 3, 4, 5, 6, 7].map((day) => makeCheckIn(astronautId, day));
}

function poorSecondHalf(astronautId: string): CheckIn[] {
  return [1, 2, 3, 4, 5, 6, 7].map((day) =>
    makeCheckIn(
      astronautId,
      day,
      day <= 3
        ? {}
        : {
            sleepHours: 5.5,
            sleepQuality: 2,
            moodScore: 2,
            stressLevel: 4,
            cognitiveFocus: 2,
            fatigueLevel: 4,
            hydrationLiters: 1.5,
            exerciseMinutes: 20,
            exerciseCompleted: false,
            resistanceTrainingCompleted: false,
          }
    )
  );
}

test('aggregates recorded crew readiness, completion, and bands for the full crew', () => {
  const result = buildCrewReadiness({
    astronauts: SEED_ASTRONAUTS,
    checkInsByAstronaut: SEED_CHECKINS_BY_ASTRONAUT,
    vitalsByAstronaut: SEED_VITALS_BY_ASTRONAUT,
    mission: SEED_MISSION,
    windowDays: 7,
  });

  assert.equal(result.memberCount, 3);
  assert.equal(result.bandedCount, 3);
  assert.equal(result.window.startDay, 8);
  assert.equal(result.window.endDay, 14);
  assert.equal(result.window.coveredDays, 7);

  const checkIn = result.metrics.find((metric) => metric.id === 'check_in_completion');
  assert.ok(checkIn);
  assert.equal(checkIn.score, 100);
  assert.equal(checkIn.status, 'recorded');
  assert.match(checkIn.summary, /21 of 21 crew-days/);
  assert.equal(checkIn.trend.direction, 'stable');
  assert.equal(checkIn.trend.firstHalfValue, 100);
  assert.equal(checkIn.trend.secondHalfValue, 100);

  assert.equal(result.metrics.length, 4);
  result.metrics.forEach((metric) => {
    assert.match(metric.caveat, /recorded|self-reported|never assumed|adherence/i);
  });

  assert.equal(result.members.length, 3);
  result.members.forEach((member) => {
    assert.ok(member.band, `${member.callSign} should have a band from recorded check-ins`);
    assert.ok(member.recordedDays > 0);
    assert.ok(member.bandReason.length > 0);
  });
  assert.ok(result.bandCounts.rest >= 1, 'the seeded sleep-debt profile should not be Ready');

  assert.equal(result.dataGaps.length, 0);
  assert.match(result.dataGapNote, /No recorded-data gaps/);
  assert.ok(result.crewRecommendation.length > 0);
  assert.match(result.sourceNote, /Simulated demonstration streams are excluded/);
  assert.match(result.privacyNote, /Private crew notes/);
  assert.match(result.disclaimer, /monitoring support, not medical diagnosis/i);
});

test('withholds an unscored band and surfaces member and factor gaps without imputing', () => {
  const result = buildCrewReadiness({
    astronauts: SEED_ASTRONAUTS,
    checkInsByAstronaut: {
      'AST-01': healthyWeek('AST-01'),
      'AST-02': [],
      'AST-03': [makeCheckIn('AST-03', 7)],
    },
    vitalsByAstronaut: {},
    mission: missionDay7,
    windowDays: 7,
  });

  const checkIn = result.metrics.find((metric) => metric.id === 'check_in_completion');
  assert.ok(checkIn);
  assert.equal(checkIn.score, 38);
  assert.equal(checkIn.status, 'partial');
  assert.equal(checkIn.membersWithEvidence, 2);

  const emptyMember = result.members.find((member) => member.astronautId === 'AST-02');
  assert.ok(emptyMember);
  assert.equal(emptyMember.band, null);
  assert.equal(emptyMember.bandLabel, 'Not scored');
  assert.equal(emptyMember.score, null);
  assert.equal(emptyMember.recordedDays, 0);
  assert.match(emptyMember.bandReason, /No readiness band is assigned/);

  const sparseMember = result.members.find((member) => member.astronautId === 'AST-03');
  assert.ok(sparseMember);
  assert.equal(sparseMember.recordedDays, 1);
  assert.equal(sparseMember.band, 'monitor');
  assert.equal(sparseMember.dayCoveragePercent, 14);

  assert.equal(result.bandedCount, 2);
  assert.equal(result.bandCounts.unscored, 1);

  const emptyCallSign = SEED_ASTRONAUTS[1].callSign;
  const sparseCallSign = SEED_ASTRONAUTS[2].callSign;
  assert.ok(
    result.dataGaps.some(
      (gap) =>
        gap.kind === 'member' &&
        gap.label.includes(emptyCallSign) &&
        /no recorded check-ins/i.test(gap.label)
    )
  );
  assert.ok(
    result.dataGaps.some(
      (gap) =>
        gap.kind === 'member' &&
        gap.label.includes(sparseCallSign) &&
        /coverage/i.test(gap.label)
    )
  );
  const vitalsGap = result.dataGaps.find((gap) => gap.kind === 'factor' && gap.id === 'factor-recorded_vitals');
  assert.ok(vitalsGap);
  assert.match(vitalsGap.detail, /simulated streams cannot fill the gap/i);
  assert.match(result.dataGapNote, /not imputed or treated as normal/);

  const sleep = result.metrics.find((metric) => metric.id === 'sleep_regularity');
  assert.ok(sleep);
  assert.equal(sleep.status, 'partial');
  assert.equal(sleep.membersWithEvidence, 2);

  assert.match(result.crewRecommendation, /Record a check-in for every crew member/);
});

test('reports crew trends across the window halves and treats rising fatigue as worsening', () => {
  const checkInsByAstronaut = Object.fromEntries(
    SEED_ASTRONAUTS.map((astronaut) => [astronaut.id, poorSecondHalf(astronaut.id)])
  );

  const result = buildCrewReadiness({
    astronauts: SEED_ASTRONAUTS,
    checkInsByAstronaut,
    vitalsByAstronaut: {},
    mission: missionDay7,
    windowDays: 7,
  });

  const sleep = result.metrics.find((metric) => metric.id === 'sleep_regularity');
  const exercise = result.metrics.find((metric) => metric.id === 'exercise_adherence');
  const workload = result.metrics.find((metric) => metric.id === 'workload_fatigue');
  const checkIn = result.metrics.find((metric) => metric.id === 'check_in_completion');
  assert.ok(sleep && exercise && workload && checkIn);

  assert.equal(sleep.trend.direction, 'worsening');
  assert.equal(sleep.trend.firstHalfValue, 7);
  assert.equal(sleep.trend.secondHalfValue, 5.5);
  assert.match(sleep.trend.detail, /Day 1–4/);
  assert.match(sleep.trend.detail, /Day 5–7/);

  assert.equal(exercise.trend.direction, 'worsening');
  assert.equal(workload.trend.direction, 'worsening');
  assert.match(workload.trend.detail, /higher is more fatigue/);
  assert.equal(checkIn.trend.direction, 'stable');
});

test('never copies private notes or sensitive alert text into the crew aggregate', () => {
  const privateNote = 'PRIVATE-MEDICAL-NOTE do not aggregate';
  const checkIns = healthyWeek('AST-01').map((day, index) =>
    index === 6
      ? {
          ...day,
          crewNotes: privateNote,
          shareWithMedicalLead: false,
          symptoms: ['chest_pain' as const],
          painScore: 6,
        }
      : day
  );

  const result = buildCrewReadiness({
    astronauts: [SEED_ASTRONAUTS[0]],
    checkInsByAstronaut: { 'AST-01': checkIns },
    vitalsByAstronaut: {},
    mission: missionDay7,
  });

  const serialized = JSON.stringify(result);
  const assessment = evaluateHealthAssessment(SEED_ASTRONAUTS[0], checkIns, [], missionDay7);
  const alertTitle = assessment.alerts[0]?.title;
  assert.ok(alertTitle);
  assert.equal(serialized.includes(alertTitle), false);

  assert.doesNotMatch(serialized, /PRIVATE-MEDICAL-NOTE/);
  assert.doesNotMatch(serialized, /chest_pain/);
  assert.doesNotMatch(serialized, /crewNotes/);
  assert.doesNotMatch(serialized, /shareWithMedicalLead/);

  const member = result.members[0];
  assert.equal('crewNotes' in member, false);
  assert.equal('alerts' in member, false);
  assert.ok(member.openAlertCount > 0);
  assert.equal(member.escalationLevel, 'urgent');

  assert.ok(result.alerts.openCount > 0);
  assert.equal(result.alerts.escalatingMembers, 1);
  assert.ok(result.alerts.bySeverity.red >= 1);
  assert.match(result.alerts.detail, /Alert titles and rationales stay in each individual record/);
});

test('reports a shortened window without fabricating pre-mission days', () => {
  const result = buildCrewReadiness({
    astronauts: [SEED_ASTRONAUTS[0]],
    checkInsByAstronaut: {
      'AST-01': [1, 2, 3].map((day) => makeCheckIn('AST-01', day)),
    },
    vitalsByAstronaut: {},
    mission: missionDay3,
    windowDays: 7,
  });

  assert.equal(result.window.startDay, 1);
  assert.equal(result.window.endDay, 3);
  assert.equal(result.window.coveredDays, 3);
  const windowGap = result.dataGaps.find((gap) => gap.id === 'window-coverage');
  assert.ok(windowGap);
  assert.match(windowGap.detail, /Pre-mission days are not fabricated/);

  const checkIn = result.metrics.find((metric) => metric.id === 'check_in_completion');
  assert.ok(checkIn);
  assert.equal(checkIn.score, 100);
  assert.equal(checkIn.trend.direction, 'stable');
});
