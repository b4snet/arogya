import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ProceduralSpaceship } from './ProceduralSpaceship';

export type VehicleModelStatus = 'procedural' | 'loading' | 'loaded' | 'error';

export interface VehicleModelResult {
  status: VehicleModelStatus;
  /** URL that actually loaded, or null when the procedural placeholder is used. */
  loadedUrl: string | null;
  detail?: string;
  progressPercent?: number | null;
}

interface VehicleGltfModelProps {
  candidates: string[];
  targetSize?: number;
  onStatusChange?: (result: VehicleModelResult) => void;
  onProgress?: (progressPercent: number | null) => void;
  onRadiusChange?: (radius: number) => void;
}

/**
 * Loads the first available vehicle GLB from a bounded, same-origin candidate list.
 *
 * Nothing is downloaded from unknown hosts: the candidate list comes from
 * `resolveVehicleModelCandidates`, which only produces bundled paths. When every candidate
 * fails, the procedural spacecraft is shown and the UI reports the failure.
 */
export function VehicleGltfModel({
  candidates,
  targetSize = 4.4,
  onStatusChange,
  onProgress,
  onRadiusChange,
}: VehicleGltfModelProps) {
  const [object, setObject] = useState<THREE.Object3D | null>(null);
  const [status, setStatus] = useState<VehicleModelStatus>('loading');
  const candidateKey = candidates.join('|');

  useEffect(() => {
    let cancelled = false;
    const loader = new GLTFLoader();

    const attempt = async () => {
      setStatus('loading');
      for (const url of candidates) {
        try {
          onProgress?.(0);
          const gltf = await loader.loadAsync(url, (event) => {
            onProgress?.(event.lengthComputable && event.total > 0
              ? Math.round((event.loaded / event.total) * 100)
              : null);
          });
          if (cancelled) return;

          const root = gltf.scene;
          const box = new THREE.Box3().setFromObject(root);
          const size = box.getSize(new THREE.Vector3());
          const maxDimension = Math.max(size.x, size.y, size.z, 0.001);
          root.scale.setScalar(targetSize / maxDimension);

          const scaledBox = new THREE.Box3().setFromObject(root);
          const center = scaledBox.getCenter(new THREE.Vector3());
          const sphere = scaledBox.getBoundingSphere(new THREE.Sphere());
          root.position.sub(center);
          onRadiusChange?.(sphere.radius);

          root.traverse((child) => {
            const mesh = child as THREE.Mesh;
            if (mesh.isMesh) {
              mesh.castShadow = false;
              mesh.receiveShadow = false;
            }
          });

          setObject(root);
          setStatus('loaded');
          onStatusChange?.({ status: 'loaded', loadedUrl: url });
          onProgress?.(100);
          return;
        } catch {
          // Try the next candidate; unknown or missing files must never break the page.
        }
      }

      if (cancelled) return;
      setStatus('error');
      setObject(null);
      onStatusChange?.({
        status: 'error',
        loadedUrl: null,
        detail: 'The local Programme ERIZON model could not be loaded.',
      });
      onProgress?.(null);
    };

    void attempt();

    return () => {
      cancelled = true;
    };
  }, [candidateKey, candidates, targetSize, onStatusChange, onProgress, onRadiusChange]);

  // Dispose GPU resources when this instance goes away.
  useEffect(() => {
    return () => {
      object?.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry?.dispose();
        const material = mesh.material;
        if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
        else material?.dispose();
      });
    };
  }, [object]);

  if (object) return <primitive object={object} />;

  return (
    <group>
      <ProceduralSpaceship />
      {/* Status is surfaced by the parent overlay, not inside the canvas. */}
      <mesh visible={false} name={`vehicle-fallback-${status}`} />
    </group>
  );
}
