import type { HealthStatusLevel } from './healthAssessment';
import type {
  RecoveryBand,
  RecoveryEscalationLevel,
} from './recoveryReadiness';

export type CrewReadinessWindowDays = 7 | 14;

export type CrewTrendDirection = 'improving' | 'worsening' | 'stable' | 'insufficient';

export type CrewMetricId =
  | 'check_in_completion'
  | 'sleep_regularity'
  | 'exercise_adherence'
  | 'workload_fatigue';

export type CrewMetricStatus = 'recorded' | 'partial' | 'missing';

export interface CrewTrendSummary {
  direction: CrewTrendDirection;
  label: string;
  detail: string;
  firstHalfValue: number | null;
  secondHalfValue: number | null;
}

export interface CrewMetricSummary {
  id: CrewMetricId;
  label: string;
  /** Average factor score across members with recorded evidence, or the crew completion percent. */
  score: number | null;
  status: CrewMetricStatus;
  membersWithEvidence: number;
  memberCount: number;
  summary: string;
  caveat: string;
  trend: CrewTrendSummary;
}

export interface CrewMemberReadiness {
  astronautId: string;
  callSign: string;
  fullName: string;
  role: string;
  /** Null when the member has no recorded evidence in the window; no band is assumed. */
  band: RecoveryBand | null;
  bandLabel: string;
  bandReason: string;
  score: number | null;
  dayCoveragePercent: number;
  recordedDays: number;
  coveredDays: number;
  missingDays: number[];
  /** Recorded assessment flags only; titles and rationales stay in the individual record. */
  openAlertCount: number;
  escalationLevel: RecoveryEscalationLevel;
  recommendation: string;
}

export interface CrewAlertRollup {
  /** Current recorded assessment flags across the crew; not scoped to the window. */
  openCount: number;
  membersWithAlerts: number;
  escalatingMembers: number;
  bySeverity: Record<HealthStatusLevel, number>;
  detail: string;
}

export interface CrewDataGap {
  id: string;
  kind: 'window' | 'member' | 'factor';
  label: string;
  detail: string;
}

export interface CrewReadiness {
  window: {
    requestedDays: number;
    startDay: number;
    endDay: number;
    coveredDays: number;
  };
  memberCount: number;
  bandedCount: number;
  bandCounts: Record<RecoveryBand | 'unscored', number>;
  members: CrewMemberReadiness[];
  metrics: CrewMetricSummary[];
  alerts: CrewAlertRollup;
  dataGaps: CrewDataGap[];
  dataGapNote: string;
  crewRecommendation: string;
  privacyNote: string;
  sourceNote: string;
  disclaimer: string;
}
