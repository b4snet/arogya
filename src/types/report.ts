import type { BodySystemId, HealthStatusLevel } from './healthAssessment';
import type { CheckIn } from './checkIn';
import type { CountermeasureCoachPlan } from './countermeasureCoach';
import type { MissionHealthBrief } from './missionHealthBrief';
import type { RecoveryReadiness, RecoveryWindowDays } from './recoveryReadiness';
import type { ResearchContextCard } from './researchContext';
import type { VitalReading } from './vitals';

export type ReportFormat = 'flight_surgeon_sbar' | 'daily_summary' | 'anomaly_brief';
export type ReportPeriod = 'today' | '7d' | '14d' | 'full_mission';

/** Decision-support summary shown at the top of the report, built from recorded data only. */
export interface ReportExecutiveSummary {
  headline: string;
  overview: string;
  keyPoints: string[];
  confidenceLine: string;
  reviewPrompt: string;
  escalationLine: string;
  source: 'recorded';
}

export type ReportDataGapKind =
  | 'window'
  | 'check_in'
  | 'vitals'
  | 'factor'
  | 'countermeasure';

export interface ReportDataGap {
  id: string;
  kind: ReportDataGapKind;
  label: string;
  detail: string;
  source: 'recorded';
}

export interface ReportReferenceContext {
  id: string;
  title: string;
  organization: string;
  url: string;
  /** Which recorded planning area(s) surfaced this background reference. */
  usedFor: string;
  source: 'research';
}

/** Recorded window used for the recovery and countermeasure sections of a report. */
export interface ReportDecisionWindow {
  checkIns: CheckIn[];
  vitals: VitalReading[];
  windowDays: RecoveryWindowDays;
}

export interface ReportSystemSnapshot {
  systemId: BodySystemId;
  label: string;
  status: HealthStatusLevel;
  score: number;
  summary: string;
  statusMessage?: string;
}

export interface ReportTrendItem {
  metric: string;
  periodSummary: string;
  baselineComparison: string;
  direction: 'improving' | 'stable' | 'worsening' | 'insufficient';
}

export interface ReportSymptomEntry {
  missionDay: number;
  symptoms: string[];
  notes?: string;
}

export interface Report {
  id: string;
  astronautId: string;
  astronautName?: string;
  astronautRole?: string;
  missionName?: string;
  missionDay: number;
  createdAtIso: string;
  format: ReportFormat;
  period?: ReportPeriod;
  periodLabel?: string;
  windowStartDay?: number;
  windowEndDay?: number;
  readinessScoreAtGeneration: number;
  overallStatus: HealthStatusLevel;
  escalationRequired: boolean;
  escalationReasons?: string[];
  situation: string;
  background: string;
  assessmentSummary: string;
  recommendations: string[];
  attachedVitalsWindowDays: number;
  preparedForRole: 'Flight Surgeon' | 'Crew Medical Officer';
  exportedOffline: boolean;
  systemSnapshots?: ReportSystemSnapshot[];
  keyFindings?: string[];
  trends?: ReportTrendItem[];
  actionTracking?: {
    completed: string[];
    missed: string[];
  };
  symptomsTimeline?: ReportSymptomEntry[];
  riskFactors?: string[];
  dataQualityNote?: string;
  dataCompletenessPercent?: number;
  includePrivateNotes?: boolean;
  conciseMedicalMode?: boolean;
  /** Daily and weekly synthesis captured with the report snapshot. */
  healthBrief?: MissionHealthBrief;
  /** Decision-support snapshot: summary, recovery, countermeasures, context, and gaps. */
  executiveSummary?: ReportExecutiveSummary;
  recoveryReadiness?: RecoveryReadiness;
  countermeasures?: CountermeasureCoachPlan;
  dataGaps?: ReportDataGap[];
  referenceContext?: ReportReferenceContext[];
  /** Archived research context cards carried with the report snapshot; never crew data. */
  researchContext?: ResearchContextCard[];
  /**
   * Immutable copies of the observations captured when the report was generated. They keep
   * a printed report stable even if new readings arrive while it is being printed, and they
   * are not snapshot-management data.
   */
  snapshotVitals?: VitalReading[];
  snapshotCheckIns?: CheckIn[];
}
