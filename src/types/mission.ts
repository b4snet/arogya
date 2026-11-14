export type MissionPhase =
  | 'Earth departure'
  | 'transit'
  | 'Mars approach'
  | 'Mars orbit'
  | 'Mars surface';

export interface MissionEnvironment {
  cabinPressureKpa: number;
  cabinOxygenPercent: number;
  cabinCo2MmHg: number;
  cabinTempC: number;
  relativeHumidityPercent: number;
  ambientRadiationRateMsvPerDay: number;
  solarParticleAlert: 'quiet' | 'elevated' | 'storm_shelter';
}

export interface Mission {
  id: string;
  name: string;
  vehicleName: string;
  phase: MissionPhase;
  currentDay: number;
  totalPlannedDays: number;
  marsDistanceKm: number;
  earthDistanceKm: number;
  remainingTravelDays: number;
  oneWayLightDelaySec: number;
  departureDateIso?: string;
  arrivalDateIso?: string;
  configuredVelocityKmH?: number;
  syncDayToCurrentDate?: boolean;
  environment: MissionEnvironment;
}
