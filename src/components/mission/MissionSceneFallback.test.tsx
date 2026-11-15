import assert from 'node:assert/strict';
import { test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MissionSceneFallback, missionSceneFailureMessage } from './MissionSceneFallback';
import { calculateMarsTransitTelemetry } from '../../engine/missionOrbitEngine';
import { buildMissionSceneOverlay } from '../../engine/missionScene';

const telemetry = calculateMarsTransitTelemetry({
  currentDay: 14,
  totalPlannedDays: 260,
  departureDateIso: '2026-11-01T00:00:00Z',
  configuredVelocityKmH: 24_000,
});
const overlay = buildMissionSceneOverlay(telemetry, {
  dataTimestampIso: '2026-11-15T09:30:00.000Z',
  modelSource: 'procedural',
  paused: true,
});

test('WebGL-unavailable and context-loss failures have distinct honest messages', () => {
  assert.equal(
    missionSceneFailureMessage('webgl-unavailable'),
    '3D view unavailable in this browser. Mission simulation details remain available.'
  );
  assert.match(missionSceneFailureMessage('context-lost'), /WebGL context was lost/);
  assert.match(missionSceneFailureMessage('context-lost'), /simulation details remain available/);
});

test('HTML scene fallback is accessible and retains simulation source and distance summary', () => {
  const html = renderToStaticMarkup(
    <MissionSceneFallback failure="webgl-unavailable" overlay={overlay} onRetry={() => undefined} />
  );

  assert.match(html, /role="status"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /3D view unavailable in this browser/);
  assert.match(html, /Mission simulation · no ephemeris integration/);
  assert.match(html, /Earth to spacecraft/);
  assert.match(html, /Earth communication delay/);
  assert.match(html, /Spacecraft to Mars/);
  assert.match(html, /2026-11-15 09:30 UTC/);
  assert.match(html, /Retry 3D view/);
  assert.doesNotMatch(html, /Programme ERIZON loaded/);
});
