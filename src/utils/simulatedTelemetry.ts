/**
 * Deterministic demonstration telemetry.
 *
 * This module is a pure generator: it never touches recorded observations. Callers keep the
 * samples in a separate, in-memory buffer that is not persisted and never enters
 * `vitalsByAstronaut`, so nothing here can reach the assessment engine or a medical report.
 */

export const SIMULATED_LIVE_LABEL = 'SIMULATED LIVE — not patient measurements';

export const SIMULATED_SAMPLE_INTERVAL_MS = 1000;
/** Rolling window kept in memory: 120 one-second samples = the last 120 s. */
export const SIMULATED_WINDOW_SECONDS = 120;
export const SIMULATED_BUFFER_LIMIT = SIMULATED_WINDOW_SECONDS;
/** Intermittent cuff reading cadence: one sample every 30 s of simulated time. */
export const SIMULATED_BP_SAMPLE_INTERVAL_TICKS = 30;

export interface SimulatedSample {
  tick: number;
  tMs: number;
  heartRateBpm: number;
  spo2Percent: number;
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
}

export interface SimulatedTelemetryEngine {
  next: () => SimulatedSample;
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
 * Mean-reverting, bounded random walk. Step-to-step change stays below ~2 bpm and SpO₂
 * follows heart-rate excursions loosely (higher HR → slightly lower saturation), so the
 * trace breathes instead of jumping between independent random values.
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

  return {
    next: () => {
      tick += 1;

      const hrNoise = random() * 2 - 1;
      const spo2Noise = random() * 2 - 1;

      heartRate += (baseHr - heartRate) * 0.12 + hrNoise * 0.8;
      heartRate = clamp(heartRate, baseHr - 6, baseHr + 9);

      const spo2Target = baseSpo2 - (heartRate - baseHr) * 0.18;
      spo2 += (spo2Target - spo2) * 0.35 + spo2Noise * 0.12;
      spo2 = clamp(spo2, 95, 100);

      return {
        tick,
        tMs: options.startedAtMs + tick * SIMULATED_SAMPLE_INTERVAL_MS,
        heartRateBpm: Math.round(heartRate),
        spo2Percent: Number(spo2.toFixed(1)),
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
 * crew baseline, and only ever produced on an explicit sampling tick or button press.
 */
export function simulatedBpForTick(
  tick: number,
  baseSystolic: number,
  baseDiastolic: number
): { systolicBpMmHg: number; diastolicBpMmHg: number } {
  const wobble = Math.sin(tick / 9);
  return {
    systolicBpMmHg: Math.round(baseSystolic + wobble * 3),
    diastolicBpMmHg: Math.round(baseDiastolic + wobble * 2),
  };
}
