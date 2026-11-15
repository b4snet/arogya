import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  WAVEFORM_PROVENANCE_LABELS,
  buildWaveformPoints,
  clampWaveformRate,
  ecgWaveform,
  plethWaveform,
  waveformSample,
} from './vitalWaveforms';

test('ecg waveform peaks at the R wave and stays bounded', () => {
  const values = buildWaveformPoints('ecg', 2, 256).map((point) => point.value);
  const peak = Math.max(...values);
  assert.ok(peak > 0.85, 'R wave should be the dominant positive deflection');
  assert.ok(peak <= 1.05, 'waveform must remain normalized');
  assert.ok(Math.min(...values) > -0.4, 'waveform must not swing wildly negative');
  assert.ok(ecgWaveform(0.3) > ecgWaveform(0.5), 'R peak precedes the T wave');
});

test('pleth waveform is normalized and rises before it falls', () => {
  for (let phase = 0; phase < 1; phase += 0.01) {
    const value = plethWaveform(phase);
    assert.ok(value >= 0 && value <= 1, `pleth sample out of range at ${phase}`);
  }
  assert.ok(plethWaveform(0.26) > plethWaveform(0.75), 'systolic peak exceeds the diastolic runoff');
});

test('waveform phase wraps without discontinuity', () => {
  assert.ok(Math.abs(ecgWaveform(-0.001) - ecgWaveform(0.999)) < 1e-3);
  assert.ok(Math.abs(plethWaveform(2.001) - plethWaveform(0.001)) < 1e-3);
  assert.equal(ecgWaveform(Number.NaN), ecgWaveform(0));
});

test('waveform sample dispatches by kind', () => {
  assert.equal(waveformSample('ecg', 0.3), ecgWaveform(0.3));
  assert.equal(waveformSample('pleth', 0.3), plethWaveform(0.3));
});

test('clampWaveformRate bounds the animation frequency', () => {
  assert.equal(clampWaveformRate(0), 1);
  assert.equal(clampWaveformRate(Number.NaN), 1);
  assert.equal(clampWaveformRate(-12), 1);
  assert.equal(clampWaveformRate(30), 0.5);
  assert.equal(clampWaveformRate(60), 1);
  assert.equal(clampWaveformRate(600), 3);
});

test('provenance labels never imply a recorded waveform', () => {
  assert.match(WAVEFORM_PROVENANCE_LABELS.simulated, /demonstration only/i);
  assert.match(WAVEFORM_PROVENANCE_LABELS.illustrative, /no measurement recorded/i);
  assert.match(WAVEFORM_PROVENANCE_LABELS.recorded, /illustrative/i);
  for (const label of Object.values(WAVEFORM_PROVENANCE_LABELS)) {
    assert.doesNotMatch(label, /diagnos|real[- ]time|clinical/i);
  }
});
