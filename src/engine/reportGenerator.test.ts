import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  REPORTS_EXACT_DISCLAIMER,
  buildStructuredReport,
  filterDataForReportPeriod,
  reportToMarkdown,
} from './reportGenerator.ts';
import { evaluateHealthAssessment } from './healthEngine.ts';
import { buildMissionHealthBrief } from './missionHealthBrief.ts';
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
  assert.equal(
    REPORTS_EXACT_DISCLAIMER,
    'This report is an educational decision-support summary generated from self-reported and optional device data. It is not a medical diagnosis. Reference ranges are general educational ranges and may not reflect individual baselines, spaceflight conditions, or clinical standards. Contact qualified medical personnel for interpretation and care.'
  );
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

test('report snapshot carries the Mission Health Brief through Markdown and JSON exports', () => {
  const astronaut = SEED_ASTRONAUTS[1];
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
  const healthBrief = buildMissionHealthBrief({
    astronaut,
    checkIns: checkInsWindow,
    vitals: vitalsWindow,
    missionDay: SEED_MISSION.currentDay,
    escalation: {
      required: assessment.escalationRequired,
      reasons: assessment.escalationReasons,
    },
  });

  const report = buildStructuredReport({
    astronaut,
    assessment,
    mission: SEED_MISSION,
    vitalsWindow,
    checkInsWindow,
    format: 'flight_surgeon_sbar',
    preparedForRole: 'Flight Surgeon',
    period: '7d',
    healthBrief,
  });

  assert.ok(report.healthBrief);
  assert.equal(report.healthBrief?.daily.id, 'daily');
  assert.equal(report.healthBrief?.weekly.id, 'weekly');

  const md = reportToMarkdown(report, astronaut.fullName);
  assert.ok(md.includes('## Mission Health Brief'));
  assert.ok(md.includes('#### What needs attention'));

  const roundTripped = JSON.parse(JSON.stringify(report));
  assert.equal(roundTripped.healthBrief.astronautId, astronaut.id);
  assert.equal(roundTripped.healthBrief.weekly.sections.length, 5);
});

test('mission report carries decision support, source labels, gaps, and privacy-safe JSON by default', () => {
  const subject = SEED_ASTRONAUTS[0];
  const subjectVitals = SEED_VITALS_BY_ASTRONAUT[subject.id];
  const subjectCheckIns = SEED_CHECKINS_BY_ASTRONAUT[subject.id];
  const privateNote = 'PRIVATE-REPORT-SNAPSHOT-NOTE';
  const withPrivate = subjectCheckIns.map((item, index) =>
    index === subjectCheckIns.length - 1
      ? { ...item, crewNotes: privateNote, shareWithMedicalLead: true }
      : item
  );
  const { checkInsWindow, vitalsWindow } = filterDataForReportPeriod(
    withPrivate,
    subjectVitals,
    SEED_MISSION.currentDay,
    '7d'
  );
  const assessment = evaluateHealthAssessment(
    subject,
    checkInsWindow,
    vitalsWindow,
    SEED_MISSION
  );

  const report = buildStructuredReport({
    astronaut: subject,
    assessment,
    mission: SEED_MISSION,
    vitalsWindow,
    checkInsWindow,
    format: 'flight_surgeon_sbar',
    preparedForRole: 'Flight Surgeon',
    period: '7d',
    includePrivateNotes: false,
  });

  assert.ok(report.executiveSummary);
  assert.equal(report.executiveSummary?.source, 'recorded');
  assert.ok(report.recoveryReadiness);
  assert.equal(report.recoveryReadiness?.simulatedTrend.available, false);
  assert.equal(report.recoveryReadiness?.simulatedTrend.sampleCount, 0);
  assert.ok(report.countermeasures);
  assert.equal(report.countermeasures?.items.length, 6);
  assert.ok(report.dataGaps);
  assert.ok(report.dataGaps?.every((gap) => gap.source === 'recorded'));
  assert.ok(report.referenceContext && report.referenceContext.length > 0);
  assert.ok(report.referenceContext?.every((reference) => reference.source === 'research'));
  assert.ok(report.researchContext && report.researchContext.length === 4);
  assert.ok(report.researchContext?.every((card) => card.source === 'research'));
  assert.ok(report.researchContext?.every((card) => card.crewDataNote.includes('not this crew member')));

  const md = reportToMarkdown(report, subject.fullName);
  assert.ok(md.includes('## Executive Summary (Recorded)'));
  assert.ok(md.includes('## Recovery Readiness (Recorded)'));
  assert.ok(md.includes('## Countermeasure Adherence (Recorded)'));
  assert.ok(md.includes('## Trends and Reference Context (Recorded)'));
  assert.ok(md.includes('## Data Gaps (Recorded)'));
  assert.ok(md.includes('_Research context, not crew data_'));
  assert.ok(md.includes('## Research Context (Research — not crew data)'));
  assert.ok(md.includes('Source: OSD-575 Version 3 · DOI 10.26030/mc5d-p710 · License CC0-1.0 · NASA OSDR'));
  assert.equal(md.includes(`### ${subject.fullName}`), false);
  assert.ok(md.includes(REPORTS_EXACT_DISCLAIMER));
  assert.equal(md.includes(privateNote), false);

  const json = JSON.stringify(report);
  assert.equal(json.includes(privateNote), false);
  const roundTripped = JSON.parse(json);
  assert.equal(roundTripped.executiveSummary.source, 'recorded');
  assert.equal(roundTripped.recoveryReadiness.simulatedTrend.available, false);
  assert.equal(roundTripped.countermeasures.items.length, 6);
  assert.equal(roundTripped.dataGaps.every((gap: { source: string }) => gap.source === 'recorded'), true);
  assert.equal(roundTripped.researchContext.length, 4);
  assert.equal(roundTripped.researchContext.every((card: { source: string }) => card.source === 'research'), true);
  assert.equal(
    roundTripped.snapshotCheckIns.every(
      (item: { crewNotes: string; shareWithMedicalLead?: boolean }) =>
        item.crewNotes === '' && item.shareWithMedicalLead !== true
    ),
    true
  );
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
  assert.equal(
    JSON.stringify(privateExcluded).includes('CONFIDENTIAL_PRIVATE_JOURNAL_ENTRY'),
    false
  );
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
  assert.ok(JSON.stringify(privateIncluded).includes('CONFIDENTIAL_PRIVATE_JOURNAL_ENTRY'));
});
