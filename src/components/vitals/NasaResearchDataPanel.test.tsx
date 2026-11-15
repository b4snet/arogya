import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { NasaResearchDataPanel } from './NasaResearchDataPanel';

test('renders a source-traceable NASA result, research labels, and a link to the research library', () => {
  const html = renderToStaticMarkup(
    createElement(MemoryRouter, null, createElement(NasaResearchDataPanel))
  );
  assert.match(html, /NASA Research Data · Inspiration4 Serum CMP/);
  assert.match(html, /OSD-575 · Version 3/);
  assert.match(html, /These are archived serum research measurements, not live sensor readings/);
  assert.match(html, /Source subject/);
  assert.match(html, /C001_serum_L-3/);
  assert.match(html, /Open full research library/);
  assert.match(html, /href="\/research"/);
  const sampleStart = html.indexOf('C001_serum_L-3');
  const sampleRowEnd = html.indexOf('</tr>', sampleStart);
  const sampleRow = html.slice(sampleStart, sampleRowEnd);
  assert.match(sampleRow, /L-3/);
  assert.match(sampleRow, /69 mg\/dL/);
  assert.match(sampleRow, /65–99 mg\/dL; not interpreted/);
  assert.match(html, /Download filtered JSON \+ provenance/);
  assert.doesNotMatch(html, /Commander Aarav Sharma/);
});
