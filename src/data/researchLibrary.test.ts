import assert from 'node:assert/strict';
import { test } from 'vitest';
import importedDataset from './nasaOsd575Cmp.json';
import type { NasaCmpDataset } from './nasaOsd575';
import {
  NASA_RESEARCH_BOUNDARIES,
  buildNasaAnalyteCoverage,
  buildNasaSubjectSummaries,
  buildResearchLibraryCatalog,
  getNasaSampleRows,
  searchNasaAnalytes,
  summarizeNasaCmpDataset,
} from './researchLibrary';

const dataset = importedDataset as NasaCmpDataset;

test('summarizes the bundled OSD-575 cohort without inventing observations', () => {
  const summary = summarizeNasaCmpDataset(dataset);

  assert.equal(summary.datasetId, 'nasa-osd-575-cmp');
  assert.equal(summary.studyId, 'OSD-575');
  assert.equal(summary.version, '3');
  assert.equal(summary.doi, '10.26030/mc5d-p710');
  assert.equal(summary.license, 'CC0-1.0');
  assert.equal(summary.sampleCount, 28);
  assert.equal(summary.subjectCount, 4);
  assert.equal(summary.analyteCount, 19);
  assert.equal(summary.timepointCount, 7);
  assert.equal(summary.measurementCount, 532);
  assert.equal(summary.observedMeasurementCount, 509);
  assert.equal(summary.missingMeasurementCount, 23);
  assert.deepEqual(summary.subjects, ['C001', 'C002', 'C003', 'C004']);
  assert.deepEqual(summary.timepoints, ['L-92', 'L-44', 'L-3', 'R+1', 'R+45', 'R+82', 'R+194']);
});

test('builds per-subject coverage with preserved relative timepoints and missing counts', () => {
  const summaries = buildNasaSubjectSummaries(dataset);
  const bySubject = new Map(summaries.map((summary) => [summary.subjectId, summary]));

  assert.equal(summaries.length, 4);
  assert.equal(bySubject.get('C001')?.sampleCount, 7);
  assert.equal(bySubject.get('C001')?.observedMeasurementCount, 127);
  assert.equal(bySubject.get('C001')?.missingMeasurementCount, 6);
  assert.equal(bySubject.get('C002')?.missingMeasurementCount, 7);
  assert.equal(bySubject.get('C003')?.missingMeasurementCount, 5);
  assert.equal(bySubject.get('C004')?.missingMeasurementCount, 5);
  assert.deepEqual(bySubject.get('C002')?.timepoints, [
    'L-92',
    'L-44',
    'L-3',
    'R+1',
    'R+45',
    'R+82',
    'R+194',
  ]);
});

test('reports analyte coverage without converting missing values to zero', () => {
  const coverage = buildNasaAnalyteCoverage(dataset);
  const byId = new Map(coverage.map((analyte) => [analyte.id, analyte]));

  assert.equal(coverage.length, 19);
  assert.equal(byId.get('glucose')?.observedCount, 28);
  assert.equal(byId.get('glucose')?.missingCount, 0);
  assert.equal(byId.get('glucose')?.subjectCount, 4);
  assert.equal(byId.get('glucose')?.unit, 'mg/dL');
  assert.equal(byId.get('bun_to_creatinine_ratio')?.observedCount, 6);
  assert.equal(byId.get('bun_to_creatinine_ratio')?.missingCount, 22);
  assert.equal(byId.get('bun_to_creatinine_ratio')?.subjectCount, 3);
  assert.equal(byId.get('total_bilirubin')?.missingCount, 1);
  assert.equal(coverage.reduce((total, analyte) => total + analyte.observedCount, 0), 509);
  assert.equal(coverage.reduce((total, analyte) => total + analyte.missingCount, 0), 23);
});

test('returns sorted source rows and keeps a missing result null', () => {
  const glucoseRows = getNasaSampleRows(dataset, 'C001', 'glucose');
  const bunRows = getNasaSampleRows(dataset, 'C001', 'bun_to_creatinine_ratio');

  assert.equal(glucoseRows.length, 7);
  assert.deepEqual(glucoseRows.map((row) => row.timepoint), [
    'L-92',
    'L-44',
    'L-3',
    'R+1',
    'R+45',
    'R+82',
    'R+194',
  ]);
  assert.equal(glucoseRows.find((row) => row.timepoint === 'L-3')?.result.value, 69);
  assert.equal(bunRows.find((row) => row.timepoint === 'L-44')?.result.value, null);
  assert.notEqual(bunRows.find((row) => row.timepoint === 'L-44')?.result.value, 0);
});

test('searches analytes by label, id, and source unit while preserving source order', () => {
  assert.deepEqual(
    searchNasaAnalytes(dataset, 'egfr').map((analyte) => analyte.id),
    ['egfr_african_american', 'egfr_non_african_american']
  );
  assert.equal(searchNasaAnalytes(dataset, 'mg/dL').every((analyte) => analyte.unit === 'mg/dL'), true);
  assert.equal(searchNasaAnalytes(dataset, '').length, 19);
  assert.equal(searchNasaAnalytes(dataset, 'not-an-analyte').length, 0);
});

test('catalogs the dataset, NASA references, and non-clinical research boundaries', () => {
  const catalog = buildResearchLibraryCatalog(dataset);

  assert.equal(catalog.datasets.length, 1);
  assert.equal(catalog.datasets[0].datasetId, 'nasa-osd-575-cmp');
  assert.equal(catalog.references.length, 7);
  assert.equal(catalog.boundaries, NASA_RESEARCH_BOUNDARIES);
  assert.ok(catalog.boundaries.some((boundary) => /not live telemetry/i.test(boundary)));
  assert.ok(catalog.boundaries.some((boundary) => /no re-identification|not linked/i.test(boundary)));
  assert.ok(catalog.boundaries.some((boundary) => /no predictive model|model training/i.test(boundary)));
  assert.ok(catalog.references.every((reference) => reference.organization.length > 0));
});
