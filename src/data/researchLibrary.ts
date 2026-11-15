import nasaCmpDataset from './nasaOsd575Cmp.json';
import {
  compareNasaRelativeTimepoints,
  type NasaCmpAnalyte,
  type NasaCmpDataset,
  type NasaCmpResult,
  type NasaCmpSample,
} from './nasaOsd575';
import { SPACEFLIGHT_REFERENCES, type ReferenceSource } from './references';

export const NASA_CMP_DATASET = nasaCmpDataset as NasaCmpDataset;

/**
 * Research boundaries are source-level constraints, not UI copy variations.
 * Keep them explicit so the library cannot be mistaken for crew telemetry,
 * linked participant data, or clinical validation.
 */
export const NASA_RESEARCH_BOUNDARIES = [
  'Archived serum laboratory observations from NASA OSDR; not live telemetry, a medical-device reading, a diagnosis, or clinical validation.',
  'Source pseudonyms C001–C004 remain separate from Arogya’s fictional crew records; no re-identification or participant linkage is attempted.',
  'Relative sample labels are preserved as supplied. No collection dates, daily cadence, symptoms, or clinical flags are inferred.',
  'Source-reported laboratory intervals are displayed without interpretation and are not treatment targets.',
  'No predictive model, model training, or operational medical guidance is included.',
] as const;

export interface NasaCmpDatasetSummary {
  datasetId: 'nasa-osd-575-cmp';
  studyId: string;
  title: string;
  shortTitle: string;
  version: string;
  doi: string;
  license: string;
  officialUrl: string;
  retrievedAt: string;
  sampleCount: number;
  subjectCount: number;
  analyteCount: number;
  timepointCount: number;
  measurementCount: number;
  observedMeasurementCount: number;
  missingMeasurementCount: number;
  subjects: string[];
  timepoints: string[];
}

export interface NasaSubjectSummary {
  subjectId: string;
  sampleCount: number;
  timepoints: string[];
  observedMeasurementCount: number;
  missingMeasurementCount: number;
}

export interface NasaAnalyteCoverage {
  id: string;
  label: string;
  unit: string;
  observedCount: number;
  missingCount: number;
  subjectCount: number;
}

export interface NasaSampleRow {
  sampleName: string;
  subjectId: string;
  timepoint: string;
  result: NasaCmpResult;
}

export interface ResearchLibraryCatalog {
  datasets: NasaCmpDatasetSummary[];
  references: ReferenceSource[];
  boundaries: readonly string[];
}

function sortedSubjects(samples: NasaCmpSample[]): string[] {
  return [...new Set(samples.map((sample) => sample.subjectId))].sort((a, b) => a.localeCompare(b));
}

function sortedTimepoints(samples: NasaCmpSample[]): string[] {
  return [...new Set(samples.map((sample) => sample.timepoint))].sort(compareNasaRelativeTimepoints);
}

function countMeasurements(dataset: NasaCmpDataset, samples: NasaCmpSample[]) {
  let observed = 0;
  let missing = 0;
  for (const sample of samples) {
    for (const analyte of dataset.analytes) {
      if (sample.results[analyte.id]?.value == null) {
        missing += 1;
      } else {
        observed += 1;
      }
    }
  }
  return { observed, missing };
}

export function summarizeNasaCmpDataset(
  dataset: NasaCmpDataset = NASA_CMP_DATASET
): NasaCmpDatasetSummary {
  const subjects = sortedSubjects(dataset.samples);
  const timepoints = sortedTimepoints(dataset.samples);
  const { observed, missing } = countMeasurements(dataset, dataset.samples);

  return {
    datasetId: 'nasa-osd-575-cmp',
    studyId: dataset.provenance.studyId,
    title: dataset.provenance.title,
    shortTitle: 'Inspiration4 serum comprehensive metabolic panel',
    version: dataset.provenance.version,
    doi: dataset.provenance.doi,
    license: dataset.provenance.license,
    officialUrl: dataset.provenance.officialUrl,
    retrievedAt: dataset.provenance.retrievedAt,
    sampleCount: dataset.samples.length,
    subjectCount: subjects.length,
    analyteCount: dataset.analytes.length,
    timepointCount: timepoints.length,
    measurementCount: dataset.samples.length * dataset.analytes.length,
    observedMeasurementCount: observed,
    missingMeasurementCount: missing,
    subjects,
    timepoints,
  };
}

export function getNasaSamplesForSubject(
  dataset: NasaCmpDataset,
  subjectId: string
): NasaCmpSample[] {
  return dataset.samples
    .filter((sample) => sample.subjectId === subjectId)
    .sort((a, b) => compareNasaRelativeTimepoints(a.timepoint, b.timepoint));
}

export function buildNasaSubjectSummaries(
  dataset: NasaCmpDataset = NASA_CMP_DATASET
): NasaSubjectSummary[] {
  return sortedSubjects(dataset.samples).map((subjectId) => {
    const samples = getNasaSamplesForSubject(dataset, subjectId);
    const { observed, missing } = countMeasurements(dataset, samples);
    return {
      subjectId,
      sampleCount: samples.length,
      timepoints: sortedTimepoints(samples),
      observedMeasurementCount: observed,
      missingMeasurementCount: missing,
    };
  });
}

export function buildNasaAnalyteCoverage(
  dataset: NasaCmpDataset = NASA_CMP_DATASET
): NasaAnalyteCoverage[] {
  return dataset.analytes.map((analyte) => {
    const subjectsWithResults = new Set<string>();
    let observed = 0;
    let missing = 0;

    for (const sample of dataset.samples) {
      if (sample.results[analyte.id]?.value == null) {
        missing += 1;
      } else {
        observed += 1;
        subjectsWithResults.add(sample.subjectId);
      }
    }

    return {
      id: analyte.id,
      label: analyte.label,
      unit: analyte.unit,
      observedCount: observed,
      missingCount: missing,
      subjectCount: subjectsWithResults.size,
    };
  });
}

export function getNasaSampleRows(
  dataset: NasaCmpDataset,
  subjectId: string,
  analyteId: string
): NasaSampleRow[] {
  const missingResult: NasaCmpResult = {
    value: null,
    referenceMin: null,
    referenceMax: null,
  };

  return getNasaSamplesForSubject(dataset, subjectId).map((sample) => ({
    sampleName: sample.sampleName,
    subjectId: sample.subjectId,
    timepoint: sample.timepoint,
    result: sample.results[analyteId] ?? missingResult,
  }));
}

export function searchNasaAnalytes(
  dataset: NasaCmpDataset,
  query: string
): NasaCmpAnalyte[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [...dataset.analytes];

  return dataset.analytes.filter((analyte) =>
    `${analyte.label} ${analyte.id} ${analyte.unit}`.toLowerCase().includes(normalized)
  );
}

export function buildResearchLibraryCatalog(
  dataset: NasaCmpDataset = NASA_CMP_DATASET
): ResearchLibraryCatalog {
  return {
    datasets: [summarizeNasaCmpDataset(dataset)],
    references: [...SPACEFLIGHT_REFERENCES],
    boundaries: NASA_RESEARCH_BOUNDARIES,
  };
}
