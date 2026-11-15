export type ResearchAreaId =
  | 'cardiovascular'
  | 'metabolic_nutrition'
  | 'renal_hydration'
  | 'sleep_behavioral'
  | 'musculoskeletal'
  | 'hazard-radiation'
  | 'hazard-isolation'
  | 'hazard-distance'
  | 'hazard-gravity'
  | 'hazard-environment';

export type ResearchSurface = 'vitals' | 'mission' | 'recovery' | 'countermeasure' | 'report';

export interface ResearchAnalyteObservation {
  analyteId: string;
  label: string;
  unit: string;
  observedCount: number;
  missingCount: number;
  sampleCount: number;
  subjectCount: number;
  minimum: number | null;
  maximum: number | null;
}

export interface ResearchReferenceContext {
  id: string;
  kind: 'reference' | 'hazard';
  title: string;
  organization: string;
  topic: string;
  summary: string;
  url: string;
}

export interface ResearchDatasetProvenance {
  studyId: string;
  title: string;
  version: string;
  doi: string;
  license: string;
  licenseUrl: string;
  officialUrl: string;
  retrievedAt: string;
  filename: string;
  sha256: string;
}

export interface ResearchContextCard {
  id: ResearchAreaId;
  label: string;
  whyItMatters: string;
  /** Archived OSD-575 composition context; never a crew-specific result. */
  dataset: ResearchDatasetProvenance | null;
  observations: ResearchAnalyteObservation[];
  datasetNote: string;
  references: ResearchReferenceContext[];
  crewDataNote: string;
  researchHref: string;
  source: 'research';
}
