import { create } from 'zustand';
import {
  SIMULATED_BP_SAMPLE_INTERVAL_TICKS,
  SIMULATED_SAMPLE_INTERVAL_MS,
  createSimulatedTelemetryEngine,
  getSimulationScenario,
  pushBounded,
  simulatedBpForTick,
  type SimulationDurationMinutes,
  type SimulationScenarioId,
  type SimulationSpeed,
  type SimulatedBpSample,
  type SimulatedSample,
  type SimulatedTelemetryEngine,
} from '../utils/simulatedTelemetry';

/**
 * Demonstration telemetry store.
 *
 * Deliberately separate from `useArogyaStore`: nothing here is persisted and nothing here
 * is ever written into `vitalsByAstronaut`, so a simulated stream cannot alter recorded
 * observations, the assessment engine, or a generated medical report. The audit trail and
 * event timeline also stay in memory and are never exported with clinical data.
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
  scenario?: SimulationScenarioId;
  speed?: SimulationSpeed;
  durationMinutes?: SimulationDurationMinutes;
  /** Crew profile this demonstration stream belongs to. */
  astronautId?: string;
}

export type SimulationStatus = 'idle' | 'running' | 'paused' | 'completed';
export type SimulationSessionStatus = 'running' | 'paused' | 'completed' | 'reset';

export type SimulationEventType =
  | 'start'
  | 'scenario'
  | 'speed'
  | 'duration'
  | 'pause'
  | 'resume'
  | 'reset'
  | 'complete'
  | 'bp';

export interface SimulationAuditEvent {
  id: string;
  type: SimulationEventType;
  label: string;
  atMs: number;
  atIso: string;
  simulatedSecond: number;
  scenario: SimulationScenarioId;
  speed: SimulationSpeed;
}

export interface SimulationTimelineEvent {
  id: string;
  type: SimulationEventType;
  label: string;
  atMs: number;
  atIso: string;
  simulatedSecond: number;
  scenario: SimulationScenarioId;
  /** Crew profile the event belongs to; null only for an unassigned stream. */
  astronautId: string | null;
}

export interface SimulationSessionAudit {
  id: string;
  scenario: SimulationScenarioId;
  startedAtMs: number;
  startedAtIso: string;
  durationMinutes: SimulationDurationMinutes;
  speed: SimulationSpeed;
  status: SimulationSessionStatus;
  events: SimulationAuditEvent[];
}

const SESSION_LIMIT = 8;
const EVENT_LIMIT = 24;
const TIMELINE_LIMIT = 30;

interface SimulatedTelemetryState {
  /** Stream is armed (may be temporarily suspended while the tab is hidden). */
  running: boolean;
  /** Page hidden — the interval is stopped but the stream is not ended by the user. */
  suspended: boolean;
  status: SimulationStatus;
  scenario: SimulationScenarioId;
  speed: SimulationSpeed;
  durationMinutes: SimulationDurationMinutes;
  points: SimulatedSample[];
  bpSamples: SimulatedBpSample[];
  startedAtMs: number | null;
  astronautId: string | null;
  sessions: SimulationSessionAudit[];
  timeline: SimulationTimelineEvent[];
}

interface SimulatedTelemetryActions {
  startSimulation: (options: StartSimulationOptions) => void;
  pauseSimulation: () => void;
  resumeSimulation: () => void;
  /** Ends the active session, clears the buffers, and appends a reset audit marker. */
  resetSimulation: () => void;
  /** Backwards-compatible alias for resetSimulation. */
  stopSimulation: () => void;
  setSimulationScenario: (scenario: SimulationScenarioId) => void;
  setSimulationSpeed: (speed: SimulationSpeed) => void;
  setSimulationDuration: (durationMinutes: SimulationDurationMinutes) => void;
  takeSimulatedBpReading: () => void;
  setPageHidden: (hidden: boolean) => void;
  ensureSubject: (astronautId: string, options: StartSimulationOptions) => void;
}

export type SimulatedTelemetryStore = SimulatedTelemetryState & SimulatedTelemetryActions;

let engine: SimulatedTelemetryEngine | null = null;
let intervalId: ReturnType<typeof setInterval> | null = null;
let lastBpTick = 0;
let activeOptions: StartSimulationOptions | null = null;
let activeSessionId: string | null = null;
let idSequence = 0;

function nextId(prefix: string): string {
  idSequence += 1;
  return `${prefix}-${idSequence}`;
}

function stopInterval(): void {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function ensureInterval(): void {
  if (intervalId !== null) return;
  const speed = useSimulatedTelemetryStore.getState().speed;
  intervalId = setInterval(runTick, SIMULATED_SAMPLE_INTERVAL_MS / speed);
}

function latestSimulatedSecond(): number {
  const points = useSimulatedTelemetryStore.getState().points;
  return points[points.length - 1]?.tick ?? 0;
}

function makeAuditEvent(
  type: SimulationEventType,
  label: string,
  atMs: number,
  simulatedSecond: number,
  scenario: SimulationScenarioId,
  speed: SimulationSpeed
): SimulationAuditEvent {
  return {
    id: nextId('event'),
    type,
    label,
    atMs,
    atIso: new Date(atMs).toISOString(),
    simulatedSecond,
    scenario,
    speed,
  };
}

function appendAuditEvent(type: SimulationEventType, label: string): void {
  if (!activeSessionId) return;
  const state = useSimulatedTelemetryStore.getState();
  const sessionId = activeSessionId;
  const event = makeAuditEvent(
    type,
    label,
    Date.now(),
    latestSimulatedSecond(),
    state.scenario,
    state.speed
  );
  useSimulatedTelemetryStore.setState((prev) => ({
    sessions: prev.sessions.map((session) =>
      session.id === sessionId
        ? { ...session, events: pushBounded(session.events, event, EVENT_LIMIT) }
        : session
    ),
  }));
}

function appendTimeline(
  type: SimulationEventType,
  label: string,
  scenario: SimulationScenarioId,
  atMs = Date.now(),
  simulatedSecond = latestSimulatedSecond()
): void {
  const event: SimulationTimelineEvent = {
    id: nextId('timeline'),
    type,
    label,
    atMs,
    atIso: new Date(atMs).toISOString(),
    simulatedSecond,
    scenario,
    astronautId: useSimulatedTelemetryStore.getState().astronautId,
  };
  useSimulatedTelemetryStore.setState((state) => ({
    timeline: pushBounded(state.timeline, event, TIMELINE_LIMIT),
  }));
}

function beginSession(
  startedAtMs: number,
  scenario: SimulationScenarioId,
  speed: SimulationSpeed,
  durationMinutes: SimulationDurationMinutes
): void {
  const event = makeAuditEvent('start', 'Session started', startedAtMs, 0, scenario, speed);
  const session: SimulationSessionAudit = {
    id: nextId('session'),
    scenario,
    startedAtMs,
    startedAtIso: new Date(startedAtMs).toISOString(),
    durationMinutes,
    speed,
    status: 'running',
    events: [event],
  };
  activeSessionId = session.id;
  appendTimeline('start', 'Session started', scenario, startedAtMs, 0);
  useSimulatedTelemetryStore.setState((state) => ({
    sessions: pushBounded(state.sessions, session, SESSION_LIMIT),
  }));
}

function endActiveSession(
  status: SimulationSessionStatus,
  type: SimulationEventType,
  label: string,
  atMs = Date.now(),
  simulatedSecond = latestSimulatedSecond()
): void {
  if (!activeSessionId) return;
  const sessionId = activeSessionId;
  const state = useSimulatedTelemetryStore.getState();
  const event = makeAuditEvent(
    type,
    label,
    atMs,
    simulatedSecond,
    state.scenario,
    state.speed
  );
  activeSessionId = null;
  useSimulatedTelemetryStore.setState((prev) => ({
    sessions: prev.sessions.map((session) =>
      session.id === sessionId
        ? {
            ...session,
            status,
            events: pushBounded(session.events, event, EVENT_LIMIT),
          }
        : session
    ),
  }));
  appendTimeline(type, label, state.scenario, atMs, simulatedSecond);
}

function appendBpSample(tick: number, tMs: number): void {
  const options = activeOptions;
  if (!options) return;
  const { systolicBpMmHg, diastolicBpMmHg } = simulatedBpForTick(
    tick,
    options.baseSystolicBpMmHg ?? 118,
    options.baseDiastolicBpMmHg ?? 76,
    engine?.getBpOffsets()
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

  // Blood pressure is intermittent: a new cuff sample only every 30 simulated seconds (or on demand).
  if (sample.tick - lastBpTick >= SIMULATED_BP_SAMPLE_INTERVAL_TICKS) {
    lastBpTick = sample.tick;
    appendBpSample(sample.tick, sample.tMs);
  }

  if (sample.tick >= state.durationMinutes * 60) {
    stopInterval();
    useSimulatedTelemetryStore.setState({ running: false, status: 'completed' });
    endActiveSession(
      'completed',
      'complete',
      'Simulation duration reached',
      Date.now(),
      sample.tick
    );
  }
}

function startSimulationInternal(
  options: StartSimulationOptions,
  astronautId: string | null
): void {
  const state = useSimulatedTelemetryStore.getState();
  if (activeSessionId) {
    endActiveSession('reset', 'reset', 'Session ended (restarted)');
  }
  stopInterval();

  const scenario = options.scenario ?? state.scenario;
  const speed = options.speed ?? state.speed;
  const durationMinutes = options.durationMinutes ?? state.durationMinutes;
  const startedAtMs = options.startedAtMs ?? Date.now();

  activeOptions = options;
  lastBpTick = 0;
  engine = createSimulatedTelemetryEngine({ ...options, startedAtMs, scenario });

  useSimulatedTelemetryStore.setState({
    running: true,
    suspended: false,
    status: 'running',
    scenario,
    speed,
    durationMinutes,
    points: [],
    bpSamples: [],
    startedAtMs,
    astronautId,
  });

  beginSession(startedAtMs, scenario, speed, durationMinutes);
  ensureInterval();
  runTick();
}

export const useSimulatedTelemetryStore = create<SimulatedTelemetryStore>()((set, get) => ({
  running: false,
  suspended: false,
  status: 'idle',
  scenario: 'nominal',
  speed: 1,
  durationMinutes: 15,
  points: [],
  bpSamples: [],
  startedAtMs: null,
  astronautId: null,
  sessions: [],
  timeline: [],

  startSimulation: (options) => {
    startSimulationInternal(options, options.astronautId ?? null);
  },

  pauseSimulation: () => {
    if (get().status !== 'running') return;
    stopInterval();
    set({ running: false, status: 'paused' });
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === activeSessionId ? { ...session, status: 'paused' } : session
      ),
    }));
    appendAuditEvent('pause', 'Paused');
    appendTimeline('pause', 'Paused', get().scenario);
  },

  resumeSimulation: () => {
    if (get().status !== 'paused' || !engine) return;
    set({ running: true, suspended: false, status: 'running' });
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === activeSessionId ? { ...session, status: 'running' } : session
      ),
    }));
    appendAuditEvent('resume', 'Resumed');
    appendTimeline('resume', 'Resumed', get().scenario);
    ensureInterval();
  },

  resetSimulation: () => {
    const state = get();
    stopInterval();
    engine = null;
    activeOptions = null;
    lastBpTick = 0;

    if (activeSessionId) {
      endActiveSession('reset', 'reset', 'Session reset');
    } else if (state.status !== 'idle' || state.points.length > 0) {
      appendTimeline(
        'reset',
        'Session reset',
        state.scenario,
        Date.now(),
        state.points[state.points.length - 1]?.tick ?? 0
      );
    }

    set({
      running: false,
      suspended: false,
      status: 'idle',
      points: [],
      bpSamples: [],
      startedAtMs: null,
      astronautId: null,
    });
  },

  stopSimulation: () => {
    get().resetSimulation();
  },

  setSimulationScenario: (scenario) => {
    const state = get();
    if (state.scenario === scenario) return;
    set({ scenario });
    engine?.setScenario(scenario);
    const label = `Scenario → ${getSimulationScenario(scenario).label}`;

    if (activeSessionId) {
      set((prev) => ({
        sessions: prev.sessions.map((session) =>
          session.id === activeSessionId ? { ...session, scenario } : session
        ),
      }));
      appendAuditEvent('scenario', label);
    }

    // Scenario selection is a simulation setting, so it stays in the timeline even when no
    // session is active. The feed treats unassigned scenario events as global settings.
    appendTimeline('scenario', label, scenario);
  },

  setSimulationSpeed: (speed) => {
    const state = get();
    if (state.speed === speed) return;
    set({ speed });
    if (state.running) {
      stopInterval();
      ensureInterval();
    }

    if (activeSessionId) {
      set((prev) => ({
        sessions: prev.sessions.map((session) =>
          session.id === activeSessionId ? { ...session, speed } : session
        ),
      }));
      const label = `Speed → ${speed}×`;
      appendAuditEvent('speed', label);
      appendTimeline('speed', label, get().scenario);
    }
  },

  setSimulationDuration: (durationMinutes) => {
    const state = get();
    if (state.durationMinutes === durationMinutes) return;
    set({ durationMinutes });

    if (activeSessionId) {
      set((prev) => ({
        sessions: prev.sessions.map((session) =>
          session.id === activeSessionId ? { ...session, durationMinutes } : session
        ),
      }));
      const label = `Duration → ${durationMinutes} min`;
      appendAuditEvent('duration', label);
      appendTimeline('duration', label, get().scenario);
    }
  },

  takeSimulatedBpReading: () => {
    const state = get();
    const latest = state.points[state.points.length - 1];
    const tick = latest?.tick ?? 0;
    const tMs = latest?.tMs ?? state.startedAtMs ?? Date.now();
    lastBpTick = tick;
    appendBpSample(tick, tMs);
    appendAuditEvent('bp', 'Simulated BP reading');
  },

  setPageHidden: (hidden) => {
    // The interval is intentionally kept: the browser throttles hidden tabs on its own and
    // keeping one interval avoids a stop/start race that can strand the stream with no timer.
    set({ suspended: hidden });
    if (!hidden && get().running) ensureInterval();
  },

  ensureSubject: (astronautId, options) => {
    const current = get();
    if (
      current.astronautId === astronautId &&
      (current.running || current.suspended || current.status === 'paused' || current.status === 'completed')
    ) {
      return;
    }
    startSimulationInternal(options, astronautId);
  },
}));

/** Test/debug helper: how many update intervals this module currently owns (0 or 1). */
export function getActiveSimulationIntervalCount(): number {
  return intervalId === null ? 0 : 1;
}
