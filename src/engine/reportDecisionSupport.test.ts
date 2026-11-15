import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { Mission } from '../types';
import { SEED_ASTRONAUTS } from '../data/astronauts';
import { SEED_MISSION } from '../data/missionData';
import { SEED_CHECKINS_BY_ASTRONAUT } from '../data/checkIns14Day';
import { SEED_VITALS_BY_ASTRONAUT } from '../data/vitals14Day';
import { evaluateHealthAssessment } from './healthEngine';
import { filterDataForReportPeriod } from './reportGenerator';
import {
  REPORT_DECISION_DISCLAIMER,
  REPORT_DECISION_SOURCE_NOTE,
  buildReportDecisionSupport,
} from './reportDecisionSupport';

const astronaut = SEED_ASTRONAUTS[0];
const mission = SEED_MISSION;
const checkIns = SEED_CHECKINS_BY_ASTRONAUT[astronaut.id];
const vitals = SEED_VITALS_BY_ASTRONAUT[astronaut.id];

function decisionSupportFor(
  period: 'today' | '7d' | '14d' | 'full_mission',
  overrides: {
    checkIns?: typeof checkIns;
    vitals?: typeof vitals;
    mission?: Mission;
  } = {}
) {
  const activeMission = overrides.mission ?? mission;
  const data = filterDataForReportPeriod(
    overrides.checkIns ?? checkIns,
    overrides.vitals ?? vitals,
    activeMission.currentDay,
    period === 'today' || period === '7d' ? '7d' : '14d'
  );
  const assessment = evaluateHealthAssessment(
    astronaut,
    data.checkInsWindow,
    data.vitalsWindow,
    activeMission
  );
  return buildReportDecisionSupport({
    astronaut,
    assessment,
    mission: activeMission,
    checkIns: data.checkInsWindow,
    vitals: data.vitalsWindow,
    period,
    windowDays: period === 'today' || period === '7d' ? 7 : 14,
  });
}

test('builds a recorded decision summary with recovery, countermeasures, and labelled research context', () => {
  const support = decisionSupportFor('7d');

  assert.equal(support.executiveSummary.source, 'recorded');
  assert.ok(support.executiveSummary.headline.length > 0);
  assert.ok(support.executiveSummary.overview.includes('7-day decision window'));
  assert.ok(support.executiveSummary.keyPoints.length >= 3);
  assert.ok(
    support.executiveSummary.keyPoints.some((point) =>
      point.includes('Countermeasure adherence')
    )
  );
  assert.match(support.executiveSummary.reviewPrompt, /medical review|escalation procedures/i);
  assert.match(support.executiveSummary.escalationLine, /escalation|review prompt|criterion/i);
  assert.match(support.executiveSummary.confidenceLine, /telemetry completeness/i);

  const recovery = support.recoveryReadiness;
  assert.equal(recovery.window.requestedDays, 7);
  assert.equal(recovery.window.startDay, 8);
  assert.equal(recovery.window.endDay, 14);
  assert.equal(recovery.window.recordedDays, 7);
  assert.ok(recovery.score != null);
  assert.ok(['ready', 'monitor', 'rest'].includes(recovery.band));
  assert.equal(recovery.simulatedTrend.available, false);
  assert.equal(recovery.simulatedTrend.sampleCount, 0);
  assert.match(recovery.simulatedTrend.detail, /simulated/i);
  assert.match(recovery.disclaimer, /monitoring support, not a medical diagnosis/i);

  assert.equal(support.countermeasures.items.length, 6);
  assert.ok(support.countermeasures.focusItemId);
  support.countermeasures.items.forEach((item) => {
    assert.equal(item.dataSources.every((source) => source.source === 'recorded'), true);
    assert.equal(item.researchContext.every((context) => context.source === 'research'), true);
  });

  assert.ok(support.referenceContext.length > 0);
  support.referenceContext.forEach((reference) => {
    assert.equal(reference.source, 'research');
    assert.ok(reference.title.length > 0);
    assert.ok(reference.usedFor.length > 0);
  });

  assert.equal(support.dataGaps.length, 0, 'the seeded 7-day window has no recorded gaps');
  assert.match(REPORT_DECISION_DISCLAIMER, /not a medical diagnosis/i);
  assert.match(REPORT_DECISION_DISCLAIMER, /no treatment, medication, or dosage guidance/i);
  assert.match(REPORT_DECISION_SOURCE_NOTE, /Simulated demonstration streams are excluded/i);

  const summaryText = JSON.stringify({
    summary: support.executiveSummary,
    countermeasures: support.countermeasures.items.map((item) => item.currentStatus),
  });
  assert.doesNotMatch(summaryText, /prescrib|dosage|diagnos/i);
});

test('reports missing records as gaps without scoring or assuming normal values', () => {
  const support = decisionSupportFor('7d', { checkIns: [], vitals: [] });
  const serialized = JSON.stringify(support);

  assert.equal(support.recoveryReadiness.score, null);
  assert.equal(support.recoveryReadiness.simulatedTrend.available, false);
  assert.match(support.recoveryReadiness.missingDataNote, /No check-ins were recorded/i);
  assert.match(support.executiveSummary.headline, /not scored/i);
  assert.ok(
    support.executiveSummary.keyPoints.some((point) => /data gap/i.test(point))
  );

  const gapIds = support.dataGaps.map((gap) => gap.id);
  assert.ok(gapIds.includes('gap-check-in-coverage'));
  assert.ok(gapIds.includes('gap-today-check-in'));
  assert.ok(gapIds.includes('gap-vitals-coverage'));
  assert.ok(support.dataGaps.every((gap) => gap.source === 'recorded'));
  assert.ok(
    support.dataGaps.some((gap) => /not imputed or treated as normal/i.test(gap.detail))
  );
  assert.ok(
    support.dataGaps.some((gap) => /simulated samples .*cannot fill the gap/i.test(gap.detail))
  );

  support.countermeasures.items.forEach((item) => {
    assert.equal(item.todayRecorded, false);
    assert.equal(item.dataSources.every((source) => source.source === 'recorded'), true);
  });

  assert.equal(serialized.includes('Simulated:'), false);
  assert.doesNotMatch(serialized, /normal findings|within normal limits/i);
});

test('flags a shortened decision window instead of fabricating pre-mission days', () => {
  const missionDay3: Mission = { ...SEED_MISSION, currentDay: 3 };
  const support = decisionSupportFor('14d', { mission: missionDay3 });

  assert.equal(support.recoveryReadiness.window.requestedDays, 14);
  assert.equal(support.recoveryReadiness.window.startDay, 1);
  assert.equal(support.recoveryReadiness.window.endDay, 3);
  assert.equal(support.recoveryReadiness.window.coveredDays, 3);

  const gap = support.dataGaps.find((item) => item.id === 'gap-shortened-window');
  assert.ok(gap);
  assert.match(gap.detail, /Pre-mission days are not fabricated/i);
});

test('never copies private notes, symptom text, or share settings into decision support', () => {
  const privateNote = 'PRIVATE-DECISION-NOTE do not export';
  const withPrivate = checkIns.map((item, index) =>
    index === checkIns.length - 1
      ? {
          ...item,
          crewNotes: privateNote,
          shareWithMedicalLead: false,
          symptoms: ['chest_pain' as const],
          painScore: 6,
        }
      : item
  );
  const support = decisionSupportFor('7d', { checkIns: withPrivate });
  const serialized = JSON.stringify(support);

  assert.doesNotMatch(serialized, /PRIVATE-DECISION-NOTE/);
  assert.doesNotMatch(serialized, /chest_pain/);
  assert.doesNotMatch(serialized, /crewNotes|shareWithMedicalLead/);
  assert.ok(support.executiveSummary.escalationLine.length > 0);
  assert.ok(support.executiveSummary.keyPoints.length > 0);
});
