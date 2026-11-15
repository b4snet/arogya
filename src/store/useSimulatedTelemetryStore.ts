import { create } from 'zustand';
import {
  SIMULATED_BP_SAMPLE_INTERVAL_TICKS,
  SIMULATED_SAMPLE_INTERVAL_MS,
  createSimulatedTelemetryEngine,
  pushBounded,
  simulatedBpForTick,
  type SimulatedBpSample,
  type SimulatedSample,
  type SimulatedTelemetryEngine,
} from '../utils/simulatedTelemetry';

/**
 * Demonstration telemetry store.
 *
 * Deliberately separate from `useArogyaStore`: nothing here is persisted and nothing here
 * is ever written into `vitalsByAstronaut`, so a simulated stream cannot alter recorded
 * observations, the assessment engine, or a generated medical report.
 *
 * The store is also the single owner of the update timer. `ensureInterval` is idempotent,
 * so mounting two subscribers, resuming, or returning to a hidden tab can never create a
 * second interval.
 */

export interface StartSimulationOptions {
  seed: number;
  baseHeartRateBpm: number;
  baseSpo2Percent: number;
  baseSystolicBpMmHg?: number;
  baseDiastolicBpMmHg?: number;
  startedAtMs?: number;
}

interface SimulatedTelemetryState {
  /** Stream is armed (may be temporarily suspended while the tab is hidden). */
  running: boolean;
  /** Page hidden — the interval is stopped but the stream is not ended by the user. */
  suspended: boolean;
  points: SimulatedSample[];
  bpSamples: SimulatedBpSample[];
  startedAtMs: number | null;
  astronautId: string | null;
}

interface SimulatedTelemetryActions {
  startSimulation: (options: StartSimulationOptions) => void;
  pauseSimulation: () => void;
  resumeSimulation: () => void;
  /** Ends the stream and clears the buffer (used on unmount). */
  stopSimulation: () => void;
  takeSimulatedBpReading: () => void;
  setPageHidden: (hidden: boolean) => void;
  ensureSubject: (astronautId: string, options: StartSimulationOptions) => void;
}

export type SimulatedTelemetryStore = SimulatedTelemetryState & SimulatedTelemetryActions;

let engine: SimulatedTelemetryEngine | null = null;
let intervalId: ReturnType<typeof setInterval> | null = null;
let lastBpTick = 0;
let activeOptions: StartSimulationOptions | null = null;

function stopInterval(): void {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function ensureInterval(): void {
  if (intervalId !== null) return;
  intervalId = setInterval(runTick, SIMULATED_SAMPLE_INTERVAL_MS);
}

function appendBpSample(tick: number, tMs: number): void {
  const options = activeOptions;
  if (!options) return;
  const { systolicBpMmHg, diastolicBpMmHg } = simulatedBpForTick(
    tick,
    options.baseSystolicBpMmHg ?? 118,
    options.baseDiastolicBpMmHg ?? 76
  );
  useSimulatedTelemetryStore.setState((state) => ({
    bpSamples: pushBounded(state.bpSamples, { tick, tMs, systolicBpMmHg, diastolicBpMmHg }),
  }));
}

function runTick(): void {
  const state = useSimulatedTelemetryStore.getState();
  if (!state.running) return;

  // Suspension is advisory and self-healing: if the document is visible again without a
  // visibilitychange event (which some embedded panes never deliver), sampling resumes
  // instead of leaving the stream permanently dead.
  let suspended = state.suspended;
  if (suspended && typeof document !== 'undefined' && document.visibilityState === 'visible') {
    suspended = false;
    useSimulatedTelemetryStore.setState({ suspended: false });
  }
  if (suspended) return;

  const sample = engine?.next();
  if (!sample) return;

  useSimulatedTelemetryStore.setState((prev) => ({
    points: pushBounded(prev.points, sample),
  }));

  // Blood pressure is intermittent: a new cuff sample only every 30 s (or on demand).
  if (sample.tick - lastBpTick >= SIMULATED_BP_SAMPLE_INTERVAL_TICKS) {
    lastBpTick = sample.tick;
    appendBpSample(sample.tick, sample.tMs);
  }
}

export const useSimulatedTelemetryStore = create<SimulatedTelemetryStore>()((set, get) => ({
  running: false,
  suspended: false,
  points: [],
  bpSamples: [],
  startedAtMs: null,
  astronautId: null,

  startSimulation: (options) => {
    stopInterval();
    activeOptions = options;
    lastBpTick = 0;
    const startedAtMs = options.startedAtMs ?? Date.now();
    engine = createSimulatedTelemetryEngine({ ...options, startedAtMs });
    set({ running: true, suspended: false, points: [], bpSamples: [], startedAtMs, astronautId: null });
    ensureInterval();
    runTick();
  },

  pauseSimulation: () => {
    stopInterval();
    set({ running: false });
  },

  resumeSimulation: () => {
    if (!engine) return;
    set({ running: true, suspended: false });
    ensureInterval();
  },

  stopSimulation: () => {
    stopInterval();
    engine = null;
    activeOptions = null;
    lastBpTick = 0;
    set({ running: false, suspended: false, points: [], bpSamples: [], startedAtMs: null, astronautId: null });
  },

  takeSimulatedBpReading: () => {
    const state = get();
    const latest = state.points[state.points.length - 1];
    const tick = latest?.tick ?? 0;
    const tMs = latest?.tMs ?? state.startedAtMs ?? Date.now();
    lastBpTick = tick;
    appendBpSample(tick, tMs);
  },

  setPageHidden: (hidden) => {
    // The interval is intentionally kept: the browser throttles hidden tabs on its own and
    // keeping one interval avoids a stop/start race that can strand the stream with no timer.
    set({ suspended: hidden });
    if (!hidden && get().running) ensureInterval();
  },

  ensureSubject: (astronautId, options) => {
    const current = get();
    if (current.astronautId === astronautId && (current.running || current.suspended)) return;
    stopInterval();
    activeOptions = options;
    lastBpTick = 0;
    const startedAtMs = options.startedAtMs ?? Date.now();
    engine = createSimulatedTelemetryEngine({ ...options, startedAtMs });
    set({ running: true, suspended: false, points: [], bpSamples: [], startedAtMs, astronautId });
    ensureInterval();
    runTick();
  },
}));

/** Test/debug helper: how many update intervals this module currently owns (0 or 1). */
export function getActiveSimulationIntervalCount(): number {
  return intervalId === null ? 0 : 1;
}
