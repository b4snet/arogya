export type RecoveryBand = 'ready' | 'monitor' | 'rest';

export type RecoveryWindowDays = 7 | 14;

export type RecoveryFactorId =
  | 'check_in_adherence'
  | 'sleep_regularity'
  | 'exercise_adherence'
  | 'hydration_nutrition_entries'
  | 'workload_fatigue'
  | 'recorded_vitals';

export type RecoveryFactorStatus = 'scored' | 'partial' | 'missing';

export type RecoveryInputSource = 'recorded' | 'simulated' | 'research';

export type RecoveryTrendDirection = 'falling' | 'rising' | 'stable' | 'insufficient';

export type RecoveryEscalationLevel = 'urgent' | 'review' | 'none';

export type RecoveryEscalationAction = 'escalation_report' | 'review_report' | 'none';

export interface RecoveryReadinessWindow {
  requestedDays: number;
  startDay: number;
  endDay: number;
  coveredDays: number;
  recordedDays: number;
  coverageNotice: string | null;
}

export interface RecoveryFactorInput {
  label: string;
  value: string;
  note?: string;
  source: RecoveryInputSource;
}

export interface RecoveryFactor {
  id: RecoveryFactorId;
  label: string;
  weight: number;
  /** 0-100, or null when the factor cannot be scored from recorded data. */
  score: number | null;
  /** score x weight / 100, rounded to one decimal. */
  points: number | null;
  status: RecoveryFactorStatus;
  summary: string;
  inputs: RecoveryFactorInput[];
  caveat?: string;
  recommendation: string;
  missingReason?: string;
}

export interface SimulatedRecoveryTrend {
  available: boolean;
  includedInBand: false;
  sampleCount: number;
  latestHeartRateBpm: number | null;
  latestSpo2Percent: number | null;
  direction: RecoveryTrendDirection;
  directionLabel: string;
  scenarioLabel: string | null;
  series: number[];
  detail: string;
}

export interface RecoveryEscalationPathway {
  level: RecoveryEscalationLevel;
  title: string;
  detail: string;
  reasons: string[];
  action: RecoveryEscalationAction;
}

export interface RecoveryReadiness {
  astronautId: string;
  missionDay: number;
  window: RecoveryReadinessWindow;
  band: RecoveryBand;
  bandLabel: string;
  bandReason: string;
  /** Weighted score from the factors that could be scored, 0-100. */
  score: number | null;
  /** Share of factor weight backed by recorded data; missing factors lower it. */
  evidenceCoveragePercent: number;
  dayCoveragePercent: number;
  missingDays: number[];
  factors: RecoveryFactor[];
  weakestFactorId: RecoveryFactorId | null;
  recommendation: string;
  missingDataNote: string;
  escalation: RecoveryEscalationPathway;
  simulatedTrend: SimulatedRecoveryTrend;
  disclaimer: string;
}
