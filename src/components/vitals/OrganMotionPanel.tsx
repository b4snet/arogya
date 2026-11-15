import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Brain, Heart, Info, Pause, Play, Wind } from 'lucide-react';
import type { Astronaut, CheckIn, VitalReading } from '../../types';
import type { VitalReferenceRow } from '../../engine/vitalsReference';
import {
  ORGAN_MOTION_DISCLAIMER,
  ORGAN_MOTION_LIMITATIONS,
  buildMissingMeasurementNames,
  buildOrganFindings,
  buildOrganSystemStatuses,
  describeOrganMotionText,
  mapMeasurementToSystem,
  recordedRespiratoryRateFrom,
  resolveBrainTiming,
  resolveHeartTiming,
  resolveLungTiming,
  resolveOrganRenderMode,
  type BrainActivityTiming,
  type OrganMotionTiming,
} from '../../engine/organMotion';
import {
  ProceduralBrainModel,
  ProceduralHeartModel,
  ProceduralLungsModel,
} from '../three/ProceduralOrganModels';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useSimulatedTelemetryStore } from '../../store/useSimulatedTelemetryStore';
import { getSimulationScenario, hashSeed } from '../../utils/simulatedTelemetry';

type OrganKind = 'heart' | 'lungs' | 'brain';

function hasUsableWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

interface OrganMotionPanelProps {
  astronaut: Astronaut;
  latestVital: VitalReading | null;
  latestCheckIn?: CheckIn | null;
  rows: VitalReferenceRow[];
}

/**
 * Fits a procedural organ to the canvas so the whole shape stays visible at every
 * viewport size instead of inheriting hand-tuned per-model scales.
 */
function FittedOrgan({ fitKey, children }: { fitKey: OrganKind; children: ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);

  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group || !camera?.isPerspectiveCamera || width === 0 || height === 0) return;

    group.scale.setScalar(1);
    group.position.set(0, 0, 0);
    group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(group);
    if (box.isEmpty()) return;

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const verticalFov = (camera.fov * Math.PI) / 180;
    const visibleHeight = 2 * Math.tan(verticalFov / 2) * Math.abs(camera.position.z);
    const visibleWidth = visibleHeight * (width / height);
    // Small canvases carry the tab and overlay rows, so leave more margin there.
    const target = width < 640 ? 0.72 : 0.86;
    const scale = Math.min(
      (visibleHeight * target) / Math.max(size.y, 1e-4),
      (visibleWidth * target) / Math.max(size.x, 1e-4)
    );
    if (!Number.isFinite(scale) || scale <= 0) return;

    group.scale.setScalar(scale);
    group.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
  }, [camera, width, height, fitKey]);

  return <group ref={groupRef}>{children}</group>;
}

const ORGAN_LABEL: Record<OrganKind, string> = {
  heart: 'Heart',
  lungs: 'Lungs',
  brain: 'Brain',
};

function provenanceTone(isDemonstration: boolean): string {
  return isDemonstration
    ? 'border-[#ca8a04]/40 bg-[#422006]/60 text-[#fde68a]'
    : 'border-[#22d3ee]/30 bg-[#083344]/60 text-[#a5f3fc]';
}

/**
 * Large, borderless illustrative organ monitor. All geometry is original procedural
 * geometry — no third-party anatomical model is shipped. Every motion is a stylized proxy;
 * a highlighted organ is a related body system, never a disease location.
 */
export function OrganMotionPanel({
  astronaut,
  latestVital,
  latestCheckIn = null,
  rows,
}: OrganMotionPanelProps) {
  const reducedMotion = useReducedMotion();
  const [organ, setOrgan] = useState<OrganKind>('heart');
  const [userPaused, setUserPaused] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [inView, setInView] = useState(true);
  const [tabHidden, setTabHidden] = useState(
    typeof document !== 'undefined' ? document.visibilityState === 'hidden' : false
  );
  const [webglAvailable] = useState(hasUsableWebGL);
  const containerRef = useRef<HTMLDivElement>(null);

  const findings = useMemo(() => buildOrganFindings(rows), [rows]);
  const missingNames = useMemo(() => buildMissingMeasurementNames(rows), [rows]);
  const systemStatuses = useMemo(() => buildOrganSystemStatuses(rows), [rows]);

  const simulatedRunning = useSimulatedTelemetryStore((state) => state.running);
  const simulatedScenario = useSimulatedTelemetryStore((state) => state.scenario);
  const simulatedSubjectId = useSimulatedTelemetryStore((state) => state.astronautId);
  const ensureSubject = useSimulatedTelemetryStore((state) => state.ensureSubject);
  const latestSimulated = useSimulatedTelemetryStore((state) =>
    state.points.length > 0 ? state.points[state.points.length - 1] : null
  );
  const latestBp = useSimulatedTelemetryStore((state) =>
    state.bpSamples.length > 0 ? state.bpSamples[state.bpSamples.length - 1] : null
  );

  const simulatedLinked =
    simulatedRunning && simulatedSubjectId === astronaut.id && latestSimulated != null;
  const scenarioMeta = getSimulationScenario(simulatedScenario);

  const heartTiming: OrganMotionTiming = useMemo(
    () =>
      resolveHeartTiming({
        simulatedHeartRateBpm: simulatedLinked ? latestSimulated?.heartRateBpm ?? null : null,
        recordedHeartRateBpm: latestVital?.heartRateBpm ?? null,
        recordedTimestampIso: latestVital?.timestampIso ?? null,
      }),
    [simulatedLinked, latestSimulated?.heartRateBpm, latestVital?.heartRateBpm, latestVital?.timestampIso]
  );

  const lungTiming: OrganMotionTiming = useMemo(
    () =>
      resolveLungTiming({
        recordedRespiratoryRatePerMin: recordedRespiratoryRateFrom(latestVital),
      }),
    [latestVital]
  );

  const brainTiming: BrainActivityTiming = useMemo(
    () =>
      resolveBrainTiming({
        simulatedScenario: simulatedLinked ? simulatedScenario : null,
        recordedCognitiveFocus: latestCheckIn?.cognitiveFocus ?? null,
      }),
    [simulatedLinked, simulatedScenario, latestCheckIn?.cognitiveFocus]
  );

  useEffect(() => {
    const primary = findings[0] ?? null;
    setSelectedRowId(primary?.rowId ?? null);
    if (primary?.modelLink) setOrgan(primary.modelLink);
  }, [astronaut.id, findings]);

  useEffect(() => {
    const onVisibility = () => setTabHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => setInView(entries.some((entry) => entry.isIntersecting)),
      { threshold: 0.05 }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const selectedFinding = findings.find((finding) => finding.rowId === selectedRowId) ?? null;
  const renderMode = resolveOrganRenderMode({
    webglAvailable,
    reducedMotion,
    paused: userPaused,
    visible: inView && !tabHidden,
  });
  const isAnimating = renderMode === 'animated';

  const selectFinding = useCallback(
    (rowId: string) => {
      setSelectedRowId(rowId);
      const finding = findings.find((item) => item.rowId === rowId);
      if (finding?.modelLink) setOrgan(finding.modelLink);
    },
    [findings]
  );

  const textEquivalent = describeOrganMotionText({
    organ,
    heart: heartTiming,
    lungs: lungTiming,
    brain: brainTiming,
    selectedFinding,
    renderMode,
  });

  const currentTiming = organ === 'heart' ? heartTiming : organ === 'lungs' ? lungTiming : brainTiming;
  const currentRateLabel =
    organ === 'heart'
      ? `${heartTiming.ratePerMinute} beats/min`
      : organ === 'lungs'
      ? `${lungTiming.ratePerMinute} breaths/min`
      : `${brainTiming.ratePerMinute} activity pulses/min`;

  const systemStatus = organ === 'lungs' ? systemStatuses.respiratory : systemStatuses.cardiovascular;
  const selectedSystem = selectedFinding?.system ?? null;
  const isSelectedOnCurrentOrgan =
    selectedSystem?.model != null && selectedSystem.model === organ;

  const startStream = () => {
    ensureSubject(astronaut.id, {
      seed: hashSeed(astronaut.id),
      baseHeartRateBpm: astronaut.baseline.restingHeartRateBpm,
      baseSpo2Percent: astronaut.baseline.spo2Percent,
      baseSystolicBpMmHg: astronaut.baseline.systolicBpMmHg,
      baseDiastolicBpMmHg: astronaut.baseline.diastolicBpMmHg,
      astronautId: astronaut.id,
    });
  };

  return (
    <section
      ref={containerRef}
      aria-labelledby="organ-motion-heading"
      className="space-y-3"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="organ-motion-heading" className="arogya-h2 text-[var(--arogya-text-primary)]">
            Illustrative Organ Monitor
          </h2>
          <p className="mt-0.5 text-xs text-[var(--arogya-text-secondary)]">
            Original procedural heart, lung and brain geometry. Motion is a stylized proxy, never
            diagnostic imaging.
          </p>
        </div>
        <span className="rounded border border-[var(--arogya-caution-border)] bg-[var(--arogya-caution-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--arogya-caution-text)]">
          {ORGAN_MOTION_DISCLAIMER}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Large borderless organ stage */}
        <div className="overflow-hidden rounded-2xl border border-[#1e293b] lg:col-span-7">
          <div className="relative h-[360px] w-full sm:h-[460px] lg:h-[560px]">
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                backgroundImage:
                  'radial-gradient(ellipse 60% 55% at 50% 46%, rgba(30,64,110,.55), transparent 72%), radial-gradient(ellipse 90% 70% at 50% 110%, rgba(8,145,178,.18), transparent 70%), linear-gradient(180deg, #050b18 0%, #071322 60%, #04101c 100%)',
              }}
            />

            <div className="absolute inset-x-3 top-3 z-10 flex flex-wrap items-center justify-between gap-2">
              <div
                role="tablist"
                aria-label="Organ illustration"
                className="inline-flex items-center gap-1 rounded-xl border border-white/12 bg-[#050b18]/80 p-1 backdrop-blur-sm"
              >
                {(
                  [
                    { id: 'heart', label: 'Heart', icon: Heart },
                    { id: 'lungs', label: 'Lungs', icon: Wind },
                    { id: 'brain', label: 'Brain', icon: Brain },
                  ] as const
                ).map((tab) => {
                  const Icon = tab.icon;
                  const active = organ === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setOrgan(tab.id)}
                      className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors ${
                        active
                          ? 'bg-[#22d3ee] text-[#03141c]'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                    simulatedLinked
                      ? 'border-[#22d3ee]/40 bg-[#083344]/70 text-[#a5f3fc]'
                      : 'border-white/15 bg-[#050b18]/80 text-slate-300'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      simulatedLinked ? 'animate-pulse bg-[#22d3ee]' : 'bg-slate-500'
                    }`}
                    aria-hidden="true"
                  />
                  {simulatedLinked ? 'Simulated live' : 'Recorded / demonstration'}
                </span>
                <button
                  type="button"
                  onClick={() => setUserPaused((prev) => !prev)}
                  aria-pressed={userPaused}
                  disabled={reducedMotion}
                  aria-label={userPaused || reducedMotion ? 'Resume organ animation' : 'Pause organ animation'}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-[#050b18]/80 text-slate-200 transition-colors hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {userPaused || reducedMotion ? (
                    <Play className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {renderMode === 'fallback' ? (
              <StaticOrganFallback organ={organ} animating={false} />
            ) : (
              <Canvas
                frameloop={isAnimating ? 'always' : 'never'}
                dpr={[1, 1.6]}
                camera={{ position: [0, 0, 0.95], fov: 42 }}
                gl={{ antialias: true, alpha: true }}
                fallback={<StaticOrganFallback organ={organ} animating={false} />}
                aria-label={
                  organ === 'heart'
                    ? 'Animated illustration of a stylized heart with chambers and valve rings'
                    : organ === 'lungs'
                    ? 'Animated illustration of stylized lungs expanding and contracting'
                    : 'Animated illustration of a stylized brain with subtle illustrative activity pulses'
                }
              >
                <ambientLight intensity={1.1} />
                <directionalLight position={[2, 3, 4]} intensity={1.7} />
                <directionalLight position={[-2, -1, -3]} intensity={0.6} color="#93c5fd" />
                <pointLight position={[0, 0.3, 0.6]} intensity={0.5} color="#67e8f9" distance={2} />
                <FittedOrgan fitKey={organ}>
                  {organ === 'heart' ? (
                    <ProceduralHeartModel
                      status={systemStatuses.cardiovascular}
                      selected={isSelectedOnCurrentOrgan}
                      reducedMotion={reducedMotion}
                      beatHz={heartTiming.hertz}
                      paused={!isAnimating}
                    />
                  ) : organ === 'lungs' ? (
                    <ProceduralLungsModel
                      status={systemStatuses.respiratory}
                      selected={isSelectedOnCurrentOrgan}
                      reducedMotion={reducedMotion}
                      breathHz={lungTiming.hertz}
                      paused={!isAnimating}
                    />
                  ) : (
                    <ProceduralBrainModel
                      status="green"
                      selected={false}
                      reducedMotion={reducedMotion}
                      activityHz={brainTiming.hertz}
                      paused={!isAnimating}
                    />
                  )}
                </FittedOrgan>
              </Canvas>
            )}

            <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 flex flex-wrap items-end justify-between gap-2">
              <div className="rounded-xl border border-white/10 bg-[#050b18]/85 px-3 py-2 backdrop-blur-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  {ORGAN_LABEL[organ]} illustration
                </p>
                <p className="font-mono-tabular text-lg font-semibold text-white">{currentRateLabel}</p>
                <p className="hidden max-w-[22rem] text-[10px] leading-snug text-slate-400 sm:block">
                  {currentTiming.sourceLabel}
                </p>
              </div>
              <span className="hidden rounded border border-white/15 bg-[#050b18]/85 px-1.5 py-0.5 font-mono-tabular text-[9px] uppercase tracking-wider text-slate-400 sm:inline">
                {renderMode === 'animated' ? 'Motion running' : renderMode === 'static' ? 'Still frame' : 'Static fallback'}
              </span>
            </div>
          </div>
        </div>

        {/* Live / recorded readout beside the organ */}
        <div className="min-w-0 space-y-3 lg:col-span-5">
          {organ === 'brain' ? (
            <BrainReadout
              latestCheckIn={latestCheckIn}
              simulatedLinked={simulatedLinked}
              scenarioLabel={simulatedLinked ? scenarioMeta.label : null}
              brainTiming={brainTiming}
            />
          ) : (
            <VitalsReadout
              organ={organ}
              latestVital={latestVital}
              simulatedHeartRate={simulatedLinked ? latestSimulated?.heartRateBpm ?? null : null}
              simulatedSpo2={simulatedLinked ? latestSimulated?.spo2Percent ?? null : null}
              simulatedBp={
                simulatedLinked && latestBp
                  ? `${latestBp.systolicBpMmHg}/${latestBp.diastolicBpMmHg}`
                  : null
              }
              heartTiming={heartTiming}
              lungTiming={lungTiming}
              systemStatus={systemStatus}
            />
          )}

          <div className="rounded-2xl border border-[#1e293b] bg-[#050b18] p-3 text-slate-100">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#a5f3fc]">
              Related body system
            </h3>
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
              A highlighted organ means “related body system”, never “disease located here”.
            </p>

            {findings.length === 0 ? (
              <p className="mt-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-2 text-[11px] text-emerald-200">
                No recorded measurement in this window is currently flagged.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {findings.map((finding) => {
                  const active = finding.rowId === selectedRowId;
                  return (
                    <li key={finding.rowId}>
                      <button
                        type="button"
                        onClick={() => selectFinding(finding.rowId)}
                        aria-pressed={active}
                        className={`flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left text-[11px] transition-colors ${
                          active
                            ? 'border-[#22d3ee]/50 bg-[#22d3ee]/10'
                            : 'border-white/10 bg-white/[0.03] hover:border-white/25'
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block font-semibold text-slate-100">
                            {finding.measurementName} · {finding.valueLabel}
                          </span>
                          <span className="block text-slate-400">
                            {finding.system.label}
                            {finding.modelLink ? ' — organ illustration available' : ' — text only'}
                          </span>
                        </span>
                        <span className="rounded border border-white/15 px-1.5 py-0.5 font-mono-tabular text-[9px] uppercase text-slate-300">
                          {finding.statusLabel}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {selectedFinding && (
              <dl className="mt-2 space-y-1.5 border-t border-white/10 pt-2 text-[11px]">
                <div>
                  <dt className="text-[9px] uppercase tracking-wider text-slate-500">Flag rationale</dt>
                  <dd className="text-slate-300">
                    {selectedFinding.flagRationale} Compared with {selectedFinding.generalReferenceRange}.
                  </dd>
                </div>
                <div>
                  <dt className="text-[9px] uppercase tracking-wider text-slate-500">Why this system</dt>
                  <dd className="text-slate-300">{selectedFinding.system.relationship}</dd>
                </div>
                <div>
                  <dt className="text-[9px] uppercase tracking-wider text-slate-500">
                    Escalation threshold
                  </dt>
                  <dd className="text-slate-300">{selectedFinding.escalationThreshold}</dd>
                </div>
              </dl>
            )}

            {missingNames.length > 0 && (
              <p className="mt-2 text-[10px] leading-snug text-amber-200/85">
                No recorded value for: {missingNames.join(', ')}. Missing data is not interpreted here.
              </p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {!simulatedRunning && (
                <button
                  type="button"
                  onClick={startStream}
                  className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg bg-[#22d3ee] px-2.5 text-[11px] font-bold text-[#03141c] transition-colors hover:bg-[#67e8f9]"
                >
                  <Play className="h-3.5 w-3.5" aria-hidden="true" /> Start simulated stream
                </button>
              )}
              <details className="min-w-0 flex-1 text-[10px] text-slate-500">
                <summary className="flex cursor-pointer items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  <Info className="h-3 w-3" aria-hidden="true" /> Limitations
                </summary>
                <ul className="mt-1 list-disc space-y-1 pl-4 leading-relaxed">
                  {ORGAN_MOTION_LIMITATIONS.map((limitation) => (
                    <li key={limitation}>{limitation}</li>
                  ))}
                </ul>
              </details>
            </div>
          </div>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {textEquivalent}
      </p>
    </section>
  );
}

function ReadoutTile({
  label,
  value,
  unit,
  note,
}: {
  label: string;
  value: string;
  unit?: string;
  note: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="font-mono-tabular text-xl font-semibold text-white">{value}</span>
        {unit && <span className="font-mono-tabular text-[10px] text-slate-400">{unit}</span>}
      </div>
      <p className="mt-0.5 text-[10px] leading-snug text-slate-400">{note}</p>
    </div>
  );
}

function VitalsReadout({
  organ,
  latestVital,
  simulatedHeartRate,
  simulatedSpo2,
  simulatedBp,
  heartTiming,
  lungTiming,
  systemStatus,
}: {
  organ: 'heart' | 'lungs';
  latestVital: VitalReading | null;
  simulatedHeartRate: number | null;
  simulatedSpo2: number | null;
  simulatedBp: string | null;
  heartTiming: OrganMotionTiming;
  lungTiming: OrganMotionTiming;
  systemStatus: 'green' | 'yellow' | 'orange' | 'red';
}) {
  const hr = simulatedHeartRate ?? latestVital?.heartRateBpm ?? null;
  const spo2 = simulatedSpo2 ?? latestVital?.spo2Percent ?? null;
  const bp =
    simulatedBp ??
    (latestVital?.systolicBpMmHg != null && latestVital?.diastolicBpMmHg != null
      ? `${latestVital.systolicBpMmHg}/${latestVital.diastolicBpMmHg}`
      : null);
  const rr = recordedRespiratoryRateFrom(latestVital);
  const provenance = simulatedHeartRate != null ? 'simulated stream' : 'recorded observation';

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#050b18] p-3 text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#a5f3fc]">
          {organ === 'heart' ? 'Cardiovascular readout' : 'Respiratory readout'}
        </h3>
        <span
          className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
            simulatedHeartRate != null
              ? 'border-[#22d3ee]/40 bg-[#083344]/60 text-[#a5f3fc]'
              : 'border-white/15 text-slate-400'
          }`}
        >
          {simulatedHeartRate != null ? 'Simulated live' : 'Recorded'}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <ReadoutTile
          label={simulatedHeartRate != null ? 'Simulated heart rate' : 'Recorded heart rate'}
          value={hr != null ? String(hr) : 'MISSING'}
          unit="bpm"
          note={
            simulatedHeartRate != null
              ? 'Volatile demonstration value; never saved.'
              : hr != null
              ? `Latest recorded${latestVital?.missionDay != null ? ` · Day ${latestVital.missionDay}` : ''}`
              : 'No recorded value in this window.'
          }
        />
        <ReadoutTile
          label={simulatedSpo2 != null ? 'Simulated SpO₂' : 'Recorded SpO₂'}
          value={spo2 != null ? spo2.toFixed(1) : 'MISSING'}
          unit="%"
          note={
            simulatedSpo2 != null
              ? 'From the simulated stream only.'
              : spo2 != null
              ? 'Latest recorded pulse oximetry.'
              : 'No recorded value in this window.'
          }
        />
        <ReadoutTile
          label="Blood pressure"
          value={bp ?? 'MISSING'}
          unit="mmHg"
          note={
            simulatedBp != null
              ? 'Intermittent simulated cuff sample.'
              : bp != null
              ? 'Latest recorded cuff reading.'
              : 'No recorded pair.'
          }
        />
        <ReadoutTile
          label="Respiratory rate"
          value={rr != null ? String(rr) : 'MISSING'}
          unit="/min"
          note={
            rr != null
              ? 'Recorded respiratory-rate observation.'
              : 'No respiratory-rate observation recorded.'
          }
        />
      </div>

      <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
          Animation provenance
        </p>
        <p className="mt-0.5 text-[10px] leading-relaxed text-slate-300">
          {organ === 'heart' ? heartTiming.sourceLabel : lungTiming.sourceLabel}.
        </p>
        <p className="mt-1 text-[10px] text-slate-500">
          Related system status: {systemStatus} · {provenance}. Not a diagnosis or disease location.
        </p>
      </div>
    </div>
  );
}

function BrainReadout({
  latestCheckIn,
  simulatedLinked,
  scenarioLabel,
  brainTiming,
}: {
  latestCheckIn: CheckIn | null;
  simulatedLinked: boolean;
  scenarioLabel: string | null;
  brainTiming: BrainActivityTiming;
}) {
  const focus = latestCheckIn?.cognitiveFocus ?? null;
  const fatigue = latestCheckIn?.fatigueLevel ?? null;
  const sleep = latestCheckIn?.sleepHours ?? null;

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#050b18] p-3 text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#a5f3fc]">
          Behavioral readout
        </h3>
        <span className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${provenanceTone(brainTiming.isDemonstration)}`}>
          {brainTiming.source === 'simulated_workload'
            ? 'Simulated workload'
            : brainTiming.source === 'recorded_focus'
            ? 'Recorded check-in'
            : 'Demonstration'}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <ReadoutTile
          label="Cognitive focus"
          value={focus != null ? `${focus}/5` : 'MISSING'}
          note={
            focus != null
              ? `Self-reported${latestCheckIn?.missionDay != null ? ` · Day ${latestCheckIn.missionDay}` : ''}. Not a cognitive test.`
              : 'No check-in value recorded.'
          }
        />
        <ReadoutTile
          label="Fatigue"
          value={fatigue != null ? `${fatigue}/5` : 'MISSING'}
          note="Self-reported check-in value. Not a sleep-disorder assessment."
        />
        <ReadoutTile
          label="Sleep"
          value={sleep != null ? sleep.toFixed(1) : 'MISSING'}
          unit="h"
          note="Recorded from the daily check-in."
        />
        <ReadoutTile
          label="Workload scenario"
          value={simulatedLinked && scenarioLabel ? scenarioLabel : 'None'}
          note="Simulated scenario pacing only; no live workload measurement."
        />
      </div>

      <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
          Brain illustration provenance
        </p>
        <p className="mt-0.5 text-[10px] leading-relaxed text-slate-300">{brainTiming.sourceLabel}.</p>
        <p className="mt-1 text-[10px] leading-relaxed text-amber-200/80">
          No EEG, neuroimaging or mental-health measurement exists in this build. The model shows a
          generic activity rhythm and cannot localize function, injury or disease.
        </p>
      </div>
    </div>
  );
}

/** Visible rendering fallback when WebGL is unavailable or a canvas cannot start. */
function StaticOrganFallback({ organ, animating }: { organ: OrganKind; animating: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center">
      <div
        className={`h-32 w-32 ${animating ? 'animate-pulse' : ''}`}
        aria-hidden="true"
        style={{ animationDuration: '2.4s' }}
      >
        {organ === 'heart' ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="1.2">
            <path d="M12 20s-7-4.3-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.7-7 9-7 9z" />
            <path d="M12 8.4v7.2" strokeOpacity="0.5" />
            <ellipse cx="8.7" cy="10" rx="1.4" ry="1" strokeOpacity="0.6" />
            <ellipse cx="15.3" cy="10.6" rx="1.3" ry="1" strokeOpacity="0.6" />
          </svg>
        ) : organ === 'lungs' ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.2">
            <path d="M9 4v4.2c0 2.1-.9 3.3-2.2 4.6C5.5 14.1 5 15.3 5 16.8 5 19 6.6 20 8.2 20c1.6 0 3-1.1 3-3.2V4" />
            <path d="M15 4v4.2c0 2.1.9 3.3 2.2 4.6 1.3 1.3 1.8 2.5 1.8 4 0 2.2-1.6 3.2-3.2 3.2-1.6 0-3-1.1-3-3.2V4" />
            <path d="M12 4v3" strokeOpacity="0.6" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="1.2">
            <path d="M12 4.5c-2.4-1.3-5-.4-6 1.6-.9 1.8-.3 4 1.3 5.3-.8 1.7-.2 3.8 1.4 4.9 1.1.8 2.5.9 3.3.2.8.7 2.2.6 3.3-.2 1.6-1.1 2.2-3.2 1.4-4.9 1.6-1.3 2.2-3.5 1.3-5.3-1-2-3.6-2.9-6-1.6z" />
            <path d="M12 4.5v10.5" strokeOpacity="0.5" />
            <path d="M8.5 9.5c1.2.6 2.3.6 3.5 0M15.5 9.5c-1.2.6-2.3.6-3.5 0" strokeOpacity="0.5" />
          </svg>
        )}
      </div>
      <p className="text-[11px] font-medium text-slate-200">
        Static {ORGAN_LABEL[organ].toLowerCase()} illustration
      </p>
      <p className="max-w-xs text-[10px] text-slate-400">
        3D is unavailable on this device. The readout and text summary carry the same information.
      </p>
    </div>
  );
}

/** Utility re-exported for the panel's tests / diagnostics. */
export { mapMeasurementToSystem };
