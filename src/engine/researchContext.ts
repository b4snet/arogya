import type {
  CountermeasureId,
  ResearchAnalyteObservation,
  ResearchAreaId,
  ResearchContextCard,
  ResearchReferenceContext,
  ResearchSurface,
} from '../types';
import type { NasaCmpDataset } from '../data/nasaOsd575';
import {
  NASA_CMP_DATASET,
  summarizeNasaCmpDataset,
} from '../data/researchLibrary';
import { NASA_FIVE_HAZARDS, SPACEFLIGHT_REFERENCES } from '../data/references';

export const RESEARCH_CONTEXT_SECTION_NOTE =
  'Research observations are archived NASA source material, not personal crew data. Source attribution does not imply an agency endorsement of Arogya, and no research value is joined, plotted, or scored against Arogya crew records.';

export const RESEARCH_CONTEXT_CREW_NOTE =
  'Archived source samples, not this crew member. No OSD-575 value is linked to Arogya crew records or used as a personal reference.';

const NASA_FIVE_HAZARDS_URL =
  SPACEFLIGHT_REFERENCES.find((reference) => reference.id === 'nasa-hrp-5-hazards')?.url ??
  'https://www.nasa.gov/hrp/5-hazards-of-human-spaceflight/';

interface AreaSpec {
  label: string;
  whyItMatters: string;
  analyteIds: string[];
  referenceIds: string[];
  hazardIds: string[];
}

const AREA_SPECS: Record<ResearchAreaId, AreaSpec> = {
  cardiovascular: {
    label: 'Cardiovascular & fluid shifts',
    whyItMatters:
      'Fluid shifts in weightlessness reduce plasma volume and can lower orthostatic tolerance. Resting heart rate and blood pressure are monitored so this adaptation stays visible; a recorded value is never interpreted here as a diagnosis.',
    analyteIds: [],
    referenceIds: ['nasa-hrp-cardio'],
    hazardIds: ['hazard-gravity'],
  },
  metabolic_nutrition: {
    label: 'Metabolism & nutrition',
    whyItMatters:
      'Long missions depend on planned food and energy availability, and archived spaceflight laboratory research includes metabolic and protein markers. Arogya tracks whether nutrition was logged; it does not judge intake adequacy.',
    analyteIds: ['glucose', 'albumin', 'total_protein', 'calcium'],
    referenceIds: [],
    hazardIds: [],
  },
  renal_hydration: {
    label: 'Kidney function & fluid balance',
    whyItMatters:
      'Fluid shifts and closed-loop water systems make hydration logging operationally useful. The OSD-575 kidney and electrolyte measures below provide archived research context only, not a personal fluid target.',
    analyteIds: ['creatinine', 'egfr_non_african_american', 'urea_nitrogen_bun', 'sodium', 'potassium'],
    referenceIds: [],
    hazardIds: ['hazard-gravity'],
  },
  sleep_behavioral: {
    label: 'Sleep, mood & workload',
    whyItMatters:
      'Confinement, workload, and circadian disruption can affect sleep, mood, and cognitive focus. NASA’s behavioral-health research treats these as related monitoring areas; Arogya records self-reports as planning signals, not performance assessments.',
    analyteIds: [],
    referenceIds: ['nasa-hrp-bhpc'],
    hazardIds: ['hazard-isolation'],
  },
  musculoskeletal: {
    label: 'Muscle, bone & exercise',
    whyItMatters:
      'Mechanical unloading in spaceflight reduces bone and muscle loading, and scheduled aerobic and resistance activity is a standard countermeasure area. Arogya tracks recorded exercise completion against a planning reference; it does not measure fitness.',
    analyteIds: [],
    referenceIds: [],
    hazardIds: ['hazard-gravity'],
  },
  'hazard-radiation': {
    label: 'Space radiation',
    whyItMatters: '',
    analyteIds: [],
    referenceIds: ['nasa-hrp-rad'],
    hazardIds: ['hazard-radiation'],
  },
  'hazard-isolation': {
    label: 'Isolation & confinement',
    whyItMatters: '',
    analyteIds: [],
    referenceIds: ['nasa-hrp-bhpc'],
    hazardIds: ['hazard-isolation'],
  },
  'hazard-distance': {
    label: 'Distance from Earth',
    whyItMatters: '',
    analyteIds: [],
    referenceIds: ['nasa-hrp-risks'],
    hazardIds: ['hazard-distance'],
  },
  'hazard-gravity': {
    label: 'Gravity fields',
    whyItMatters: '',
    analyteIds: [],
    referenceIds: ['nasa-hrp-cardio', 'nasa-hrp-sans'],
    hazardIds: ['hazard-gravity'],
  },
  'hazard-environment': {
    label: 'Closed-loop environment',
    whyItMatters: '',
    analyteIds: [],
    referenceIds: ['nasa-hrp-co2'],
    hazardIds: ['hazard-environment'],
  },
};

export const RESEARCH_SURFACE_AREAS: Record<ResearchSurface, ResearchAreaId[]> = {
  vitals: ['cardiovascular', 'metabolic_nutrition', 'renal_hydration'],
  mission: [
    'hazard-radiation',
    'hazard-isolation',
    'hazard-distance',
    'hazard-gravity',
    'hazard-environment',
  ],
  recovery: ['musculoskeletal', 'sleep_behavioral', 'renal_hydration', 'metabolic_nutrition'],
  countermeasure: [
    'musculoskeletal',
    'sleep_behavioral',
    'renal_hydration',
    'metabolic_nutrition',
  ],
  report: ['cardiovascular', 'metabolic_nutrition', 'renal_hydration', 'sleep_behavioral'],
};

export const COUNTERMEASURE_RESEARCH_AREAS: Record<CountermeasureId, ResearchAreaId> = {
  exercise: 'musculoskeletal',
  sleep: 'sleep_behavioral',
  hydration: 'renal_hydration',
  nutrition: 'metabolic_nutrition',
  workload: 'sleep_behavioral',
  check_in: 'sleep_behavioral',
};

function observationFor(
  dataset: NasaCmpDataset,
  analyteId: string
): ResearchAnalyteObservation | null {
  const analyte = dataset.analytes.find((item) => item.id === analyteId);
  if (!analyte) return null;

  const values: number[] = [];
  const subjects = new Set<string>();
  for (const sample of dataset.samples) {
    const value = sample.results[analyteId]?.value;
    if (value != null) {
      values.push(value);
      subjects.add(sample.subjectId);
    }
  }

  return {
    analyteId,
    label: analyte.label,
    unit: analyte.unit,
    observedCount: values.length,
    missingCount: dataset.samples.length - values.length,
    sampleCount: dataset.samples.length,
    subjectCount: subjects.size,
    minimum: values.length > 0 ? Math.min(...values) : null,
    maximum: values.length > 0 ? Math.max(...values) : null,
  };
}

function referenceContexts(spec: AreaSpec): ResearchReferenceContext[] {
  const references = spec.referenceIds
    .map((id) => SPACEFLIGHT_REFERENCES.find((reference) => reference.id === id))
    .filter((reference): reference is NonNullable<typeof reference> => Boolean(reference))
    .map<ResearchReferenceContext>((reference) => ({
      id: reference.id,
      kind: 'reference',
      title: reference.title,
      organization: reference.organization,
      topic: reference.topic,
      summary: reference.summary,
      url: reference.url,
    }));

  const hazards = spec.hazardIds
    .map((id) => NASA_FIVE_HAZARDS.find((hazard) => hazard.id === id))
    .filter((hazard): hazard is NonNullable<typeof hazard> => Boolean(hazard))
    .map<ResearchReferenceContext>((hazard) => ({
      id: hazard.id,
      kind: 'hazard',
      title: `${hazard.name} — ${hazard.nasaCategory}`,
      organization: 'NASA Human Research Program',
      topic: 'Spaceflight hazard framework',
      summary: `${hazard.physiologicalImpact} ${hazard.arogyaMonitoring}`,
      url: NASA_FIVE_HAZARDS_URL,
    }));

  const byId = new Map<string, ResearchReferenceContext>();
  for (const reference of [...references, ...hazards]) {
    if (!byId.has(reference.id)) byId.set(reference.id, reference);
  }
  return [...byId.values()];
}

function hazardWhyItMatters(hazardId: string): string {
  const hazard = NASA_FIVE_HAZARDS.find((item) => item.id === hazardId);
  if (!hazard) return '';
  return `${hazard.physiologicalImpact} ${hazard.arogyaMonitoring}`;
}

export function buildResearchContextCard(
  areaId: ResearchAreaId,
  dataset: NasaCmpDataset = NASA_CMP_DATASET
): ResearchContextCard {
  const spec = AREA_SPECS[areaId];
  const observations = spec.analyteIds
    .map((analyteId) => observationFor(dataset, analyteId))
    .filter((observation): observation is ResearchAnalyteObservation => Boolean(observation));
  const summary = summarizeNasaCmpDataset(dataset);
  const usesDataset = observations.length > 0;
  const subjectCount = summary.subjectCount;
  const whyItMatters =
    spec.whyItMatters.length > 0 ? spec.whyItMatters : hazardWhyItMatters(spec.hazardIds[0] ?? '');

  const datasetNote = usesDataset
    ? `Bundled OSD-575 CMP context: ${observations.length} related analyte${
        observations.length === 1 ? '' : 's'
      } from ${subjectCount} source pseudonyms across ${summary.sampleCount} archived serum samples. Ranges describe source observations only, not this crew member.`
    : 'No OSD-575 CMP analyte maps directly to this area. Research context is limited to the NASA reference material below.';

  return {
    id: areaId,
    label: spec.label,
    whyItMatters,
    dataset: usesDataset
      ? {
          studyId: summary.studyId,
          title: summary.title,
          version: summary.version,
          doi: summary.doi,
          license: summary.license,
          licenseUrl: dataset.provenance.licenseUrl,
          officialUrl: summary.officialUrl,
          retrievedAt: summary.retrievedAt,
          filename: dataset.provenance.filename,
          sha256: dataset.provenance.sha256,
        }
      : null,
    observations,
    datasetNote,
    references: referenceContexts(spec),
    crewDataNote: RESEARCH_CONTEXT_CREW_NOTE,
    researchHref: usesDataset ? '/research#nasa-osd575' : '/research#nasa-reference-library',
    source: 'research',
  };
}

export function buildResearchContextCards(
  areaIds: ResearchAreaId[],
  dataset: NasaCmpDataset = NASA_CMP_DATASET
): ResearchContextCard[] {
  return areaIds.map((areaId) => buildResearchContextCard(areaId, dataset));
}

export function buildResearchContextCardsForSurface(
  surface: ResearchSurface,
  dataset: NasaCmpDataset = NASA_CMP_DATASET
): ResearchContextCard[] {
  return buildResearchContextCards(RESEARCH_SURFACE_AREAS[surface], dataset);
}

export function buildCountermeasureResearchContext(
  id: CountermeasureId,
  dataset: NasaCmpDataset = NASA_CMP_DATASET
): ResearchContextCard {
  return buildResearchContextCard(COUNTERMEASURE_RESEARCH_AREAS[id], dataset);
}

export function researchContextCardsToMarkdown(cards: ResearchContextCard[]): string {
  if (cards.length === 0) return '';
  const lines: string[] = [
    '## Research Context (Research — not crew data)',
    `_${RESEARCH_CONTEXT_SECTION_NOTE}_`,
    '',
  ];

  for (const card of cards) {
    lines.push(`### ${card.label}`, card.whyItMatters, '');
    if (card.observations.length > 0) {
      lines.push(
        '**Bundled OSD-575 archived context**',
        '',
        '| Analyte | Archived source range | Observed / samples |',
        '| --- | --- | --- |',
        ...card.observations.map((observation) => {
          const range =
            observation.minimum == null || observation.maximum == null
              ? '—'
              : `${observation.minimum}–${observation.maximum} ${observation.unit}`;
          return `| ${observation.label} | ${range} | ${observation.observedCount} / ${observation.sampleCount} |`;
        }),
        '',
        `_${card.datasetNote}_`,
        ''
      );
    } else {
      lines.push(`_${card.datasetNote}_`, '');
    }

    if (card.dataset) {
      lines.push(
        `Source: ${card.dataset.studyId} Version ${card.dataset.version} · DOI ${card.dataset.doi} · License ${card.dataset.license} · NASA OSDR. ${card.dataset.officialUrl}`,
        ''
      );
    }
    for (const reference of card.references) {
      lines.push(
        `- ${reference.title} — ${reference.organization} (${reference.topic}). ${reference.url}`
      );
    }
    if (card.references.length > 0) lines.push('');
    lines.push(`_${card.crewDataNote}_`, '');
  }

  return lines.join('\n').trimEnd();
}
