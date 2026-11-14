import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import {
  resolveBundledLocalModelUrl,
  type AtlasModelKey,
} from '../../utils/localAssets';

export type GltfLoadStatus = 'procedural' | 'loading' | 'loaded' | 'error';

interface ModelErrorBoundaryProps {
  onError: (err: Error) => void;
  resetKey: string | number;
  fallback: ReactNode;
  children: ReactNode;
}

class ModelErrorBoundary extends Component<
  ModelErrorBoundaryProps,
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(prevProps: ModelErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

interface NormalizedModelSceneProps {
  url: string;
  targetHeight: number;
  position: [number, number, number];
  transparentOverride: boolean;
  opacityOverride: number;
  emissiveTint?: string;
  emissiveIntensity: number;
  onLoaded: () => void;
  onClick?: () => void;
  onHoverChange?: (hovered: boolean) => void;
}

function NormalizedGltfInstance({
  url,
  targetHeight,
  position,
  transparentOverride,
  opacityOverride,
  emissiveTint,
  emissiveIntensity,
  onLoaded,
  onClick,
  onHoverChange,
}: NormalizedModelSceneProps) {
  const gltf = useGLTF(url);

  // Clone and normalize geometry/materials ONCE per loaded GLTF + targetHeight
  const { normalizedScene, materials } = useMemo(() => {
    const root = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const maxY = Math.max(size.y, 0.001);
    const scale = targetHeight / maxY;
    root.scale.setScalar(scale);

    const scaledBox = new THREE.Box3().setFromObject(root);
    const center = scaledBox.getCenter(new THREE.Vector3());
    root.position.set(-center.x, -scaledBox.min.y, -center.z);

    const clonedMaterials: THREE.MeshStandardMaterial[] = [];

    root.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.receiveShadow = true;
        if (mesh.material) {
          const mat = Array.isArray(mesh.material)
            ? mesh.material[0].clone()
            : mesh.material.clone();
          mesh.material = mat;
          if (mat instanceof THREE.MeshStandardMaterial) {
            clonedMaterials.push(mat);
          }
        }
      }
    });

    return { normalizedScene: root, materials: clonedMaterials };
  }, [gltf.scene, targetHeight]);

  // Apply dynamic visual updates (hover/selection emissive & transparency) WITHOUT re-cloning scene
  useEffect(() => {
    normalizedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).castShadow = !transparentOverride;
      }
    });

    const tintColor = emissiveTint ? new THREE.Color(emissiveTint) : null;
    for (const mat of materials) {
      mat.transparent = transparentOverride;
      mat.opacity = transparentOverride ? opacityOverride : 1;
      mat.depthWrite = !transparentOverride;
      if (tintColor) {
        mat.emissive.copy(tintColor);
        mat.emissiveIntensity = emissiveIntensity;
      } else {
        mat.emissiveIntensity = 0;
      }
      mat.needsUpdate = true;
    }
  }, [
    normalizedScene,
    materials,
    transparentOverride,
    opacityOverride,
    emissiveTint,
    emissiveIntensity,
  ]);

  useEffect(() => {
    onLoaded();
  }, [onLoaded, url]);

  return (
    <group
      position={position}
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
      onPointerOver={(e) => {
        if (onHoverChange) {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
          onHoverChange(true);
        }
      }}
      onPointerOut={() => {
        if (onHoverChange) {
          document.body.style.cursor = 'default';
          onHoverChange(false);
        }
      }}
    >
      <primitive object={normalizedScene} />
    </group>
  );
}

function SuspenseStatusNotifier({
  onLoading,
  fallback,
}: {
  onLoading: () => void;
  fallback: ReactNode;
}) {
  useEffect(() => {
    onLoading();
  }, [onLoading]);

  return <>{fallback}</>;
}

interface AtlasGltfModelProps {
  modelKey: AtlasModelKey;
  driveUrl?: string | null;
  targetHeight?: number;
  position?: [number, number, number];
  transparentOverride?: boolean;
  opacityOverride?: number;
  emissiveTint?: string;
  emissiveIntensity?: number;
  retryToken?: number;
  fallback?: ReactNode;
  onStatusChange?: (status: GltfLoadStatus, message?: string) => void;
  onClick?: () => void;
  onHoverChange?: (hovered: boolean) => void;
}

export function AtlasGltfModel({
  modelKey,
  driveUrl = null,
  targetHeight = 1.75,
  position = [0, 0, 0],
  transparentOverride = false,
  opacityOverride = 1,
  emissiveTint,
  emissiveIntensity = 0,
  retryToken = 0,
  fallback = null,
  onStatusChange,
  onClick,
  onHoverChange,
}: AtlasGltfModelProps) {
  const [bundledUrl, setBundledUrl] = useState<string | null>(null);
  const [resolvedCheckDone, setResolvedCheckDone] = useState(false);

  // Lazy-load bundled /src/assets/models/<key>.glb URL via Vite import.meta.glob
  useEffect(() => {
    let active = true;
    setResolvedCheckDone(false);

    if (driveUrl) {
      setBundledUrl(null);
      setResolvedCheckDone(true);
      return () => {
        active = false;
      };
    }

    void resolveBundledLocalModelUrl(modelKey).then((url) => {
      if (!active) return;
      setBundledUrl(url);
      setResolvedCheckDone(true);
      if (!url) {
        onStatusChange?.('procedural');
      }
    });

    return () => {
      active = false;
    };
  }, [modelKey, driveUrl, retryToken, onStatusChange]);

  const effectiveUrl = driveUrl ?? bundledUrl;

  if (!resolvedCheckDone) {
    return (
      <group position={position}>
        <SuspenseStatusNotifier
          onLoading={() => onStatusChange?.('loading')}
          fallback={fallback}
        />
      </group>
    );
  }

  // If neither a Drive GLB nor a bundled /src/assets/models/<key>.glb exists yet, render procedural anatomy
  if (!effectiveUrl) {
    return <group position={position}>{fallback}</group>;
  }

  return (
    <ModelErrorBoundary
      resetKey={`${effectiveUrl}-${retryToken}`}
      onError={(err) => {
        onStatusChange?.('error', err.message || `Unable to load ${modelKey}.glb`);
      }}
      fallback={<group position={position}>{fallback}</group>}
    >
      <Suspense
        fallback={
          <group position={position}>
            <SuspenseStatusNotifier
              onLoading={() => onStatusChange?.('loading')}
              fallback={fallback}
            />
          </group>
        }
      >
        <NormalizedGltfInstance
          url={effectiveUrl}
          targetHeight={targetHeight}
          position={position}
          transparentOverride={transparentOverride}
          opacityOverride={opacityOverride}
          emissiveTint={emissiveTint}
          emissiveIntensity={emissiveIntensity}
          onLoaded={() => onStatusChange?.('loaded')}
          onClick={onClick}
          onHoverChange={onHoverChange}
        />
      </Suspense>
    </ModelErrorBoundary>
  );
}

export function LoadedDriveGltf(
  props: Omit<AtlasGltfModelProps, 'modelKey'> & { modelKey?: AtlasModelKey; url?: string }
) {
  return (
    <AtlasGltfModel
      {...props}
      modelKey={props.modelKey ?? 'astronaut'}
      driveUrl={props.driveUrl ?? props.url ?? null}
    />
  );
}
