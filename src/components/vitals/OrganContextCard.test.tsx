import assert from 'node:assert/strict';
import { test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SEED_ASTRONAUTS } from '../../data/astronauts';
import { SEED_MISSION } from '../../data/missionData';
import { SEED_CHECKINS_BY_ASTRONAUT } from '../../data/checkIns14Day';
import { SEED_VITALS_BY_ASTRONAUT } from '../../data/vitals14Day';
import { evaluateHealthAssessment } from '../../engine/healthEngine';
import { OrganContextCard } from './OrganContextCard';
const astronaut = SEED_ASTRONAUTS[0];

const assessment = evaluateHealthAssessment(
  astronaut,
  SEED_CHECKINS_BY_ASTRONAUT[astronaut.id] ?? [],
  SEED_VITALS_BY_ASTRONAUT[astronaut.id] ?? [],
  { ...SEED_MISSION, currentDay: 7 }
);

function render() {
  return renderToStaticMarkup(<OrganContextCard assessment={assessment} />);
}

test('organ context card pairs every system with recorded context and a status', () => {
  const html = render();

  assert.match(html, /Organ &amp; body-system context/);
  assert.match(html, /Illustrative mapping of recorded signals\. Not an organ diagnosis\./);

  assert.match(html, /Brain &amp; behavior/);
  assert.match(html, /Heart &amp; circulation/);
  assert.match(html, /Lungs &amp; respiration/);
  assert.match(html, /Full-body readiness/);
  assert.match(html, /Combined view across all eight monitored systems and hazards\./);

  // Organ context is informational; retired atlas routes must not become dead links.
  assert.doesNotMatch(html, /href="\/atlas/);
  assert.doesNotMatch(html, /diagnosed with|clinical validation|trained on NASA/i);
});
