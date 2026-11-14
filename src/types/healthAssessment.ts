export type HealthStatusLevel = 'green' | 'yellow' | 'orange' | 'red';

export type BodySystemId =
  | 'brain'
  | 'cardiovascular'
  | 'respiratory'
  | 'bone_muscle'
  | 'behavioral'
  | 'hydration'
  | 'nutrition'
  | 'radiation';

export type OrganTarget = 'brain' | 'heart' | 'lungs' | 'full_body';

export interface ReferenceRange {
  metric: string;
  unit: string;
  currentValue: string;
  generalReferenceRange: string;
  personalBaseline: string;
  isMissing: boolean;
  withinGeneralRange: boolean | null;
  withinPersonalBaseline: boolean | null;
}

export interface Alert {
  id: string;
  systemId: BodySystemId;
  organTarget: OrganTarget;
  severity: HealthStatusLevel;
  escalationRequired: boolean;
  title: string;
  rationale: string;
  recommendedAction: string;
}

export interface RuleResult {
  id: string;
  systemId: BodySystemId;
  severity: HealthStatusLevel;
  triggered: boolean;
  summary: string;
}

export interface ActionItem {
  id: string;
  priority: 'immediate' | 'today' | 'monitor';
  systemId: BodySystemId;
  title: string;
  detail: string;
}

export interface SystemAssessment {
  systemId: BodySystemId;
  organTarget: OrganTarget;
  label: string;
  score: number; // 0 - 100
  status: HealthStatusLevel;
  referenceRanges: ReferenceRange[];
  findings: string[];
  missingIndicators: string[];
  spaceflightHazard: string;
  plainLanguageSummary: string;
  recommendedActions: string[];
  escalationGuidance: string;
}

export interface DataQualitySummary {
  completenessPercent: number;
  missingFields: string[];
  hasTodayCheckIn: boolean;
  hasTodayVitals: boolean;
  qualityTier: 'complete' | 'partial' | 'insufficient';
  note: string;
}

export interface HealthAssessment {
  astronautId: string;
  missionDay: number;
  overallReadinessScore: number;
  overallStatus: HealthStatusLevel;
  escalationRequired: boolean;
  escalationReasons: string[];
  dataQuality: DataQualitySummary;
  systems: Record<BodySystemId, SystemAssessment>;
  ruleResults: RuleResult[];
  alerts: Alert[];
  prioritizedActions: ActionItem[];
  nextBestAction: string;
  disclaimer: string;
}
