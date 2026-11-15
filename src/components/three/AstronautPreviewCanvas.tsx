import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Link } from 'react-router-dom';
import { Activity, ChevronLeft, ChevronRight, Loader2, RotateCcw } from 'lucide-react';
import * as THREE from 'three';
import type { HealthStatusLevel } from '../../types';
import { StudioLightingRig, detectWebGLCapability } from './StudioLightingRig';
import { ProceduralAstronautSuit, TelemetryPedestal } from './ProceduralOrganModels';
import { AtlasGltfModel, type GltfLoadStatus } from './DriveOrProceduralModel';
import { useDriveMedia } from '../../hooks/useDriveMedia';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { STATUS_META } from '../../engine/thresholds';
import { ErrorState } from '../ui';

/**
 * Camera framing input. The actual camera distance is NOT hardcoded: it is derived
 * from the measured world-space bounding sphere of the loaded model, the vertical
 * field of view, the viewport aspect ratio and a padding factor. Because the fit
 * uses a bounding sphere it stays valid at every supported orbit angle.
 *
 * targetHeight: 1.76 m suit height, normalized by AtlasGltfModel so the model base
 * sits at y = 0 and the helmet top sits at y = targetHeight.
 */
export const HERO_ASTRONAUT_CONFIG = {
  targetHeight: 1.76,
  initialPosition: [0, 0.02, 0] as [number, number, number],
  initialRotation: [0, 0, 0] as [number, number, number],
  cameraPosition: [0, 0.95, 4.0] as [number, number, number],
  cameraFov: 38,
};

/** Extra space kept around the bounding sphere so helmet and boots never touch the edge. */
const FRAMING_PADDING = 1.14;
const MAX_DISTANCE_FACTOR = 1.85;
const MIN_DISTANCE_HEADROOM = 0.75;

interface OrbitControlsLike {
  target: THREE.Vector3;
  minDistance: number;
  maxDistance: number;
  update: () => void;
}

type CameraControlApi = {
  rotate: (deltaRadians: number) => void;
  reset: () => void;
};

interface FramedLimits {
  min: number;
  max: number;
  target: [number, number, number];
}

interface AstronautSceneFramingProps {
  modelRef: { current: THREE.Group | null };
  apiRef: { current: CameraControlApi | null };
  boundsVersion: number;
  onFramed: (limits: FramedLimits) => void;
}

/**
 * Measures the astronaut once per model load / viewport change and fits the camera
 * to it. Runs in effects only, so it never fights the user's orbit or re-renders.
 */
function AstronautSceneFraming({
  modelRef,
  apiRef,
  boundsVersion,
  onFramed,
}: AstronautSceneFramingProps) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const controls = useThree((state) => state.controls) as unknown as OrbitControlsLike | null;
  const invalidate = useThree((state) => state.invalidate);
  const fitRef = useRef<{ distance: number; center: THREE.Vector3 } | null>(null);

  useEffect(() => {
    const group = modelRef.current;
    const perspective = camera as THREE.PerspectiveCamera;
    if (!group || !perspective.isPerspectiveCamera) return;

    group.updateWorldMatrix(true, true);
    const bounds = new THREE.Box3().setFromObject(group);
    if (bounds.isEmpty()) return;

    const sphere = bounds.getBoundingSphere(new THREE.Sphere());
    const radius = Math.max(sphere.radius, 0.35);

    const verticalFovRad = (perspective.fov * Math.PI) / 180;
    const aspect = Math.max(size.width, 1) / Math.max(size.height, 1);
    const horizontalFovRad = 2 * Math.atan(Math.tan(verticalFovRad / 2) * aspect);
    // The tighter axis decides the fit, so the model is fully inside the frustum on both axes.
    const limitingFovRad = Math.min(verticalFovRad, horizontalFovRad);

    const distance = (radius * FRAMING_PADDING) / Math.sin(limitingFovRad / 2);
    const min = distance;
    // Guarantee a usable zoom-out range even at narrow (mobile) widths.
    const max = Math.max(distance * MAX_DISTANCE_FACTOR, min + MIN_DISTANCE_HEADROOM);

    fitRef.current = { distance, center: sphere.center.clone() };

    perspective.position.set(
      sphere.center.x,
      sphere.center.y + distance * 0.05,
      sphere.center.z + distance
    );
    perspective.near = Math.max(distance / 200, 0.01);
    perspective.far = distance * 8;
    perspective.lookAt(sphere.center);
    perspective.updateProjectionMatrix();

    if (controls) {
      controls.target.copy(sphere.center);
      controls.minDistance = min;
      controls.maxDistance = max;
      controls.update();
    }

    onFramed({
      min,
      max,
      target: [sphere.center.x, sphere.center.y, sphere.center.z],
    });
  }, [camera, controls, modelRef, onFramed, size.width, size.height, boundsVersion]);

  useEffect(() => {
    apiRef.current = {
      // Rotate the model group itself: deterministic, keeps the fitted framing intact and
      // never fights OrbitControls' internal camera state.
      rotate: (deltaRadians: number) => {
        const model = modelRef.current;
        if (!model) return;
        model.rotation.y += deltaRadians;
        invalidate();
      },
      reset: () => {
        if (modelRef.current) modelRef.current.rotation.y = 0;
        const fit = fitRef.current;
        if (!fit) {
          invalidate();
          return;
        }
        const perspective = camera as THREE.PerspectiveCamera;
        const offset = new THREE.Vector3(0, 0.05, 1).normalize().multiplyScalar(fit.distance);

        perspective.position.copy(fit.center).add(offset);
        perspective.lookAt(fit.center);
        if (controls) {
          controls.target.copy(fit.center);
          controls.update();
        }
        invalidate();
      },
    };
  }, [apiRef, camera, controls, invalidate, modelRef]);

  return null;
}

interface AstronautPreviewCanvasProps {
  status: HealthStatusLevel;
  astronautName: string;
}

export function AstronautPreviewCanvas({
  status,
  astronautName,
}: AstronautPreviewCanvasProps) {
  const { astronautModelUrl } = useDriveMedia();
  const reducedMotion = useReducedMotion();
  const webglCapability = useMemo(() => detectWebGLCapability(), []);
  const isSoftwareGl = webglCapability === 'software';
  const containerRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<THREE.Group>(null);
  const cameraApiRef = useRef<CameraControlApi | null>(null);

  const [contextLost, setContextLost] = useState(false);
  const [modelStatus, setModelStatus] = useState<GltfLoadStatus>('procedural');
  const [boundsVersion, setBoundsVersion] = useState(0);
  const [limits, setLimits] = useState<FramedLimits>({
    min: 2.8,
    max: 6.5,
    target: [0, 0.89, 0],
  });
  const [tabHidden, setTabHidden] = useState(
    typeof document !== 'undefined' ? document.visibilityState === 'hidden' : false
  );
  const [inViewport, setInViewport] = useState(true);

  useEffect(() => {
    const onVisChange = () => {
      setTabHidden(document.visibilityState === 'hidden');
    };
    document.addEventListener('visibilitychange', onVisChange);
    return () => document.removeEventListener('visibilitychange', onVisChange);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        setInViewport(entries.some((e) => e.isIntersecting));
      },
      { threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleModelStatus = useCallback((next: GltfLoadStatus) => {
    setModelStatus(next);
    // Re-measure the bounds whenever the underlying model changes (procedural ⇄ GLB).
    setBoundsVersion((version) => version + 1);
  }, []);

  const handleFramed = useCallback((next: FramedLimits) => {
    setLimits(next);
  }, []);

  const shouldPause = tabHidden || !inViewport || reducedMotion;

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={`Interactive 3D astronaut preview for ${astronautName}. Overall status: ${STATUS_META[status].shortLabel}. Use the rotate and reset view buttons, or drag to orbit.`}
      className="relative flex h-full w-full flex-col justify-between"
    >
      {/* Floating Status Pill & View Vitals Control */}
      <div className="pointer-events-none z-10 flex items-center justify-between gap-2 px-2 pt-2">
        <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#060B14]/85 px-3 py-1.5 shadow-lg">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: STATUS_META[status].colorHex }}
            aria-hidden="true"
          />
          <span className="text-xs font-semibold text-white">{astronautName}</span>
          <span
            className="rounded border px-1.5 py-0.5 font-mono-tabular text-[10px] font-medium"
            style={{
              borderColor: `${STATUS_META[status].colorHex}55`,
              backgroundColor: `${STATUS_META[status].colorHex}18`,
              color: STATUS_META[status].colorHex,
            }}
          >
            {STATUS_META[status].shortLabel}
          </span>
        </div>

        <Link
          to="/vitals"
          className="pointer-events-auto inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-white/20 bg-[#060B14]/85 px-3.5 py-1 text-xs font-medium text-white shadow-lg transition-colors hover:border-[#93C5FD] hover:text-white"
        >
          <Activity className="h-3.5 w-3.5 text-[#93C5FD]" aria-hidden="true" />
          <span>View Vitals</span>
        </Link>
      </div>

      {/* Model Loading HUD */}
      {modelStatus === 'loading' && (
        <div className="pointer-events-none absolute right-4 top-14 z-10 flex items-center gap-1.5 rounded-md border border-white/15 bg-[#0B1120]/90 px-2.5 py-1 text-[11px] text-slate-200">
          <Loader2 className="h-3 w-3 animate-spin text-[#93C5FD]" aria-hidden="true" />
          <span>Loading 3D EVA Model...</span>
        </div>
      )}

      {/* Fallback-model notice (kept visible whenever the bundled GLB cannot be used) */}
      {modelStatus === 'error' && !contextLost && (
        <div
          role="status"
          className="pointer-events-none absolute left-4 top-14 z-10 rounded-md border border-[#CA8A04]/50 bg-[#0B1120]/90 px-2.5 py-1 text-[11px] text-[#FDE68A]"
        >
          Using backup 3D suit model
        </div>
      )}

      {contextLost || webglCapability === 'unavailable' ? (
        <div className="flex flex-1 items-center justify-center p-4">
          <ErrorState
            title={contextLost ? '3D Preview Paused' : '3D Preview Unavailable'}
            description={
              contextLost
                ? 'Graphics context unavailable. Use the View Vitals link to inspect crew biometrics.'
                : 'WebGL is unavailable in this browser. The rest of the dashboard remains available; use the View Vitals link to inspect crew biometrics.'
            }
            action={
              <Link
                to="/vitals"
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-[#1E3A5F] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#2D4A6F]"
              >
                View Vitals
              </Link>
            }
            compact
          />
        </div>
      ) : (
        <div className="relative min-h-0 flex-1">
          <Canvas
            frameloop={shouldPause ? 'demand' : 'always'}
            shadows={!isSoftwareGl}
            dpr={isSoftwareGl ? 1 : [1, 2]}
            camera={{
              position: HERO_ASTRONAUT_CONFIG.cameraPosition,
              fov: HERO_ASTRONAUT_CONFIG.cameraFov,
            }}
            gl={{
              antialias: !isSoftwareGl,
              alpha: true,
              powerPreference: 'high-performance',
            }}
            onCreated={({ gl }) => {
              gl.domElement.addEventListener('webglcontextlost', (e) => {
                e.preventDefault();
                setContextLost(true);
              });
            }}
          >
            <AstronautSceneFraming
              modelRef={modelRef}
              apiRef={cameraApiRef}
              boundsVersion={boundsVersion}
              onFramed={handleFramed}
            />
            <StudioLightingRig />
            <group
              position={HERO_ASTRONAUT_CONFIG.initialPosition}
              rotation={HERO_ASTRONAUT_CONFIG.initialRotation}
            >
              <group ref={modelRef}>
                <AtlasGltfModel
                  modelKey="astronaut"
                  driveUrl={astronautModelUrl}
                  targetHeight={HERO_ASTRONAUT_CONFIG.targetHeight}
                  emissiveTint={STATUS_META[status].colorHex}
                  emissiveIntensity={status === 'green' ? 0.03 : 0.12}
                  onStatusChange={handleModelStatus}
                  fallback={<ProceduralAstronautSuit visible status={status} />}
                />
              </group>
              <TelemetryPedestal status={status} />
            </group>
            <OrbitControls
              enablePan={false}
              enableZoom={true}
              minDistance={limits.min}
              maxDistance={limits.max}
              enableDamping={!isSoftwareGl}
              dampingFactor={0.07}
              autoRotate={false}
              minPolarAngle={Math.PI / 3.2}
              maxPolarAngle={Math.PI / 1.92}
              target={limits.target}
            />
          </Canvas>
        </div>
      )}

      {/* Orbit affordance + accessible camera controls */}
      <div className="z-10 flex flex-wrap items-center justify-between gap-2 px-3 pb-1.5">
        <span className="pointer-events-none text-[11px] text-slate-300/85">Drag to orbit view</span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => cameraApiRef.current?.rotate(Math.PI / 8)}
            aria-label="Rotate astronaut view left"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-[#060B14]/85 text-slate-200 transition-colors hover:border-white/40 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => cameraApiRef.current?.rotate(-Math.PI / 8)}
            aria-label="Rotate astronaut view right"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-[#060B14]/85 text-slate-200 transition-colors hover:border-white/40 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => cameraApiRef.current?.reset()}
            aria-label="Reset astronaut view"
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/20 bg-[#060B14]/85 px-2.5 text-[11px] font-medium text-slate-200 transition-colors hover:border-white/40 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            <span>Reset view</span>
          </button>
        </div>

        <span className="pointer-events-none font-mono-tabular text-[10px] uppercase text-slate-400/80">
          {modelStatus === 'loaded' ? 'GLB Model Ready' : 'Procedural Model Ready'}
        </span>
      </div>
    </div>
  );
}
