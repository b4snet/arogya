import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  Astronaut,
  AstronautBaseline,
  CheckIn,
  DriveAssetItem,
  Mission,
  MissionEnvironment,
  OrganTarget,
  Report,
  VitalReading,
} from '../types';
import { SEED_ASTRONAUTS } from '../data/astronauts';
import { SEED_MISSION } from '../data/missionData';
import { SEED_VITALS_BY_ASTRONAUT } from '../data/vitals14Day';
import { SEED_CHECKINS_BY_ASTRONAUT } from '../data/checkIns14Day';
import { clearCachedDriveAssets, loadCachedDriveAssets } from '../services/offlineStorage';
import { indexedDbStateStorage } from '../services/indexedDbStateStorage';

export interface AtlasLayerState {
  selectedOrgan: OrganTarget;
  showSuitShell: boolean;
  showOrgans: boolean;
  showSkeleton: boolean;
  showOrgansOnly: boolean;
  autoRotate: boolean;
  cameraPreset: 'overview' | 'brain' | 'heart' | 'lungs';
}

export interface PreferencesState {
  units: 'metric' | 'imperial';
  highContrast: boolean;
  reducedMotionOverride: boolean;
  enableVideoBackdrop: boolean;
}

interface ArogyaStore {
  astronauts: Astronaut[];
  activeAstronautId: string;
  mission: Mission;
  vitalsByAstronaut: Record<string, VitalReading[]>;
  checkInsByAstronaut: Record<string, CheckIn[]>;
  reports: Report[];
  atlasState: AtlasLayerState;
  preferences: PreferencesState;

  // Non-persisted runtime Drive state (hydrated from IndexedDB)
  driveAssets: DriveAssetItem[];
  driveUserEmail: string | null;
  driveNeedsAuth: boolean;
  driveSyncStatus: 'idle' | 'syncing' | 'ready' | 'error';
  driveSyncProgress: string;
  driveSyncError: string | null;

  // Actions
  setActiveAstronaut: (astronautId: string) => void;
  updateAstronautBaseline: (astronautId: string, baseline: Partial<AstronautBaseline>) => void;
  addCheckIn: (checkIn: Omit<CheckIn, 'id' | 'timestampIso' | 'syncedToGround'>) => void;
  addVitals: (
    vitals: Omit<VitalReading, 'id' | 'timestampIso' | 'cumulativeRadiationMsv' | 'source'> & {
      source?: VitalReading['source'];
    }
  ) => void;
  ingestVitalReading: (reading: VitalReading) => void;
  importVitalsBatch: (astronautId: string, records: VitalReading[]) => void;
  updateMissionSimulation: (patch: Partial<Mission>) => void;
  updateMissionEnvironment: (patch: Partial<MissionEnvironment>) => void;
  addReport: (report: Report) => void;
  deleteReport: (reportId: string) => void;
  setAtlasState: (patch: Partial<AtlasLayerState>) => void;
  selectOrgan: (organ: OrganTarget) => void;
  setPreferences: (patch: Partial<PreferencesState>) => void;

  // Drive actions
  hydrateCachedDriveAssets: () => Promise<void>;
  setDriveAuthState: (needsAuth: boolean, email?: string | null) => void;
  setDriveSyncState: (
    status: ArogyaStore['driveSyncStatus'],
    progress?: string,
    error?: string | null
  ) => void;
  setDriveAssets: (items: DriveAssetItem[]) => void;
  clearDriveCache: () => Promise<void>;
  resetDemoData: () => void;
}

export const useArogyaStore = create<ArogyaStore>()(
  persist(
    (set, get) => ({
      astronauts: SEED_ASTRONAUTS,
      activeAstronautId: SEED_ASTRONAUTS[0].id,
      mission: SEED_MISSION,
      vitalsByAstronaut: SEED_VITALS_BY_ASTRONAUT,
      checkInsByAstronaut: SEED_CHECKINS_BY_ASTRONAUT,
      reports: [],
      atlasState: {
        selectedOrgan: 'heart',
        showSuitShell: true,
        showOrgans: true,
        showSkeleton: false,
        showOrgansOnly: false,
        autoRotate: false,
        cameraPreset: 'overview',
      },
      preferences: {
        units: 'metric',
        highContrast: false,
        reducedMotionOverride: false,
        enableVideoBackdrop: true,
      },

      driveAssets: [],
      driveUserEmail: null,
      driveNeedsAuth: true,
      driveSyncStatus: 'idle',
      driveSyncProgress: '',
      driveSyncError: null,

      setActiveAstronaut: (astronautId) =>
        set((state) => {
          const exists = state.astronauts.some((a) => a.id === astronautId);
          return exists ? { activeAstronautId: astronautId } : state;
        }),

      updateAstronautBaseline: (astronautId, baseline) =>
        set((state) => ({
          astronauts: state.astronauts.map((a) =>
            a.id === astronautId ? { ...a, baseline: { ...a.baseline, ...baseline } } : a
          ),
        })),

      addCheckIn: (payload) =>
        set((state) => {
          const existing = state.checkInsByAstronaut[payload.astronautId] ?? [];
          const filtered = existing.filter((c) => c.missionDay !== payload.missionDay);
          const nextItem: CheckIn = {
            ...payload,
            id: `CHK-${payload.astronautId}-D${payload.missionDay}-${Date.now()}`,
            timestampIso: new Date().toISOString(),
            syncedToGround: false,
          };
          return {
            checkInsByAstronaut: {
              ...state.checkInsByAstronaut,
              [payload.astronautId]: [...filtered, nextItem].sort(
                (a, b) => a.missionDay - b.missionDay
              ),
            },
          };
        }),

      addVitals: (payload) =>
        set((state) => {
          const existing = state.vitalsByAstronaut[payload.astronautId] ?? [];
          const sortedPrev = [...existing]
            .filter((v) => v.missionDay < payload.missionDay)
            .sort((a, b) => a.missionDay - b.missionDay);
          const prevCum =
            sortedPrev.length > 0
              ? (sortedPrev[sortedPrev.length - 1].cumulativeRadiationMsv ?? 0)
              : 0;
          const filtered = existing.filter((v) => v.missionDay !== payload.missionDay);
          const dailyRad = payload.dailyRadiationMsv ?? 0;
          const nextItem: VitalReading = {
            ...payload,
            source: payload.source ?? 'manual_entry',
            id: `VIT-${payload.astronautId}-D${payload.missionDay}-${Date.now()}`,
            timestampIso: new Date().toISOString(),
            cumulativeRadiationMsv:
              payload.dailyRadiationMsv !== null
                ? Number((prevCum + dailyRad).toFixed(2))
                : prevCum,
          };
          return {
            vitalsByAstronaut: {
              ...state.vitalsByAstronaut,
              [payload.astronautId]: [...filtered, nextItem].sort(
                (a, b) => a.missionDay - b.missionDay
              ),
            },
          };
        }),

      ingestVitalReading: (reading) =>
        set((state) => {
          const existing = state.vitalsByAstronaut[reading.astronautId] ?? [];
          const filtered = existing.filter((v) => v.missionDay !== reading.missionDay);
          return {
            vitalsByAstronaut: {
              ...state.vitalsByAstronaut,
              [reading.astronautId]: [...filtered, reading].sort(
                (a, b) => a.missionDay - b.missionDay
              ),
            },
          };
        }),

      importVitalsBatch: (astronautId, records) =>
        set((state) => {
          const existing = state.vitalsByAstronaut[astronautId] ?? [];
          const byDay = new Map<number, VitalReading>();
          existing.forEach((v) => byDay.set(v.missionDay, v));
          records.forEach((v) => byDay.set(v.missionDay, v));
          const merged = Array.from(byDay.values()).sort((a, b) => a.missionDay - b.missionDay);
          return {
            vitalsByAstronaut: {
              ...state.vitalsByAstronaut,
              [astronautId]: merged,
            },
          };
        }),

      updateMissionSimulation: (patch) =>
        set((state) => ({
          mission: { ...state.mission, ...patch },
        })),

      updateMissionEnvironment: (patch) =>
        set((state) => ({
          mission: {
            ...state.mission,
            environment: { ...state.mission.environment, ...patch },
          },
        })),

      addReport: (report) =>
        set((state) => ({
          reports: [report, ...state.reports],
        })),

      deleteReport: (reportId) =>
        set((state) => ({
          reports: state.reports.filter((r) => r.id !== reportId),
        })),

      setAtlasState: (patch) =>
        set((state) => ({
          atlasState: { ...state.atlasState, ...patch },
        })),

      selectOrgan: (organ) =>
        set((state) => ({
          atlasState: {
            ...state.atlasState,
            selectedOrgan: organ,
            cameraPreset: organ === 'full_body' ? 'overview' : organ,
          },
        })),

      setPreferences: (patch) =>
        set((state) => ({
          preferences: { ...state.preferences, ...patch },
        })),

      hydrateCachedDriveAssets: async () => {
        const items = await loadCachedDriveAssets();
        if (items.length > 0) {
          set({ driveAssets: items, driveSyncStatus: 'ready' });
        }
      },

      setDriveAuthState: (needsAuth, email) =>
        set({
          driveNeedsAuth: needsAuth,
          driveUserEmail: email ?? get().driveUserEmail,
        }),

      setDriveSyncState: (status, progress = '', error = null) =>
        set({
          driveSyncStatus: status,
          driveSyncProgress: progress,
          driveSyncError: error,
        }),

      setDriveAssets: (items) => {
        const previous = get().driveAssets;
        previous.forEach((item) => {
          if (item.objectUrl) URL.revokeObjectURL(item.objectUrl);
        });
        set({ driveAssets: items, driveSyncStatus: 'ready', driveSyncError: null });
      },

      clearDriveCache: async () => {
        get().driveAssets.forEach((item) => {
          if (item.objectUrl) URL.revokeObjectURL(item.objectUrl);
        });
        await clearCachedDriveAssets();
        set({ driveAssets: [], driveSyncStatus: 'idle', driveSyncProgress: '' });
      },

      resetDemoData: () => {
        if (typeof window !== 'undefined' && window.localStorage) {
          try {
            const keysToRemove: string[] = [];
            for (let i = 0; i < window.localStorage.length; i += 1) {
              const key = window.localStorage.key(i);
              if (key && key.startsWith('arogya-checkin-draft-')) {
                keysToRemove.push(key);
              }
            }
            keysToRemove.forEach((k) => window.localStorage.removeItem(k));
          } catch {
            // Ignore localStorage access restrictions
          }
        }
        set({
          astronauts: SEED_ASTRONAUTS,
          activeAstronautId: SEED_ASTRONAUTS[0].id,
          mission: SEED_MISSION,
          vitalsByAstronaut: SEED_VITALS_BY_ASTRONAUT,
          checkInsByAstronaut: SEED_CHECKINS_BY_ASTRONAUT,
          reports: [],
        });
      },
    }),
    {
      name: 'arogya-mission-store-v2',
      storage: createJSONStorage(() => indexedDbStateStorage),
      // Only synthetic demo mission data and non-identifying UI preferences are persisted;
      // zero real personal data, OAuth tokens, or emails are ever stored.
      partialize: (state) => ({
        astronauts: state.astronauts,
        activeAstronautId: state.activeAstronautId,
        mission: state.mission,
        vitalsByAstronaut: state.vitalsByAstronaut,
        checkInsByAstronaut: state.checkInsByAstronaut,
        reports: state.reports,
        preferences: state.preferences,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Could not restore Arogya state from IndexedDB.', error);
          return;
        }
        if (!state) return;
        const valid = state.astronauts.some((a) => a.id === state.activeAstronautId);
        if (!valid && state.astronauts.length > 0) {
          state.setActiveAstronaut(state.astronauts[0].id);
        }
      },
    }
  )
);
