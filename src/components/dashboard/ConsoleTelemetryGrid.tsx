import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Activity, Clock3, HeartPulse, Pause, Play, RotateCcw, Stethoscope, Wind } from 'lucide-react';
import type { Astronaut, Mission } from '../../types';
import { useSimulatedTelemetryStore } from '../../store/useSimulatedTelemetryStore';
import {
  SIMULATED_BP_SAMPLE_INTERVAL_TICKS,
  SIMULATED_LIVE_LABEL,
  SIMULATED_SAMPLE_INTERVAL_MS,
  SIMULATED_WINDOW_SECONDS,
  SIMULATION_SCENARIOS,
  getSimulationScenario,
  hashSeed,
} from '../../utils/simulatedTelemetry';
import { WAVEFORM_PROVENANCE_LABELS } from '../../engine/vitalWaveforms';
import { LiveWaveform } from '../monitor/LiveWaveform';

interface ConsoleTelemetryGridProps {
  astronaut: Astronaut;
  mission: Mission;
}

function formatCuffTime(tMs: number | undefined): string {
  if (tMs == null) return '—';
  return new Date(tMs).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function missionElapsedSeconds(mission: Mission, nowMs: number): number {
  const departure = mission.departureDateIso ? Date.parse(mission.departureDateIso) : Number.NaN;
  if (Number.isFinite(departure)) return Math.max(0, (nowMs - departure) / 1000);
  return mission.currentDay * 86_400;
}

function formatTPlus(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const secs = seconds % 60;
  return `T+ ${String(days).padStart(2, '0')}d ${String(hours).padStart(2, '0')}:${String(
    minutes
  ).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function GlassCard({
  label,
  icon,
  accentClass,
  className = '',
  children,
}: {
  label: string;
  icon: ReactNode;
  accentClass: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-sky-300/15 bg-white/[0.045] p-3.5 shadow-[0_0_34px_-14px_rgba(56,189,248,0.45)] backdrop-blur-md sm:p-4 ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[10px] font-bold uppercase tracking-[0.16em] ${accentClass}`}>
          {label}
        </span>
        <span className={accentClass} aria-hidden="true">
          {icon}
        </span>
      </div>
      {children}
    </div>
  );
}

function pathFor(values: number[], min: number, max: number): string | null {
  if (values.length < 2) return null;
  const span = Math.max(1, max - min);
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 36 - ((value - min) / span) * 32;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

function VitalsOverviewChart({
  heartRates,
  spo2Values,
}: {
  heartRates: number[];
  spo2Values: number[];
}) {
  const heartPath = useMemo(() => {
    if (heartRates.length < 2) return null;
    const min = Math.min(...heartRates) - 2;
    const max = Math.max(...heartRates) + 2;
    return pathFor(heartRates, min, max);
  }, [heartRates]);

  const spo2Path = useMemo(() => {
    if (spo2Values.length < 2) return null;
    const min = Math.min(...spo2Values) - 0.5;
    const max = Math.max(...spo2Values) + 0.5;
    return pathFor(spo2Values, min, max);
  }, [spo2Values]);

  const latestHr = heartRates[heartRates.length - 1];
  const latestSpo2 = spo2Values[spo2Values.length - 1];

  return (
    <GlassCard
      label="Vitals overview · rolling window"
      icon={<Activity className="h-4 w-4" />}
      accentClass="text-sky-300"
      className="sm:col-span-2"
    >
      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex items-baseline gap-4">
          <span className="font-mono-tabular text-[11px] text-slate-400">
            HR{' '}
            <span className="text-sm font-semibold text-[#f87171]">
              {latestHr != null ? Math.round(latestHr) : '—'}
            </span>{' '}
            bpm
          </span>
          <span className="font-mono-tabular text-[11px] text-slate-400">
            SpO₂{' '}
            <span className="text-sm font-semibold text-[#5eead4]">
              {latestSpo2 != null ? latestSpo2.toFixed(1) : '—'}
            </span>{' '}
            %
          </span>
        </div>
        <span className="font-mono-tabular text-[10px] text-slate-500">
          {heartRates.length}/{SIMULATED_WINDOW_SECONDS} s samples
        </span>
      </div>

      <svg
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        className="mt-2 h-20 w-full sm:h-24"
        role="img"
        aria-label={
          latestHr != null
            ? `Rolling ${SIMULATED_WINDOW_SECONDS}-second demonstration chart: heart rate ${Math.round(
                latestHr
              )} beats per minute and oxygen saturation ${
                latestSpo2 != null ? latestSpo2.toFixed(1) : 'not yet sampled'
              } percent. Simulated values, not live NASA telemetry.`
            : 'Rolling vitals chart awaiting simulated samples. Simulated values, not live NASA telemetry.'
        }
      >
        {[6, 14, 22, 30].map((y) => (
          <line
            key={y}
            x1="0"
            y1={y}
            x2="100"
            y2={y}
            stroke="rgba(148,163,184,0.14)"
            strokeWidth="0.4"
          />
        ))}
        {heartPath && (
          <path
            d={heartPath}
            fill="none"
            stroke="#f87171"
            strokeWidth="1.3"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
        )}
        {spo2Path && (
          <path
            d={spo2Path}
            fill="none"
            stroke="#5eead4"
            strokeWidth="1.1"
            strokeDasharray="3 2"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
        )}
      </svg>

      <div className="flex items-center justify-between font-mono-tabular text-[9px] text-slate-500">
        <span>-{SIMULATED_WINDOW_SECONDS}s</span>
        <span className="inline-flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-3 rounded-full bg-[#f87171]" aria-hidden="true" /> Heart rate
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-3 rounded-full bg-[#5eead4]" aria-hidden="true" /> SpO₂
          </span>
        </span>
        <span>now</span>
      </div>
    </GlassCard>
  );
}

/**
 * Right-hand console: four live demonstration cards plus one rolling-window overview.
 * Values come only from the volatile simulation store and never reach recorded vitals.
 */
export function ConsoleTelemetryGrid({ astronaut, mission }: ConsoleTelemetryGridProps) {
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

  const [nowMs, setNowMs] = useState(() => Date.now());

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

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const latest = points[points.length - 1];
  const latestBp = bpSamples[bpSamples.length - 1];
  const heartRate = latest?.heartRateBpm ?? baseHeartRateBpm;
  const spo2 = latest?.spo2Percent ?? baseSpo2Percent;
  const scenarioMeta = getSimulationScenario(scenario);
  const running = status === 'running';
  const paused = status === 'paused';
  const completed = status === 'completed';
  const bpCadenceSeconds = (SIMULATED_BP_SAMPLE_INTERVAL_TICKS * SIMULATED_SAMPLE_INTERVAL_MS) / 1000;

  // A real monitor takes one cuff reading shortly after attach, then follows its cadence.
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
  const tPlus = formatTPlus(missionElapsedSeconds(mission, nowMs));

  return (
    <section
      aria-label="Simulated live mission telemetry"
      className="flex flex-col gap-2.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-sky-300/15 bg-white/[0.045] px-3 py-2.5 backdrop-blur-md">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
            running
              ? 'border-cyan-300/40 bg-cyan-400/10 text-cyan-100'
              : 'border-amber-300/30 bg-amber-400/10 text-amber-200'
          }`}
          role="status"
          aria-live="polite"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              running ? 'animate-pulse bg-cyan-300' : 'bg-amber-300'
            }`}
            aria-hidden="true"
          />
          {running ? 'SIMULATED LIVE' : paused ? 'SIMULATED · PAUSED' : completed ? 'SIMULATED · COMPLETE' : 'SIMULATED · IDLE'}
        </span>

        <div className="flex items-center gap-1.5">
          {running ? (
            <button
              type="button"
              onClick={pauseSimulation}
              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-2.5 text-[11px] font-semibold text-white transition-colors hover:bg-white/10"
            >
              <Pause className="h-3.5 w-3.5" aria-hidden="true" />
              Pause
            </button>
          ) : paused ? (
            <button
              type="button"
              onClick={resumeSimulation}
              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg bg-cyan-300 px-2.5 text-[11px] font-bold text-[#03141c] transition-colors hover:bg-cyan-200"
            >
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              Resume
            </button>
          ) : (
            <button
              type="button"
              onClick={() => startSimulation(startOptions)}
              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg bg-cyan-300 px-2.5 text-[11px] font-bold text-[#03141c] transition-colors hover:bg-cyan-200"
            >
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              {completed ? 'Restart' : 'Start'}
            </button>
          )}
          <button
            type="button"
            onClick={resetSimulation}
            aria-label="Reset simulated monitor"
            className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-white/15 text-slate-300 transition-colors hover:border-white/35 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <GlassCard
          label="Heart rate"
          icon={<HeartPulse className="h-4 w-4" />}
          accentClass="text-[#fca5a5]"
        >
          <div className="mt-1 flex items-baseline gap-1.5">
            <span
              key={latest?.tick ?? 'idle'}
              className="monitor-value-pop font-mono-tabular text-4xl font-semibold leading-none text-[#fecaca] sm:text-5xl"
            >
              {latest ? Math.round(heartRate) : '—'}
            </span>
            <span className="font-mono-tabular text-[11px] text-slate-400">bpm</span>
          </div>
          <p className="mt-0.5 font-mono-tabular text-[10px] text-slate-500">ECG · live trace</p>
          <LiveWaveform
            kind="ecg"
            ratePerMinute={heartRate}
            active={running}
            accent="#f87171"
            height={72}
            className="mt-1.5 border border-white/5 bg-black/30"
            label={`Demonstration ECG trace at ${Math.round(heartRate)} beats per minute. ${WAVEFORM_PROVENANCE_LABELS.simulated}`}
          />
        </GlassCard>

        <GlassCard
          label="SpO₂ · saturation"
          icon={<Wind className="h-4 w-4" />}
          accentClass="text-[#a5f3fc]"
        >
          <div className="mt-1 flex items-baseline gap-1.5">
            <span
              key={latest?.tick ?? 'idle'}
              className="monitor-value-pop font-mono-tabular text-4xl font-semibold leading-none text-[#cffafe] sm:text-5xl"
            >
              {latest ? spo2.toFixed(1) : '—'}
            </span>
            <span className="font-mono-tabular text-[11px] text-slate-400">%</span>
          </div>
          <p className="mt-0.5 font-mono-tabular text-[10px] text-slate-500">Pleth · live trace</p>
          <LiveWaveform
            kind="pleth"
            ratePerMinute={heartRate}
            active={running}
            accent="#22d3ee"
            height={72}
            className="mt-1.5 border border-white/5 bg-black/30"
            label={`Demonstration plethysmograph trace at the simulated pulse rate of ${Math.round(
              heartRate
            )} per minute. ${WAVEFORM_PROVENANCE_LABELS.simulated}`}
          />
        </GlassCard>

        <GlassCard
          label="Blood pressure · cuff"
          icon={<Stethoscope className="h-4 w-4" />}
          accentClass="text-slate-300"
        >
          <div className="mt-1 flex items-baseline gap-1.5">
            <span
              key={latestBp?.tick ?? 'no-bp'}
              className="monitor-value-pop font-mono-tabular text-3xl font-semibold leading-none text-white sm:text-4xl"
            >
              {latestBp ? `${latestBp.systolicBpMmHg}/${latestBp.diastolicBpMmHg}` : '—/—'}
            </span>
            <span className="font-mono-tabular text-[10px] text-slate-400">mmHg</span>
          </div>
          <p className="mt-1 font-mono-tabular text-[10px] text-slate-500">
            {latestBp
              ? `Cuff ${formatCuffTime(latestBp.tMs)}${
                  bpAgeSeconds != null ? ` · ${Math.max(0, bpAgeSeconds)} s ago` : ''
                }`
              : `Intermittent cuff · every ${bpCadenceSeconds} s`}
          </p>
          <button
            type="button"
            onClick={takeSimulatedBpReading}
            className="mt-2 inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-2.5 text-[11px] font-semibold text-slate-100 transition-colors hover:bg-white/10"
          >
            <Stethoscope className="h-3.5 w-3.5" aria-hidden="true" />
            Take simulated cuff
          </button>
        </GlassCard>

        <GlassCard
          label="Mission time"
          icon={<Clock3 className="h-4 w-4" />}
          accentClass="text-sky-300"
        >
          <p className="mt-2 whitespace-nowrap font-mono-tabular text-xl font-semibold leading-tight tracking-tight text-white">
            {tPlus}
          </p>
          <p className="mt-1 font-mono-tabular text-[10px] text-slate-500">
            Sol {mission.currentDay}/{mission.totalPlannedDays} · {mission.name}
          </p>
          <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
            Simulated elapsed mission time from the configured departure date.
          </p>
        </GlassCard>

        <VitalsOverviewChart
          heartRates={points.map((point) => point.heartRateBpm)}
          spo2Values={points.map((point) => point.spo2Percent)}
        />
      </div>

      <div className="rounded-2xl border border-sky-300/15 bg-white/[0.045] px-3 py-2.5 backdrop-blur-md">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
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
                    ? 'border-cyan-300/60 bg-cyan-400/15 text-cyan-100'
                    : 'border-white/15 text-slate-300 hover:border-white/35 hover:text-white'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-[10px] leading-snug text-slate-400">
          {scenarioMeta.label} · {scenarioMeta.description}
        </p>
      </div>

      <p className="flex items-start gap-1.5 px-1 text-[10px] leading-relaxed text-slate-500">
        <Activity className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
        <span>
          {SIMULATED_LIVE_LABEL}. Not live NASA telemetry; never written to logged vitals or
          reports.
        </span>
      </p>
    </section>
  );
}
