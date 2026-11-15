import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  SIMULATED_BUFFER_LIMIT,
  createSimulatedTelemetryEngine,
  hashSeed,
  pushBounded,
  simulatedBpForTick,
} from './simulatedTelemetry';

const BASE_HR = 62;
const BASE_SPO2 = 98;

function collect(seed: number, count: number) {
  const engine = createSimulatedTelemetryEngine({
    seed,
    baseHeartRateBpm: BASE_HR,
    baseSpo2Percent: BASE_SPO2,
    startedAtMs: 1_000_000,
  });
  return Array.from({ length: count }, () => engine.next());
}

test('the same seed always replays the same demonstration stream', () => {
  assert.deepEqual(collect(1234, 40), collect(1234, 40));
  assert.notDeepEqual(collect(1234, 40), collect(9999, 40));
  assert.equal(hashSeed('AST-01'), hashSeed('AST-01'));
  assert.notEqual(hashSeed('AST-01'), hashSeed('AST-02'));
});

test('samples stay bounded, move gently, and SpO2 follows heart rate inversely', () => {
  const samples = collect(42, 400);

  const heartRates = samples.map((s) => s.heartRateBpm);
  const spo2Values = samples.map((s) => s.spo2Percent);

  assert.ok(heartRates.every((hr) => hr >= BASE_HR - 6 && hr <= BASE_HR + 9));
  assert.ok(spo2Values.every((spo2) => spo2 >= 95 && spo2 <= 100));

  for (let i = 1; i < samples.length; i += 1) {
    assert.ok(
      Math.abs(samples[i].heartRateBpm - samples[i - 1].heartRateBpm) <= 2,
      'heart rate must not jump between independent random values'
    );
  }

  const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;
  const hrMean = mean(heartRates);
  const spo2Mean = mean(spo2Values);
  const covariance = samples.reduce(
    (sum, s) => sum + (s.heartRateBpm - hrMean) * (s.spo2Percent - spo2Mean),
    0
  );
  assert.ok(covariance < 0, 'saturation should drift gently against heart rate');
});

test('each sample carries its own timestamp one interval after the previous one', () => {
  const samples = collect(7, 5);
  assert.equal(samples[0].tMs, 1_000_000 + 1000);
  for (let i = 1; i < samples.length; i += 1) {
    assert.equal(samples[i].tMs - samples[i - 1].tMs, 1000);
    assert.equal(samples[i].tick, samples[i - 1].tick + 1);
  }
});

test('the rolling buffer stays bounded and keeps the newest samples', () => {
  let buffer: Array<{ tick: number }> = [];
  for (let tick = 1; tick <= SIMULATED_BUFFER_LIMIT + 40; tick += 1) {
    buffer = pushBounded(buffer, { tick }, SIMULATED_BUFFER_LIMIT);
  }
  assert.equal(buffer.length, SIMULATED_BUFFER_LIMIT);
  assert.equal(buffer[buffer.length - 1].tick, SIMULATED_BUFFER_LIMIT + 40);
  assert.equal(buffer[0].tick, 41);
});

test('intermittent simulated blood pressure is deterministic and gently bounded', () => {
  const first = simulatedBpForTick(30, 118, 76);
  assert.deepEqual(first, simulatedBpForTick(30, 118, 76));

  for (let tick = 0; tick < 200; tick += 1) {
    const bp = simulatedBpForTick(tick, 118, 76);
    assert.ok(bp.systolicBpMmHg >= 115 && bp.systolicBpMmHg <= 121);
    assert.ok(bp.diastolicBpMmHg >= 74 && bp.diastolicBpMmHg <= 78);
  }
});
