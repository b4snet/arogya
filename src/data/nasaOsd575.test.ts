import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'vitest';
import importedDataset from './nasaOsd575Cmp.json';
import { buildNasaCmpChartData, describeNasaSourceInterval, parseNasaCmpCsv, type NasaCmpDataset } from './nasaOsd575';

const csv = readFileSync(
  new URL('../../data/nasa/osd-575/source/LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv', import.meta.url),
  'utf8'
);

test('parses the actual OSD-575 transformed CMP file structure and preserves source identifiers', () => {
  const parsed = parseNasaCmpCsv(csv);
  assert.equal(parsed.samples.length, 28);
  assert.equal(parsed.analytes.length, 19);
  assert.deepEqual(
    [...new Set(parsed.samples.map((sample) => sample.subjectId))].sort(),
    ['C001', 'C002', 'C003', 'C004']
  );
  assert.deepEqual(
    [...new Set(parsed.samples.map((sample) => sample.timepoint))].sort(),
    ['L-3', 'L-44', 'L-92', 'R+1', 'R+194', 'R+45', 'R+82']
  );
});

test('preserves CMP values and physical source units without converting them to normalized or diagnostic results', () => {
  const parsed = parseNasaCmpCsv(csv);
  const c001L3 = parsed.samples.find((sample) => sample.sampleName === 'C001_serum_L-3')!;
  assert.equal(c001L3.results.glucose.value, 69);
  assert.equal(parsed.analytes.find((analyte) => analyte.id === 'glucose')?.unit, 'mg/dL');
  assert.equal(parsed.analytes.find((analyte) => analyte.id === 'egfr_african_american')?.unit, 'mL/min/1.73 m²');
  assert.equal(parsed.analytes.find((analyte) => analyte.id === 'bun_to_creatinine_ratio')?.unit, 'ratio');
});

test('converts only source missing tokens to null and never to zero', () => {
  const parsed = parseNasaCmpCsv(csv);
  const c001L44 = parsed.samples.find((sample) => sample.sampleName === 'C001_serum_L-44')!;
  assert.equal(c001L44.results.bun_to_creatinine_ratio.value, null);
  assert.equal(c001L44.results.bun_to_creatinine_ratio.value === 0, false);
  assert.equal(c001L44.results.egfr_african_american.referenceMax, null);
  assert.equal(c001L44.results.egfr_non_african_american.referenceMax, null);
  const chart = buildNasaCmpChartData(
    parsed.samples.filter((sample) => sample.subjectId === 'C001'),
    'bun_to_creatinine_ratio'
  );
  assert.deepEqual(chart.map((point) => point.timepoint), ['L-92', 'L-44', 'L-3', 'R+1', 'R+45', 'R+82', 'R+194']);
  assert.equal(chart[1].value, null);
  assert.notEqual(chart[1].value, 0);
  assert.equal(
    describeNasaSourceInterval(c001L44.results.egfr_non_african_american, 'mL/min/1.73 m²'),
    'Reference interval not supplied; research observation only.'
  );
});

test('bundled artifact includes source-linked provenance and row counts', () => {
  const dataset = importedDataset as NasaCmpDataset;
  assert.equal(dataset.provenance.studyId, 'OSD-575');
  assert.equal(dataset.provenance.version, '3');
  assert.equal(dataset.provenance.filename, 'LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv');
  assert.match(dataset.provenance.downloadUrl, /osdr\.nasa\.gov\/geode-py\/ws\/studies\/OSD-575\/download\?/);
  assert.equal(dataset.provenance.sha256, '5eb1e7f025dd8443a9e70111e62bc32afae3432753024489c5c013e401d709d9');
  assert.equal(dataset.provenance.sourceSampleRows, 28);
  assert.equal(dataset.provenance.importedMeasurements, 532);
  assert.match(dataset.provenance.transformDescription, /NA\/N\/A\/blank tokens become null/);
  assert.match(dataset.provenance.licenseVerification, /Verified against the official OSDR/);
  assert.ok(dataset.provenance.limitations.some((item) => item.includes('not linked to Arogya demo astronauts')));
});
