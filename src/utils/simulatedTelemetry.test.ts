import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  SIMULATED_BUFFER_LIMIT,
  SIMULATED_DIASTOLIC_MAX_MMHG,
  SIMULATED_DIASTOLIC_MIN_MMHG,
  SIMULATED_HR_MAX_BPM,
  SIMULATED_HR_MIN_BPM,
  SIMULATED_SPO2_MAX_PERCENT,
  SIMULATED_SPO2_MIN_PERCENT,
  SIMULATED_SYSTOLIC_MAX_MMHG,
  SIMULATED_SYSTOLIC_MIN_MMHG,
  SIMULATION_SCENARIOS,
  circadianOffsetsForTime,
  createSimulatedTelemetryEngine,
  hashSeed,
  pushBounded,
  simulatedBpForTick,
  type SimulationScenarioId,
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

test('scenario presets shift the trace in the expected direction and stay bounded', () => {
  const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

  const collectScenario = (scenario: SimulationScenarioId) => {
    const engine = createSimulatedTelemetryEngine({
      seed: 77,
      baseHeartRateBpm: BASE_HR,
      baseSpo2Percent: BASE_SPO2,
      startedAtMs: 0,
      scenario,
    });
    return Array.from({ length: 600 }, () => engine.next());
  };

  const means = new Map<SimulationScenarioId, number>();
  for (const scenario of SIMULATION_SCENARIOS) {
    const samples = collectScenario(scenario.id);
    means.set(scenario.id, mean(samples.map((sample) => sample.heartRateBpm)));
    assert.ok(samples.every((sample) => sample.scenario === scenario.id));
    assert.ok(
      samples.every(
        (sample) =>
          sample.heartRateBpm >= SIMULATED_HR_MIN_BPM &&
          sample.heartRateBpm <= SIMULATED_HR_MAX_BPM
      )
    );
    assert.ok(
      samples.every(
        (sample) =>
          sample.spo2Percent >= SIMULATED_SPO2_MIN_PERCENT &&
          sample.spo2Percent <= SIMULATED_SPO2_MAX_PERCENT
      )
    );
  }

  assert.ok((means.get('exercise') ?? 0) > (means.get('high_workload') ?? 0));
  assert.ok((means.get('high_workload') ?? 0) > (means.get('nominal') ?? 0));
  assert.ok((means.get('nominal') ?? 0) > (means.get('sleep') ?? 0));
  assert.ok((means.get('synthetic_anomaly') ?? 0) > (means.get('nominal') ?? 0));
});

test('scenario switching is smooth and never steps the heart rate abruptly', () => {
  const engine = createSimulatedTelemetryEngine({
    seed: 314,
    baseHeartRateBpm: BASE_HR,
    baseSpo2Percent: BASE_SPO2,
    startedAtMs: 0,
    scenario: 'nominal',
  });

  for (let i = 0; i < 60; i += 1) engine.next();
  engine.setScenario('exercise');

  let previous = engine.next().heartRateBpm;
  let maxStep = 0;
  for (let i = 0; i < 300; i += 1) {
    const sample = engine.next();
    maxStep = Math.max(maxStep, Math.abs(sample.heartRateBpm - previous));
    previous = sample.heartRateBpm;
  }

  assert.ok(maxStep <= 4, `scenario switch produced a ${maxStep} bpm step`);
  assert.ok(previous > BASE_HR + 15, 'exercise scenario should elevate heart rate');
});

test('circadian phase gently raises the daytime baseline and lowers the overnight baseline', () => {
  const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const options = {
    seed: 2026,
    baseHeartRateBpm: BASE_HR,
    baseSpo2Percent: BASE_SPO2,
  };

  const morning = createSimulatedTelemetryEngine({
    ...options,
    startedAtMs: Date.UTC(2026, 0, 1, 4),
  });
  const afternoon = createSimulatedTelemetryEngine({
    ...options,
    startedAtMs: Date.UTC(2026, 0, 1, 16),
  });

  const morningSamples = Array.from({ length: 120 }, () => morning.next());
  const afternoonSamples = Array.from({ length: 120 }, () => afternoon.next());

  assert.ok(
    mean(afternoonSamples.map((sample) => sample.heartRateBpm)) -
      mean(morningSamples.map((sample) => sample.heartRateBpm)) >
      2
  );
  assert.ok(circadianOffsetsForTime(Date.UTC(2026, 0, 1, 16)).heartRateBpm > 2);
  assert.ok(circadianOffsetsForTime(Date.UTC(2026, 0, 1, 4)).heartRateBpm < -2);
});

test('scenario and circadian BP offsets are applied and remain inside hard bounds', () => {
  const base = simulatedBpForTick(30, 118, 76);
  const elevated = simulatedBpForTick(30, 118, 76, {
    systolicBpMmHg: 12,
    diastolicBpMmHg: 6,
  });

  assert.ok(elevated.systolicBpMmHg > base.systolicBpMmHg);
  assert.ok(elevated.diastolicBpMmHg > base.diastolicBpMmHg);

  for (let tick = 0; tick < 500; tick += 1) {
    const bp = simulatedBpForTick(tick, 118, 76, { systolicBpMmHg: 500, diastolicBpMmHg: 500 });
    assert.ok(
      bp.systolicBpMmHg >= SIMULATED_SYSTOLIC_MIN_MMHG &&
        bp.systolicBpMmHg <= SIMULATED_SYSTOLIC_MAX_MMHG
    );
    assert.ok(
      bp.diastolicBpMmHg >= SIMULATED_DIASTOLIC_MIN_MMHG &&
        bp.diastolicBpMmHg <= SIMULATED_DIASTOLIC_MAX_MMHG
    );
  }

  const engine = createSimulatedTelemetryEngine({
    seed: 5,
    baseHeartRateBpm: BASE_HR,
    baseSpo2Percent: BASE_SPO2,
    startedAtMs: 0,
    scenario: 'exercise',
  });
  for (let i = 0; i < 120; i += 1) engine.next();
  const offsets = engine.getBpOffsets();
  assert.ok(offsets.systolicBpMmHg > 5);
  assert.ok(offsets.diastolicBpMmHg > 2);
});
