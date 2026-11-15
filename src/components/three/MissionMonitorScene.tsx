import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Orbit, Pause, Play } from 'lucide-react';
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
      className="relative h-[380px] w-full overflow-hidden rounded-2xl border border-[#1e293b] sm:h-[460px] lg:h-full lg:min-h-[520px]"
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
      aria-label={`Interactive 3D astronaut preview for ${astronautName}, floating over a static CSS space backdrop. Static CSS background; illustrative scene, not live telemetry. Drag to orbit the scene.`}
    >
      <NasaEarthBackdrop image={earthImage} animate={animate} />
      {unavailable ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
          <Orbit className="h-8 w-8 text-[#7dd3fc]" aria-hidden="true" />
          <p className="text-sm font-semibold text-slate-100">3D scene unavailable in this browser</p>
          <p className="max-w-xs text-xs leading-relaxed text-slate-400">
            The live monitor remains available. This scene is illustrative and not required for
            monitoring.
          </p>
        </div>
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
          <button
            type="button"
            onClick={() => setPaused((prev) => !prev)}
            aria-pressed={paused}
            aria-label={paused ? 'Resume scene motion' : 'Pause scene motion'}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-[#050b18]/85 text-slate-200 transition-colors hover:border-white/40 hover:text-white"
          >
            {paused ? <Play className="h-3.5 w-3.5" aria-hidden="true" /> : <Pause className="h-3.5 w-3.5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center justify-between gap-2">
        <p className="text-[9px] leading-snug text-slate-400">
          {astronautStatus === 'loaded' ? 'Crew GLB loaded' : 'Crew illustrative model'} · Not live
          NASA telemetry.
        </p>
        <span className="hidden rounded border border-white/15 px-1.5 py-0.5 font-mono-tabular text-[9px] uppercase tracking-wider text-slate-400 sm:inline">
          Illustrative
        </span>
      </div>
    </div>
  );
}
