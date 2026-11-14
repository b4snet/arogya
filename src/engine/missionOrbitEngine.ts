import type { MissionPhase } from '../types';

const AU_KM = 149_597_870.7;
const EARTH_ORBIT_AU = 1.0;
const MARS_ORBIT_AU = 1.524;
const SPEED_OF_LIGHT_KM_S = 299_792.458;
const EARTH_ANGULAR_RATE_RAD_DAY = (2 * Math.PI) / 365.25;
const MARS_ANGULAR_RATE_RAD_DAY = (2 * Math.PI) / 686.98;
const MS_PER_DAY = 86_400_000;

export const DEFAULT_MISSION_NAME = 'ARES-7 Transit';
export const DEFAULT_DEPARTURE_ISO = '2026-11-01T00:00:00Z';
export const DEFAULT_DURATION_DAYS = 260;
export const DEFAULT_VELOCITY_KMH = 24_000;

export const MISSION_SIMULATION_DISCLOSURE =
  'Simulated mission telemetry. Values are illustrative and do not represent real-time NASA mission data.';

export interface OrbitalPointAu {
  x: number;
  y: number;
}

export interface MissionTimelineMilestone {
  phase: MissionPhase;
  label: string;
  startDay: number;
  endDay: number;
  status: 'completed' | 'active' | 'upcoming';
}

export interface CalculatedMissionTelemetry {
  missionDay: number;
  totalDurationDays: number;
  progressPercent: number;
  remainingDays: number;
  remainingWeeks: number;
  remainingMonths: number;
  phase: MissionPhase;
  departureDateIso: string;
  arrivalDateIso: string;
  distanceTraveledKm: number;
  totalTransferDistanceKm: number;
  totalArcDistanceKm: number;
  currentDistanceToMarsKm: number;
  currentDistanceFromEarthKm: number;
  spacecraftVelocityKmS: number;
  spacecraftVelocityKmH: number;
  oneWayLightDelaySec: number;
  roundTripLightDelaySec: number;
  heliocentricRadiusAu: number;
  earthPosAu: OrbitalPointAu;
  marsPosAu: OrbitalPointAu;
  craftPosAu: OrbitalPointAu;
  transferArcPointsAu: OrbitalPointAu[];
  timelineMilestones: MissionTimelineMilestone[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function deriveMissionPhase(progressRatio: number): MissionPhase {
  if (progressRatio < 0.05) return 'Earth departure';
  if (progressRatio < 0.85) return 'transit';
  if (progressRatio < 0.96) return 'Mars approach';
  if (progressRatio < 1.0) return 'Mars orbit';
  return 'Mars surface';
}

export function calculateMissionDayFromDate(
  departureDateIso: string,
  totalDurationDays: number,
  referenceDate: Date = new Date()
): number {
  const dep = new Date(departureDateIso);
  if (Number.isNaN(dep.getTime())) return 1;
  const elapsedDays = Math.floor((referenceDate.getTime() - dep.getTime()) / MS_PER_DAY) + 1;
  return clamp(elapsedDays, 1, Math.max(1, totalDurationDays));
}

export function calculateDurationFromDates(
  departureDateIso: string,
  arrivalDateIso: string
): number {
  const dep = new Date(departureDateIso);
  const arr = new Date(arrivalDateIso);
  if (Number.isNaN(dep.getTime()) || Number.isNaN(arr.getTime())) {
    return DEFAULT_DURATION_DAYS;
  }
  const diffDays = Math.round((arr.getTime() - dep.getTime()) / MS_PER_DAY);
  return clamp(diffDays, 60, 500);
}

function buildTimelineMilestones(
  missionDay: number,
  totalDurationDays: number,
  currentPhase: MissionPhase
): MissionTimelineMilestone[] {
  const depEnd = Math.max(1, Math.floor(totalDurationDays * 0.05));
  const transitEnd = Math.max(depEnd + 1, Math.floor(totalDurationDays * 0.85));
  const approachEnd = Math.max(transitEnd + 1, Math.floor(totalDurationDays * 0.96));
  const orbitEnd = Math.max(approachEnd + 1, totalDurationDays - 1);

  const defs: Array<{ phase: MissionPhase; label: string; startDay: number; endDay: number }> = [
    { phase: 'Earth departure', label: 'Earth departure', startDay: 1, endDay: depEnd },
    { phase: 'transit', label: 'Transit', startDay: depEnd + 1, endDay: transitEnd },
    { phase: 'Mars approach', label: 'Mars approach', startDay: transitEnd + 1, endDay: approachEnd },
    { phase: 'Mars orbit', label: 'Mars orbit', startDay: approachEnd + 1, endDay: orbitEnd },
    { phase: 'Mars surface', label: 'Mars surface', startDay: totalDurationDays, endDay: totalDurationDays },
  ];

  return defs.map((item) => {
    let status: MissionTimelineMilestone['status'] = 'upcoming';
    if (item.phase === currentPhase) {
      status = 'active';
    } else if (missionDay > item.endDay) {
      status = 'completed';
    }
    return { ...item, status };
  });
}

/**
 * Simplified heliocentric Type-I orbital transfer telemetry model for ARES-7 Transit.
 * Simulated mission telemetry — values are illustrative and do not represent real-time NASA mission data.
 */
export function calculateMarsTransitTelemetry(params: {
  currentDay?: number;
  totalPlannedDays?: number;
  departureDateIso?: string;
  arrivalDateIso?: string;
  configuredVelocityKmH?: number;
  syncDayToCurrentDate?: boolean;
  referenceDate?: Date;
}): CalculatedMissionTelemetry {
  const parsedDeparture = new Date(params.departureDateIso ?? DEFAULT_DEPARTURE_ISO);
  const validDeparture = Number.isNaN(parsedDeparture.getTime())
    ? new Date(DEFAULT_DEPARTURE_ISO)
    : parsedDeparture;

  let totalDurationDays = clamp(
    Math.round(params.totalPlannedDays ?? DEFAULT_DURATION_DAYS) || DEFAULT_DURATION_DAYS,
    60,
    500
  );

  if (params.arrivalDateIso && !params.totalPlannedDays) {
    totalDurationDays = calculateDurationFromDates(
      validDeparture.toISOString(),
      params.arrivalDateIso
    );
  }

  const arrivalDate = new Date(validDeparture.getTime());
  arrivalDate.setUTCDate(arrivalDate.getUTCDate() + totalDurationDays);

  const computedDay = params.syncDayToCurrentDate
    ? calculateMissionDayFromDate(
        validDeparture.toISOString(),
        totalDurationDays,
        params.referenceDate
      )
    : params.currentDay ?? 1;

  const missionDay = clamp(Math.round(computedDay) || 1, 1, totalDurationDays);
  const progressRatio = clamp(missionDay / totalDurationDays, 0, 1);
  const progressPercent = Number((progressRatio * 100).toFixed(1));

  const remainingDays = Math.max(0, totalDurationDays - missionDay);
  const remainingWeeks = Number((remainingDays / 7).toFixed(1));
  const remainingMonths = Number((remainingDays / 30.4375).toFixed(1));

  const spacecraftVelocityKmH = clamp(
    Math.round(params.configuredVelocityKmH ?? DEFAULT_VELOCITY_KMH) || DEFAULT_VELOCITY_KMH,
    5_000,
    120_000
  );
  const spacecraftVelocityKmS = Number((spacecraftVelocityKmH / 3600).toFixed(2));

  // Total transfer distance derived from mission duration and cruise velocity
  const totalTransferDistanceKm = Math.max(1, Math.round(totalDurationDays * 24 * spacecraftVelocityKmH));
  const distanceTraveledKm = Math.min(
    totalTransferDistanceKm,
    Math.round(missionDay * 24 * spacecraftVelocityKmH)
  );
  const currentDistanceToMarsKm = Math.max(
    0,
    Math.round(totalTransferDistanceKm * (1 - progressRatio))
  );

  // Transfer ellipse geometry (1.0 AU perihelion -> 1.524 AU aphelion) for heliocentric visualization & RF distance
  const semiMajorAxisAu = (EARTH_ORBIT_AU + MARS_ORBIT_AU) / 2;
  const semiMinorAxisAu = Math.sqrt(EARTH_ORBIT_AU * MARS_ORBIT_AU);
  const eccentricity = (MARS_ORBIT_AU - EARTH_ORBIT_AU) / (MARS_ORBIT_AU + EARTH_ORBIT_AU);
  const h =
    Math.pow(semiMajorAxisAu - semiMinorAxisAu, 2) /
    Math.pow(semiMajorAxisAu + semiMinorAxisAu, 2);
  const halfEllipseAu =
    (Math.PI * (semiMajorAxisAu + semiMinorAxisAu) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)))) /
    2;
  const totalArcDistanceKm = Math.round(halfEllipseAu * AU_KM);

  const trueAnomalyRad = progressRatio * Math.PI + 0.14 * Math.sin(progressRatio * Math.PI);
  const clampedAnomaly = clamp(trueAnomalyRad, 0, Math.PI);

  const heliocentricRadiusAu =
    (semiMajorAxisAu * (1 - eccentricity * eccentricity)) /
    (1 + eccentricity * Math.cos(clampedAnomaly));

  const craftPosAu: OrbitalPointAu = {
    x: Number((heliocentricRadiusAu * Math.cos(clampedAnomaly)).toFixed(4)),
    y: Number((heliocentricRadiusAu * Math.sin(clampedAnomaly)).toFixed(4)),
  };

  const earthAngleRad = missionDay * EARTH_ANGULAR_RATE_RAD_DAY;
  const earthPosAu: OrbitalPointAu = {
    x: Number((EARTH_ORBIT_AU * Math.cos(earthAngleRad)).toFixed(4)),
    y: Number((EARTH_ORBIT_AU * Math.sin(earthAngleRad)).toFixed(4)),
  };

  const marsStartAngleRad = Math.PI - totalDurationDays * MARS_ANGULAR_RATE_RAD_DAY;
  const marsAngleRad = marsStartAngleRad + missionDay * MARS_ANGULAR_RATE_RAD_DAY;
  const marsPosAu: OrbitalPointAu = {
    x: Number((MARS_ORBIT_AU * Math.cos(marsAngleRad)).toFixed(4)),
    y: Number((MARS_ORBIT_AU * Math.sin(marsAngleRad)).toFixed(4)),
  };

  const dxEarthAu = earthPosAu.x - craftPosAu.x;
  const dyEarthAu = earthPosAu.y - craftPosAu.y;
  const rawEarthDistKm = Math.round(Math.hypot(dxEarthAu, dyEarthAu) * AU_KM);
  const currentDistanceFromEarthKm = Math.max(420, rawEarthDistKm);

  const oneWayLightDelaySec = Math.max(
    1,
    Math.round(currentDistanceFromEarthKm / SPEED_OF_LIGHT_KM_S)
  );
  const roundTripLightDelaySec = oneWayLightDelaySec * 2;

  const transferArcPointsAu: OrbitalPointAu[] = Array.from({ length: 37 }, (_, idx) => {
    const theta = (idx / 36) * Math.PI;
    const r =
      (semiMajorAxisAu * (1 - eccentricity * eccentricity)) /
      (1 + eccentricity * Math.cos(theta));
    return {
      x: Number((r * Math.cos(theta)).toFixed(4)),
      y: Number((r * Math.sin(theta)).toFixed(4)),
    };
  });

  const phase = deriveMissionPhase(progressRatio);
  const timelineMilestones = buildTimelineMilestones(missionDay, totalDurationDays, phase);

  return {
    missionDay,
    totalDurationDays,
    progressPercent,
    remainingDays,
    remainingWeeks,
    remainingMonths,
    phase,
    departureDateIso: validDeparture.toISOString(),
    arrivalDateIso: arrivalDate.toISOString(),
    distanceTraveledKm,
    totalTransferDistanceKm,
    totalArcDistanceKm,
    currentDistanceToMarsKm,
    currentDistanceFromEarthKm,
    spacecraftVelocityKmS,
    spacecraftVelocityKmH,
    oneWayLightDelaySec,
    roundTripLightDelaySec,
    heliocentricRadiusAu: Number(heliocentricRadiusAu.toFixed(3)),
    earthPosAu,
    marsPosAu,
    craftPosAu,
    transferArcPointsAu,
    timelineMilestones,
  };
}

export function formatDurationMmSs(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.round(totalSeconds % 60);
  return `${mins}m ${String(secs).padStart(2, '0')}s`;
}
