import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { VitalReferenceRow } from './vitalsReference';
import {
  DEMONSTRATION_HEART_RATE_BPM,
  DEMONSTRATION_RESPIRATORY_RATE_PER_MIN,
  ORGAN_MOTION_DISCLAIMER,
  buildMissingMeasurementNames,
  buildOrganFindings,
  buildOrganSystemStatuses,
  describeOrganMotionText,
  mapMeasurementToSystem,
  recordedRespiratoryRateFrom,
  resolveHeartTiming,
  resolveLungTiming,
  resolveOrganRenderMode,
} from './organMotion';
import { SEED_ASTRONAUTS } from '../data/astronauts';
import { buildVitalReferenceRows } from './vitalsReference';
import { SEED_VITALS_BY_ASTRONAUT } from '../data/vitals14Day';

function row(partial: Partial<VitalReferenceRow> & Pick<VitalReferenceRow, 'id' | 'status'>): VitalReferenceRow {
  return {
    name: partial.id,
    latestNumeric: 100,
    latestFormatted: '100',
    unit: '',
    generalReferenceRange: 'general adult range',
    personalBaseline: 'personal baseline',
    trendDirection: 'stable',
    trendLabel: 'Stable',
    statusLabel: 'Monitor',
    explanation: 'Outside the comparison band on the recorded reading.',
    recommendedAction: 'Re-measure.',
    escalationThreshold: 'repeat threshold',
    latestDay: 14,
    ...partial,
  };
}

const ROW_IDS: VitalReferenceRow['id'][] = [
  'resting_hr',
  'systolic_bp',
  'diastolic_bp',
  'body_temp',
  'blood_glucose',
  'body_mass',
  'radiation',
  'spo2',
];

test('flagged measurements map to a related body system, never a location', () => {
  assert.equal(mapMeasurementToSystem('resting_hr').id, 'cardiovascular');
  assert.equal(mapMeasurementToSystem('systolic_bp').model, 'heart');
  assert.equal(mapMeasurementToSystem('diastolic_bp').id, 'cardiovascular');
  assert.equal(mapMeasurementToSystem('spo2').id, 'respiratory');
  assert.equal(mapMeasurementToSystem('spo2').model, 'lungs');
  assert.equal(mapMeasurementToSystem('blood_glucose').id, 'metabolic');
  assert.equal(mapMeasurementToSystem('body_temp').id, 'thermoregulation');
  assert.equal(mapMeasurementToSystem('body_mass').id, 'musculoskeletal');
  assert.equal(mapMeasurementToSystem('radiation').id, 'radiation_exposure');

  // No reviewed localization data exists, so every system carries a null localization.
  for (const id of ROW_IDS) {
    const system = mapMeasurementToSystem(id);
    assert.equal(system.localization, null, `${id} must not localize a region or lobe`);
    assert.match(system.relationship, /whole|not attribute|not localize|whole-body/i);
  }

  // Systems without an organ model stay text-only rather than inventing one.
  assert.equal(mapMeasurementToSystem('radiation').model, null);
  assert.equal(mapMeasurementToSystem('blood_glucose').model, null);
});

test('only non-nominal, non-missing readings become selectable findings', () => {
  const findings = buildOrganFindings([
    row({ id: 'resting_hr', status: 'green', statusLabel: 'Nominal' }),
    row({ id: 'systolic_bp', status: 'yellow', statusLabel: 'Monitor' }),
    row({ id: 'diastolic_bp', status: 'red', statusLabel: 'Medical Review' }),
    row({ id: 'spo2', status: 'orange', statusLabel: 'Caution' }),
    row({ id: 'body_temp', status: 'missing', latestNumeric: null, latestFormatted: 'MISSING' }),
  ]);

  assert.deepEqual(
    findings.map((finding) => finding.rowId),
    ['diastolic_bp', 'spo2', 'systolic_bp'],
    'findings are ordered by severity'
  );

  const spo2 = findings.find((finding) => finding.rowId === 'spo2');
  assert.ok(spo2);
  assert.equal(spo2!.system.label, 'Respiratory system');
  assert.equal(spo2!.modelLink, 'lungs');
  assert.ok(spo2!.flagRationale.length > 0);
  assert.ok(spo2!.escalationThreshold.length > 0);
  assert.equal(spo2!.system.localization, null);
  assert.ok(spo2!.limitations.some((limitation) => /not reprod|cannot|never/i.test(limitation)));

  assert.deepEqual(buildMissingMeasurementNames([row({ id: 'body_temp', status: 'missing' })]), ['body_temp']);
});

test('system status reflects the worst flagged measurement for that system', () => {
  const statuses = buildOrganSystemStatuses([
    row({ id: 'resting_hr', status: 'green' }),
    row({ id: 'systolic_bp', status: 'orange' }),
    row({ id: 'spo2', status: 'yellow' }),
    row({ id: 'body_temp', status: 'red' }),
  ]);
  assert.equal(statuses.cardiovascular, 'orange');
  assert.equal(statuses.respiratory, 'yellow');
});

test('heart timing prefers the simulated stream, then recorded data, then a demo pace', () => {
  const simulated = resolveHeartTiming({ simulatedHeartRateBpm: 72, recordedHeartRateBpm: 63 });
  assert.equal(simulated.source, 'simulated_stream');
  assert.equal(simulated.ratePerMinute, 72);
  assert.equal(Number(simulated.hertz.toFixed(2)), 1.2);
  assert.equal(simulated.isDemonstration, true);
  assert.match(simulated.sourceLabel, /simulated/i);

  const recorded = resolveHeartTiming({ simulatedHeartRateBpm: null, recordedHeartRateBpm: 63 });
  assert.equal(recorded.source, 'recorded_observation');
  assert.equal(Number(recorded.hertz.toFixed(3)), Number((63 / 60).toFixed(3)));
  assert.equal(recorded.isDemonstration, false);

  const demo = resolveHeartTiming({});
  assert.equal(demo.source, 'demonstration');
  assert.equal(demo.ratePerMinute, DEMONSTRATION_HEART_RATE_BPM);
  assert.match(demo.sourceLabel, /Demonstration/);

  // Absurd values are clamped so the animation cannot strobe, without changing the label.
  const clamped = resolveHeartTiming({ recordedHeartRateBpm: 600 });
  assert.ok(clamped.hertz <= 2.6);
  assert.equal(clamped.ratePerMinute, 600);
});

test('breathing rate uses a real respiratory observation, otherwise a labelled simulation', () => {
  assert.equal(recordedRespiratoryRateFrom({ respiratoryRateBpm: 14 } as never), 14);
  assert.equal(recordedRespiratoryRateFrom({ respiratoryRateBpm: null } as never), null);
  assert.equal(recordedRespiratoryRateFrom(null), null);

  const observed = resolveLungTiming({ recordedRespiratoryRatePerMin: 16 });
  assert.equal(observed.source, 'recorded_observation');
  assert.equal(observed.isDemonstration, false);
  assert.equal(observed.ratePerMinute, 16);

  const simulated = resolveLungTiming({});
  assert.equal(simulated.source, 'demonstration');
  assert.equal(simulated.isDemonstration, true);
  assert.equal(simulated.ratePerMinute, DEMONSTRATION_RESPIRATORY_RATE_PER_MIN);
  assert.match(simulated.sourceLabel, /Simulated demonstration/);

  // SpO₂ is not an input: a reading with only saturation still yields a demonstration rate.
  const onlySpo2 = { spo2Percent: 96 } as never;
  assert.equal(recordedRespiratoryRateFrom(onlySpo2), null);
  assert.equal(resolveLungTiming({ recordedRespiratoryRatePerMin: recordedRespiratoryRateFrom(onlySpo2) }).source, 'demonstration');
});

test('render mode falls back visibly, honours pause, reduced motion and visibility', () => {
  assert.equal(
    resolveOrganRenderMode({ webglAvailable: false, reducedMotion: false, paused: false, visible: true }),
    'fallback'
  );
  assert.equal(
    resolveOrganRenderMode({ webglAvailable: true, reducedMotion: true, paused: false, visible: true }),
    'static'
  );
  assert.equal(
    resolveOrganRenderMode({ webglAvailable: true, reducedMotion: false, paused: true, visible: true }),
    'static'
  );
  assert.equal(
    resolveOrganRenderMode({ webglAvailable: true, reducedMotion: false, paused: false, visible: false }),
    'static'
  );
  assert.equal(
    resolveOrganRenderMode({ webglAvailable: true, reducedMotion: false, paused: false, visible: true }),
    'animated'
  );
});

test('text equivalent states the source, the system and the disclaimer', () => {
  const heart = resolveHeartTiming({ recordedHeartRateBpm: 63 });
  const lungs = resolveLungTiming({ recordedRespiratoryRatePerMin: 14 });
  const [finding] = buildOrganFindings([row({ id: 'systolic_bp', status: 'orange', latestFormatted: '152 mmHg' })]);

  const text = describeOrganMotionText({
    organ: 'heart',
    heart,
    lungs,
    selectedFinding: finding,
    renderMode: 'animated',
  });

  assert.ok(text.includes(ORGAN_MOTION_DISCLAIMER));
  assert.match(text, /63 per minute/);
  assert.match(text, /14 breaths per minute/);
  assert.match(text, /Cardiovascular system/);
  assert.match(text, /not a disease location/i);
  assert.match(text, /Animation is running/);
});

test('the panel reads real flagged vitals without inventing localization', () => {
  const astronaut = SEED_ASTRONAUTS[0];
  const vitals = SEED_VITALS_BY_ASTRONAUT[astronaut.id];
  const rows = buildVitalReferenceRows(astronaut, vitals, vitals, 'metric');
  const findings = buildOrganFindings(rows);

  // Every finding maps to exactly one of the declared systems via the row id.
  for (const finding of findings) {
    assert.equal(finding.system.id, mapMeasurementToSystem(finding.rowId).id);
    assert.equal(finding.system.localization, null);
  }

  // Respiratory rate comes from the latest vital reading when the demo data carries one.
  const latest = vitals[vitals.length - 1];
  const rr = recordedRespiratoryRateFrom(latest);
  const timing = resolveLungTiming({ recordedRespiratoryRatePerMin: rr });
  assert.equal(timing.source, rr == null ? 'demonstration' : 'recorded_observation');
});
