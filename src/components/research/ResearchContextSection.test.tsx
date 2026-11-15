import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { ResearchContextCardView, ResearchContextSection } from './ResearchContextSection';
import { buildResearchContextCard } from '../../engine/researchContext';

function render(element: ReactElement) {
  return renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>);
}

test('section renders surface cards with research labels, provenance, and a Research page link', () => {
  const html = render(
    <ResearchContextSection surface="vitals" headingId="vitals-research-context-heading" title="Research context for recorded vitals" />
  );

  assert.match(html, /aria-labelledby="vitals-research-context-heading"/);
  assert.match(html, /data-research-context-surface="vitals"/);
  assert.match(html, /Research context for recorded vitals/);
  assert.equal((html.match(/data-research-area=/g) ?? []).length, 3);
  assert.equal((html.match(/data-mission-source="research"/g) ?? []).length, 4);
  assert.match(html, /Why it matters in spaceflight/);
  assert.match(html, /Bundled OSD-575 context/);
  assert.match(html, /DOI/);
  assert.match(html, /10\.26030\/mc5d-p710/);
  assert.match(html, /License CC0-1\.0/);
  assert.match(html, /https:\/\/osdr\.nasa\.gov\/bio\/repo\/data\/studies\/OSD-575/);
  assert.match(html, /not this crew member/i);
  assert.match(html, /Research Context page/);
  assert.match(html, /href="\/research"/);
  assert.match(html, /href="\/research#nasa-osd575"/);
  assert.match(html, /href="\/research#nasa-reference-library"/);
  assert.match(html, /does not imply an agency endorsement/);
  assert.doesNotMatch(html, /trained on NASA|NASA[- ]endorsed|NASA[- ]approved|validated by NASA/i);
});

test('mission surface renders hazard cards without fabricating OSD-575 coverage', () => {
  const html = render(
    <ResearchContextSection surface="mission" headingId="mission-research-context-heading" />
  );

  assert.equal((html.match(/data-research-area="hazard-/g) ?? []).length, 5);
  assert.equal((html.match(/No OSD-575 CMP analyte maps directly to this area/g) ?? []).length, 5);
  assert.match(html, /NASA Human Research Program/);
  assert.match(html, /aria-label="Open NASA source:/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noreferrer"/);
  assert.doesNotMatch(html, /Bundled OSD-575 context/);
});

test('card view exposes the crew-data note and evidence variant stays compact', () => {
  const card = buildResearchContextCard('renal_hydration');
  const html = render(<ResearchContextCardView card={card} compact />);

  assert.match(html, /data-research-area="renal_hydration"/);
  assert.match(html, /role="note"/);
  assert.match(html, /Archived source samples, not this crew member/);
  assert.match(html, /Kidney function &amp; fluid balance/);
  assert.match(html, /mmol\/L|mg\/dL/);
  assert.match(html, /Research observation · not\s+crew data/);
});

test('section without cards renders nothing', () => {
  const html = render(<ResearchContextSection cards={[]} />);
  assert.equal(html, '');
});
