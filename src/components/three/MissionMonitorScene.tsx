import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls, useProgress } from '@react-three/drei';
import { Pause, Play } from 'lucide-react';
import * as THREE from 'three';
import type { HealthStatusLevel } from '../../types';
import { AtlasGltfModel, type GltfLoadStatus } from './DriveOrProceduralModel';
import { ProceduralAstronautSuit } from './ProceduralOrganModels';
import { StudioLightingRig, detectWebGLCapability } from './StudioLightingRig';
import { useDriveMedia } from '../../hooks/useDriveMedia';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { STATUS_META } from '../../engine/thresholds';
import { BackdropMotionControl } from '../dashboard/BackdropMotionControl';

/**
 * Dashboard centerpiece: the real astronaut GLB standing over the page-level video backdrop.
 * The scene itself is transparent; the CSS starfield behind this region only shows through if
 * the video cannot play. Illustrative only — never live telemetry.
 */

const HERO_CAMERA = {
  position: [0, 1.15, 4.6] as [number, number, number],
  fov: 30,
  lookAt: [0, 0.98, 0] as [number, number, number],
};

function CameraSetup() {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;

  useEffect(() => {
    if (!camera?.isPerspectiveCamera) return;
    camera.position.set(...HERO_CAMERA.position);
    camera.fov = HERO_CAMERA.fov;
    camera.near = 0.1;
    camera.far = 60;
    camera.lookAt(...HERO_CAMERA.lookAt);
    camera.updateProjectionMatrix();
  }, [camera]);

  return null;
}

/** Slow standing idle rotation. The astronaut stays planted; only the model turns. */
function IdleRotation({ animate, children }: { animate: boolean; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);

  useFrame((_state, delta) => {
    if (!animate || !ref.current) return;
    ref.current.rotation.y += Math.min(delta, 0.05) * 0.12;
  });

  return <group ref={ref}>{children}</group>;
}

interface MissionMonitorSceneProps {
  status: HealthStatusLevel;
  astronautName: string;
}

/**
 * Static vector portrait used when WebGL is unavailable, the context is lost, or the GLB
 * cannot load. Keeps the centerpiece composed without a technical failure message.
 */
function StaticAstronautFallback({
  status,
  animate,
}: {
  status: HealthStatusLevel;
  animate: boolean;
}) {
  const accent = STATUS_META[status].colorHex;
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className={`h-[78%] max-h-[520px] ${animate ? 'astronaut-float' : ''}`}>
        <svg
          viewBox="0 0 220 330"
          className="h-full w-auto"
          role="img"
          aria-label="Static illustration of an astronaut in a spacesuit"
        >
          <defs>
            <linearGradient id="hero-suit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="62%" stopColor="#dbe3ec" />
              <stop offset="100%" stopColor="#a8b6c8" />
            </linearGradient>
            <radialGradient id="hero-visor" cx="44%" cy="36%" r="72%">
              <stop offset="0%" stopColor="#155e75" />
              <stop offset="52%" stopColor="#0b1c30" />
              <stop offset="100%" stopColor="#020617" />
            </radialGradient>
          </defs>
          <ellipse
            cx="110"
            cy="172"
            rx="86"
            ry="128"
            fill="none"
            stroke={accent}
            strokeWidth="1.2"
            opacity="0.3"
          />
          <rect x="42" y="118" width="136" height="112" rx="34" fill="#334155" opacity="0.85" />
          <rect x="82" y="246" width="22" height="58" rx="11" fill="url(#hero-suit)" />
          <rect x="116" y="246" width="22" height="58" rx="11" fill="url(#hero-suit)" />
          <ellipse cx="93" cy="306" rx="17" ry="9" fill="#94a3b8" />
          <ellipse cx="127" cy="306" rx="17" ry="9" fill="#94a3b8" />
          <rect x="64" y="140" width="92" height="104" rx="30" fill="url(#hero-suit)" />
          <rect
            x="54"
            y="148"
            width="18"
            height="78"
            rx="9"
            fill="url(#hero-suit)"
            transform="rotate(-12 63 187)"
          />
          <rect
            x="148"
            y="148"
            width="18"
            height="78"
            rx="9"
            fill="url(#hero-suit)"
            transform="rotate(12 157 187)"
          />
          <circle cx="58" cy="232" r="11" fill="#cbd5e1" />
          <circle cx="162" cy="232" r="11" fill="#cbd5e1" />
          <rect x="88" y="120" width="44" height="14" rx="7" fill="#94a3b8" />
          <circle cx="110" cy="92" r="48" fill="url(#hero-suit)" />
          <ellipse cx="110" cy="94" rx="34" ry="30" fill="url(#hero-visor)" />
          <path
            d="M86 82c8-9 22-13 34-11"
            stroke="#67e8f9"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.55"
            fill="none"
          />
          <rect
            x="94"
            y="168"
            width="32"
            height="24"
            rx="6"
            fill="#0f172a"
            stroke={accent}
            strokeWidth="1.5"
          />
          <circle cx="102" cy="180" r="2.5" fill={accent} />
          <rect x="109" y="176" width="10" height="2.5" rx="1.25" fill="#64748b" />
          <rect x="109" y="182" width="7" height="2.5" rx="1.25" fill="#64748b" />
          <path
            d="M78 206c10 6 54 6 64 0"
            stroke="#b6c2d1"
            strokeWidth="2"
            fill="none"
            opacity="0.8"
          />
        </svg>
      </div>
    </div>
  );
}

export function MissionMonitorScene({ status, astronautName }: MissionMonitorSceneProps) {
  const { astronautModelUrl } = useDriveMedia();
  const reducedMotion = useReducedMotion();
  const webglCapability = useMemo(() => detectWebGLCapability(), []);
  const isSoftwareGl = webglCapability === 'software';
  const { active: assetsLoading, progress } = useProgress();

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(reducedMotion);
  const [tabHidden, setTabHidden] = useState(
    typeof document !== 'undefined' ? document.visibilityState === 'hidden' : false
  );
  const [inView, setInView] = useState(true);
  const [contextLost, setContextLost] = useState(false);
  const [astronautStatus, setAstronautStatus] = useState<GltfLoadStatus>('procedural');

  useEffect(() => {
    setPaused(reducedMotion);
  }, [reducedMotion]);

  useEffect(() => {
    const onVisibility = () => setTabHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
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

  const animate = !paused && inView && !tabHidden && !reducedMotion;
  const unavailable = contextLost || webglCapability === 'unavailable';
  const loadFailed = astronautStatus === 'error';
  const showProgress = !unavailable && !loadFailed && (astronautStatus === 'loading' || assetsLoading);

  return (
    <div
      ref={wrapperRef}
      className="relative h-[380px] w-full sm:h-[500px] lg:h-full lg:min-h-[560px]"
      role="region"
      aria-label={
        unavailable
          ? `Illustrative astronaut portrait for ${astronautName}, standing over a static CSS starfield backdrop. Static illustration, not live telemetry.`
          : `Interactive 3D astronaut preview for ${astronautName}, standing over the Static CSS background that becomes the full-screen backdrop video. Illustrative scene, not live telemetry. Drag to orbit the scene.`
      }
    >
      {/* Soft stage glow — a light pool, not a platform or disc. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 bottom-10 top-10 rounded-full opacity-70 blur-3xl"
        style={{
          background:
            'radial-gradient(ellipse 54% 46% at 50% 62%, rgba(56,189,248,0.16), transparent 70%)',
        }}
      />

      {unavailable ? (
        <StaticAstronautFallback status={status} animate={animate} />
      ) : (
        <Canvas
          frameloop={animate || showProgress ? 'always' : 'demand'}
          dpr={isSoftwareGl ? 1 : [1, 2]}
          shadows={!isSoftwareGl}
          camera={{ position: HERO_CAMERA.position, fov: HERO_CAMERA.fov, near: 0.1, far: 60 }}
          gl={{ antialias: !isSoftwareGl, alpha: true, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener('webglcontextlost', (event) => {
              event.preventDefault();
              setContextLost(true);
            });
          }}
        >
          <CameraSetup />
          <OrbitControls
            makeDefault
            enablePan={false}
            enableZoom={false}
            target={HERO_CAMERA.lookAt}
            minAzimuthAngle={-0.75}
            maxAzimuthAngle={0.75}
            minPolarAngle={Math.PI / 2 - 0.22}
            maxPolarAngle={Math.PI / 2 + 0.12}
            enableDamping
            dampingFactor={0.08}
          />
          <StudioLightingRig />
          <IdleRotation animate={animate}>
            <AtlasGltfModel
              modelKey="astronaut"
              driveUrl={astronautModelUrl}
              targetHeight={1.9}
              emissiveTint={STATUS_META[status].colorHex}
              emissiveIntensity={status === 'green' ? 0.02 : 0.08}
              onStatusChange={setAstronautStatus}
              fallback={<ProceduralAstronautSuit visible={false} status={status} />}
            />
          </IdleRotation>
          <ContactShadows
            position={[0, 0.01, 0]}
            opacity={0.9}
            scale={4.6}
            blur={3.2}
            far={1.6}
            resolution={512}
            color="#000000"
          />
        </Canvas>
      )}

      {loadFailed && !unavailable && (
        <StaticAstronautFallback status={status} animate={false} />
      )}

      {/* Soft contact shadow beneath the feet; deliberately borderless, not a platform. */}
      {!unavailable && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[9%] left-1/2 h-9 w-[48%] max-w-[360px] -translate-x-1/2 rounded-[100%] blur-md"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(1,4,10,0.72) 0%, rgba(2,7,14,0.42) 42%, transparent 74%)',
          }}
        />
      )}

      {showProgress && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute inset-x-0 bottom-14 flex flex-col items-center gap-1.5"
        >
          <p className="font-mono-tabular text-[10px] uppercase tracking-[0.16em] text-slate-300">
            Loading astronaut model · {Math.round(progress)}%
          </p>
          <div className="h-1 w-40 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-cyan-300 transition-[width] duration-300"
              style={{ width: `${Math.max(6, Math.min(100, progress))}%` }}
            />
          </div>
        </div>
      )}

      {/* Scene badges */}
      <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap items-start justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#050b18]/70 px-2.5 py-1 text-[10px] font-semibold text-slate-100 backdrop-blur-sm">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: STATUS_META[status].colorHex }}
            aria-hidden="true"
          />
          ARES-7 · {astronautName}
        </span>
        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-1.5">
          <BackdropMotionControl />
          {!unavailable && (
            <button
              type="button"
              onClick={() => setPaused((prev) => !prev)}
              aria-pressed={paused}
              aria-label={paused ? 'Resume astronaut motion' : 'Pause astronaut motion'}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-[#050b18]/70 text-slate-200 backdrop-blur-sm transition-colors hover:border-white/40 hover:text-white"
            >
              {paused ? (
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Pause className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center justify-between gap-2">
        <p className="text-[9px] leading-snug text-slate-300/80">
          {unavailable || loadFailed
            ? 'Crew illustrative portrait'
            : astronautStatus === 'loaded'
            ? 'Crew GLB loaded'
            : 'Crew illustrative model'}{' '}
          · Not live NASA telemetry.
        </p>
        <span className="hidden rounded border border-white/15 px-1.5 py-0.5 font-mono-tabular text-[9px] uppercase tracking-wider text-slate-300/80 sm:inline">
          Illustrative
        </span>
      </div>
    </div>
  );
}
