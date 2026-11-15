import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  MISSION_HEALTH_BRIEF_DISCLAIMER,
  MISSION_HEALTH_BRIEF_PRIVACY_NOTE,
  buildMissionHealthBrief,
  missionHealthBriefToMarkdown,
} from './missionHealthBrief.ts';
import { SEED_ASTRONAUTS } from '../data/astronauts.ts';
import { SEED_VITALS_BY_ASTRONAUT } from '../data/vitals14Day.ts';
import { SEED_CHECKINS_BY_ASTRONAUT } from '../data/checkIns14Day.ts';

const patel = SEED_ASTRONAUTS[1];
const patelCheckIns = SEED_CHECKINS_BY_ASTRONAUT[patel.id];
const patelVitals = SEED_VITALS_BY_ASTRONAUT[patel.id];

function build(missionDay: number, astronaut = patel) {
  return buildMissionHealthBrief({
    astronaut,
    checkIns: SEED_CHECKINS_BY_ASTRONAUT[astronaut.id] ?? [],
    vitals: SEED_VITALS_BY_ASTRONAUT[astronaut.id] ?? [],
    missionDay,
  });
}

function section(brief: ReturnType<typeof build>, scope: 'daily' | 'weekly', id: string) {
  const found = brief[scope].sections.find((item) => item.id === id);
  assert.ok(found, `missing ${scope} section ${id}`);
  return found;
}

test('daily brief reports recorded changes, attention items, actions, and moderate confidence', () => {
  const brief = build(12);
  const daily = brief.daily;
  assert.equal(daily.id, 'daily');
  assert.equal(daily.window.recordedDays, 1);
  assert.equal(daily.window.startDay, 12);
  assert.equal(daily.window.endDay, 12);
  assert.equal(daily.confidence.level, 'moderate');

  const changedIds = section(brief, 'daily', 'changed').entries.map((item) => item.id);
  assert.deepEqual(new Set(changedIds), new Set(['change-exercise', 'change-hydration']));

  const attentionIds = section(brief, 'daily', 'attention').entries.map((item) => item.id);
  assert.ok(attentionIds.includes('daily-sleep-attention'));
  assert.ok(attentionIds.includes('daily-exercise-attention'));
  assert.ok(attentionIds.includes('daily-hydration-attention'));
  assert.ok(attentionIds.includes('daily-fatigue-attention'));

  const actionIds = section(brief, 'daily', 'action').entries.map((item) => item.id);
  assert.ok(actionIds.includes('daily-action-exercise'));
  assert.ok(actionIds.includes('daily-action-hydration'));
  assert.ok(actionIds.includes('daily-action-recovery'));
  assert.ok(actionIds.includes('daily-action-symptoms'));
});

test('daily brief assumes no measurement when today is missing and lowers confidence', () => {
  const brief = build(15);
  const daily = brief.daily;
  assert.equal(daily.window.recordedDays, 0);
  assert.equal(daily.confidence.level, 'low');
  assert.match(daily.confidence.note, /No today value was assumed/);

  const missing = section(brief, 'daily', 'missing').entries;
  assert.ok(missing.some((item) => item.id === 'daily-no-check-in'));
  assert.ok(
    missing.some((item) => item.text.includes('No today value was assumed'))
  );

  const actions = section(brief, 'daily', 'action').entries;
  assert.ok(actions.some((item) => item.id === 'daily-action-continue'));
  assert.ok(section(brief, 'daily', 'changed').entries.length === 0);
});

test('weekly brief compares the first and latest recorded day and surfaces symptoms and pain', () => {
  const brief = build(14);
  const weekly = brief.weekly;
  assert.equal(weekly.window.requestedDays, 7);
  assert.equal(weekly.window.startDay, 8);
  assert.equal(weekly.window.endDay, 14);
  assert.equal(weekly.window.recordedDays, 7);

  const changedIds = section(brief, 'weekly', 'changed').entries.map((item) => item.id);
  assert.deepEqual(
    new Set(changedIds),
    new Set(['change-sleep', 'change-exercise', 'change-hydration', 'change-fatigue', 'change-stress'])
  );

  const attentionTexts = section(brief, 'weekly', 'attention').entries.map((item) => item.text);
  assert.ok(attentionTexts.some((text) => text.includes('Sleep fragmentation')));
  assert.ok(attentionTexts.some((text) => text.includes('Headache')));
  assert.ok(attentionTexts.some((text) => text.startsWith('Pain was self-reported on 7 days')));

  assert.notEqual(weekly.confidence.level, 'low');
  assert.match(weekly.confidence.note, /Simulation and research material never count toward confidence/);
  assert.ok(weekly.sections.every((item) => item.title.length > 0));
  assert.deepEqual(
    weekly.sections.map((item) => item.id),
    ['changed', 'stable', 'attention', 'missing', 'action']
  );
});

test('weekly brief never assumes normal data when the window has no check-ins', () => {
  const empty = buildMissionHealthBrief({
    astronaut: patel,
    checkIns: [],
    vitals: [],
    missionDay: 14,
  });
  assert.equal(empty.weekly.window.recordedDays, 0);
  assert.equal(empty.weekly.confidence.level, 'low');
  assert.match(empty.weekly.confidence.note, /No value was assumed/);
  assert.ok(
    empty.weekly.sections
      .filter((item) => item.id === 'missing')[0]
      .entries.some((item) => item.id === 'weekly-no-check-ins')
  );
  assert.equal(section(empty, 'weekly', 'stable').entries.length, 0);
  assert.equal(empty.daily.window.recordedDays, 0);
});

test('recorded, simulated, and research material stay separated and private notes never leak', () => {
  const brief = build(14);
  const scopes = [brief.daily, brief.weekly];

  scopes.forEach((scope) => {
    scope.sections.forEach((sectionItem) => {
      sectionItem.entries.forEach((item) => {
        assert.ok(item.sources.length > 0, `${item.id} has no source`);
        item.sources.forEach((source) => assert.equal(source.source, 'recorded'));
      });
    });
    assert.ok(scope.share.some((item) => item.disposition === 'withhold' && item.source === 'private'));
    assert.ok(scope.share.some((item) => item.disposition === 'withhold' && item.source === 'simulated'));
    assert.ok(scope.share.some((item) => item.source === 'research'));
  });

  assert.ok(brief.researchReferences.length > 0);
  brief.researchReferences.forEach((reference) => {
    assert.equal(reference.source, 'research');
    assert.match(reference.url, /^https:\/\//);
  });

  const markdown = missionHealthBriefToMarkdown(brief);
  assert.equal(markdown.includes('Extended airlock seal diagnostics'), false);
  assert.ok(markdown.includes(MISSION_HEALTH_BRIEF_PRIVACY_NOTE));
  assert.ok(markdown.includes('## Mission Health Brief'));
  assert.ok(markdown.includes('### Source separation'));
  assert.ok(markdown.includes('#### What changed'));
  assert.ok(markdown.includes('#### What is stable'));
  assert.ok(markdown.includes('#### What needs attention'));
  assert.ok(markdown.includes('#### What data is missing'));
  assert.ok(markdown.includes('#### What action to consider'));
  assert.ok(markdown.includes('#### What to share with medical support'));
  assert.ok(markdown.includes('- [Withhold] Private crew free-text notes'));
  assert.ok(markdown.includes('_Research_'));
  assert.ok(markdown.includes(MISSION_HEALTH_BRIEF_DISCLAIMER));
  assert.equal(markdown.includes('CONFIDENTIAL'), false);
});

test('escalation language is non-diagnostic and urgent escalation appears in both scopes', () => {
  const brief = buildMissionHealthBrief({
    astronaut: patel,
    checkIns: patelCheckIns,
    vitals: patelVitals,
    missionDay: 14,
    escalation: {
      required: true,
      reasons: ['Resting heart rate outside the configured comparison band'],
    },
  });

  assert.equal(brief.daily.escalation.level, 'urgent');
  assert.equal(brief.weekly.escalation.level, 'urgent');
  assert.equal(
    brief.daily.escalation.title,
    'Follow mission medical escalation procedures now'
  );
  assert.match(brief.daily.escalation.detail, /not a diagnosis/);
  assert.ok(
    brief.daily.escalation.reasons.includes(
      'Resting heart rate outside the configured comparison band'
    )
  );

  const dailyActions = section(brief, 'daily', 'action').entries.map((item) => item.id);
  assert.equal(dailyActions[0], 'daily-action-escalate');
  const weeklyActions = section(brief, 'weekly', 'action').entries.map((item) => item.id);
  assert.equal(weeklyActions[0], 'weekly-action-escalate');

  const markdown = missionHealthBriefToMarkdown(brief);
  assert.ok(markdown.includes('**Recorded escalation reasons**'));
  assert.ok(markdown.includes('Follow mission medical escalation procedures now'));
  assert.equal(/diagnosed with/i.test(markdown), false);
});
