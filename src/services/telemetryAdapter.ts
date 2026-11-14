import type { MissionEnvironment, VitalReading } from '../types';
import { SEED_VITALS_BY_ASTRONAUT } from '../data/vitals14Day';
import { SEED_MISSION } from '../data/missionData';

/**
 * TelemetryProvider defines the boundary between Arogya's Zustand/Engine layer
 * and external biometric hardware or spacecraft telemetry buses.
 *
 * To replace mock data with real devices later:
 * 1. Implement `TelemetryProvider` (e.g., `WebBluetoothWearableProvider` or `SpacecraftBusWebSocketProvider`).
 * 2. Map incoming sensor packets into `VitalReading` (setting unavailable sensors to `null`, never `0`).
 * 3. Call `useArogyaStore.getState().ingestVitalReading(reading)` or `updateMissionEnvironment(env)`.
 */
export interface TelemetryProvider {
  readonly providerName: string;
  fetchLatestVitals(astronautId: string): Promise<VitalReading[]>;
  fetchEnvironment(): Promise<MissionEnvironment>;
  subscribeVitals?(
    astronautId: string,
    onReading: (reading: VitalReading) => void
  ): () => void;
}

export class MockTelemetryProvider implements TelemetryProvider {
  readonly providerName = 'Offline Seed Telemetry Provider';

  async fetchLatestVitals(astronautId: string): Promise<VitalReading[]> {
    return SEED_VITALS_BY_ASTRONAUT[astronautId] ?? [];
  }

  async fetchEnvironment(): Promise<MissionEnvironment> {
    return SEED_MISSION.environment;
  }
}

export const activeTelemetryProvider: TelemetryProvider = new MockTelemetryProvider();
