/**
 * Deterministic demonstration telemetry.
 *
 * This module is a pure generator: it never touches recorded observations. Callers keep the
 * samples in a separate, in-memory buffer that is not persisted and never enters
 * `vitalsByAstronaut`, so nothing here can reach the assessment engine or a medical report.
 */

export const SIMULATED_LIVE_LABEL = 'SIMULATED DEMONSTRATION — not patient measurements';

export const SIMULATED_SAMPLE_INTERVAL_MS = 1000;
/** Rolling window kept in memory: 120 one-second samples = the last 120 s. */
export const SIMULATED_WINDOW_SECONDS = 120;
export const SIMULATED_BUFFER_LIMIT = SIMULATED_WINDOW_SECONDS;
/** Intermittent cuff reading cadence: one sample every 30 s of simulated time. */
export const SIMULATED_BP_SAMPLE_INTERVAL_TICKS = 30;

export const SIMULATION_SCENARIO_IDS = [
  'nominal',
  'exercise',
  'sleep',
  'high_workload',
  'synthetic_anomaly',
] as const;

export type SimulationScenarioId = (typeof SIMULATION_SCENARIO_IDS)[number];

export const SIMULATION_SPEEDS = [1, 2, 4] as const;
export type SimulationSpeed = (typeof SIMULATION_SPEEDS)[number];

export const SIMULATION_DURATIONS_MINUTES = [5, 15, 30, 60] as const;
export type SimulationDurationMinutes = (typeof SIMULATION_DURATIONS_MINUTES)[number];

export interface SimulationScenarioDefinition {
  id: SimulationScenarioId;
  label: string;
  description: string;
  heartRateDelta: number;
  spo2Delta: number;
  systolicBpDelta: number;
  diastolicBpDelta: number;
  /** Slow simulated oscillation used only by the clearly labeled synthetic anomaly. */
  anomalySwingBpm: number;
}

export const SIMULATION_SCENARIOS: readonly SimulationScenarioDefinition[] = [
  {
    id: 'nominal',
    label: 'Nominal',
    description: 'Resting crew baseline with a gentle circadian drift.',
    heartRateDelta: 0,
    spo2Delta: 0,
    systolicBpDelta: 0,
    diastolicBpDelta: 0,
    anomalySwingBpm: 0,
  },
  {
    id: 'exercise',
    label: 'Exercise',
    description: 'Scripted aerobic countermeasure bout.',
    heartRateDelta: 28,
    spo2Delta: -1,
    systolicBpDelta: 11,
    diastolicBpDelta: 6,
    anomalySwingBpm: 0,
  },
  {
    id: 'sleep',
    label: 'Sleep',
    description: 'Scripted sleep period with lower resting demand.',
    heartRateDelta: -7,
    spo2Delta: -0.2,
    systolicBpDelta: -5,
    diastolicBpDelta: -3,
    anomalySwingBpm: 0,
  },
  {
    id: 'high_workload',
    label: 'High workload',
    description: 'Scripted sustained cognitive workload.',
    heartRateDelta: 12,
    spo2Delta: -0.7,
    systolicBpDelta: 7,
    diastolicBpDelta: 4,
    anomalySwingBpm: 0,
  },
  {
    id: 'synthetic_anomaly',
    label: 'Synthetic anomaly',
    description:
      'Scripted demonstration anomaly for interface testing — not a diagnosis or clinical alarm.',
    heartRateDelta: 18,
    spo2Delta: -2.2,
    systolicBpDelta: 9,
    diastolicBpDelta: 5,
    anomalySwingBpm: 5,
  },
];

export function getSimulationScenario(
  id: SimulationScenarioId
): SimulationScenarioDefinition {
  return SIMULATION_SCENARIOS.find((scenario) => scenario.id === id) ?? SIMULATION_SCENARIOS[0];
}

export const SIMULATED_HR_MIN_BPM = 45;
export const SIMULATED_HR_MAX_BPM = 145;
export const SIMULATED_SPO2_MIN_PERCENT = 90;
export const SIMULATED_SPO2_MAX_PERCENT = 100;
export const SIMULATED_SYSTOLIC_MIN_MMHG = 80;
export const SIMULATED_SYSTOLIC_MAX_MMHG = 180;
export const SIMULATED_DIASTOLIC_MIN_MMHG = 45;
export const SIMULATED_DIASTOLIC_MAX_MMHG = 115;

export interface CircadianOffsets {
  heartRateBpm: number;
  spo2Percent: number;
  systolicBpMmHg: number;
  diastolicBpMmHg: number;
}

/**
 * Small demonstration circadian cycle, anchored to UTC so replay is deterministic across
 * time zones. Trough is 04:00 and peak is 16:00; amplitudes stay inside the nominal bounds.
 */
export function circadianOffsetsForTime(tMs: number): CircadianOffsets {
  const msPerDay = 86_400_000;
  const minutesOfDay = (((tMs % msPerDay) + msPerDay) % msPerDay) / 60_000;
  const phase = Math.cos((2 * Math.PI * (minutesOfDay - 16 * 60)) / 1440);
  return {
    heartRateBpm: 2.2 * phase,
    spo2Percent: -0.2 * phase,
    systolicBpMmHg: 1.8 * phase,
    diastolicBpMmHg: 1.1 * phase,
  };
}

export interface SimulatedSample {
  tick: number;
  tMs: number;
  heartRateBpm: number;
  spo2Percent: number;
  scenario: SimulationScenarioId;
}

export interface SimulatedBpSample {
  tick: number;
  tMs: number;
  systolicBpMmHg: number;
  diastolicBpMmHg: number;
}

export interface SimulatedEngineOptions {
  seed: number;
  baseHeartRateBpm: number;
  baseSpo2Percent: number;
  startedAtMs: number;
  scenario?: SimulationScenarioId;
}

export interface SimulatedBpOffsets {
  systolicBpMmHg: number;
  diastolicBpMmHg: number;
}

export interface SimulatedTelemetryEngine {
  next: () => SimulatedSample;
  setScenario: (scenario: SimulationScenarioId) => void;
  getScenario: () => SimulationScenarioId;
  getBpOffsets: () => SimulatedBpOffsets;
}

/** Small, fast, deterministic PRNG (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable string → 32-bit seed, so the same crew member always replays the same stream. */
export function hashSeed(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Mean-reverting, bounded random walk with smooth scenario transitions, a small circadian
 * cycle, and scenario-specific offsets. Step-to-step change stays gradual; SpO₂ follows
 * heart-rate excursions loosely (higher HR → slightly lower saturation). No value is a
 * patient measurement.
 */
export function createSimulatedTelemetryEngine(
  options: SimulatedEngineOptions
): SimulatedTelemetryEngine {
  const random = mulberry32(options.seed);
  const baseHr = options.baseHeartRateBpm;
  const baseSpo2 = options.baseSpo2Percent;

  let tick = 0;
  let heartRate = baseHr;
  let spo2 = baseSpo2;
  let scenario: SimulationScenarioId = options.scenario ?? 'nominal';

  const initial = getSimulationScenario(scenario);
  let hrOffset = initial.heartRateDelta;
  let spo2Offset = initial.spo2Delta;
  let systolicOffset = initial.systolicBpDelta;
  let diastolicOffset = initial.diastolicBpDelta;
  let anomalySwingBpm = initial.anomalySwingBpm;

  return {
    next: () => {
      tick += 1;
      const tMs = options.startedAtMs + tick * SIMULATED_SAMPLE_INTERVAL_MS;
      const target = getSimulationScenario(scenario);
      const circadian = circadianOffsetsForTime(tMs);

      // One-pole smoothing keeps scenario changes gradual instead of stepping the trace.
      hrOffset += (target.heartRateDelta - hrOffset) * 0.06;
      spo2Offset += (target.spo2Delta - spo2Offset) * 0.06;
      systolicOffset += (target.systolicBpDelta - systolicOffset) * 0.06;
      diastolicOffset += (target.diastolicBpDelta - diastolicOffset) * 0.06;
      anomalySwingBpm += (target.anomalySwingBpm - anomalySwingBpm) * 0.05;

      const hrNoise = random() * 2 - 1;
      const spo2Noise = random() * 2 - 1;
      const anomalySwing = anomalySwingBpm * Math.sin(tick / 12);
      const hrTarget = baseHr + hrOffset + circadian.heartRateBpm + anomalySwing;

      heartRate += (hrTarget - heartRate) * 0.12 + hrNoise * 0.8;

      const nearNominal = scenario === 'nominal' && Math.abs(hrOffset) < 0.75;
      heartRate = clamp(
        heartRate,
        nearNominal ? baseHr - 6 : SIMULATED_HR_MIN_BPM,
        nearNominal ? baseHr + 9 : SIMULATED_HR_MAX_BPM
      );

      const spo2Target =
        baseSpo2 + spo2Offset + circadian.spo2Percent - (heartRate - baseHr) * 0.06;
      spo2 += (spo2Target - spo2) * 0.35 + spo2Noise * 0.12;

      const nearNominalSpo2 = scenario === 'nominal' && Math.abs(spo2Offset) < 0.25;
      spo2 = clamp(
        spo2,
        nearNominalSpo2 ? 95 : SIMULATED_SPO2_MIN_PERCENT,
        SIMULATED_SPO2_MAX_PERCENT
      );

      return {
        tick,
        tMs,
        heartRateBpm: Math.round(heartRate),
        spo2Percent: Number(spo2.toFixed(1)),
        scenario,
      };
    },

    setScenario: (nextScenario) => {
      scenario = nextScenario;
    },

    getScenario: () => scenario,

    getBpOffsets: () => {
      const circadian = circadianOffsetsForTime(
        options.startedAtMs + tick * SIMULATED_SAMPLE_INTERVAL_MS
      );
      return {
        systolicBpMmHg: systolicOffset + circadian.systolicBpMmHg,
        diastolicBpMmHg: diastolicOffset + circadian.diastolicBpMmHg,
      };
    },
  };
}

/** Appends a sample while keeping the buffer bounded to the rolling window. */
export function pushBounded<T>(buffer: T[], item: T, limit = SIMULATED_BUFFER_LIMIT): T[] {
  const next = buffer.length >= limit ? buffer.slice(buffer.length - limit + 1) : buffer.slice();
  next.push(item);
  return next;
}

/**
 * Intermittent simulated cuff values. Deterministic per tick, gently bounded around the
 * crew baseline plus any smoothed scenario/circadian offset, and only ever produced on an
 * explicit sampling tick or button press.
 */
export function simulatedBpForTick(
  tick: number,
  baseSystolic: number,
  baseDiastolic: number,
  offsets?: SimulatedBpOffsets
): { systolicBpMmHg: number; diastolicBpMmHg: number } {
  const wobble = Math.sin(tick / 9);
  return {
    systolicBpMmHg: Math.round(
      clamp(
        baseSystolic + (offsets?.systolicBpMmHg ?? 0) + wobble * 3,
        SIMULATED_SYSTOLIC_MIN_MMHG,
        SIMULATED_SYSTOLIC_MAX_MMHG
      )
    ),
    diastolicBpMmHg: Math.round(
      clamp(
        baseDiastolic + (offsets?.diastolicBpMmHg ?? 0) + wobble * 2,
        SIMULATED_DIASTOLIC_MIN_MMHG,
        SIMULATED_DIASTOLIC_MAX_MMHG
      )
    ),
  };
}
