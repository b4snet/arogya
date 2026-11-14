import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import type { HealthAssessment, HealthStatusLevel, OrganTarget } from '../../types';
import { ErrorState } from '../ui';
import { StudioLightingRig, detectSoftwareWebGL } from './StudioLightingRig';
import {
  ProceduralAstronautSuit,
  ProceduralBrainModel,
  ProceduralHeartModel,
  ProceduralLungsModel,
  ProceduralSkeletonLayer,
  TelemetryPedestal,
} from './ProceduralOrganModels';
import { AtlasGltfModel, type GltfLoadStatus } from './DriveOrProceduralModel';
import { useDriveMedia } from '../../hooks/useDriveMedia';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { getOrganSelectorStatus } from '../../engine/atlasPanelBuilder';
import { STATUS_META } from '../../engine/thresholds';

const _targetPos = new THREE.Vector3();
const _targetLook = new THREE.Vector3();

const CAMERA_PRESETS: Record<
  'overview' | 'brain' | 'heart' | 'lungs',
  { pos: [number, number, number]; look: [number, number, number] }
> = {
  overview: { pos: [0, 1.35, 3.1], look: [0, 0.95, 0] },
  brain: { pos: [0.35, 1.72, 0.92], look: [0, 1.56, 0] },
  heart: { pos: [0.28, 1.24, 0.86], look: [0.02, 1.14, 0] },
  lungs: { pos: [-0.36, 1.28, 0.96], look: [0, 1.17, 0] },
};

function statusHex(status: HealthStatusLevel): string {
  return STATUS_META[status].colorHex;
}

function StatusHoverBadge({
  label,
  status,
  score,
}: {
  label: string;
  status: HealthStatusLevel;
  score: number;
}) {
  const meta = STATUS_META[status];
  const Icon =
    status === 'red'
      ? ShieldAlert
      : status === 'orange'
      ? AlertTriangle
      : status === 'yellow'
      ? AlertCircle
      : CheckCircle2;

  return (
    <div className="pointer-events-none select-none whitespace-nowrap rounded-lg border border-white/20 bg-[#060B14]/95 px-2.5 py-1.5 shadow-xl">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: meta.colorHex }} />
        <span className="text-xs font-semibold text-[#E6EDF6]">{label}</span>
        <span className={`rounded border px-1.5 py-0.5 font-mono-tabular text-[10px] font-medium ${meta.badgeClass}`}>
          {meta.shortLabel} · {score}
        </span>
      </div>
    </div>
  );
}

class SceneErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function CameraRig({
  preset,
  resetToken,
  isSoftwareGl,
}: {
  preset: 'overview' | 'brain' | 'heart' | 'lungs';
  resetToken: number;
  isSoftwareGl: boolean;
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const activeTransitionRef = useRef(true);
  const lastKeyRef = useRef(`${preset}-${resetToken}`);
  const { invalidate } = useThree();

  const currentKey = `${preset}-${resetToken}`;
  if (lastKeyRef.current !== currentKey) {
    lastKeyRef.current = currentKey;
    activeTransitionRef.current = true;
    invalidate();
  }

  useFrame((state, delta) => {
    const controls = controlsRef.current;
    if (!controls || !activeTransitionRef.current) return;

    const cfg = CAMERA_PRESETS[preset];
    _targetPos.set(...cfg.pos);
    _targetLook.set(...cfg.look);

    const lambda = isSoftwareGl ? 18 : 6;
    const alpha = 1 - Math.exp(-lambda * Math.min(delta, 0.08));

    state.camera.position.lerp(_targetPos, alpha);
    controls.target.lerp(_targetLook, alpha);
    controls.update();
    invalidate();

    if (
      state.camera.position.distanceTo(_targetPos) < 0.015 &&
      controls.target.distanceTo(_targetLook) < 0.015
    ) {
      activeTransitionRef.current = false;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping={!isSoftwareGl}
      dampingFactor={0.07}
      minDistance={0.55}
      maxDistance={5.2}
      maxPolarAngle={Math.PI / 1.85}
      onChange={() => invalidate()}
      onStart={() => {
        activeTransitionRef.current = false;
        invalidate();
      }}
    />
  );
}

interface HealthAtlasCanvasProps {
  assessment: HealthAssessment;
  selectedOrgan: OrganTarget;
  showSuitShell: boolean;
  showOrgans: boolean;
  showSkeleton: boolean;
  cameraPreset: 'overview' | 'brain' | 'heart' | 'lungs';
  resetToken?: number;
  onSelectOrgan: (organ: OrganTarget) => void;
}

export function HealthAtlasCanvas({
  assessment,
  selectedOrgan,
  showSuitShell,
  showOrgans,
  showSkeleton,
  cameraPreset,
  resetToken = 0,
  onSelectOrgan,
}: HealthAtlasCanvasProps) {
  const { astronautModelUrl, brainModelUrl, heartModelUrl, lungsModelUrl } =
    useDriveMedia();
  const reducedMotion = useReducedMotion();
  const isSoftwareGl = useMemo(() => detectSoftwareWebGL(), []);
  const containerRef = useRef<HTMLDivElement>(null);

  const [hoveredOrgan, setHoveredOrgan] = useState<OrganTarget | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const [tabHidden, setTabHidden] = useState(
    typeof document !== 'undefined' ? document.visibilityState === 'hidden' : false
  );
  const [inViewport, setInViewport] = useState(true);

  const [assetStates, setAssetStates] = useState<
    Record<'astronaut' | 'brain' | 'heart' | 'lungs', { status: GltfLoadStatus; error?: string }>
  >({
    astronaut: { status: 'loading' },
    brain: { status: 'loading' },
    heart: { status: 'loading' },
    lungs: { status: 'loading' },
  });

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

  const updateAssetStatus = useCallback(
    (key: 'astronaut' | 'brain' | 'heart' | 'lungs', status: GltfLoadStatus, message?: string) => {
      setAssetStates((prev) => {
        if (prev[key].status === status && prev[key].error === message) return prev;
        return { ...prev, [key]: { status, error: message } };
      });
    },
    []
  );

  const brainCombinedStatus = getOrganSelectorStatus('brain', assessment);
  const brainCombinedScore = Math.round(
    (assessment.systems.brain.score + assessment.systems.behavioral.score) / 2
  );
  const heartSystem = assessment.systems.cardiovascular;
  const lungsSystem = assessment.systems.respiratory;

  const isLoadingModels = Object.values(assetStates).some((s) => s.status === 'loading');
  const failedAssets = (Object.entries(assetStates) as Array<[string, { status: GltfLoadStatus; error?: string }]>)
    .filter(([, val]) => val.status === 'error');
  const allLoadedGltf = Object.values(assetStates).some((s) => s.status === 'loaded');
  const pauseRenderLoop = tabHidden || !inViewport || reducedMotion;

  const errorFallback = (
    <div className="flex h-full min-h-[520px] items-center justify-center rounded-xl border border-white/10 bg-[#070B16] p-6">
      <ErrorState
        title="3D Health Atlas Viewport Unavailable"
        description="Your browser or graphics context could not initialize the 3D scene. All system health panels remain fully accessible using the Brain, Heart, Lungs, and Full Body buttons above."
        action={
          <button
            type="button"
            onClick={() => {
              setContextLost(false);
              setRetryToken((n) => n + 1);
            }}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#22D3EE]/50 bg-[#0B3D91] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#1D4ED8]"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Reload 3D Atlas</span>
          </button>
        }
        compact
      />
    </div>
  );

  if (contextLost) return errorFallback;

  return (
    <SceneErrorBoundary fallback={errorFallback}>
      <div
        ref={containerRef}
        role="region"
        aria-label={`Interactive 3D anatomical health atlas. Selected view: ${selectedOrgan.replace('_', ' ')}. Current statuses — Brain: ${STATUS_META[brainCombinedStatus].shortLabel}, Heart: ${STATUS_META[heartSystem.status].shortLabel}, Lungs: ${STATUS_META[lungsSystem.status].shortLabel}, Full Body: ${STATUS_META[assessment.overallStatus].shortLabel}. Use the accessible anatomical system buttons above or below to switch panels with keyboard or screen reader.`}
        className="relative h-full w-full overflow-hidden rounded-xl border border-white/10 bg-[#050811]"
      >
        {/* Loading / Error / Model Status HUD */}
        {isLoadingModels && (
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-none absolute right-4 top-4 z-10 flex items-center gap-2 rounded-lg border border-white/15 bg-[#0B1120]/95 px-3 py-1.5 text-[11px] text-slate-200"
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#22D3EE]" aria-hidden="true" />
            <span>Loading 3D anatomical models...</span>
          </div>
        )}

        {!isLoadingModels && failedAssets.length > 0 && (
          <div
            role="alert"
            className="absolute right-4 top-4 z-10 flex flex-wrap items-center gap-2 rounded-lg border border-[#F97316]/45 bg-[#0B1120]/95 px-3 py-1.5 text-[11px] text-[#FB923C]"
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              Unable to load {failedAssets.map(([k]) => `${k}.glb`).join(', ')} (procedural fallback active)
            </span>
            <button
              type="button"
              onClick={() => setRetryToken((n) => n + 1)}
              className="inline-flex items-center gap-1 rounded border border-[#22D3EE]/40 bg-[#121C2B] px-2 py-0.5 text-[10px] font-medium text-[#22D3EE] hover:text-white"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {!isLoadingModels && failedAssets.length === 0 && !allLoadedGltf && (
          <div className="pointer-events-none absolute right-4 top-4 z-10 flex items-center gap-2 rounded-lg border border-white/15 bg-[#0B1120]/90 px-3 py-1.5 text-[11px] text-slate-300">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#38BDF8]" aria-hidden="true" />
            <span>Procedural 3D anatomy active</span>
          </div>
        )}

        <Canvas
          frameloop={pauseRenderLoop ? 'demand' : 'always'}
          shadows={!isSoftwareGl}
          dpr={isSoftwareGl ? 1 : [1, 2]}
          camera={{ position: [0, 1.35, 3.1], fov: 40 }}
          gl={{ antialias: !isSoftwareGl, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener('webglcontextlost', (e) => {
              e.preventDefault();
              setContextLost(true);
            });
          }}
        >
          <color attach="background" args={['#050811']} />
          <fog attach="fog" args={['#050811', 5.5, 13]} />
          <StudioLightingRig />

          <Suspense fallback={null}>
            <group position={[0, 0, 0]}>
              {/* Astronaut Body / Outer Suit Layer */}
              {showSuitShell && (
                <group>
                  <AtlasGltfModel
                    modelKey="astronaut"
                    driveUrl={astronautModelUrl}
                    targetHeight={1.76}
                    transparentOverride={showOrgans || showSkeleton}
                    opacityOverride={showOrgans || showSkeleton ? 0.22 : 0.96}
                    emissiveTint={statusHex(assessment.overallStatus)}
                    emissiveIntensity={
                      selectedOrgan === 'full_body'
                        ? 0.16
                        : assessment.overallStatus === 'green'
                        ? 0.03
                        : 0.09
                    }
                    retryToken={retryToken}
                    onStatusChange={(s, msg) => updateAssetStatus('astronaut', s, msg)}
                    onClick={() => onSelectOrgan('full_body')}
                    fallback={
                      <ProceduralAstronautSuit
                        visible
                        transparentShell={showOrgans || showSkeleton}
                        status={assessment.overallStatus}
                        onSelectBody={() => onSelectOrgan('full_body')}
                      />
                    }
                  />
                </group>
              )}

              {/* Skeleton Layer */}
              <ProceduralSkeletonLayer visible={showSkeleton} />

              {/* Selectable Organs Layer */}
              {showOrgans && (
                <>
                  {/* Brain (Cranial Cavity) */}
                  <group position={[0, 1.56, 0.01]}>
                    <AtlasGltfModel
                      modelKey="brain"
                      driveUrl={brainModelUrl}
                      targetHeight={0.14}
                      position={[0, -0.07, 0]}
                      emissiveTint={statusHex(brainCombinedStatus)}
                      emissiveIntensity={
                        selectedOrgan === 'brain'
                          ? 0.35
                          : hoveredOrgan === 'brain'
                          ? 0.22
                          : brainCombinedStatus === 'green'
                          ? 0.06
                          : 0.14
                      }
                      retryToken={retryToken}
                      onStatusChange={(s, msg) => updateAssetStatus('brain', s, msg)}
                      onClick={() => onSelectOrgan('brain')}
                      onHoverChange={(h) => setHoveredOrgan(h ? 'brain' : null)}
                      fallback={
                        <ProceduralBrainModel
                          status={brainCombinedStatus}
                          selected={selectedOrgan === 'brain'}
                          hovered={hoveredOrgan === 'brain'}
                          reducedMotion={reducedMotion || pauseRenderLoop}
                          onSelect={onSelectOrgan}
                          onHoverChange={(h) => setHoveredOrgan(h ? 'brain' : null)}
                        />
                      }
                    />
                    {hoveredOrgan === 'brain' && (
                      <Html position={[0, 0.14, 0]} center distanceFactor={2.4}>
                        <StatusHoverBadge
                          label="Mind, Sleep & Behavior"
                          status={brainCombinedStatus}
                          score={brainCombinedScore}
                        />
                      </Html>
                    )}
                  </group>

                  {/* Heart (Left-Center Thoracic Cavity) */}
                  <group position={[0.028, 1.13, 0.045]}>
                    <AtlasGltfModel
                      modelKey="heart"
                      driveUrl={heartModelUrl}
                      targetHeight={0.15}
                      position={[0, -0.075, 0]}
                      emissiveTint={statusHex(heartSystem.status)}
                      emissiveIntensity={
                        selectedOrgan === 'heart'
                          ? 0.35
                          : hoveredOrgan === 'heart'
                          ? 0.22
                          : heartSystem.status === 'green'
                          ? 0.06
                          : 0.14
                      }
                      retryToken={retryToken}
                      onStatusChange={(s, msg) => updateAssetStatus('heart', s, msg)}
                      onClick={() => onSelectOrgan('heart')}
                      onHoverChange={(h) => setHoveredOrgan(h ? 'heart' : null)}
                      fallback={
                        <ProceduralHeartModel
                          status={heartSystem.status}
                          selected={selectedOrgan === 'heart'}
                          hovered={hoveredOrgan === 'heart'}
                          reducedMotion={reducedMotion || pauseRenderLoop}
                          onSelect={onSelectOrgan}
                          onHoverChange={(h) => setHoveredOrgan(h ? 'heart' : null)}
                        />
                      }
                    />
                    {hoveredOrgan === 'heart' && (
                      <Html position={[0.12, 0.08, 0.05]} center distanceFactor={2.4}>
                        <StatusHoverBadge
                          label="Cardiovascular Health"
                          status={heartSystem.status}
                          score={heartSystem.score}
                        />
                      </Html>
                    )}
                  </group>

                  {/* Lungs (Bilateral Thoracic Cavity) */}
                  <group position={[0, 1.16, -0.01]}>
                    <AtlasGltfModel
                      modelKey="lungs"
                      driveUrl={lungsModelUrl}
                      targetHeight={0.27}
                      position={[0, -0.135, 0]}
                      emissiveTint={statusHex(lungsSystem.status)}
                      emissiveIntensity={
                        selectedOrgan === 'lungs'
                          ? 0.32
                          : hoveredOrgan === 'lungs'
                          ? 0.2
                          : lungsSystem.status === 'green'
                          ? 0.06
                          : 0.14
                      }
                      retryToken={retryToken}
                      onStatusChange={(s, msg) => updateAssetStatus('lungs', s, msg)}
                      onClick={() => onSelectOrgan('lungs')}
                      onHoverChange={(h) => setHoveredOrgan(h ? 'lungs' : null)}
                      fallback={
                        <ProceduralLungsModel
                          status={lungsSystem.status}
                          selected={selectedOrgan === 'lungs'}
                          hovered={hoveredOrgan === 'lungs'}
                          reducedMotion={reducedMotion || pauseRenderLoop}
                          onSelect={onSelectOrgan}
                          onHoverChange={(h) => setHoveredOrgan(h ? 'lungs' : null)}
                        />
                      }
                    />
                    {hoveredOrgan === 'lungs' && (
                      <Html position={[-0.18, 0.14, 0.02]} center distanceFactor={2.4}>
                        <StatusHoverBadge
                          label="Respiratory Health"
                          status={lungsSystem.status}
                          score={lungsSystem.score}
                        />
                      </Html>
                    )}
                  </group>
                </>
              )}

              <TelemetryPedestal status={assessment.overallStatus} />
            </group>
          </Suspense>

          <CameraRig
            preset={cameraPreset}
            resetToken={resetToken}
            isSoftwareGl={isSoftwareGl}
          />
        </Canvas>
      </div>
    </SceneErrorBoundary>
  );
}
