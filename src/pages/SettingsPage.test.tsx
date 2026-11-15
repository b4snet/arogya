import assert from 'node:assert/strict';
import { test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { SettingsPage } from './SettingsPage';

function render() {
  return renderToStaticMarkup(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>
  );
}

test('settings owns a single h1 and exposes privacy, data, and accessibility controls', () => {
  const html = render();

  assert.equal(html.split('<h1').length - 1, 1);
  assert.match(html, /Settings &amp; Crew Profile/);
  assert.match(html, /Accessibility &amp; Display/);
  assert.match(html, /High-Contrast Mode/);
  assert.match(html, /Reduced Motion Override/);
  assert.match(html, /Contrast mode/);
  assert.match(html, /Motion/);

  assert.match(html, /Privacy &amp; Data/);
  assert.match(html, /Local-first\./);
  assert.match(html, /IndexedDB/);
  assert.match(html, /Reports stay private by default\./);
  assert.match(html, /Free-text crew notes are excluded/);
  assert.match(html, /Simulated monitor values stay in memory/);
  assert.match(html, /NASA OSD-575 observations appear only as labelled research context/);
  assert.match(html, /No client credentials\./);
  assert.match(html, /href="\/reports"/);
  assert.doesNotMatch(html, /api[_-]?key\s*[:=]|trained on NASA|diagnosed with/i);
});
