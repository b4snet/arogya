/**
 * Stylized ECG and pulse-oximetry waveform shapes for the demonstration monitor.
 *
 * These curves are illustrative display geometry derived from a rate. They are not
 * recorded ECG or plethysmograph signals, not patient measurements, and never enter
 * the vitals store, an assessment, or a report.
 */

export type WaveformKind = 'ecg' | 'pleth';

function normalizePhase(phase: number): number {
  if (!Number.isFinite(phase)) return 0;
  return phase - Math.floor(phase);
}

function gaussian(x: number, center: number, width: number): number {
  const distance = (x - center) / width;
  return Math.exp(-0.5 * distance * distance);
}

/** Single ECG cycle: P wave, QRS complex, T wave. Values stay within roughly -0.35 to 1. */
export function ecgWaveform(phase: number): number {
  const p = normalizePhase(phase);
  return (
    0.1 * gaussian(p, 0.17, 0.022) -
    0.16 * gaussian(p, 0.265, 0.008) +
    1.0 * gaussian(p, 0.3, 0.0075) -
    0.3 * gaussian(p, 0.337, 0.011) +
    0.26 * gaussian(p, 0.55, 0.043) +
    0.055 * gaussian(p, 0.74, 0.06)
  );
}

/** Single pulse-oximetry cycle with a systolic peak and dicrotic notch. Values stay within 0 to 1. */
export function plethWaveform(phase: number): number {
  const p = normalizePhase(phase);
  const systolic = 1.0 * gaussian(p, 0.26, 0.085);
  const dicrotic = 0.34 * gaussian(p, 0.47, 0.055);
  const runoff = 0.16 * gaussian(p, 0.68, 0.09);
  return Math.min(1, systolic + dicrotic + runoff);
}

export function waveformSample(kind: WaveformKind, phase: number): number {
  return kind === 'ecg' ? ecgWaveform(phase) : plethWaveform(phase);
}

export interface WaveformPoint {
  phase: number;
  value: number;
}

/** Pure point builder used by tests and non-canvas fallbacks. */
export function buildWaveformPoints(
  kind: WaveformKind,
  cycles = 2,
  samplesPerCycle = 64
): WaveformPoint[] {
  const total = Math.max(2, Math.round(cycles * samplesPerCycle));
  const points: WaveformPoint[] = [];
  for (let index = 0; index <= total; index += 1) {
    const phase = (index / samplesPerCycle) % 1;
    points.push({ phase, value: waveformSample(kind, phase) });
  }
  return points;
}

export function clampWaveformRate(ratePerMinute: number): number {
  if (!Number.isFinite(ratePerMinute) || ratePerMinute <= 0) return 1;
  return Math.min(3, Math.max(0.4, ratePerMinute / 60));
}

export type WaveformProvenance = 'simulated' | 'recorded' | 'illustrative';

export const WAVEFORM_PROVENANCE_LABELS: Record<WaveformProvenance, string> = {
  simulated: 'Simulated waveform — demonstration only',
  recorded: 'Illustrative waveform derived from the latest recorded rate',
  illustrative: 'Illustrative demonstration waveform — no measurement recorded',
};
