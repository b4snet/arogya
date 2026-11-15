import assert from 'node:assert/strict';
import { afterEach, test, vi } from 'vitest';
import {
  getActiveSimulationIntervalCount,
  useSimulatedTelemetryStore,
} from './useSimulatedTelemetryStore';
import { useArogyaStore } from './useArogyaStore';
import { SIMULATED_BUFFER_LIMIT } from '../utils/simulatedTelemetry';

const START_OPTIONS = {
  seed: 20261115,
  baseHeartRateBpm: 62,
  baseSpo2Percent: 98,
  baseSystolicBpMmHg: 118,
  baseDiastolicBpMmHg: 76,
  startedAtMs: 0,
};

afterEach(() => {
  useSimulatedTelemetryStore.getState().stopSimulation();
  vi.useRealTimers();
});

test('simulated samples never enter recorded observations', () => {
  const before = JSON.stringify(useArogyaStore.getState().vitalsByAstronaut);

  vi.useFakeTimers();
  useSimulatedTelemetryStore.getState().startSimulation(START_OPTIONS);
  vi.advanceTimersByTime(5000);

  const simulation = useSimulatedTelemetryStore.getState();
  assert.ok(simulation.points.length >= 5);
  assert.ok(simulation.points.every((point) => point.heartRateBpm > 0));

  // The recorded mission record is byte-for-byte unchanged and the two stores stay separate.
  assert.equal(JSON.stringify(useArogyaStore.getState().vitalsByAstronaut), before);
  assert.equal(
    'vitalsByAstronaut' in (simulation as unknown as Record<string, unknown>),
    false
  );
});

test('one interval owner: repeated start, resume and visibility flips never duplicate timers', () => {
  vi.useFakeTimers();
  const store = useSimulatedTelemetryStore.getState();

  store.startSimulation(START_OPTIONS);
  assert.equal(getActiveSimulationIntervalCount(), 1);

  store.startSimulation(START_OPTIONS);
  assert.equal(getActiveSimulationIntervalCount(), 1);

  store.pauseSimulation();
  assert.equal(getActiveSimulationIntervalCount(), 0);

  store.resumeSimulation();
  store.resumeSimulation();
  assert.equal(getActiveSimulationIntervalCount(), 1);

  // Hiding the tab suspends sampling but must not strand the stream without a timer.
  store.setPageHidden(true);
  assert.equal(getActiveSimulationIntervalCount(), 1);

  store.setPageHidden(false);
  assert.equal(getActiveSimulationIntervalCount(), 1);

  const pointsWhileRunning = useSimulatedTelemetryStore.getState().points.length;
  vi.advanceTimersByTime(3000);
  assert.ok(useSimulatedTelemetryStore.getState().points.length > pointsWhileRunning);
});

test('a paused or hidden tab does not accumulate samples', () => {
  vi.useFakeTimers();
  const store = useSimulatedTelemetryStore.getState();
  store.startSimulation(START_OPTIONS);

  store.pauseSimulation();
  const pausedCount = useSimulatedTelemetryStore.getState().points.length;
  vi.advanceTimersByTime(10_000);
  assert.equal(useSimulatedTelemetryStore.getState().points.length, pausedCount);

  store.resumeSimulation();
  store.setPageHidden(true);
  const hiddenCount = useSimulatedTelemetryStore.getState().points.length;
  vi.advanceTimersByTime(10_000);
  assert.equal(useSimulatedTelemetryStore.getState().points.length, hiddenCount);
});

test('the rolling replay buffer stays bounded and timestamps stay one second apart', () => {
  vi.useFakeTimers();
  useSimulatedTelemetryStore.getState().startSimulation(START_OPTIONS);
  vi.advanceTimersByTime((SIMULATED_BUFFER_LIMIT + 60) * 1000);

  const { points } = useSimulatedTelemetryStore.getState();
  assert.equal(points.length, SIMULATED_BUFFER_LIMIT);
  for (let i = 1; i < points.length; i += 1) {
    assert.equal(points[i].tMs - points[i - 1].tMs, 1000);
  }
});

test('stopping clears the buffer and releases the timer', () => {
  vi.useFakeTimers();
  const store = useSimulatedTelemetryStore.getState();
  store.startSimulation(START_OPTIONS);
  vi.advanceTimersByTime(4000);

  store.stopSimulation();
  const state = useSimulatedTelemetryStore.getState();
  assert.equal(getActiveSimulationIntervalCount(), 0);
  assert.equal(state.points.length, 0);
  assert.equal(state.bpSamples.length, 0);
  assert.equal(state.running, false);
});

test('a shared stream survives route-owner unmount and subject changes reset its buffer', () => {
  vi.useFakeTimers();
  const store = useSimulatedTelemetryStore.getState();
  store.ensureSubject('AST-01', START_OPTIONS);
  vi.advanceTimersByTime(2000);
  const priorCount = useSimulatedTelemetryStore.getState().points.length;
  // Route unmount does not call stop or pause; the single owner remains active.
  assert.equal(useSimulatedTelemetryStore.getState().running, true);
  assert.equal(getActiveSimulationIntervalCount(), 1);
  vi.advanceTimersByTime(1000);
  assert.ok(useSimulatedTelemetryStore.getState().points.length > priorCount);

  store.ensureSubject('AST-02', { ...START_OPTIONS, seed: START_OPTIONS.seed + 1 });
  const changed = useSimulatedTelemetryStore.getState();
  assert.equal(changed.astronautId, 'AST-02');
  assert.equal(changed.points.length, 1);
  assert.equal(getActiveSimulationIntervalCount(), 1);
});

test('blood pressure is intermittent, timestamped, and also available on demand', () => {
  vi.useFakeTimers();
  const store = useSimulatedTelemetryStore.getState();
  store.startSimulation(START_OPTIONS);

  // Nothing every second: at ~5 s only the initial on-demand-free window has no cuff sample yet.
  vi.advanceTimersByTime(5000);
  assert.equal(useSimulatedTelemetryStore.getState().bpSamples.length, 0);

  // First automatic cuff sample after the 30 s cadence.
  vi.advanceTimersByTime(26_000);
  const auto = useSimulatedTelemetryStore.getState().bpSamples;
  assert.equal(auto.length, 1);
  const sampleAtBpTick = useSimulatedTelemetryStore
    .getState()
    .points.find((point) => point.tick === auto[0].tick);
  assert.equal(auto[0].tMs, sampleAtBpTick?.tMs);

  // Explicit "Take simulated reading" adds its own timestamped sample.
  vi.advanceTimersByTime(3000);
  store.takeSimulatedBpReading();
  const afterManual = useSimulatedTelemetryStore.getState().bpSamples;
  assert.equal(afterManual.length, 2);
  assert.notEqual(afterManual[1].tMs, afterManual[0].tMs);
});

test('replaying the same seed reproduces the same demonstration values', () => {
  vi.useFakeTimers();
  const store = useSimulatedTelemetryStore.getState();

  store.startSimulation(START_OPTIONS);
  vi.advanceTimersByTime(6000);
  const first = useSimulatedTelemetryStore.getState().points.map((p) => ({
    hr: p.heartRateBpm,
    spo2: p.spo2Percent,
  }));

  store.startSimulation(START_OPTIONS);
  vi.advanceTimersByTime(6000);
  const second = useSimulatedTelemetryStore.getState().points.map((p) => ({
    hr: p.heartRateBpm,
    spo2: p.spo2Percent,
  }));

  assert.deepEqual(first, second);
});
