import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { ResearchPage } from './ResearchPage';

test('renders the secondary research context view, source boundaries, coverage, and reference catalog', () => {
  const html = renderToStaticMarkup(
    createElement(MemoryRouter, null, createElement(ResearchPage))
  );

  assert.match(html, /Research Context/);
  assert.match(html, /NASA OSDR · Archived research context/);
  assert.match(html, /no model is trained on it/i);
  assert.match(html, /Research boundaries/);
  assert.match(html, /not live telemetry/i);
  assert.match(html, /OSD-575 · Inspiration4 serum CMP/);
  assert.match(html, /10\.26030\/mc5d-p710/);
  assert.match(html, /CC0-1\.0/);
  assert.match(html, /532/);
  assert.match(html, /Missing values/);
  assert.match(html, /C001/);
  assert.match(html, /BUN\/creatinine ratio/);
  assert.match(html, /NASA Human Research Program: 5 Hazards of Human Spaceflight/);
  assert.match(html, /NASA Open Data catalog/);
  assert.match(html, /Metadata only/);
  assert.match(html, /Space radiation/);
  assert.match(html, /does not download these/);
  assert.match(html, /not a validation set/i);
  assert.match(html, /Loading dataset metadata from data\.nasa\.gov/);
  assert.match(html, /Open Vitals view/);
  assert.match(html, /Source pseudonym/);
  assert.match(html, /Download filtered JSON \+ provenance/);
  assert.match(html, /id="nasa-osd575"/);
  assert.match(html, /id="nasa-reference-library"/);
  assert.doesNotMatch(html, /Commander Aarav Sharma/);
});
