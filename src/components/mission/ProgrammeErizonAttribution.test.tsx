import assert from 'node:assert/strict';
import { test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProgrammeErizonAttribution } from './ProgrammeErizonAttribution';

test('Mission attribution exposes creator, title, source, license, and license URL', () => {
  const html = renderToStaticMarkup(<ProgrammeErizonAttribution />);

  assert.match(html, /Programme ERIZON/);
  assert.match(html, /nejenabinupa/);
  assert.match(html, /https:\/\/sketchfab\.com\/3d-models\/programme-erizon-/);
  assert.match(html, /CC BY-NC-ND 4\.0/);
  assert.match(html, /https:\/\/creativecommons\.org\/licenses\/by-nc-nd\/4\.0\//);
  assert.match(html, /served unmodified/i);
  assert.match(html, /non-commercial/i);
  assert.match(html, /not covered by Arogya/);
});
