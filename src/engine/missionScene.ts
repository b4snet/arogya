/**
 * Mission flight-scene configuration, data-integrity labels and overlay text.
 *
 * Everything is pure so the labels, the model-path resolution and the derived overlay can be
 * tested without a WebGL context.
 *
 * Non-negotiables encoded here:
 * - ARES-7 is a fictional mission. Nothing is presented as live NASA telemetry.
 * - There is no ephemeris integration in this build, and the UI says so instead of implying one.
 * - Decorative star/planet/asteroid motion is illustrative and explicitly not to scale.
 * - Earth↔spacecraft distance drives the communications delay; Mars distance is separate.
 */

import type { CalculatedMissionTelemetry } from './missionOrbitEngine';
import { formatDurationMmSs } from './missionOrbitEngine';

export const PROGRAMME_ERIZON_MODEL_PATH = 'models/programme_erizon.glb';

/**
 * Resolve only the approved Programme ERIZON local model, never an unrelated fallback asset.
 */
export const DEFAULT_VEHICLE_GLB_CANDIDATES = [PROGRAMME_ERIZON_MODEL_PATH] as const;

export interface VehicleCandidateResolution {
  candidates: string[];
  /** Paths rejected because they point outside this origin (not approved). */
  rejectedExternal: string[];
}

export function resolveVehicleModelCandidates(params: {
  baseUrl?: string;
}): VehicleCandidateResolution {
  const baseUrl = params.baseUrl ?? '/';

  if (import.meta.env.MODE === 'release') return { candidates: [], rejectedExternal: [] };

  return {
    candidates: DEFAULT_VEHICLE_GLB_CANDIDATES.map((path) => `${baseUrl}${path}`),
    rejectedExternal: [],
  };
}

export const MISSION_SCENE_LABELS = {
  simulation: {
    title: 'Mission simulation',
    detail:
      'ARES-7 Transit is a fictional scenario. Day, progress, velocity and trajectory come from the configured departure/arrival dates, cruise speed and the simplified transfer model in this app.',
  },
  ephemeris: {
    title: 'Ephemeris-backed celestial context: not integrated',
    detail:
      'No ephemeris source is connected in this build. The transfer ellipse and Sun-centred positions are simplified geometry for illustration, not JPL/SPICE state vectors, and are not a live tracking feed.',
  },
  cinematic: {
    title: 'Illustrative cinematic effects',
    detail:
      'Stars, the distant planet, drifting rocks and the vehicle motion are decorative, not to scale, and do not represent real celestial encounters.',
  },
} as const;

export const MISSION_NOT_LIVE_NOTE =
  'Not live NASA telemetry. No value on this page is a real-time mission feed.';

export type VehicleModelSource = 'programme_erizon' | 'procedural';

export type VehicleModelLoadState = 'procedural' | 'loading' | 'loaded' | 'error';

export function describeVehicleLoadState(state: VehicleModelLoadState): string {
  if (state === 'procedural') return 'Illustrative procedural spacecraft — mission simulation only.';
  if (state === 'loading') return 'Loading Programme ERIZON…';
  if (state === 'loaded') return 'Programme ERIZON loaded.';
  return 'Programme ERIZON could not be loaded — showing illustrative fallback.';
}

export function describeVehicleDisplayLabel(params: {
  releaseBuild: boolean;
  status: VehicleModelLoadState;
}): string {
  if (params.releaseBuild) return 'Illustrative procedural spacecraft · ARES-7 Transit';
  if (params.status === 'loaded') return 'Programme ERIZON · ARES-7 Transit';
  if (params.status === 'error') return 'Procedural fallback · ARES-7 Transit';
  if (params.status === 'procedural') return 'Illustrative procedural spacecraft · ARES-7 Transit';
  return 'Loading Programme ERIZON · ARES-7 Transit';
}

export function describeVehicleModelSource(source: VehicleModelSource): string {
  return source === 'programme_erizon'
    ? 'Vehicle model: Programme ERIZON GLB loaded locally'
    : 'Vehicle model: procedural spacecraft fallback';
}

export interface MissionSceneOverlay {
  missionTimeLabel: string;
  elapsedLabel: string;
  progressLabel: string;
  progressPercent: number;
  remainingLabel: string;
  dataTimestampLabel: string;
  dataTimestampIso: string;
  sourceModeLabel: string;
  earthDistanceKm: number;
  earthDistanceLabel: string;
  earthDelayLabel: string;
  earthDelaySec: number;
  marsDistanceKm: number;
  marsDistanceLabel: string;
  velocityLabel: string;
  phaseLabel: string;
}

function formatUtc(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unavailable';
  return `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

function formatKm(km: number): string {
  if (!Number.isFinite(km)) return 'Unavailable';
  return `${(km / 1_000_000).toFixed(2)} M km`;
}

export function buildMissionSceneOverlay(
  telemetry: CalculatedMissionTelemetry,
  options: {
    dataTimestampIso: string;
    modelSource: VehicleModelSource;
    paused: boolean;
  }
): MissionSceneOverlay {
  const elapsedDays = Math.max(0, telemetry.missionDay - 1);

  return {
    missionTimeLabel: `Sol ${telemetry.missionDay} of ${telemetry.totalDurationDays}`,
    elapsedLabel: `${elapsedDays} day${elapsedDays === 1 ? '' : 's'} elapsed since departure`,
    progressLabel: `${telemetry.progressPercent.toFixed(1)}% of the simulated transit`,
    progressPercent: telemetry.progressPercent,
    remainingLabel:
      telemetry.remainingDays === 0
        ? 'Arrival day reached'
        : `${telemetry.remainingDays} days (${telemetry.remainingWeeks} weeks)`,
    dataTimestampIso: options.dataTimestampIso,
    dataTimestampLabel: formatUtc(options.dataTimestampIso),
    sourceModeLabel: `Mission simulation · ${describeVehicleModelSource(options.modelSource)} · ${
      options.paused ? 'motion paused' : 'motion running'
    }`,
    earthDistanceKm: telemetry.currentDistanceFromEarthKm,
    earthDistanceLabel: formatKm(telemetry.currentDistanceFromEarthKm),
    earthDelaySec: telemetry.oneWayLightDelaySec,
    earthDelayLabel: `${formatDurationMmSs(telemetry.oneWayLightDelaySec)} one-way (Earth↔spacecraft light travel)`,
    marsDistanceKm: telemetry.currentDistanceToMarsKm,
    marsDistanceLabel: formatKm(telemetry.currentDistanceToMarsKm),
    velocityLabel: `${telemetry.spacecraftVelocityKmH.toLocaleString()} km/h configured cruise (simulated)`,
    phaseLabel: telemetry.phase,
  };
}

export type SceneMotionMode = 'animated' | 'static';

/** Motion is static when the user paused it or the scene is off-screen / tab hidden. */
export function resolveSceneMotionMode(params: {
  paused: boolean;
  visible: boolean;
}): SceneMotionMode {
  return params.paused || !params.visible ? 'static' : 'animated';
}

/** Reduced motion starts the scene paused; the user can still resume explicitly. */
export function initialScenePaused(reducedMotion: boolean): boolean {
  return reducedMotion;
}

/** Star count adapts to viewport width so small screens keep a smooth frame rate. */
export function starCountForViewport(width: number): number {
  if (!Number.isFinite(width) || width <= 0) return 500;
  if (width < 640) return 420;
  if (width < 1024) return 700;
  return 1000;
}
