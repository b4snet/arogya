import assert from 'node:assert/strict';
import { test } from 'vitest';
import { SEED_ASTRONAUTS } from '../data/astronauts';
import { SEED_CHECKINS_BY_ASTRONAUT } from '../data/checkIns14Day';
import { SEED_MISSION } from '../data/missionData';
import { SEED_VITALS_BY_ASTRONAUT } from '../data/vitals14Day';
import { ATLAS_REFERENCE_RANGE_NOTE } from '../data/atlasHealthContent';
import { evaluateHealthAssessment } from './healthEngine';
import { buildAtlasPanelViewModel, STATUS_GUIDANCE_COPY } from './atlasPanelBuilder';
import type { OrganTarget } from '../types';

test('atlasPanelBuilder builds all 4 required panels with exact titles, indicators, and reference note', () => {
  const astronaut = SEED_ASTRONAUTS[0];
  const checkIns = SEED_CHECKINS_BY_ASTRONAUT[astronaut.id];
  const vitals = SEED_VITALS_BY_ASTRONAUT[astronaut.id];
  const assessment = evaluateHealthAssessment(astronaut, checkIns, vitals, SEED_MISSION);

  const expectedTitles: Record<OrganTarget, string> = {
    brain: 'Mind, Sleep & Behavior',
    heart: 'Cardiovascular Health',
    lungs: 'Respiratory Health',
    full_body: 'Full-Body Health Overview',
  };

  const expectedMinIndicators: Record<OrganTarget, number> = {
    brain: 7,
    heart: 6,
    lungs: 6,
    full_body: 13,
  };

  for (const organ of ['brain', 'heart', 'lungs', 'full_body'] as OrganTarget[]) {
    const panel = buildAtlasPanelViewModel({
      organ,
      astronaut,
      assessment,
      mission: SEED_MISSION,
      vitals14d: vitals,
      checkIns14d: checkIns,
      units: 'metric',
    });

    assert.equal(panel.title, expectedTitles[organ]);
    assert.ok(panel.statusPillLabel.length > 0);
    assert.equal(panel.statusActionCopy, STATUS_GUIDANCE_COPY[panel.status]);
    assert.ok(panel.indicators.length >= expectedMinIndicators[organ]);
    assert.equal(panel.referenceDistinctionNote, ATLAS_REFERENCE_RANGE_NOTE);
    assert.ok(panel.trendSeries.length >= 1);
    assert.ok(panel.trendSeries[0].data.length <= 7);
    assert.ok(panel.spaceflightRelevancePoints.length >= 2);
    assert.ok(panel.relatedNasaHazardTitle.includes('NASA'));
    assert.ok(panel.recommendedActions.length >= 4);
    assert.ok(panel.escalationGuidance.length > 10);
    assert.ok(panel.quickLinks.length >= 2);

    for (const ind of panel.indicators) {
      assert.ok(ind.personalBaseline.length > 0);
      assert.ok(['rising', 'falling', 'stable', 'insufficient'].includes(ind.trendDirection));
    }
  }

  const fullBodyPanel = buildAtlasPanelViewModel({
    organ: 'full_body',
    astronaut,
    assessment,
    mission: SEED_MISSION,
    vitals14d: vitals,
    checkIns14d: checkIns,
    units: 'metric',
  });
  assert.deepEqual(
    fullBodyPanel.quickLinks.map((l) => l.to),
    ['/check-in', '/vitals', '/reports', '/mission']
  );
  assert.ok(fullBodyPanel.topPriorities && fullBodyPanel.topPriorities.length >= 1);
  assert.ok(
    (fullBodyPanel.completedHealthActions?.length ?? 0) +
      (fullBodyPanel.missedHealthActions?.length ?? 0) >
      0
  );
});

test('status guidance strings match exact required phrasing for all 4 levels', () => {
  assert.equal(STATUS_GUIDANCE_COPY.green, 'Maintain current routine.');
  assert.equal(STATUS_GUIDANCE_COPY.yellow, 'Monitor this trend and take preventive action.');
  assert.equal(STATUS_GUIDANCE_COPY.orange, 'Notify the crew medical lead and monitor closely.');
  assert.equal(
    STATUS_GUIDANCE_COPY.red,
    'Follow the urgent escalation workflow and seek medical support.'
  );
});

test('panel text never contains diagnostic claims or medication instructions', () => {
  const bannedPatterns = [
    /you have hypertension/i,
    /you have diabetes/i,
    /take \d+\s*mg/i,
    /ibuprofen|acetaminophen|aspirin/i,
    /diagnosed with/i,
    /prescrib/i,
  ];

  for (const astronaut of SEED_ASTRONAUTS) {
    const checkIns = SEED_CHECKINS_BY_ASTRONAUT[astronaut.id];
    const vitals = SEED_VITALS_BY_ASTRONAUT[astronaut.id];
    const assessment = evaluateHealthAssessment(astronaut, checkIns, vitals, SEED_MISSION);

    for (const organ of ['brain', 'heart', 'lungs', 'full_body'] as OrganTarget[]) {
      const panel = buildAtlasPanelViewModel({
        organ,
        astronaut,
        assessment,
        mission: SEED_MISSION,
        vitals14d: vitals,
        checkIns14d: checkIns,
        units: 'metric',
      });

      const corpus = [
        panel.plainLanguageSummary,
        ...panel.spaceflightRelevancePoints,
        panel.relatedNasaHazardDetail,
        panel.escalationGuidance,
        ...panel.recommendedActions,
      ].join(' ');

      for (const rx of bannedPatterns) {
        assert.equal(rx.test(corpus), false, `Unexpected match ${rx} in ${organ} for ${astronaut.id}`);
      }
    }
  }
});

test('red escalation from chest pain triggers exact Red status action copy on heart and full_body', () => {
  const astronaut = SEED_ASTRONAUTS[0];
  const baseCheckIns = [...SEED_CHECKINS_BY_ASTRONAUT[astronaut.id]];
  const last = baseCheckIns[baseCheckIns.length - 1];
  baseCheckIns[baseCheckIns.length - 1] = {
    ...last,
    symptoms: ['chest_pain'],
  };
  const vitals = SEED_VITALS_BY_ASTRONAUT[astronaut.id];
  const assessment = evaluateHealthAssessment(astronaut, baseCheckIns, vitals, SEED_MISSION);

  const heartPanel = buildAtlasPanelViewModel({
    organ: 'heart',
    astronaut,
    assessment,
    mission: SEED_MISSION,
    vitals14d: vitals,
    checkIns14d: baseCheckIns,
    units: 'metric',
  });
  const bodyPanel = buildAtlasPanelViewModel({
    organ: 'full_body',
    astronaut,
    assessment,
    mission: SEED_MISSION,
    vitals14d: vitals,
    checkIns14d: baseCheckIns,
    units: 'metric',
  });

  assert.equal(heartPanel.status, 'red');
  assert.equal(
    heartPanel.statusActionCopy,
    'Follow the urgent escalation workflow and seek medical support.'
  );
  assert.equal(bodyPanel.status, 'red');
  assert.equal(
    bodyPanel.statusActionCopy,
    'Follow the urgent escalation workflow and seek medical support.'
  );
});
