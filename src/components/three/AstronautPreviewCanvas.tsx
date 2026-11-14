import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Link } from 'react-router-dom';
import { Loader2, Maximize2 } from 'lucide-react';
import type { HealthStatusLevel } from '../../types';
import { StudioLightingRig, detectSoftwareWebGL } from './StudioLightingRig';
import { ProceduralAstronautSuit, TelemetryPedestal } from './ProceduralOrganModels';
import { AtlasGltfModel, type GltfLoadStatus } from './DriveOrProceduralModel';
import { useDriveMedia } from '../../hooks/useDriveMedia';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { STATUS_META } from '../../engine/thresholds';
import { ErrorState } from '../ui';

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
  const isSoftwareGl = useMemo(() => detectSoftwareWebGL(), []);
  const containerRef = useRef<HTMLDivElement>(null);

  const [contextLost, setContextLost] = useState(false);
  const [modelStatus, setModelStatus] = useState<GltfLoadStatus>('procedural');
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

  const handleModelStatus = useCallback((s: GltfLoadStatus) => {
    setModelStatus(s);
  }, []);

  const shouldPause = tabHidden || !inViewport || reducedMotion || isSoftwareGl;

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={`Interactive 3D astronaut preview for ${astronautName}. Overall status: ${STATUS_META[status].shortLabel}. Use the Open 3D Atlas link for accessible keyboard and screen-reader organ panels.`}
      className="relative h-full min-h-[300px] w-full overflow-hidden rounded-xl border border-[var(--arogya-border-strong)] bg-[var(--arogya-surface)]"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 bg-gradient-to-b from-[#060B14]/85 to-transparent px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--arogya-text-secondary)]">
            3D Crew Avatar
          </p>
          <p className="truncate text-sm font-semibold text-[var(--arogya-text-primary)]">
            {astronautName}
          </p>
        </div>
        <Link
          to="/atlas"
          className="pointer-events-auto inline-flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-white/20 bg-[#0B1120]/95 px-3 py-1.5 text-xs font-medium text-slate-100 transition-colors hover:border-[#22D3EE]/60 hover:text-white"
        >
          <Maximize2 className="h-3.5 w-3.5 text-[#22D3EE]" aria-hidden="true" />
          <span>Open 3D Atlas</span>
        </Link>
      </div>

      {modelStatus === 'loading' && (
        <div className="pointer-events-none absolute bottom-11 right-4 z-10 flex items-center gap-1.5 rounded-md border border-white/15 bg-[#0B1120]/95 px-2.5 py-1 text-[11px] text-slate-200">
          <Loader2 className="h-3 w-3 animate-spin text-[#22D3EE]" aria-hidden="true" />
          <span>Loading astronaut model</span>
        </div>
      )}

      {modelStatus === 'error' && !contextLost && (
        <div
          role="status"
          className="pointer-events-none absolute bottom-11 left-4 z-10 rounded-md border border-[#EAB308]/40 bg-[#0B1120]/95 px-2.5 py-1 text-[11px] text-[#FACC15]"
        >
          Using backup 3D suit model
        </div>
      )}

      {contextLost ? (
        <div className="flex h-full min-h-[300px] items-center justify-center p-4">
          <ErrorState
            title="3D Preview Paused"
            description="Graphics rendering is unavailable right now. You can inspect vitals or open the 3D Health Atlas in accessible mode."
            action={
              <Link
                to="/atlas"
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#22D3EE]/50 bg-[#0B3D91] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1D4ED8]"
              >
                Open Health Atlas
              </Link>
            }
            compact
          />
        </div>
      ) : (
        <Canvas
          frameloop={shouldPause ? 'demand' : 'always'}
          shadows={!isSoftwareGl}
          dpr={isSoftwareGl ? 1 : [1, 2]}
          camera={{ position: [0, 1.35, 2.75], fov: 38 }}
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
          <StudioLightingRig />
          <group position={[0, -0.88, 0]}>
            <AtlasGltfModel
              modelKey="astronaut"
              driveUrl={astronautModelUrl}
              targetHeight={1.75}
              emissiveTint={STATUS_META[status].colorHex}
              emissiveIntensity={status === 'green' ? 0.04 : 0.14}
              onStatusChange={handleModelStatus}
              fallback={<ProceduralAstronautSuit visible status={status} />}
            />
            <TelemetryPedestal status={status} />
          </group>
          <OrbitControls
            enablePan={false}
            enableZoom={false}
            enableDamping={!isSoftwareGl}
            dampingFactor={0.06}
            autoRotate={!shouldPause}
            autoRotateSpeed={0.5}
            minPolarAngle={Math.PI / 3}
            maxPolarAngle={Math.PI / 1.95}
            target={[0, 0.02, 0]}
          />
        </Canvas>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-[#060B14]/90 to-transparent px-4 py-2.5 text-[11px] text-[var(--arogya-text-secondary)]">
        <span>Drag to orbit</span>
        <span className="font-mono-tabular uppercase">
          {modelStatus === 'loaded'
            ? `GLB Active · ${status.replace('_', ' ')}`
            : `EVA Model · ${status.replace('_', ' ')}`}
        </span>
      </div>
    </div>
  );
}
