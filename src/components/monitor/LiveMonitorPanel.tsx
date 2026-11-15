import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Pause, Play, RotateCcw, Stethoscope } from 'lucide-react';
import type { Astronaut, CheckIn } from '../../types';
import { useSimulatedTelemetryStore } from '../../store/useSimulatedTelemetryStore';
import {
  SIMULATED_BP_SAMPLE_INTERVAL_TICKS,
  SIMULATED_LIVE_LABEL,
  SIMULATED_SAMPLE_INTERVAL_MS,
  SIMULATION_SCENARIOS,
  getSimulationScenario,
  hashSeed,
} from '../../utils/simulatedTelemetry';
import { WAVEFORM_PROVENANCE_LABELS } from '../../engine/vitalWaveforms';
import { LiveWaveform } from './LiveWaveform';

interface LiveMonitorPanelProps {
  astronaut: Astronaut;
  latestCheckIn?: CheckIn;
  /** Hide the scenario row when the surrounding page already exposes it. */
  showScenarios?: boolean;
}

function formatClock(tMs: number | undefined): string {
  if (tMs == null) return '—';
  return new Date(tMs).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function HrTrend({ values }: { values: number[] }) {
  const path = useMemo(() => {
    if (values.length < 2) return null;
    const min = Math.min(...values) - 2;
    const max = Math.max(...values) + 2;
    const span = Math.max(1, max - min);
    return values
      .map((value, index) => {
        const x = (index / (values.length - 1)) * 100;
        const y = 34 - ((value - min) / span) * 28;
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
  }, [values]);

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-500">
        <span>HR trend · rolling window</span>
        <span className="font-mono-tabular">-120 s → now</span>
      </div>
      <svg
        viewBox="0 0 100 38"
        preserveAspectRatio="none"
        className="mt-1 h-10 w-full"
        role="img"
        aria-label={`Rolling simulated heart-rate trend across the last ${values.length} one-second samples`}
      >
        <line x1="0" y1="34" x2="100" y2="34" stroke="rgba(148,163,184,0.18)" strokeWidth="0.5" />
        <line x1="0" y1="20" x2="100" y2="20" stroke="rgba(148,163,184,0.10)" strokeWidth="0.4" />
        {path && (
          <path
            d={path}
            fill="none"
            stroke="#f87171"
            strokeWidth="1.1"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
        )}
      </svg>
      <div className="flex justify-between font-mono-tabular text-[9px] text-slate-600">
        <span>-120s</span>
        <span>-60s</span>
        <span>now</span>
      </div>
    </div>
  );
}

/**
 * Simulated-live hospital monitor. Values come only from the volatile demonstration stream;
 * nothing here is persisted, written into recorded vitals, or included in a report.
 */
export function LiveMonitorPanel({
  astronaut,
  latestCheckIn,
  showScenarios = true,
}: LiveMonitorPanelProps) {
  const points = useSimulatedTelemetryStore((s) => s.points);
  const bpSamples = useSimulatedTelemetryStore((s) => s.bpSamples);
  const status = useSimulatedTelemetryStore((s) => s.status);
  const scenario = useSimulatedTelemetryStore((s) => s.scenario);
  const ensureSubject = useSimulatedTelemetryStore((s) => s.ensureSubject);
  const startSimulation = useSimulatedTelemetryStore((s) => s.startSimulation);
  const pauseSimulation = useSimulatedTelemetryStore((s) => s.pauseSimulation);
  const resumeSimulation = useSimulatedTelemetryStore((s) => s.resumeSimulation);
  const resetSimulation = useSimulatedTelemetryStore((s) => s.resetSimulation);
  const setSimulationScenario = useSimulatedTelemetryStore((s) => s.setSimulationScenario);
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
      astronautId: astronaut.id,
    });

    const handleVisibility = () => setPageHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', handleVisibility);

    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [
    astronaut.id,
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
  const heartRate = latest?.heartRateBpm ?? baseHeartRateBpm;
  const spo2 = latest?.spo2Percent ?? baseSpo2Percent;
  const scenarioMeta = getSimulationScenario(scenario);
  const running = status === 'running';
  const paused = status === 'paused';
  const completed = status === 'completed';

  // Like a real monitor, take one cuff reading shortly after attaching, then follow the
  // intermittent automatic cadence.
  useEffect(() => {
    if (!running || latestBp) return;
    const timer = window.setTimeout(takeSimulatedBpReading, 1200);
    return () => window.clearTimeout(timer);
  }, [running, latestBp, takeSimulatedBpReading]);

  const startOptions = {
    seed,
    baseHeartRateBpm,
    baseSpo2Percent,
    baseSystolicBpMmHg,
    baseDiastolicBpMmHg,
    astronautId: astronaut.id,
    scenario,
  } as const;

  const bpAgeSeconds = latest && latestBp ? latest.tick - latestBp.tick : null;
  const sleepHours = latestCheckIn?.sleepHours;

  return (
    <section
      aria-label="Simulated live medical monitor"
      className="flex flex-col rounded-2xl border border-[#1e293b] bg-[#050b18] p-3 text-slate-100 shadow-[0_20px_50px_-24px_rgba(2,6,23,0.9)] sm:p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
              running
                ? 'border-[#22d3ee]/40 bg-[#083344]/70 text-[#a5f3fc]'
                : 'border-amber-400/30 bg-amber-950/50 text-amber-200'
            }`}
            role="status"
            aria-live="polite"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                running ? 'animate-pulse bg-[#22d3ee]' : 'bg-amber-300'
              }`}
              aria-hidden="true"
            />
            {running ? 'Simulated live' : paused ? 'Simulated · paused' : completed ? 'Simulated · complete' : 'Simulated · idle'}
          </p>
          <h2 className="mt-2 text-base font-semibold tracking-tight text-white">
            Crew physiological monitor
          </h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
            {scenarioMeta.label} scenario · {scenarioMeta.description}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {running ? (
            <button
              type="button"
              onClick={pauseSimulation}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/10"
            >
              <Pause className="h-3.5 w-3.5" aria-hidden="true" />
              Pause
            </button>
          ) : paused ? (
            <button
              type="button"
              onClick={resumeSimulation}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-[#22d3ee] px-3 text-xs font-bold text-[#03141c] transition-colors hover:bg-[#67e8f9]"
            >
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              Resume
            </button>
          ) : (
            <button
              type="button"
              onClick={() => startSimulation(startOptions)}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-[#22d3ee] px-3 text-xs font-bold text-[#03141c] transition-colors hover:bg-[#67e8f9]"
            >
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              {completed ? 'Restart' : 'Start'}
            </button>
          )}
          <button
            type="button"
            onClick={resetSimulation}
            aria-label="Reset simulated monitor"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-slate-300 transition-colors hover:border-white/35 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <div className="rounded-xl border border-[#f87171]/25 bg-[#f87171]/[0.06] p-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#fca5a5]">
              Heart rate
            </span>
            <Activity className="h-3.5 w-3.5 text-[#f87171]" aria-hidden="true" />
          </div>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span
              key={latest?.tick ?? 'idle'}
              className="monitor-value-pop font-mono-tabular text-4xl font-bold leading-none text-[#fecaca]"
            >
              {latest ? heartRate : '—'}
            </span>
            <span className="font-mono-tabular text-[11px] text-slate-400">bpm</span>
          </div>
          <LiveWaveform
            kind="ecg"
            ratePerMinute={heartRate}
            active={running}
            accent="#f87171"
            height={62}
            className="mt-1.5 border border-white/5 bg-black/25"
            label={`Demonstration ECG trace at ${heartRate} beats per minute. ${WAVEFORM_PROVENANCE_LABELS.simulated}`}
          />
        </div>

        <div className="rounded-xl border border-[#22d3ee]/25 bg-[#22d3ee]/[0.06] p-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#a5f3fc]">
              SpO₂ · oxygen saturation
            </span>
            <span className="font-mono-tabular text-[10px] text-slate-400">pleth</span>
          </div>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span
              key={latest?.tick ?? 'idle'}
              className="monitor-value-pop font-mono-tabular text-4xl font-bold leading-none text-[#cffafe]"
            >
              {latest ? spo2.toFixed(1) : '—'}
            </span>
            <span className="font-mono-tabular text-[11px] text-slate-400">%</span>
          </div>
          <LiveWaveform
            kind="pleth"
            ratePerMinute={heartRate}
            active={running}
            accent="#22d3ee"
            height={62}
            className="mt-1.5 border border-white/5 bg-black/25"
            label={`Demonstration plethysmograph trace at the simulated pulse rate of ${heartRate} per minute. ${WAVEFORM_PROVENANCE_LABELS.simulated}`}
          />
        </div>
      </div>

      <div className="mt-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Blood pressure · intermittent cuff
            </span>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span
                key={latestBp?.tick ?? 'no-bp'}
                className="monitor-value-pop font-mono-tabular text-2xl font-bold text-white"
              >
                {latestBp
                  ? `${latestBp.systolicBpMmHg}/${latestBp.diastolicBpMmHg}`
                  : '—/—'}
              </span>
              <span className="font-mono-tabular text-[10px] text-slate-400">mmHg</span>
            </div>
            <p className="mt-0.5 font-mono-tabular text-[10px] text-slate-500">
              {latestBp
                ? `cuff sampled ${formatClock(latestBp.tMs)}${
                    bpAgeSeconds != null ? ` · ${Math.max(0, bpAgeSeconds)} s ago` : ''
                  }`
                : `awaiting first sample · every ${
                    (SIMULATED_BP_SAMPLE_INTERVAL_TICKS * SIMULATED_SAMPLE_INTERVAL_MS) / 1000
                  } s`}
            </p>
          </div>
          <button
            type="button"
            onClick={takeSimulatedBpReading}
            className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-2.5 text-[11px] font-semibold text-slate-100 transition-colors hover:bg-white/10"
          >
            <Stethoscope className="h-3.5 w-3.5" aria-hidden="true" />
            Take simulated cuff
          </button>
        </div>
      </div>

      <HrTrend values={points.map((point) => point.heartRateBpm)} />

      {showScenarios && (
        <div className="mt-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Simulation scenario
          </p>
          <div
            role="group"
            aria-label="Simulation scenario"
            className="mt-1.5 flex gap-1.5 overflow-x-auto pb-1"
          >
            {SIMULATION_SCENARIOS.map((option) => {
              const active = option.id === scenario;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSimulationScenario(option.id)}
                  aria-pressed={active}
                  className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                    active
                      ? 'border-[#22d3ee]/60 bg-[#22d3ee]/15 text-[#cffafe]'
                      : 'border-white/15 text-slate-300 hover:border-white/35 hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2.5">
        <p className="flex items-center gap-1.5 text-[10px] leading-snug text-slate-500">
          <Activity className="h-3 w-3 shrink-0" aria-hidden="true" />
          {SIMULATED_LIVE_LABEL}. Never written to recorded vitals or reports.
        </p>
        <Link
          to="/vitals"
          className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-white/15 px-2.5 text-[11px] font-semibold text-[#a5f3fc] hover:border-[#22d3ee]/50"
        >
          Open vitals monitor
        </Link>
      </div>

      <p className="sr-only">
        Latest simulated values: heart rate {heartRate} beats per minute, oxygen saturation{' '}
        {spo2.toFixed(1)} percent
        {latestBp
          ? `, blood pressure ${latestBp.systolicBpMmHg} over ${latestBp.diastolicBpMmHg} millimetres of mercury`
          : ', blood pressure awaiting first cuff sample'}
        . Recorded sleep last check-in:{' '}
        {sleepHours != null ? `${sleepHours.toFixed(1)} hours` : 'not recorded'}.
      </p>
    </section>
  );
}
