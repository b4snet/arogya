import type { BodySystemId, HealthStatusLevel } from './healthAssessment';

export type ReportFormat = 'flight_surgeon_sbar' | 'daily_summary' | 'anomaly_brief';
export type ReportPeriod = 'today' | '7d' | '14d' | 'full_mission';

export interface ReportSystemSnapshot {
  systemId: BodySystemId;
  label: string;
  status: HealthStatusLevel;
  score: number;
  summary: string;
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
}
