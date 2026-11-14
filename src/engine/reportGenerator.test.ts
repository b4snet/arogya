import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  REPORTS_EXACT_DISCLAIMER,
  buildStructuredReport,
  filterDataForReportPeriod,
  reportToMarkdown,
} from './reportGenerator.ts';
import { evaluateHealthAssessment } from './healthEngine.ts';
import { SEED_ASTRONAUTS } from '../data/astronauts.ts';
import { SEED_MISSION } from '../data/missionData.ts';
import { SEED_VITALS_BY_ASTRONAUT } from '../data/vitals14Day.ts';
import { SEED_CHECKINS_BY_ASTRONAUT } from '../data/checkIns14Day.ts';

test('filterDataForReportPeriod slices check-ins and vitals accurately for Today, 7d, 14d, and Full Mission', () => {
  const astronaut = SEED_ASTRONAUTS[1];
  const vitals = SEED_VITALS_BY_ASTRONAUT[astronaut.id];
  const checkIns = SEED_CHECKINS_BY_ASTRONAUT[astronaut.id];

  const today = filterDataForReportPeriod(checkIns, vitals, 14, 'today');
  assert.equal(today.vitalsWindow.length, 1);
  assert.equal(today.vitalsWindow[0].missionDay, 14);
  assert.equal(today.expectedDays, 1);

  const last7 = filterDataForReportPeriod(checkIns, vitals, 14, '7d');
  assert.equal(last7.startDay, 8);
  assert.equal(last7.endDay, 14);
  assert.equal(last7.vitalsWindow.length, 7);

  const last14 = filterDataForReportPeriod(checkIns, vitals, 14, '14d');
  assert.equal(last14.startDay, 1);
  assert.equal(last14.vitalsWindow.length, 14);

  const full = filterDataForReportPeriod(checkIns, vitals, 14, 'full_mission');
  assert.equal(full.startDay, 1);
  assert.equal(full.endDay, 14);
});

test('buildStructuredReport and reportToMarkdown include all required sections and exact disclaimer', () => {
  const astronaut = SEED_ASTRONAUTS[1]; // Maya Patel
  const vitals = SEED_VITALS_BY_ASTRONAUT[astronaut.id];
  const checkIns = SEED_CHECKINS_BY_ASTRONAUT[astronaut.id];
  const { checkInsWindow, vitalsWindow } = filterDataForReportPeriod(
    checkIns,
    vitals,
    SEED_MISSION.currentDay,
    '7d'
  );
  const assessment = evaluateHealthAssessment(
    astronaut,
    checkInsWindow,
    vitalsWindow,
    SEED_MISSION
  );

  const report = buildStructuredReport({
    astronaut,
    assessment,
    mission: SEED_MISSION,
    vitalsWindow,
    checkInsWindow,
    format: 'flight_surgeon_sbar',
    preparedForRole: 'Flight Surgeon',
    period: '7d',
  });

  assert.equal(report.astronautName, astronaut.fullName);
  assert.equal(report.astronautRole, astronaut.role);
  assert.equal(report.missionName, SEED_MISSION.name);
  assert.equal(report.systemSnapshots?.length, 8);
  assert.ok((report.trends?.length ?? 0) >= 6);
  assert.ok(report.actionTracking);
  assert.ok(Array.isArray(report.symptomsTimeline));
  assert.ok((report.riskFactors?.length ?? 0) >= 1);

  const md = reportToMarkdown(report, astronaut.fullName);
  assert.ok(md.includes('## Body-System Status Overview'));
  assert.ok(md.includes('## Key Findings'));
  assert.ok(md.includes('## Trends'));
  assert.ok(md.includes('## Completed & Missed Health Actions'));
  assert.ok(md.includes('## Symptoms Timeline'));
  assert.ok(md.includes('## Risk Factors'));
  assert.ok(md.includes('## Recommendations'));
  assert.ok(md.includes('## Data-Quality Notes'));
  assert.ok(md.includes(REPORTS_EXACT_DISCLAIMER));
});

test('private crew notes are excluded unless explicitly opted in, and concise medical mode focuses summary', () => {
  const astronaut = SEED_ASTRONAUTS[1];
  const vitals = SEED_VITALS_BY_ASTRONAUT[astronaut.id];
  const checkIns = SEED_CHECKINS_BY_ASTRONAUT[astronaut.id].map((c, idx) =>
    idx === SEED_CHECKINS_BY_ASTRONAUT[astronaut.id].length - 1
      ? { ...c, crewNotes: 'CONFIDENTIAL_PRIVATE_JOURNAL_ENTRY' }
      : c
  );
  const { checkInsWindow, vitalsWindow } = filterDataForReportPeriod(
    checkIns,
    vitals,
    SEED_MISSION.currentDay,
    '7d'
  );
  const assessment = evaluateHealthAssessment(
    astronaut,
    checkInsWindow,
    vitalsWindow,
    SEED_MISSION
  );

  const privateExcluded = buildStructuredReport({
    astronaut,
    assessment,
    mission: SEED_MISSION,
    vitalsWindow,
    checkInsWindow,
    format: 'flight_surgeon_sbar',
    preparedForRole: 'Crew Medical Officer',
    period: '7d',
    includePrivateNotes: false,
    conciseMedicalMode: true,
  });

  const mdExcluded = reportToMarkdown(privateExcluded, astronaut.fullName);
  assert.equal(mdExcluded.includes('CONFIDENTIAL_PRIVATE_JOURNAL_ENTRY'), false);
  assert.equal(privateExcluded.conciseMedicalMode, true);

  const privateIncluded = buildStructuredReport({
    astronaut,
    assessment,
    mission: SEED_MISSION,
    vitalsWindow,
    checkInsWindow,
    format: 'flight_surgeon_sbar',
    preparedForRole: 'Crew Medical Officer',
    period: '7d',
    includePrivateNotes: true,
  });

  const mdIncluded = reportToMarkdown(privateIncluded, astronaut.fullName);
  assert.ok(mdIncluded.includes('CONFIDENTIAL_PRIVATE_JOURNAL_ENTRY'));
});
