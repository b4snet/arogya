export type TelemetrySource = 'wearable_mock' | 'cabin_sensor_mock' | 'manual_entry' | 'device_ble' | 'spacecraft_bus';

export interface VitalReading {
  id: string;
  astronautId: string;
  missionDay: number;
  timestampIso: string;
  source: TelemetrySource;
  // Nullable fields allow explicit missing-data detection (never treated as normal)
  heartRateBpm: number | null;
  hrvMs: number | null;
  systolicBpMmHg: number | null;
  diastolicBpMmHg: number | null;
  spo2Percent: number | null;
  respiratoryRateBpm: number | null;
  bodyTempC: number | null;
  bloodGlucoseMgDl: number | null;
  dailyRadiationMsv: number | null;
  cumulativeRadiationMsv: number | null;
  bodyMassKg?: number | null;
}

export type Vitals = VitalReading;
