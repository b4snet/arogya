import assert from 'node:assert/strict';
import { test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('./StudioLightingRig', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./StudioLightingRig')>();
  return { ...actual, detectWebGLCapability: () => 'unavailable' as const };
});

import { MissionMonitorScene } from './MissionMonitorScene';

test('the dashboard hero falls back to a static illustration when WebGL is unavailable', () => {
  const html = renderToStaticMarkup(
    <MissionMonitorScene status="green" astronautName="Cmdr. A. Reyes" />
  );

  assert.match(html, /role="region"/);
  assert.match(html, /Illustrative astronaut portrait for Cmdr\. A\. Reyes/);
  assert.match(html, /Static illustration, not live telemetry\./);
  assert.match(html, /role="img"/);
  assert.match(html, /aria-label="Static illustration of an astronaut in a spacesuit"/);
  assert.doesNotMatch(html, /<canvas/);
  assert.doesNotMatch(html, /drag to orbit the scene/i);
});
