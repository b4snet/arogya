import type {
  RecoveryFactorId,
  RecoveryInputSource,
  RecoveryReadinessWindow,
} from './recoveryReadiness';

export type CountermeasureId =
  | 'exercise'
  | 'sleep'
  | 'hydration'
  | 'nutrition'
  | 'workload'
  | 'check_in';

export type CountermeasureStatus = 'on_track' | 'review' | 'missing';

export type CountermeasureResearchKind = 'reference' | 'hazard';

export interface CountermeasureDataPoint {
  label: string;
  value: string;
  note?: string;
  source: RecoveryInputSource;
}

export interface CountermeasureResearchContext {
  id: string;
  kind: CountermeasureResearchKind;
  source: 'research';
  title: string;
  organization: string;
  topic: string;
  summary: string;
  url: string;
}

export interface CountermeasureItem {
  id: CountermeasureId;
  label: string;
  status: CountermeasureStatus;
  statusLabel: string;
  currentStatus: string;
  todayRecorded: boolean;
  plannedTarget: string | null;
  whyItMatters: string;
  researchContext: CountermeasureResearchContext[];
  researchGapNote: string | null;
  suggestedAction: string;
  dataSources: CountermeasureDataPoint[];
  factorId: RecoveryFactorId;
  missingDataNote: string | null;
}

export interface CountermeasureCoachPlan {
  astronautId: string;
  missionDay: number;
  window: RecoveryReadinessWindow;
  items: CountermeasureItem[];
  focusItemId: CountermeasureId | null;
  todayCheckInComplete: boolean;
  summary: string;
  disclaimer: string;
}
