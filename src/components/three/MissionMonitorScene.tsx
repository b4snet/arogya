import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Pause, Play } from 'lucide-react';
import * as THREE from 'three';
import type { HealthStatusLevel } from '../../types';
import { AtlasGltfModel, type GltfLoadStatus } from './DriveOrProceduralModel';
import { ProceduralAstronautSuit } from './ProceduralOrganModels';
import { StudioLightingRig, detectWebGLCapability } from './StudioLightingRig';
import { useDriveMedia } from '../../hooks/useDriveMedia';
import { useNasaEarthImage } from '../../hooks/useNasaEarthImage';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { STATUS_META } from '../../engine/thresholds';
import { NasaEarthBackdrop } from './NasaEarthBackdrop';

/**
 * Dashboard hero: the crew member floats in front of the CSS space backdrop.
 * The composition is illustrative and never renders live telemetry.
 */

const HERO_CAMERA = {
  position: [0, 0.9, 9.6] as [number, number, number],
  fov: 40,
  lookAt: [0, 0.9, 0] as [number, number, number],
};

function CameraSetup() {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;

  useEffect(() => {
    if (!camera?.isPerspectiveCamera) return;
    camera.position.set(...HERO_CAMERA.position);
    camera.fov = HERO_CAMERA.fov;
    camera.near = 0.1;
    camera.far = 120;
    camera.lookAt(...HERO_CAMERA.lookAt);
    camera.updateProjectionMatrix();
  }, [camera]);

  return null;
}

function HeroStars({ animate }: { animate: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    let seed = 4242;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    const count = 380;
    const array = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const radius = 16 + rand() * 18;
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      array[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      array[i * 3 + 1] = radius * Math.cos(phi) + 1.5;
      array[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    return array;
  }, []);

  useFrame((_state, delta) => {
    if (!animate || !ref.current) return;
    ref.current.rotation.y += delta * 0.0035;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#dbeafe" size={0.07} sizeAttenuation transparent opacity={0.8} />
    </points>
  );
}

function SceneRig({
  animate,
  children,
}: {
  animate: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!animate || !ref.current) return;
    const t = state.clock.getElapsedTime();
    ref.current.position.y = Math.sin(t * 0.32) * 0.025;
    ref.current.rotation.z = Math.sin(t * 0.2) * 0.004;
  });

  return <group ref={ref}>{children}</group>;
}

interface MissionMonitorSceneProps {
  status: HealthStatusLevel;
  astronautName: string;
}

/**
 * Static vector portrait used when WebGL is unavailable or the context is lost.
 * Keeps the hero composed without showing a technical failure message.
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
      <div className={`h-[72%] max-h-[380px] ${animate ? 'astronaut-float' : ''}`}>
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
  const earthImage = useNasaEarthImage();
  const reducedMotion = useReducedMotion();
  const webglCapability = useMemo(() => detectWebGLCapability(), []);
  const isSoftwareGl = webglCapability === 'software';

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

  return (
    <div
      ref={wrapperRef}
      className="relative h-[320px] w-full overflow-hidden rounded-2xl border border-[#1e293b] sm:h-[460px] lg:h-full lg:min-h-[520px]"
      style={{
        backgroundImage: [
          'radial-gradient(1.4px 1.4px at 14% 22%, rgba(255,255,255,.9) 50%, transparent 100%)',
          'radial-gradient(1.2px 1.2px at 32% 68%, rgba(191,219,254,.8) 50%, transparent 100%)',
          'radial-gradient(1.6px 1.6px at 48% 14%, rgba(255,255,255,.75) 50%, transparent 100%)',
          'radial-gradient(1.1px 1.1px at 66% 44%, rgba(255,255,255,.7) 50%, transparent 100%)',
          'radial-gradient(1.5px 1.5px at 82% 26%, rgba(191,219,254,.85) 50%, transparent 100%)',
          'radial-gradient(1px 1px at 92% 74%, rgba(255,255,255,.65) 50%, transparent 100%)',
          'radial-gradient(ellipse 70% 48% at 18% 108%, rgba(14,116,144,.42), transparent 70%)',
          'radial-gradient(ellipse 45% 32% at 88% 4%, rgba(154,52,18,.32), transparent 70%)',
          'linear-gradient(180deg, #030712 0%, #071120 52%, #0b1a2c 100%)',
        ].join(', '),
      }}
      role="region"
      aria-label={
        unavailable
          ? `Illustrative astronaut portrait for ${astronautName}, floating over a static CSS space backdrop. Static illustration, not live telemetry.`
          : `Interactive 3D astronaut preview for ${astronautName}, floating over a static CSS space backdrop. Static CSS background; illustrative scene, not live telemetry. Drag to orbit the scene.`
      }
    >
      <NasaEarthBackdrop image={earthImage} animate={animate} />
      {unavailable ? (
        <StaticAstronautFallback status={status} animate={animate} />
      ) : (
        <Canvas
          frameloop={animate ? 'always' : 'demand'}
          dpr={isSoftwareGl ? 1 : [1, 2]}
          shadows={!isSoftwareGl}
          camera={{ position: HERO_CAMERA.position, fov: HERO_CAMERA.fov, near: 0.1, far: 120 }}
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
            minAzimuthAngle={-0.32}
            maxAzimuthAngle={0.32}
            minPolarAngle={Math.PI / 2 - 0.16}
            maxPolarAngle={Math.PI / 2 + 0.1}
          />
          <StudioLightingRig />
          <ambientLight intensity={0.3} />
          <directionalLight position={[-5, 3.5, 3]} intensity={1.5} color="#f8fafc" />
          <pointLight position={[3, 1.2, 2.5]} intensity={0.55} color="#93c5fd" distance={14} />
          <HeroStars animate={animate} />
          <SceneRig animate={animate}>
            <AtlasGltfModel
              modelKey="astronaut"
              driveUrl={astronautModelUrl}
              targetHeight={1.76}
              emissiveTint={STATUS_META[status].colorHex}
              emissiveIntensity={status === 'green' ? 0.03 : 0.12}
              onStatusChange={setAstronautStatus}
              fallback={<ProceduralAstronautSuit visible status={status} />}
            />
          </SceneRig>
        </Canvas>
      )}

      {/* Scene badges */}
      <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap items-start justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#050b18]/85 px-2.5 py-1 text-[10px] font-semibold text-slate-100 backdrop-blur-sm">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: STATUS_META[status].colorHex }}
            aria-hidden="true"
          />
          ARES-7 · {astronautName}
        </span>
        <div className="pointer-events-auto flex items-center gap-1.5">
          {!unavailable && (
            <button
              type="button"
              onClick={() => setPaused((prev) => !prev)}
              aria-pressed={paused}
              aria-label={paused ? 'Resume scene motion' : 'Pause scene motion'}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-[#050b18]/85 text-slate-200 transition-colors hover:border-white/40 hover:text-white"
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
        <p className="text-[9px] leading-snug text-slate-400">
          {unavailable
            ? 'Crew illustrative portrait'
            : astronautStatus === 'loaded'
            ? 'Crew GLB loaded'
            : 'Crew illustrative model'}{' '}
          · Not live NASA telemetry.
        </p>
        <span className="hidden rounded border border-white/15 px-1.5 py-0.5 font-mono-tabular text-[9px] uppercase tracking-wider text-slate-400 sm:inline">
          Illustrative
        </span>
      </div>
    </div>
  );
}
