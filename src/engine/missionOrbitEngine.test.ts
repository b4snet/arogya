import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  calculateDurationFromDates,
  calculateMarsTransitTelemetry,
  calculateMissionDayFromDate,
  deriveMissionPhase,
} from './missionOrbitEngine.ts';

test('calculateMarsTransitTelemetry computes consistent ARES-7 Transit progression from departure to Mars surface', () => {
  const start = calculateMarsTransitTelemetry({
    currentDay: 1,
    totalPlannedDays: 260,
    departureDateIso: '2026-11-01T00:00:00Z',
    configuredVelocityKmH: 24_000,
  });
  const mid = calculateMarsTransitTelemetry({
    currentDay: 130,
    totalPlannedDays: 260,
    departureDateIso: '2026-11-01T00:00:00Z',
    configuredVelocityKmH: 24_000,
  });
  const approach = calculateMarsTransitTelemetry({
    currentDay: 235,
    totalPlannedDays: 260,
    departureDateIso: '2026-11-01T00:00:00Z',
    configuredVelocityKmH: 24_000,
  });
  const arrival = calculateMarsTransitTelemetry({
    currentDay: 260,
    totalPlannedDays: 260,
    departureDateIso: '2026-11-01T00:00:00Z',
    configuredVelocityKmH: 24_000,
  });

  assert.equal(start.phase, 'Earth departure');
  assert.equal(mid.phase, 'transit');
  assert.equal(approach.phase, 'Mars approach');
  assert.equal(deriveMissionPhase(0.97), 'Mars orbit');
  assert.equal(arrival.phase, 'Mars surface');

  // Velocity-based distance traveled and remaining Mars distance
  assert.equal(start.spacecraftVelocityKmH, 24_000);
  assert.equal(start.distanceTraveledKm, 24 * 24_000);
  assert.ok(start.distanceTraveledKm < mid.distanceTraveledKm);
  assert.ok(mid.distanceTraveledKm < arrival.distanceTraveledKm);
  assert.equal(arrival.distanceTraveledKm, arrival.totalTransferDistanceKm);
  assert.equal(arrival.currentDistanceToMarsKm, 0);
  assert.ok(start.currentDistanceToMarsKm > mid.currentDistanceToMarsKm);

  // Light-time communication delays
  assert.ok(start.oneWayLightDelaySec < mid.oneWayLightDelaySec);
  assert.equal(mid.roundTripLightDelaySec, mid.oneWayLightDelaySec * 2);

  // Remaining time conversions
  assert.equal(mid.remainingDays, 130);
  assert.equal(mid.remainingWeeks, Number((130 / 7).toFixed(1)));
  assert.equal(mid.remainingMonths, Number((130 / 30.4375).toFixed(1)));
  assert.equal(arrival.remainingDays, 0);
  assert.equal(arrival.progressPercent, 100);
  assert.equal(mid.timelineMilestones.length, 5);
});

test('calculateMissionDayFromDate and calculateDurationFromDates derive mission day and span accurately', () => {
  const duration = calculateDurationFromDates(
    '2026-11-01T00:00:00Z',
    '2027-07-19T00:00:00Z'
  );
  assert.equal(duration, 260);

  const day14 = calculateMissionDayFromDate(
    '2026-11-01T00:00:00Z',
    260,
    new Date('2026-11-14T12:00:00Z')
  );
  assert.equal(day14, 14);

  const synced = calculateMarsTransitTelemetry({
    departureDateIso: '2026-11-01T00:00:00Z',
    totalPlannedDays: 260,
    syncDayToCurrentDate: true,
    referenceDate: new Date('2026-11-14T12:00:00Z'),
  });
  assert.equal(synced.missionDay, 14);
});
