import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  VITALS_REFERENCE_TABLE_NOTE,
  buildVitalReferenceRows,
  buildVitalsCsv,
} from './vitalsReference.ts';
import { SEED_ASTRONAUTS } from '../data/astronauts.ts';
import { SEED_VITALS_BY_ASTRONAUT } from '../data/vitals14Day.ts';
import { SAFETY_DISCLAIMER } from './thresholds';

test('buildVitalReferenceRows returns all 8 required vital signs with cautious non-diagnostic phrasing', () => {
  const astronaut = SEED_ASTRONAUTS[1]; // Maya Patel (includes elevated BP & missing values in history)
  const readings = SEED_VITALS_BY_ASTRONAUT[astronaut.id];
  const rows = buildVitalReferenceRows(astronaut, readings, readings, 'metric');

  assert.equal(rows.length, 8);
  const expectedNames = [
    'Resting heart rate',
    'Systolic blood pressure',
    'Diastolic blood pressure',
    'Temperature',
    'Blood glucose',
    'Body mass',
    'Radiation exposure',
    'Oxygen saturation (if available)',
  ];
  assert.deepEqual(
    rows.map((r) => r.name),
    expectedNames
  );

  // Verify cautious language (never diagnoses hypertension, diabetes, arrhythmia, or infection)
  const allText = rows.map((r) => `${r.explanation} ${r.recommendedAction}`).join(' ').toLowerCase();
  assert.equal(allText.includes('hypertension'), false);
  assert.equal(allText.includes('diabetes'), false);
  assert.equal(allText.includes('arrhythmia'), false);
  assert.equal(allText.includes('infection'), false);

  // Maya Patel's Day 14 systolic BP (136 mmHg) is above general adult 130 mmHg -> cautious out-of-range phrasing
  const sysRow = rows.find((r) => r.id === 'systolic_bp');
  assert.ok(sysRow);
  assert.ok(
    sysRow.explanation.toLowerCase().includes(
      'outside a commonly used reference range and may warrant monitoring or medical review'
    )
  );

  assert.equal(
    VITALS_REFERENCE_TABLE_NOTE,
    'Reference ranges are general adult educational ranges and may not apply to spaceflight, individual physiology, measurement conditions, or an astronaut’s personal baseline. Arogya does not diagnose conditions. Contact your crew medical officer or flight surgeon for interpretation and care.'
  );
});

test('Missing vital channels are explicitly marked MISSING and missing status rather than nominal', () => {
  const astronaut = SEED_ASTRONAUTS[0];
  const readings = [
    {
      ...SEED_VITALS_BY_ASTRONAUT[astronaut.id][0],
      bloodGlucoseMgDl: null,
      spo2Percent: null,
      bodyMassKg: null,
    },
  ];
  const rows = buildVitalReferenceRows(astronaut, readings, readings, 'metric');
  const glucose = rows.find((r) => r.id === 'blood_glucose');
  const spo2 = rows.find((r) => r.id === 'spo2');
  const mass = rows.find((r) => r.id === 'body_mass');

  assert.equal(glucose?.latestFormatted, 'MISSING');
  assert.equal(glucose?.status, 'missing');
  assert.equal(spo2?.latestFormatted, 'MISSING');
  assert.equal(spo2?.status, 'missing');
  assert.equal(mass?.latestFormatted, 'MISSING');
  assert.equal(mass?.status, 'missing');
});

test('buildVitalsCsv outputs headers and preserves MISSING markers for null sensors', () => {
  const astronaut = SEED_ASTRONAUTS[1];
  const readings = SEED_VITALS_BY_ASTRONAUT[astronaut.id];
  const csv = buildVitalsCsv(astronaut, readings);
  const lines = csv.split('\n');
  assert.equal(lines.length, readings.length + 1);
  assert.ok(lines[0].includes('resting_hr_bpm'));
  assert.ok(lines[0].includes('body_mass_kg'));
  // Day 11 has null bloodGlucoseMgDl -> MISSING
  assert.ok(lines[11].includes('MISSING'));
});
