import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Heart, Info, Pause, Play, Wind } from 'lucide-react';
import type { Astronaut, VitalReading } from '../../types';
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
  resolveHeartTiming,
  resolveLungTiming,
  resolveOrganRenderMode,
} from '../../engine/organMotion';
import { ProceduralHeartModel, ProceduralLungsModel } from '../three/ProceduralOrganModels';
import { StatusPill, healthStatusToTone } from '../ui';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useSimulatedTelemetryStore } from '../../store/useSimulatedTelemetryStore';
import { hashSeed } from '../../utils/simulatedTelemetry';

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
  rows: VitalReferenceRow[];
}

/**
 * Small, self-contained illustrative heart/lung motion panel for the Vitals page.
 *
 * One compact canvas (never a full-page scene), pausable, reduced-motion aware, with a
 * visible non-WebGL fallback and a full text equivalent.
 */
export function OrganMotionPanel({ astronaut, latestVital, rows }: OrganMotionPanelProps) {
  const reducedMotion = useReducedMotion();
  const [organ, setOrgan] = useState<'heart' | 'lungs'>('heart');
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
  const simulatedSubjectId = useSimulatedTelemetryStore((state) => state.astronautId);
  const ensureSubject = useSimulatedTelemetryStore((state) => state.ensureSubject);
  const simulatedHeartRate = useSimulatedTelemetryStore((state) =>
    state.running && state.points.length > 0
      ? state.points[state.points.length - 1].heartRateBpm
      : null
  );

  const heartTiming = useMemo(
    () =>
      resolveHeartTiming({
        simulatedHeartRateBpm: simulatedRunning && simulatedSubjectId === astronaut.id ? simulatedHeartRate : null,
        recordedHeartRateBpm: latestVital?.heartRateBpm ?? null,
        recordedTimestampIso: latestVital?.timestampIso ?? null,
      }),
    [simulatedRunning, simulatedSubjectId, astronaut.id, simulatedHeartRate, latestVital?.heartRateBpm]
  );

  const lungTiming = useMemo(
    () =>
      resolveLungTiming({
        recordedRespiratoryRatePerMin: recordedRespiratoryRateFrom(latestVital),
      }),
    [latestVital]
  );

  // Default attention mapping: follow the most severe flagged measurement.
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

  const selectFinding = useCallback((rowId: string) => {
    setSelectedRowId(rowId);
    const finding = findings.find((item) => item.rowId === rowId);
    if (finding?.modelLink) setOrgan(finding.modelLink);
  }, [findings]);

  const textEquivalent = describeOrganMotionText({
    organ,
    heart: heartTiming,
    lungs: lungTiming,
    selectedFinding,
    renderMode,
  });

  const systemStatus = systemStatuses[organ === 'heart' ? 'cardiovascular' : 'respiratory'];
  const selectedSystem = selectedFinding?.system ?? null;
  const isSelectedOnCurrentOrgan =
    selectedSystem?.model != null && selectedSystem.model === organ;

  return (
    <section
      ref={containerRef}
      aria-labelledby="organ-motion-heading"
      className="space-y-3"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="organ-motion-heading" className="arogya-h2 text-[var(--arogya-text-primary)]">
            Illustrative Heart &amp; Lung Motion
          </h2>
          <span className="rounded border border-[var(--arogya-caution-border)] bg-[var(--arogya-caution-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--arogya-caution-text)]">
            {ORGAN_MOTION_DISCLAIMER}
          </span>
        </div>
        <span className="font-mono-tabular text-xs text-[var(--arogya-text-secondary)]">
          {astronaut.callSign} · stylized model
        </span>
      </div>

      <p className="text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
        A gentle, stylized pump/breathing cycle for orientation. Mesh scaling is a proxy for motion,
        not cardiac mechanics or gas exchange, and it is never used to measure or diagnose anything.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Model card */}
        <div className="rounded-xl border border-[var(--arogya-border)] bg-[var(--arogya-surface)] p-3 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div
              role="group"
              aria-label="Choose which organ illustration to show"
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] p-1"
            >
              <button
                type="button"
                onClick={() => setOrgan('heart')}
                aria-pressed={organ === 'heart'}
                className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-md px-3 text-xs font-medium ${
                  organ === 'heart'
                    ? 'bg-[#1E3A5F] text-white'
                    : 'text-[var(--arogya-text-secondary)] hover:text-[var(--arogya-text-primary)]'
                }`}
              >
                <Heart className="h-3.5 w-3.5" aria-hidden="true" />
                Heart
              </button>
              <button
                type="button"
                onClick={() => setOrgan('lungs')}
                aria-pressed={organ === 'lungs'}
                className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-md px-3 text-xs font-medium ${
                  organ === 'lungs'
                    ? 'bg-[#1E3A5F] text-white'
                    : 'text-[var(--arogya-text-secondary)] hover:text-[var(--arogya-text-primary)]'
                }`}
              >
                <Wind className="h-3.5 w-3.5" aria-hidden="true" />
                Lungs
              </button>
            </div>

            <button
              type="button"
              onClick={() => setUserPaused((prev) => !prev)}
              aria-pressed={userPaused}
              disabled={reducedMotion}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[var(--arogya-border-strong)] bg-white px-3 text-xs font-medium text-[var(--arogya-text-primary)] hover:bg-[var(--arogya-bg)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {userPaused || reducedMotion ? (
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Pause className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {userPaused || reducedMotion ? 'Resume animation' : 'Pause animation'}
            </button>
            {!simulatedRunning && (
              <button
                type="button"
                onClick={() => ensureSubject(astronaut.id, {
                  seed: hashSeed(astronaut.id),
                  baseHeartRateBpm: astronaut.baseline.restingHeartRateBpm,
                  baseSpo2Percent: astronaut.baseline.spo2Percent,
                  baseSystolicBpMmHg: astronaut.baseline.systolicBpMmHg,
                  baseDiastolicBpMmHg: astronaut.baseline.diastolicBpMmHg,
                })}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[var(--arogya-border-strong)] bg-white px-3 text-xs font-medium text-[var(--arogya-text-primary)] hover:bg-[var(--arogya-bg)]"
              >
                <Play className="h-3.5 w-3.5" aria-hidden="true" /> Start simulated stream
              </button>
            )}
          </div>

          <div className="mt-2 h-[230px] overflow-hidden rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-bg)]">
            {renderMode === 'fallback' ? (
              <StaticOrganFallback organ={organ} animating={false} />
            ) : (
              <Canvas
                frameloop={isAnimating ? 'always' : 'never'}
                dpr={[1, 1.5]}
                camera={{ position: [0, 0, 0.95], fov: 42 }}
                gl={{ antialias: true, alpha: true }}
                fallback={<StaticOrganFallback organ={organ} animating={false} />}
                aria-label={
                  organ === 'heart'
                    ? 'Animated illustration of a stylized heart contracting and relaxing'
                    : 'Animated illustration of stylized lungs expanding and contracting'
                }
              >
                <ambientLight intensity={1.1} />
                <directionalLight position={[2, 3, 4]} intensity={1.5} />
                <directionalLight position={[-2, -1, -3]} intensity={0.5} color="#93c5fd" />
                {organ === 'heart' ? (
                  <ProceduralHeartModel
                    status={systemStatuses.cardiovascular}
                    selected={isSelectedOnCurrentOrgan}
                    reducedMotion={reducedMotion}
                    beatHz={heartTiming.hertz}
                    paused={!isAnimating}
                  />
                ) : (
                  <ProceduralLungsModel
                    status={systemStatuses.respiratory}
                    selected={isSelectedOnCurrentOrgan}
                    reducedMotion={reducedMotion}
                    breathHz={lungTiming.hertz}
                    paused={!isAnimating}
                  />
                )}
              </Canvas>
            )}
          </div>

          <dl className="mt-2 space-y-1 text-[11px]">
            <div className="flex items-start justify-between gap-3">
              <dt className="shrink-0 font-medium text-[var(--arogya-text-secondary)]">Heart cycle</dt>
              <dd className="text-right text-[var(--arogya-text-primary)]">
                {heartTiming.sourceLabel}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="shrink-0 font-medium text-[var(--arogya-text-secondary)]">Breathing cycle</dt>
              <dd className="text-right text-[var(--arogya-text-primary)]">{lungTiming.sourceLabel}</dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="shrink-0 font-medium text-[var(--arogya-text-secondary)]">Playback</dt>
              <dd className="text-right text-[var(--arogya-text-secondary)]">
                {renderMode === 'fallback'
                  ? '3D unavailable — static illustration shown'
                  : isAnimating
                  ? 'Running'
                  : reducedMotion
                  ? 'Paused (reduced motion enabled)'
                  : userPaused
                  ? 'Paused by you — still frame'
                  : tabHidden
                  ? 'Paused (browser tab hidden)'
                  : 'Paused (panel off-screen)'}
              </dd>
            </div>
          </dl>

          <p className="sr-only" aria-live="polite">
            {textEquivalent}
          </p>
        </div>

        {/* Related body system card */}
        <div className="rounded-xl border border-[var(--arogya-border)] bg-[var(--arogya-surface)] p-3 lg:col-span-5">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#1E3A5F]">
            Related body system
          </h3>
          <p className="mt-0.5 text-[11px] text-[var(--arogya-text-secondary)]">
            A highlighted organ is the <strong>related body system</strong> for a flagged
            measurement — not a disease location.
          </p>

          {findings.length === 0 ? (
            <p className="mt-3 rounded-lg border border-[var(--arogya-success-border)] bg-[var(--arogya-success-soft)] px-3 py-2 text-xs text-[var(--arogya-success-text)]">
              No measurement in this window is currently flagged, so no system is highlighted.
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
                      className={`flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left text-xs ${
                        active
                          ? 'border-[#1E3A5F] bg-[#1E3A5F]/[0.06]'
                          : 'border-[var(--arogya-border)] bg-white hover:border-[var(--arogya-border-strong)]'
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block font-medium text-[var(--arogya-text-primary)]">
                          {finding.measurementName} · {finding.valueLabel}
                        </span>
                        <span className="block text-[11px] text-[var(--arogya-text-secondary)]">
                          {finding.system.label}
                          {finding.modelLink ? ' — organ model available' : ' — text only'}
                        </span>
                      </span>
                      <StatusPill
                        tone={healthStatusToTone(finding.status)}
                        label={finding.statusLabel}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {selectedFinding ? (
            <div className="mt-3 space-y-2 border-t border-[var(--arogya-border)] pt-2.5 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-[var(--arogya-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--arogya-text-primary)]">
                  {selectedFinding.system.label}
                </span>
                {selectedFinding.modelLink && selectedFinding.modelLink !== organ && (
                  <button
                    type="button"
                    onClick={() => setOrgan(selectedFinding.modelLink!)}
                    className="text-[11px] font-semibold text-[var(--arogya-info)] underline underline-offset-2"
                  >
                    Show {selectedFinding.modelLink} illustration
                  </button>
                )}
              </div>

              <dl className="space-y-1">
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-[var(--arogya-text-muted)]">
                    Source measurement
                  </dt>
                  <dd className="text-[var(--arogya-text-primary)]">
                    {selectedFinding.measurementName} · {selectedFinding.valueLabel}
                    {selectedFinding.latestDay != null ? ` · Mission Day ${selectedFinding.latestDay}` : ''}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-[var(--arogya-text-muted)]">
                    Flag rationale
                  </dt>
                  <dd className="text-[var(--arogya-text-secondary)]">
                    {selectedFinding.flagRationale} Compared with {selectedFinding.generalReferenceRange}.
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-[var(--arogya-text-muted)]">
                    Why this system
                  </dt>
                  <dd className="text-[var(--arogya-text-secondary)]">
                    {selectedFinding.system.relationship}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-[var(--arogya-text-muted)]">
                    Escalation threshold
                  </dt>
                  <dd className="text-[var(--arogya-text-secondary)]">
                    {selectedFinding.escalationThreshold}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}

          <div className="mt-3 rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-bg)] p-2.5">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--arogya-text-muted)]">
              <Info className="h-3 w-3" aria-hidden="true" />
              Limitations
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] leading-relaxed text-[var(--arogya-text-secondary)]">
              {ORGAN_MOTION_LIMITATIONS.slice(0, 4).map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
            {missingNames.length > 0 && (
              <p className="mt-1.5 text-[11px] text-[var(--arogya-warning-text)]">
                No recorded value for: {missingNames.join(', ')}. Missing data is not interpreted by
                this panel.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Text equivalent for every finding, available to all users */}
      <div className="rounded-xl border border-[var(--arogya-border)] bg-[var(--arogya-surface)] p-3">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#1E3A5F]">
          Text summary of the illustration
        </h3>
        <ul className="mt-1.5 space-y-1 text-xs text-[var(--arogya-text-primary)]">
          <li>
            Heart: gentle contraction/relaxation at {heartTiming.ratePerMinute} per minute ·{' '}
            {heartTiming.sourceLabel}.
          </li>
          <li>
            Lungs: gentle expansion/contraction at {lungTiming.ratePerMinute} breaths per minute ·{' '}
            {lungTiming.sourceLabel}.
          </li>
          {findings.length > 0 ? (
            findings.map((finding) => (
              <li key={finding.rowId}>
                {finding.measurementName} {finding.valueLabel}: {finding.statusLabel} · related body
                system {finding.system.label}
                {finding.modelLink
                  ? ` · ${finding.modelLink} illustration highlights this system`
                  : ' · no organ model for this system (text only)'}
                .
              </li>
            ))
          ) : (
            <li>No flagged measurements in the selected window.</li>
          )}
          <li>{ORGAN_MOTION_DISCLAIMER} A highlighted organ is never a disease location.</li>
        </ul>
      </div>
    </section>
  );
}

/** Visible rendering fallback when WebGL is unavailable or a canvas cannot start. */
function StaticOrganFallback({
  organ,
  animating,
}: {
  organ: 'heart' | 'lungs';
  animating: boolean;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center">
      <div
        className={`h-24 w-24 ${animating ? 'animate-pulse' : ''}`}
        aria-hidden="true"
        style={{ animationDuration: '2.4s' }}
      >
        {organ === 'heart' ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="1.4">
            <path d="M12 20s-7-4.3-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.7-7 9-7 9z" />
            <path d="M12 8.4v7.2" strokeOpacity="0.5" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="1.4">
            <path d="M9 4v4.2c0 2.1-.9 3.3-2.2 4.6C5.5 14.1 5 15.3 5 16.8 5 19 6.6 20 8.2 20c1.6 0 3-1.1 3-3.2V4" />
            <path d="M15 4v4.2c0 2.1.9 3.3 2.2 4.6 1.3 1.3 1.8 2.5 1.8 4 0 2.2-1.6 3.2-3.2 3.2-1.6 0-3-1.1-3-3.2V4" />
            <path d="M12 4v3" strokeOpacity="0.6" />
          </svg>
        )}
      </div>
      <p className="text-[11px] font-medium text-[var(--arogya-text-primary)]">
        {organ === 'heart' ? 'Static heart illustration' : 'Static lung illustration'}
      </p>
      <p className="text-[10px] text-[var(--arogya-text-secondary)]">
        Interactive 3D is unavailable on this device. The text summary below conveys the same
        information.
      </p>
    </div>
  );
}

/** Utility re-exported for the panel's tests / diagnostics. */
export { mapMeasurementToSystem };
