import assert from 'node:assert/strict';
import { test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SEED_ASTRONAUTS } from '../../data/astronauts';
import { SEED_VITALS_BY_ASTRONAUT } from '../../data/vitals14Day';
import { SEED_CHECKINS_BY_ASTRONAUT } from '../../data/checkIns14Day';
import { buildMissionHealthBrief } from '../../engine/missionHealthBrief';
import { MissionHealthBriefSection } from './MissionHealthBriefSection';

const astronaut = SEED_ASTRONAUTS[1];

function renderBrief(missionDay = 14): string {
  const brief = buildMissionHealthBrief({
    astronaut,
    checkIns: SEED_CHECKINS_BY_ASTRONAUT[astronaut.id],
    vitals: SEED_VITALS_BY_ASTRONAUT[astronaut.id],
    missionDay,
  });
  return renderToStaticMarkup(<MissionHealthBriefSection brief={brief} />);
}

test('renders daily and weekly scopes with all required sections and source badges', () => {
  const html = renderBrief();

  assert.match(html, /aria-labelledby="mission-health-brief-heading"/);
  assert.match(html, /Mission health brief/);
  assert.match(html, /data-brief-scope="daily"/);
  assert.match(html, /data-brief-scope="weekly"/);
  assert.equal((html.match(/data-brief-confidence="/g) ?? []).length, 2);
  assert.match(html, /Confidence: Moderate\./);

  for (const section of ['changed', 'stable', 'attention', 'missing', 'action']) {
    assert.equal(
      (html.match(new RegExp(`data-brief-section="${section}"`, 'g')) ?? []).length,
      2,
      `section ${section} should render once per scope`
    );
  }
  assert.match(html, /What changed/);
  assert.match(html, /What is stable/);
  assert.match(html, /What needs attention/);
  assert.match(html, /What data is missing/);
  assert.match(html, /What action to consider/);

  assert.match(html, /data-mission-source="recorded"/);
  assert.match(html, /data-mission-source="simulated"/);
  assert.match(html, /data-mission-source="research"/);
  assert.equal((html.match(/data-brief-source="private"/g) ?? []).length, 2);
  assert.equal((html.match(/data-brief-share="withhold"/g) ?? []).length, 4);
  assert.match(html, /What to share with medical support/);
  assert.match(html, /Include the recorded check-in coverage/);
  assert.match(html, /Simulated demonstration telemetry is withheld/);
});

test('renders non-diagnostic language, research links, and no private crew notes', () => {
  const html = renderBrief();

  assert.match(html, /educational planning support, not medical advice/);
  assert.match(html, /does not diagnose, prescribe treatment, or replace the crew medical lead/);
  assert.match(html, /Research context \(not crew data\)/);
  assert.match(html, /aria-label="Open NASA source:/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noreferrer"/);
  assert.match(html, /class="brief-scope print-report-card/);
  assert.match(html, /brief-scope-grid/);

  assert.doesNotMatch(html, /Extended airlock seal diagnostics/);
  assert.doesNotMatch(html, /diagnosed with|treatment plan|clinical validation|dosage/i);
  assert.doesNotMatch(html, /trained on NASA|NASA endorsement/i);
});

test('a missing current-day check-in renders low daily confidence without invented values', () => {
  const html = renderBrief(15);

  assert.match(html, /data-brief-confidence="low"/);
  assert.match(html, /Confidence is low because today’s check-in is missing/);
  assert.match(html, /No today value was assumed/);
  assert.match(html, /Today’s check-in is not recorded/);
  assert.doesNotMatch(html, />On track</);
});
