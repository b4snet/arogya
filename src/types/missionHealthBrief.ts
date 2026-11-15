import type {
  RecoveryEscalationLevel,
  RecoveryInputSource,
  RecoveryReadinessWindow,
} from './recoveryReadiness';

export type MissionHealthBriefScopeId = 'daily' | 'weekly';

export type MissionHealthBriefSectionId =
  | 'changed'
  | 'stable'
  | 'attention'
  | 'missing'
  | 'action';

export type MissionHealthBriefConfidenceLevel = 'high' | 'moderate' | 'low';

export type MissionHealthBriefShareSource = RecoveryInputSource | 'private';

export interface MissionHealthBriefSourceRef {
  label: string;
  source: RecoveryInputSource;
}

export interface MissionHealthBriefEntry {
  id: string;
  text: string;
  sources: MissionHealthBriefSourceRef[];
}

export interface MissionHealthBriefSection {
  id: MissionHealthBriefSectionId;
  title: string;
  entries: MissionHealthBriefEntry[];
  emptyText: string;
}

export interface MissionHealthBriefShareItem {
  text: string;
  disposition: 'include' | 'withhold';
  source: MissionHealthBriefShareSource;
}

export interface MissionHealthBriefConfidence {
  level: MissionHealthBriefConfidenceLevel;
  label: string;
  note: string;
  gaps: string[];
}

export interface MissionHealthBriefEscalation {
  level: RecoveryEscalationLevel;
  title: string;
  detail: string;
  reasons: string[];
  prompt: string;
}

export interface MissionHealthBriefScope {
  id: MissionHealthBriefScopeId;
  scopeLabel: string;
  windowLabel: string;
  window: RecoveryReadinessWindow;
  confidence: MissionHealthBriefConfidence;
  sections: MissionHealthBriefSection[];
  share: MissionHealthBriefShareItem[];
  escalation: MissionHealthBriefEscalation;
  disclaimer: string;
}

export interface MissionHealthBriefSourceLedger {
  recorded: string;
  simulated: string;
  research: string;
}

export interface MissionHealthBriefResearchReference {
  id: string;
  title: string;
  organization: string;
  url: string;
  source: 'research';
}

export interface MissionHealthBrief {
  astronautId: string;
  missionDay: number;
  daily: MissionHealthBriefScope;
  weekly: MissionHealthBriefScope;
  sources: MissionHealthBriefSourceLedger;
  researchReferences: MissionHealthBriefResearchReference[];
  privacyNote: string;
  disclaimer: string;
}
