import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  DEFAULT_VEHICLE_GLB_CANDIDATES,
  PROGRAMME_ERIZON_MODEL_PATH,
  MISSION_NOT_LIVE_NOTE,
  MISSION_SCENE_LABELS,
  buildMissionSceneOverlay,
  describeVehicleModelSource,
  describeVehicleLoadState,
  describeVehicleDisplayLabel,
  initialScenePaused,
  resolveSceneMotionMode,
  resolveVehicleModelCandidates,
  starCountForViewport,
} from './missionScene';
import { calculateMarsTransitTelemetry } from './missionOrbitEngine';

const TELEMETRY = calculateMarsTransitTelemetry({
  currentDay: 14,
  totalPlannedDays: 260,
  departureDateIso: '2026-11-01T00:00:00Z',
  configuredVelocityKmH: 24_000,
});

test('vehicle GLB resolution selects only the bundled Programme ERIZON model', () => {
  const defaults = resolveVehicleModelCandidates({ baseUrl: '/' });
  assert.deepEqual(
    defaults.candidates,
    DEFAULT_VEHICLE_GLB_CANDIDATES.map((path) => `/${path}`)
  );
  assert.ok(defaults.candidates.every((path) => path.startsWith('/models/')));

  assert.equal(PROGRAMME_ERIZON_MODEL_PATH, 'models/programme_erizon.glb');
  assert.equal(defaults.candidates.length, 1);
  assert.equal(defaults.rejectedExternal.length, 0);

});

test('data-integrity labels are separated and never claim live or ephemeris data', () => {
  assert.equal(MISSION_SCENE_LABELS.simulation.title, 'Mission simulation');
  assert.match(MISSION_SCENE_LABELS.simulation.detail, /fictional/i);
  assert.match(MISSION_SCENE_LABELS.ephemeris.title, /not integrated/i);
  assert.match(MISSION_SCENE_LABELS.ephemeris.detail, /no ephemeris source/i);
  assert.match(MISSION_SCENE_LABELS.cinematic.detail, /not to scale/i);
  assert.match(MISSION_NOT_LIVE_NOTE, /Not live NASA telemetry/);

  // No label may present the fictional mission as a live feed.
  const combined = Object.values(MISSION_SCENE_LABELS)
    .map((label) => `${label.title} ${label.detail}`)
    .join(' ');
  assert.equal(/live (NASA )?telemetry feed/i.test(combined), false);
});

test('communications delay is derived from Earth distance, not Mars distance', () => {
  const speedOfLightKmS = 299_792.458;
  const fromEarth = Math.max(1, Math.round(TELEMETRY.currentDistanceFromEarthKm / speedOfLightKmS));
  const fromMars = Math.max(1, Math.round(TELEMETRY.currentDistanceToMarsKm / speedOfLightKmS));

  assert.equal(TELEMETRY.oneWayLightDelaySec, fromEarth);
  assert.notEqual(fromEarth, fromMars, 'Earth and Mars distances must stay distinct');
  assert.notEqual(TELEMETRY.currentDistanceFromEarthKm, TELEMETRY.currentDistanceToMarsKm);
});

test('overlay reports mission time, progress, remaining, timestamp, source and both distances', () => {
  const overlay = buildMissionSceneOverlay(TELEMETRY, {
    dataTimestampIso: '2026-11-15T09:30:00.000Z',
    modelSource: 'procedural',
    paused: false,
  });

  assert.equal(overlay.missionTimeLabel, `Sol ${TELEMETRY.missionDay} of ${TELEMETRY.totalDurationDays}`);
  assert.match(overlay.remainingLabel, /^246 days/);
  assert.equal(overlay.progressPercent, TELEMETRY.progressPercent);
  assert.equal(overlay.dataTimestampLabel, '2026-11-15 09:30 UTC');
  assert.match(overlay.sourceModeLabel, /Mission simulation/);
  assert.match(overlay.sourceModeLabel, /procedural spacecraft fallback/);
  assert.match(overlay.sourceModeLabel, /motion running/);
  assert.match(overlay.earthDistanceLabel, /M km/);
  assert.match(overlay.earthDelayLabel, /one-way/);
  assert.match(overlay.marsDistanceLabel, /M km/);
  assert.match(overlay.velocityLabel, /simulated/);

  const pausedOverlay = buildMissionSceneOverlay(TELEMETRY, {
    dataTimestampIso: '2026-11-15T09:30:00.000Z',
    modelSource: 'programme_erizon',
    paused: true,
  });
  assert.match(pausedOverlay.sourceModeLabel, /Programme ERIZON GLB loaded locally/);
  assert.match(pausedOverlay.sourceModeLabel, /motion paused/);
});

test('model source wording distinguishes a real GLB from the placeholder', () => {
  assert.match(describeVehicleModelSource('programme_erizon'), /Programme ERIZON GLB loaded locally/);
  assert.match(describeVehicleModelSource('procedural'), /procedural spacecraft fallback/);
  assert.doesNotMatch(describeVehicleModelSource('procedural'), /Programme ERIZON GLB loaded/);
});

test('model load states clearly distinguish loading, success, and procedural fallback', () => {
  assert.equal(describeVehicleLoadState('procedural'), 'Illustrative procedural spacecraft — mission simulation only.');
  assert.equal(describeVehicleLoadState('loading'), 'Loading Programme ERIZON…');
  assert.equal(describeVehicleLoadState('loaded'), 'Programme ERIZON loaded.');
  assert.equal(
    describeVehicleLoadState('error'),
    'Programme ERIZON could not be loaded — showing illustrative fallback.'
  );
  assert.doesNotMatch(describeVehicleLoadState('error'), /Programme ERIZON loaded\./);
});

test('public release display labels the procedural ship without implying Programme ERIZON is present', () => {
  const releaseLabel = describeVehicleDisplayLabel({ releaseBuild: true, status: 'procedural' });
  assert.match(releaseLabel, /Illustrative procedural spacecraft/);
  assert.match(releaseLabel, /ARES-7 Transit/);
  assert.doesNotMatch(releaseLabel, /Programme ERIZON|loaded/i);
  assert.match(describeVehicleLoadState('procedural'), /simulation only/i);
});

test('motion and performance helpers behave predictably', () => {
  assert.equal(resolveSceneMotionMode({ paused: true, visible: true }), 'static');
  assert.equal(resolveSceneMotionMode({ paused: false, visible: false }), 'static');
  assert.equal(resolveSceneMotionMode({ paused: false, visible: true }), 'animated');

  assert.equal(initialScenePaused(true), true);
  assert.equal(initialScenePaused(false), false);

  assert.equal(starCountForViewport(390), 420);
  assert.equal(starCountForViewport(900), 700);
  assert.equal(starCountForViewport(1440), 1000);
  assert.equal(starCountForViewport(0), 500);
});
