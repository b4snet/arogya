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
  useSimulatedTelemetryStore.setState({
    timeline: [],
    scenario: 'nominal',
    speed: 1,
    durationMinutes: 15,
  });
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

test('speed accelerates the simulated clock without changing sample spacing', () => {
  vi.useFakeTimers();
  const store = useSimulatedTelemetryStore.getState();
  store.startSimulation({ ...START_OPTIONS, speed: 4 });

  vi.advanceTimersByTime(4000);
  const points = useSimulatedTelemetryStore.getState().points;
  assert.ok(points.length >= 15, `expected ≥15 simulated seconds, got ${points.length}`);
  for (let i = 1; i < points.length; i += 1) {
    assert.equal(points[i].tMs - points[i - 1].tMs, 1000);
    assert.equal(points[i].tick, points[i - 1].tick + 1);
  }

  store.pauseSimulation();
  const pausedCount = useSimulatedTelemetryStore.getState().points.length;
  vi.advanceTimersByTime(5000);
  assert.equal(useSimulatedTelemetryStore.getState().points.length, pausedCount);
});

test('scenario switching updates the engine, timeline, and audit trail', () => {
  vi.useFakeTimers();
  const store = useSimulatedTelemetryStore.getState();
  store.startSimulation({ ...START_OPTIONS, scenario: 'nominal' });
  vi.advanceTimersByTime(10_000);

  const initialHeartRate = useSimulatedTelemetryStore.getState().points.at(-1)?.heartRateBpm ?? 0;
  store.setSimulationScenario('exercise');

  const switched = useSimulatedTelemetryStore.getState();
  assert.equal(switched.scenario, 'exercise');
  const activeSession = switched.sessions.at(-1);
  assert.equal(activeSession?.scenario, 'exercise');
  assert.equal(switched.timeline.at(-1)?.type, 'scenario');
  assert.match(switched.timeline.at(-1)?.label ?? '', /Exercise/);
  assert.equal(activeSession?.events.at(-1)?.type, 'scenario');

  vi.advanceTimersByTime(20_000);
  const elevatedHeartRate =
    useSimulatedTelemetryStore.getState().points.at(-1)?.heartRateBpm ?? 0;
  assert.ok(
    elevatedHeartRate > initialHeartRate + 4,
    `expected exercise to raise simulated HR (${initialHeartRate} → ${elevatedHeartRate})`
  );
});

test('pause, resume, and reset update status and preserve the audit markers', () => {
  vi.useFakeTimers();
  const store = useSimulatedTelemetryStore.getState();
  store.startSimulation(START_OPTIONS);
  vi.advanceTimersByTime(3000);

  store.pauseSimulation();
  let state = useSimulatedTelemetryStore.getState();
  assert.equal(state.status, 'paused');
  assert.equal(state.running, false);
  assert.equal(state.sessions.at(-1)?.status, 'paused');
  assert.equal(state.sessions.at(-1)?.events.at(-1)?.type, 'pause');
  assert.equal(state.timeline.at(-1)?.type, 'pause');

  const pausedCount = state.points.length;
  vi.advanceTimersByTime(5000);
  assert.equal(useSimulatedTelemetryStore.getState().points.length, pausedCount);

  store.resumeSimulation();
  state = useSimulatedTelemetryStore.getState();
  assert.equal(state.status, 'running');
  assert.equal(state.running, true);
  assert.equal(state.sessions.at(-1)?.events.at(-1)?.type, 'resume');
  vi.advanceTimersByTime(2000);
  assert.ok(useSimulatedTelemetryStore.getState().points.length > pausedCount);

  store.resetSimulation();
  state = useSimulatedTelemetryStore.getState();
  assert.equal(state.status, 'idle');
  assert.equal(state.running, false);
  assert.equal(state.points.length, 0);
  assert.equal(state.bpSamples.length, 0);
  assert.equal(getActiveSimulationIntervalCount(), 0);
  assert.equal(state.sessions.at(-1)?.status, 'reset');
  assert.equal(state.sessions.at(-1)?.events.at(-1)?.type, 'reset');
  assert.equal(state.timeline.at(-1)?.type, 'reset');
});

test('a session completes at the selected simulated duration', () => {
  vi.useFakeTimers();
  const store = useSimulatedTelemetryStore.getState();
  store.startSimulation({ ...START_OPTIONS, speed: 4, durationMinutes: 5 });
  vi.advanceTimersByTime(76_000);

  const state = useSimulatedTelemetryStore.getState();
  assert.equal(state.status, 'completed');
  assert.equal(state.running, false);
  assert.equal(getActiveSimulationIntervalCount(), 0);
  assert.equal(state.points.at(-1)?.tick, 300);
  assert.equal(state.sessions.at(-1)?.status, 'completed');
  assert.equal(state.sessions.at(-1)?.events.at(-1)?.type, 'complete');
  assert.equal(state.timeline.at(-1)?.type, 'complete');
});

test('scenario, speed, and duration changes are recorded on the active session', () => {
  vi.useFakeTimers();
  const store = useSimulatedTelemetryStore.getState();
  store.startSimulation(START_OPTIONS);

  store.setSimulationScenario('sleep');
  store.setSimulationSpeed(2);
  store.setSimulationDuration(30);

  const state = useSimulatedTelemetryStore.getState();
  const session = state.sessions.at(-1);
  assert.equal(session?.scenario, 'sleep');
  assert.equal(session?.speed, 2);
  assert.equal(session?.durationMinutes, 30);
  assert.equal(session?.events.at(-1)?.type, 'duration');
  assert.equal(state.timeline.at(-1)?.type, 'duration');
  assert.equal(getActiveSimulationIntervalCount(), 1);
});

test('timeline events retain the crew assignment for mission-feed attribution', () => {
  vi.useFakeTimers();
  const store = useSimulatedTelemetryStore.getState();

  store.startSimulation({ ...START_OPTIONS, astronautId: 'AST-01' });
  store.setSimulationScenario('exercise');
  store.pauseSimulation();
  store.resumeSimulation();
  store.resetSimulation();

  const state = useSimulatedTelemetryStore.getState();
  assert.ok(state.timeline.length >= 5);
  assert.ok(state.timeline.every((event) => event.astronautId === 'AST-01'));
  assert.deepEqual(
    state.timeline.map((event) => event.type),
    ['start', 'scenario', 'pause', 'resume', 'reset']
  );
  assert.equal(state.astronautId, null);
});

test('an idle scenario selection is retained as an unassigned timeline setting', () => {
  const store = useSimulatedTelemetryStore.getState();
  store.setSimulationScenario('sleep');

  const state = useSimulatedTelemetryStore.getState();
  const event = state.timeline.at(-1);
  assert.equal(state.status, 'idle');
  assert.equal(event?.type, 'scenario');
  assert.equal(event?.label, 'Scenario → Sleep');
  assert.equal(event?.astronautId, null);
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
