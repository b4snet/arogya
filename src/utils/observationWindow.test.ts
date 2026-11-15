import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  OBSERVATION_WINDOW_OPTIONS,
  buildDailySeries,
  computeObservationWindow,
  countObservedDays,
  describeWindowCoverage,
  filterByObservationWindow,
} from './observationWindow';

const readings = [
  { missionDay: 1, id: 'a' },
  { missionDay: 7, id: 'b' },
  { missionDay: 8, id: 'c' },
  { missionDay: 9, id: 'd' },
  { missionDay: 14, id: 'e' },
];

test('7/14/30-day windows resolve to the correct mission-day boundaries', () => {
  const seven = computeObservationWindow(14, 7);
  assert.equal(seven.startDay, 8);
  assert.equal(seven.endDay, 14);
  assert.equal(seven.coveredDays, 7);
  assert.equal(seven.preMissionDays, 0);

  const fourteen = computeObservationWindow(14, 14);
  assert.equal(fourteen.startDay, 1);
  assert.equal(fourteen.endDay, 14);
  assert.equal(fourteen.preMissionDays, 0);

  const thirty = computeObservationWindow(14, 30);
  assert.equal(thirty.startDay, 1);
  assert.equal(thirty.endDay, 14);
  assert.equal(thirty.coveredDays, 14);
  assert.equal(thirty.preMissionDays, 16);
});

test('a window longer than the mission clamps to mission day 1 without inventing days', () => {
  const early = computeObservationWindow(3, 7);
  assert.equal(early.startDay, 1);
  assert.equal(early.endDay, 3);
  assert.equal(early.coveredDays, 3);
  assert.equal(early.preMissionDays, 4);

  const series = buildDailySeries(
    [
      { missionDay: 1, id: 'a' },
      { missionDay: 3, id: 'c' },
    ],
    early
  );
  // Day 2 has no observation: it must be a gap, never a fabricated value.
  assert.deepEqual(
    series.map((slot) => (slot.item ? slot.item.id : null)),
    ['a', null, 'c']
  );
});

test('filtering keeps only actual observations inside the window and preserves order', () => {
  const seven = computeObservationWindow(14, 7);
  assert.deepEqual(
    filterByObservationWindow(readings, seven).map((r) => r.missionDay),
    [8, 9, 14]
  );

  const thirty = computeObservationWindow(14, 30);
  assert.equal(filterByObservationWindow(readings, thirty).length, 5);
  assert.equal(countObservedDays(filterByObservationWindow(readings, thirty)), 5);
});

test('a 30-day request backed by 14 days of data reports the exact availability sentence', () => {
  const thirty = computeObservationWindow(14, 30);
  const observed = Array.from({ length: 14 }, (_, index) => ({ missionDay: index + 1 }));
  assert.equal(
    describeWindowCoverage(thirty, countObservedDays(observed)),
    '30-day window selected; 14 days of observations available.'
  );

  const fourteen = computeObservationWindow(14, 14);
  assert.equal(describeWindowCoverage(fourteen, countObservedDays(observed)), null);
});

test('window boundaries use mission days only, so timestamps cannot shift a day across timezones', () => {
  const seven = computeObservationWindow(14, 7);
  const readingsWithTimestamps = [
    // Same mission day recorded with very different UTC offsets / local calendar dates.
    { missionDay: 8, timestampIso: '2026-11-07T00:15:00Z' },
    { missionDay: 8, timestampIso: '2026-11-08T23:45:00-11:00' },
    { missionDay: 7, timestampIso: '2026-11-06T12:00:00Z' },
  ];
  const filtered = filterByObservationWindow(readingsWithTimestamps, seven);
  assert.equal(filtered.length, 2);
  assert.ok(filtered.every((reading) => reading.missionDay === 8));
});

test('selector options keep a stable order so buttons never reorder', () => {
  assert.deepEqual([...OBSERVATION_WINDOW_OPTIONS], [7, 14, 30]);
});
