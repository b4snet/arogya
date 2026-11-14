import type { OrganTarget } from '../types';

/**
 * 3D Health Atlas Anatomical Placement & Camera Configuration
 *
 * Central configuration file for positioning, orientation, and scaling
 * of external .glb models and procedural fallbacks relative to the 1.76m astronaut reference figure.
 *
 * All coordinates are in Three.js world units (meters):
 * - X: Left (-) / Right (+)
 * - Y: Foot (0.0) / Head (~1.76)
 * - Z: Posterior (-) / Anterior (+)
 */

export interface ModelPlacementConfig {
  /** Target bounding box height in meters for automatic normalization */
  targetHeight: number;
  /** Translation relative to the scene origin [x, y, z] */
  position: [number, number, number];
  /** Euler rotation in radians [x, y, z] */
  rotation: [number, number, number];
  /** Local offset applied after bounding box centering [x, y, z] */
  offset: [number, number, number];
  /** Subtly elevated emissive highlight factor when selected */
  selectedEmissiveIntensity: number;
  /** Emissive highlight factor on hover */
  hoverEmissiveIntensity: number;
  /** Idle emissive highlight factor */
  idleEmissiveIntensity: number;
}

export const ATLAS_ANATOMY_CONFIG = {
  astronaut: {
    targetHeight: 1.76,
    position: [0, 0, 0] as [number, number, number],
    rotation: [0, 0, 0] as [number, number, number],
    offset: [0, 0, 0] as [number, number, number],
    transparentShellOpacity: 0.22,
    opaqueShellOpacity: 0.96,
    selectedEmissiveIntensity: 0.16,
    hoverEmissiveIntensity: 0.10,
    idleEmissiveIntensity: 0.03,
  },
  brain: {
    // Cranial cavity centered at Y ~ 1.56m (within helmet visor opening)
    targetHeight: 0.145,
    position: [0, 1.56, 0.015] as [number, number, number],
    rotation: [0, 0, 0] as [number, number, number],
    offset: [0, -0.072, 0] as [number, number, number],
    selectedEmissiveIntensity: 0.35,
    hoverEmissiveIntensity: 0.22,
    idleEmissiveIntensity: 0.08,
  },
  heart: {
    // Left-anterior thoracic cavity centered at Y ~ 1.13m, slightly left of sternum
    targetHeight: 0.145,
    position: [0.032, 1.135, 0.045] as [number, number, number],
    rotation: [0, 0.15, -0.1] as [number, number, number],
    offset: [0, -0.072, 0] as [number, number, number],
    selectedEmissiveIntensity: 0.35,
    hoverEmissiveIntensity: 0.22,
    idleEmissiveIntensity: 0.08,
  },
  lungs: {
    // Bilateral thoracic cavity centered at Y ~ 1.16m surrounding the heart
    targetHeight: 0.265,
    position: [0, 1.16, -0.005] as [number, number, number],
    rotation: [0, 0, 0] as [number, number, number],
    offset: [0, -0.132, 0] as [number, number, number],
    selectedEmissiveIntensity: 0.32,
    hoverEmissiveIntensity: 0.20,
    idleEmissiveIntensity: 0.07,
  },
} as const;

export const ATLAS_CAMERA_PRESETS: Record<
  'overview' | 'brain' | 'heart' | 'lungs',
  { pos: [number, number, number]; look: [number, number, number] }
> = {
  overview: { pos: [0, 1.35, 3.1], look: [0, 0.95, 0] },
  brain: { pos: [0.35, 1.72, 0.92], look: [0, 1.56, 0] },
  heart: { pos: [0.28, 1.24, 0.86], look: [0.03, 1.135, 0] },
  lungs: { pos: [-0.36, 1.28, 0.96], look: [0, 1.16, 0] },
};

/** Exact status guidance copy mandated by mission safety specification */
export const ATLAS_STATUS_GUIDANCE_COPY = {
  green: 'Maintain current routine.',
  yellow: 'Monitor this trend and take preventive action.',
  orange: 'Notify the crew medical lead and monitor closely.',
  red: 'Follow the urgent escalation workflow and seek medical support.',
} as const;

export const ORGAN_TO_PRESET: Record<OrganTarget, 'overview' | 'brain' | 'heart' | 'lungs'> = {
  brain: 'brain',
  heart: 'heart',
  lungs: 'lungs',
  full_body: 'overview',
};

