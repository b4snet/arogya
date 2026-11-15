import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { Info, Loader2, Pause, Play, RotateCcw, TriangleAlert } from 'lucide-react';
import type { CalculatedMissionTelemetry } from '../../engine/missionOrbitEngine';
import {
  MISSION_NOT_LIVE_NOTE,
  MISSION_SCENE_LABELS,
  buildMissionSceneOverlay,
  describeVehicleDisplayLabel,
  describeVehicleLoadState,
  initialScenePaused,
  resolveSceneMotionMode,
  resolveVehicleModelCandidates,
  starCountForViewport,
  type VehicleModelSource,
} from '../../engine/missionScene';
import { VehicleGltfModel, type VehicleModelResult } from '../three/VehicleGltfModel';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import {
  MissionSceneFallback,
  type MissionSceneFailure,
} from './MissionSceneFallback';
import { ProgrammeErizonAttribution } from './ProgrammeErizonAttribution';

class MissionCanvasBoundary extends Component<{
  children: ReactNode;
  fallback: ReactNode;
  onError: () => void;
}, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

function CanvasContextLossMonitor({ onLost }: { onLost: () => void }) {
  const gl = useThree((state) => state.gl);

  useEffect(() => {
    const canvas = gl.domElement;
    const handleLost = (event: Event) => {
      event.preventDefault();
      onLost();
    };
    canvas.addEventListener('webglcontextlost', handleLost);
    return () => canvas.removeEventListener('webglcontextlost', handleLost);
  }, [gl, onLost]);

  return null;
}

function FrameInvalidator({ revision }: { revision: number }) {
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    invalidate();
  }, [invalidate, revision]);

  return null;
}

/* ------------------------------------------------------------------ scene parts */

function StarField({ count, animate }: { count: number; animate: boolean }) {
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const array = new Float32Array(count * 3);
    // Deterministic pseudo-random shell so the field looks the same on every visit.
    let seed = 1337;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (let i = 0; i < count; i += 1) {
      const radius = 13 + rand() * 14;
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      array[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      array[i * 3 + 1] = radius * Math.cos(phi);
      array[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    return array;
  }, [count]);

  useFrame((_state, delta) => {
    if (!animate || !ref.current) return;
    ref.current.rotation.y += delta * 0.004;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#e2e8f0" size={0.075} sizeAttenuation transparent opacity={0.85} />
    </points>
  );
}

function DistantPlanet() {
  return (
    <group position={[-8.2, 3.6, -16]}>
      <mesh>
        <sphereGeometry args={[3.1, 32, 32]} />
        <meshStandardMaterial color="#9a3412" roughness={0.85} metalness={0.05} />
      </mesh>
      {/* Soft atmospheric rim */}
      <mesh scale={1.035}>
        <sphereGeometry args={[3.1, 24, 24]} />
        <meshBasicMaterial color="#fb923c" transparent opacity={0.08} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

function DistantRocks({ animate }: { animate: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const rocks = useMemo(
    () =>
      [
        { p: [5.4, -2.1, -6.5], s: 0.16 },
        { p: [-4.6, 1.6, -7.4], s: 0.11 },
        { p: [3.2, 2.7, -9.2], s: 0.09 },
        { p: [-6.1, -2.4, -10.5], s: 0.2 },
        { p: [6.8, 1.1, -11.4], s: 0.13 },
        { p: [-2.4, -3.1, -8.8], s: 0.07 },
      ] as const,
    []
  );

  useFrame((_state, delta) => {
    if (!animate || !groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.012;
  });

  return (
    <group ref={groupRef}>
      {rocks.map((rock, index) => (
        <mesh key={index} position={rock.p as unknown as [number, number, number]} scale={rock.s}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#64748b" roughness={0.9} metalness={0.1} />
        </mesh>
      ))}
    </group>
  );
}

function ShipRig({
  rigRef,
  animate,
  children,
}: {
  rigRef: React.RefObject<THREE.Group | null>;
  animate: boolean;
  children: React.ReactNode;
}) {
  useFrame((state, delta) => {
    if (!animate || !rigRef.current) return;
    rigRef.current.rotation.y += delta * 0.055;
    const t = state.clock.getElapsedTime();
    rigRef.current.position.y = Math.sin(t * 0.35) * 0.035;
    rigRef.current.rotation.z = Math.sin(t * 0.22) * 0.012;
  });

  return (
    <group ref={rigRef} rotation={[0.08, -0.35, 0]}>
      {children}
    </group>
  );
}

function AdaptiveSceneFraming({ radius }: { radius: number }) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const size = useThree((state) => state.size);

  useEffect(() => {
    if (!camera?.isPerspectiveCamera) return;
    const verticalFov = (camera.fov * Math.PI) / 180;
    const aspect = Math.max(size.width, 1) / Math.max(size.height, 1);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
    // Fit the vehicle on the tighter axis so it is never cropped on narrow screens.
    const limitingFov = Math.min(verticalFov, horizontalFov);
    const distance = (radius * 1.16) / Math.sin(limitingFov / 2);
    camera.position.set(0, distance * 0.16, distance);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height, radius]);

  return null;
}

/* ------------------------------------------------------------------ main component */

interface MissionFlightSceneProps {
  telemetry: CalculatedMissionTelemetry;
  vehicleName: string;
}

export function MissionFlightScene({ telemetry, vehicleName }: MissionFlightSceneProps) {
  const reducedMotion = useReducedMotion();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const rigRef = useRef<THREE.Group>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);

  const [paused, setPaused] = useState(() => initialScenePaused(reducedMotion));
  const [inView, setInView] = useState(true);
  const [tabHidden, setTabHidden] = useState(
    typeof document !== 'undefined' ? document.visibilityState === 'hidden' : false
  );
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1440
  );
  const [modelSource, setModelSource] = useState<VehicleModelSource>('procedural');
  const [modelStatus, setModelStatus] = useState<VehicleModelResult['status']>('loading');
  const [modelDetail, setModelDetail] = useState<string | null>(null);
  const [modelProgress, setModelProgress] = useState<number | null>(null);
  const [modelRadius, setModelRadius] = useState(3.3);
  const [webglFailure, setWebglFailure] = useState<MissionSceneFailure | null>(null);
  const [canvasAttempt, setCanvasAttempt] = useState(0);
  const [renderRevision, setRenderRevision] = useState(0);

  const candidates = useMemo(
    () =>
      resolveVehicleModelCandidates({
        baseUrl: import.meta.env.BASE_URL,
      }).candidates,
    []
  );

  useEffect(() => {
    if (reducedMotion) setPaused(true);
  }, [reducedMotion]);

  useEffect(() => {
    const onVisibility = () => setTabHidden(document.visibilityState === 'hidden');
    const onResize = () => setViewportWidth(window.innerWidth);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => setInView(entries.some((entry) => entry.isIntersecting)),
      { threshold: 0.02 }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const handleModelStatus = useCallback((result: VehicleModelResult) => {
    setModelStatus(result.status);
    setModelSource(result.status === 'loaded' ? 'programme_erizon' : 'procedural');
    setModelDetail(result.detail ?? null);
    setRenderRevision((revision) => revision + 1);
  }, []);

  const motionMode = resolveSceneMotionMode({ paused, visible: inView && !tabHidden });
  const animate = motionMode === 'animated';
  const starCount = starCountForViewport(viewportWidth);

  // Snapshot timestamp: the overlay reports when these simulated numbers were computed.
  const dataTimestampIso = useMemo(() => new Date().toISOString(), [telemetry]);

  const overlay = useMemo(
    () =>
      buildMissionSceneOverlay(telemetry, {
        dataTimestampIso,
        modelSource,
        paused: !animate,
      }),
    [telemetry, dataTimestampIso, modelSource, animate]
  );

  const resetView = () => {
    if (rigRef.current) {
      rigRef.current.rotation.set(0.08, -0.35, 0);
      rigRef.current.position.set(0, 0, 0);
    }
    controlsRef.current?.reset();
    setRenderRevision((revision) => revision + 1);
  };

  const handleSceneKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || !controlsRef.current) return;
    const step = Math.PI / 24;
    if (event.key === 'ArrowLeft') {
      controlsRef.current.setAzimuthalAngle(controlsRef.current.getAzimuthalAngle() + step);
    } else if (event.key === 'ArrowRight') {
      controlsRef.current.setAzimuthalAngle(controlsRef.current.getAzimuthalAngle() - step);
    } else if (event.key === 'ArrowUp') {
      controlsRef.current.setPolarAngle(controlsRef.current.getPolarAngle() - step);
    } else if (event.key === 'ArrowDown') {
      controlsRef.current.setPolarAngle(controlsRef.current.getPolarAngle() + step);
    }
    else return;
    event.preventDefault();
    controlsRef.current.update();
  };

  const retryCanvas = () => {
    setWebglFailure(null);
    setCanvasAttempt((attempt) => attempt + 1);
    setModelStatus('loading');
    setModelSource('procedural');
    setModelProgress(null);
    setModelDetail(null);
  };

  return (
    <section aria-labelledby="mission-flight-scene-heading" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="mission-flight-scene-heading" className="arogya-h2 text-[var(--arogya-text-primary)]">
            Flight Scene — {vehicleName}
          </h2>
          <p className="text-xs text-[var(--arogya-text-secondary)]">
            Simulated transit of the {vehicleName}. Illustrative scene only — see the data labels below.
          </p>
        </div>
        <span className="rounded-md border border-[var(--arogya-info-border)] bg-[var(--arogya-info-soft)] px-2.5 py-1 font-mono-tabular text-[11px] font-semibold text-[var(--arogya-info)]">
          Mission simulation · fictional scenario
        </span>
      </div>

      {/* Full content-width scene */}
      <div
        ref={wrapperRef}
        tabIndex={0}
        onKeyDown={handleSceneKeyDown}
        data-erizon-status={modelStatus}
        className="relative h-[min(72vh,660px)] min-h-[360px] w-full overflow-hidden rounded-2xl border border-[#1e293b] bg-[#050b18]"
        role="region"
        aria-label={`Illustrative 3D flight scene for the ${vehicleName}. Focus this scene and use arrow keys to orbit. Simulated mission context, not live telemetry.`}
      >
        {webglFailure ? (
          <MissionSceneFallback failure={webglFailure} overlay={overlay} onRetry={retryCanvas} />
        ) : (
        <MissionCanvasBoundary
          key={canvasAttempt}
          onError={() => setWebglFailure('webgl-unavailable')}
          fallback={
            <MissionSceneFallback
              failure="webgl-unavailable"
              overlay={overlay}
              onRetry={retryCanvas}
            />
          }
        >
        <Canvas
          frameloop={animate ? 'always' : 'demand'}
          dpr={[1, 1.72]}
          camera={{ position: [0, 1.2, 6.4], fov: 40, near: 0.1, far: 80 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        >
          <CanvasContextLossMonitor onLost={() => setWebglFailure('context-lost')} />
          <FrameInvalidator revision={renderRevision} />
          <ambientLight intensity={0.45} />
          <hemisphereLight args={['#bfdbfe', '#020617', 0.55]} />
          <directionalLight position={[6, 7, 5]} intensity={2.2} color="#fff7ed" />
          <directionalLight position={[-7, -3, -6]} intensity={0.8} color="#60a5fa" />
          <pointLight position={[0, -0.4, 2.4]} intensity={0.5} color="#38bdf8" distance={9} />
          <pointLight position={[0, 1.5, -5]} intensity={1.1} color="#7dd3fc" distance={14} />

          <AdaptiveSceneFraming radius={modelRadius} />
          <StarField count={starCount} animate={animate} />
          <DistantPlanet />
          <DistantRocks animate={animate} />

          <ShipRig rigRef={rigRef} animate={animate}>
            <VehicleGltfModel
              candidates={candidates}
              onStatusChange={handleModelStatus}
              onProgress={setModelProgress}
              onRadiusChange={setModelRadius}
            />
          </ShipRig>

          <OrbitControls
            ref={controlsRef}
            enablePan={false}
            enableDamping={false}
            minDistance={Math.max(2.8, modelRadius * 1.25)}
            maxDistance={Math.max(14, modelRadius * 5)}
            rotateSpeed={0.45}
            zoomSpeed={0.6}
          />
        </Canvas>
        </MissionCanvasBoundary>
        )}

        {/* Scene title + view controls (wraps instead of overlapping on narrow screens) */}
        {!webglFailure && (
        <>
        <div className="pointer-events-none absolute inset-x-2 top-2 flex flex-wrap items-start justify-between gap-2 sm:inset-x-3 sm:top-3">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="rounded-full border border-white/15 bg-[#0b1220]/85 px-2.5 py-1 text-[10px] font-semibold text-slate-100 sm:px-3 sm:text-[11px]">
              {describeVehicleDisplayLabel({ status: modelStatus })}
            </span>
            <span className="hidden rounded-full border border-white/10 bg-[#0b1220]/70 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-slate-300 sm:inline">
              Simulated scene
            </span>
          </div>

          <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setPaused((prev) => !prev)}
              aria-pressed={paused}
              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-white/20 bg-[#0b1220]/85 px-2.5 text-[10px] font-semibold text-slate-100 hover:border-white/35 sm:min-h-[36px] sm:px-3 sm:text-[11px]"
            >
              {paused ? <Play className="h-3.5 w-3.5" aria-hidden="true" /> : <Pause className="h-3.5 w-3.5" aria-hidden="true" />}
              {paused ? 'Play motion' : 'Pause motion'}
            </button>
            <button
              type="button"
              onClick={resetView}
              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-white/20 bg-[#0b1220]/85 px-2.5 text-[10px] font-semibold text-slate-100 hover:border-white/35 sm:min-h-[36px] sm:px-3 sm:text-[11px]"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Reset view
            </button>
          </div>
        </div>

        {/* Prominent model-streaming HUD so ERIZON loading is obvious at a glance */}
        {modelStatus === 'loading' && (
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-none absolute left-2 top-14 z-10 w-[min(calc(100%-1rem),19rem)] rounded-xl border border-[#7dd3fc]/45 bg-[#050b18]/94 p-2.5 shadow-lg backdrop-blur-sm sm:left-3 sm:top-16"
          >
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-100">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#7dd3fc]" aria-hidden="true" />
              Streaming Programme ERIZON
              {modelProgress != null && (
                <span className="font-mono-tabular text-[#7dd3fc]">{modelProgress}%</span>
              )}
            </p>
            <div
              role="progressbar"
              aria-label="Programme ERIZON model download"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={modelProgress ?? undefined}
              className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#38bdf8] to-[#a5f3fc] transition-[width] duration-300"
                style={{ width: `${modelProgress ?? 9}%` }}
              />
            </div>
            <p className="mt-1 text-[9px] leading-snug text-slate-500">
              Local GLB served unmodified · decorative scene, not live telemetry
            </p>
          </div>
        )}

        {modelStatus === 'loaded' && (
          <div className="pointer-events-none absolute left-2 top-14 z-10 rounded-lg border border-emerald-400/35 bg-[#052e1b]/90 px-2.5 py-1 text-[10px] font-semibold text-emerald-200 sm:left-3 sm:top-16">
            Programme ERIZON loaded · ARES-7
          </div>
        )}

        {/* Telemetry overlay (includes model load/error status so nothing overlaps) */}
        <div className="pointer-events-auto absolute bottom-2 left-2 w-[min(100%-1rem,20rem)] rounded-xl border border-white/15 bg-[#050b18]/88 p-2.5 text-slate-100 shadow-lg backdrop-blur-sm sm:bottom-3 sm:left-3 sm:p-3">
          <div role="status" aria-live="polite">
            {modelStatus === 'procedural' && (
              <p className="mb-1.5 text-[10px] text-slate-300">{describeVehicleLoadState('procedural')}</p>
            )}
            {modelStatus === 'loading' ? (
              <p className="mb-1.5 inline-flex items-center gap-1.5 text-[10px] text-slate-300">
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                {describeVehicleLoadState('loading')} {modelProgress == null ? '' : `${modelProgress}%`}
              </p>
            ) : modelStatus === 'error' ? (
              <p className="mb-1.5 flex items-start gap-1.5 rounded-md border border-amber-400/35 bg-amber-950/60 px-2 py-1 text-[10px] leading-snug text-amber-200">
                <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                <span>
                  {describeVehicleLoadState('error')}
                  {modelDetail ? ` ${modelDetail}` : ''}
                </span>
              </p>
            ) : null}
            {modelStatus === 'loaded' && (
              <p className="mb-1.5 text-[10px] text-emerald-200">{describeVehicleLoadState('loaded')}</p>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
              Simulated mission telemetry
            </p>
            <span className="rounded border border-white/15 px-1.5 py-0.5 font-mono-tabular text-[9px] text-slate-300">
              {overlay.phaseLabel}
            </span>
          </div>

          <dl className="mt-2 space-y-1 text-[11px]">
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-slate-400">Mission time</dt>
              <dd className="font-mono-tabular text-slate-100">{overlay.missionTimeLabel}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-slate-400">Progress</dt>
              <dd className="font-mono-tabular text-slate-100">{overlay.progressPercent.toFixed(1)}%</dd>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-slate-400">Remaining</dt>
              <dd className="font-mono-tabular text-slate-100">{overlay.remainingLabel}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-slate-400">Data timestamp</dt>
              <dd className="font-mono-tabular text-slate-200">{overlay.dataTimestampLabel}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-slate-400">Mode</dt>
              <dd className="text-right text-slate-200">
                {animate ? 'Simulation · motion running' : 'Simulation · motion paused'}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-slate-400">Earth distance</dt>
              <dd className="font-mono-tabular text-slate-100">{overlay.earthDistanceLabel}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-slate-400">Earth comms</dt>
              <dd className="text-right font-mono-tabular text-[10px] text-slate-200">
                {overlay.earthDelayLabel}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-slate-400">Mars distance</dt>
              <dd className="font-mono-tabular text-slate-100">{overlay.marsDistanceLabel}</dd>
            </div>
          </dl>

          <div
            role="progressbar"
            aria-valuenow={Math.round(overlay.progressPercent)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Simulated transit progress"
            className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/12"
          >
            <div className="h-full rounded-full bg-[#7dd3fc]" style={{ width: `${overlay.progressPercent}%` }} />
          </div>
          <p className="mt-1.5 text-[9px] leading-snug text-slate-400">
            {overlay.velocityLabel}. {MISSION_NOT_LIVE_NOTE}
          </p>
        </div>
        </>
        )}
      </div>

      <ProgrammeErizonAttribution />

      {/* Clearly separated data-integrity labels */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {(Object.keys(MISSION_SCENE_LABELS) as Array<keyof typeof MISSION_SCENE_LABELS>).map((key) => {
          const label = MISSION_SCENE_LABELS[key];
          return (
            <div
              key={key}
              className="rounded-xl border border-[var(--arogya-border)] bg-[var(--arogya-surface)] p-3"
            >
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#1E3A5F]">
                <Info className="h-3 w-3 shrink-0" aria-hidden="true" />
                {label.title}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--arogya-text-secondary)]">
                {label.detail}
              </p>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-[var(--arogya-text-muted)]">
        {MISSION_NOT_LIVE_NOTE} Decorative stars, planet and drifting rocks are illustrative and not to
        scale; no real celestial encounters are implied.
      </p>

      <p className="sr-only">
        Scene summary: illustrative {vehicleName} model with simulated mission telemetry. Sol{' '}
        {telemetry.missionDay} of {telemetry.totalDurationDays}, {telemetry.progressPercent.toFixed(1)}%
        of the simulated transit, {telemetry.remainingDays} days remaining. Earth distance{' '}
        {overlay.earthDistanceLabel}; Earth communications {overlay.earthDelayLabel}. Mars distance{' '}
        {overlay.marsDistanceLabel}. {MISSION_NOT_LIVE_NOTE} Ephemeris data is not integrated in this
        build.
      </p>
    </section>
  );
}
