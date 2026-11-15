import type { Mission } from '../types';

export const SEED_MISSION: Mission = {
  id: 'ARES-7-MARS',
  name: 'ARES-7 Transit',
  vehicleName: 'Programme ERIZON',
  phase: 'transit',
  currentDay: 14,
  totalPlannedDays: 260,
  marsDistanceKm: 141_696_000,
  earthDistanceKm: 36_400_000,
  remainingTravelDays: 246,
  oneWayLightDelaySec: 121,
  departureDateIso: '2026-11-01T00:00:00Z',
  arrivalDateIso: '2027-07-19T00:00:00Z',
  configuredVelocityKmH: 24_000,
  syncDayToCurrentDate: true,
  environment: {
    cabinPressureKpa: 101.2,
    cabinOxygenPercent: 20.9,
    cabinCo2MmHg: 2.6,
    cabinTempC: 21.8,
    relativeHumidityPercent: 44,
    ambientRadiationRateMsvPerDay: 0.49,
    solarParticleAlert: 'quiet',
  },
};
