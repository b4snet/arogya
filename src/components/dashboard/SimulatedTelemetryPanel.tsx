import { useEffect } from 'react';
import type { Astronaut, CheckIn } from '../../types';
import {
  Pause,
  Play,
  RotateCcw,
  Stethoscope,
  Timer,
} from 'lucide-react';
import {
  useSimulatedTelemetryStore,
} from '../../store/useSimulatedTelemetryStore';
import {
  SIMULATED_BP_SAMPLE_INTERVAL_TICKS,
  SIMULATED_LIVE_LABEL,
  SIMULATED_SAMPLE_INTERVAL_MS,
  hashSeed,
} from '../../utils/simulatedTelemetry';

interface SimulatedTelemetryPanelProps {
  astronaut: Astronaut;
  latestCheckIn?: CheckIn;
}

function formatClock(tMs: number | undefined): string {
  if (tMs == null) return '—';
  return new Date(tMs).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function LiveCard({
  label,
  value,
  unit,
  timestampMs,
  accentColor,
  note,
}: {
  label: string;
  value: string;
  unit: string;
  timestampMs: number | undefined;
  accentColor: string;
  note?: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/70 bg-white/60 p-3 shadow-[0_12px_32px_-16px_rgba(15,23,42,0.45)] backdrop-blur-md">
      <p className="truncate text-xs font-semibold tracking-wide text-[var(--arogya-text-primary)]">
        {label}
      </p>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className="font-mono-tabular text-2xl font-bold tracking-tight text-[var(--arogya-text-primary)]">
          {value}
        </span>
        <span className="font-mono-tabular text-xs font-medium text-[var(--arogya-text-muted)]">
          {unit}
        </span>
      </div>
      <p className="mt-0.5 font-mono-tabular text-[10px] text-[var(--arogya-text-muted)]">
        sampled {formatClock(timestampMs)}
      </p>
      {note && (
        <p className="mt-0.5 text-[10px] leading-tight text-[var(--arogya-text-muted)]">{note}</p>
      )}
      <div
        aria-hidden="true"
        className="mt-2 h-0.5 w-full rounded-full"
        style={{ backgroundColor: `${accentColor}33` }}
      />
    </div>
  );
}

/**
 * Simulated live demonstration.
 *
 * Uses the shared demonstration timer. Route unmounts preserve an explicitly running stream;
 * only the explicit Stop control ends it. Recorded observations remain untouched.
 */
export function SimulatedTelemetryPanel({ astronaut, latestCheckIn }: SimulatedTelemetryPanelProps) {
  const running = useSimulatedTelemetryStore((s) => s.running);
  const points = useSimulatedTelemetryStore((s) => s.points);
  const bpSamples = useSimulatedTelemetryStore((s) => s.bpSamples);
  const startSimulation = useSimulatedTelemetryStore((s) => s.startSimulation);
  const ensureSubject = useSimulatedTelemetryStore((s) => s.ensureSubject);
  const stopSimulation = useSimulatedTelemetryStore((s) => s.stopSimulation);
  const pauseSimulation = useSimulatedTelemetryStore((s) => s.pauseSimulation);
  const resumeSimulation = useSimulatedTelemetryStore((s) => s.resumeSimulation);
  const takeSimulatedBpReading = useSimulatedTelemetryStore((s) => s.takeSimulatedBpReading);
  const setPageHidden = useSimulatedTelemetryStore((s) => s.setPageHidden);

  const seed = hashSeed(astronaut.id);
  const baseHeartRateBpm = astronaut.baseline.restingHeartRateBpm;
  const baseSpo2Percent = astronaut.baseline.spo2Percent;
  const baseSystolicBpMmHg = astronaut.baseline.systolicBpMmHg;
  const baseDiastolicBpMmHg = astronaut.baseline.diastolicBpMmHg;

  useEffect(() => {
    ensureSubject(astronaut.id, {
      seed,
      baseHeartRateBpm,
      baseSpo2Percent,
      baseSystolicBpMmHg,
      baseDiastolicBpMmHg,
    });

    const handleVisibility = () => {
      setPageHidden(document.visibilityState === 'hidden');
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [
    seed,
    baseHeartRateBpm,
    baseSpo2Percent,
    baseSystolicBpMmHg,
    baseDiastolicBpMmHg,
    ensureSubject,
    setPageHidden,
  ]);

  const latest = points[points.length - 1];
  const latestBp = bpSamples[bpSamples.length - 1];
  const sleepHours = latestCheckIn?.sleepHours;

  return (
    <section
      aria-label="Simulated live demonstration telemetry"
      className="rounded-xl border border-[#B45309]/35 bg-[#FFFBEB] p-3 shadow-sm sm:p-4"
    >
      {/* Persistent, non-dismissible demonstration label */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-[#B45309]" aria-hidden="true" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#92400E]">
              {SIMULATED_LIVE_LABEL}
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-[#78350F]">
              Deterministic seeded demonstration stream ({SIMULATED_SAMPLE_INTERVAL_MS / 1000} sample/s,
              rolling 120&nbsp;s). Excluded from recorded observations and from every medical report.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => (running ? pauseSimulation() : resumeSimulation())}
            aria-pressed={!running}
            className="inline-flex min-h-[34px] min-w-[96px] items-center justify-center gap-1.5 rounded-lg border border-[var(--arogya-border-strong)] bg-white px-2.5 text-xs font-medium text-[var(--arogya-text-primary)] transition-colors hover:bg-[var(--arogya-bg)]"
          >
            {running ? (
              <Pause className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>{running ? 'Pause' : 'Resume'}</span>
          </button>

          <button
            type="button"
            onClick={stopSimulation}
            className="inline-flex min-h-[34px] items-center justify-center rounded-lg border border-[var(--arogya-border-strong)] bg-white px-2.5 text-xs font-medium text-[var(--arogya-text-primary)] hover:bg-[var(--arogya-bg)]"
          >
            Stop
          </button>

          <button
            type="button"
            onClick={() =>
              startSimulation({
                seed,
                baseHeartRateBpm,
                baseSpo2Percent,
                baseSystolicBpMmHg,
                baseDiastolicBpMmHg,
              })
            }
            className="inline-flex min-h-[34px] min-w-[96px] items-center justify-center gap-1.5 rounded-lg border border-[var(--arogya-border-strong)] bg-white px-2.5 text-xs font-medium text-[var(--arogya-text-primary)] transition-colors hover:bg-[var(--arogya-bg)]"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Replay</span>
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <LiveCard
          label="Simulated heart rate"
          value={latest ? String(latest.heartRateBpm) : '—'}
          unit="bpm"
          timestampMs={latest?.tMs}
          accentColor="#DC2626"
        />
        <LiveCard
          label="SpO₂ — oxygen saturation"
          value={latest ? latest.spo2Percent.toFixed(1) : '—'}
          unit="%"
          timestampMs={latest?.tMs}
          accentColor="#0891B2"
        />
        <LiveCard
          label="Simulated blood pressure"
          value={latestBp ? `${latestBp.systolicBpMmHg}/${latestBp.diastolicBpMmHg}` : '—'}
          unit="mmHg"
          timestampMs={latestBp?.tMs}
          accentColor="#1E3A5F"
          note={`Intermittent cuff sample every ${
            (SIMULATED_BP_SAMPLE_INTERVAL_TICKS * SIMULATED_SAMPLE_INTERVAL_MS) / 1000
          } s or on demand`}
        />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#B45309]/25 pt-2">
        <button
          type="button"
          onClick={takeSimulatedBpReading}
          className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg bg-[#1E3A5F] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#2D4A6F]"
        >
          <Stethoscope className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Take simulated reading</span>
        </button>

        <p className="flex items-center gap-1.5 text-[11px] text-[#78350F]">
          <Timer className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            Recorded daily value (not simulated): sleep{' '}
            <strong className="font-mono-tabular">
              {sleepHours != null ? `${sleepHours.toFixed(1)} h` : 'not recorded'}
            </strong>
          </span>
        </p>
      </div>
    </section>
  );
}
