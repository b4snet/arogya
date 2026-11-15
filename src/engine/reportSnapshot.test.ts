import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  MISSING_VALUE_TEXT,
  SOURCE_NOT_CONFIGURED_TEXT,
  barcodePayloadForReport,
  buildReportReferenceMatrix,
  buildReportTrendSeries,
  buildReportVitalRows,
} from './reportSnapshot';
import { SEED_ASTRONAUTS } from '../data/astronauts';
import { SEED_MISSION } from '../data/missionData';
import { SEED_VITALS_BY_ASTRONAUT } from '../data/vitals14Day';
import { SEED_CHECKINS_BY_ASTRONAUT } from '../data/checkIns14Day';
import { buildStructuredReport, filterDataForReportPeriod } from './reportGenerator';
import { evaluateHealthAssessment } from './healthEngine';
import { toReportChartData } from '../components/reports/ReportTrendCharts';

const astronaut = SEED_ASTRONAUTS[0];
const vitals = SEED_VITALS_BY_ASTRONAUT[astronaut.id];
const checkIns = SEED_CHECKINS_BY_ASTRONAUT[astronaut.id];

test('vital snapshot uses canonical clinical units and never imperial or country units', () => {
  const rows = buildReportVitalRows({
    astronaut,
    latestVital: vitals[vitals.length - 1],
    latestCheckIn: checkIns[checkIns.length - 1],
  });

  const units = new Set(rows.map((row) => row.unit));
  for (const unit of units) {
    assert.ok(
      ['bpm', 'mmHg', '%', '°C', 'mg/dL', 'h', 'breaths/min', 'kg', 'mSv/day'].includes(unit),
      `unexpected report unit: ${unit}`
    );
  }

  const serialized = JSON.stringify(rows);
  assert.equal(serialized.includes('°F'), false);
  assert.equal(serialized.includes('mmol/L'), false);
  assert.equal(serialized.includes('lb'), false);

  const temperature = rows.find((row) => row.id === 'temperature');
  assert.equal(temperature?.unit, '°C');
  const glucose = rows.find((row) => row.id === 'blood_glucose');
  assert.equal(glucose?.unit, 'mg/dL');
  assert.match(glucose?.method ?? '', /fasting\/random context not recorded/);
});

test('missing measurements are reported as not recorded, never as normal', () => {
  const rows = buildReportVitalRows({ astronaut, latestVital: null, latestCheckIn: null });
  assert.ok(rows.length >= 8);
  for (const row of rows) {
    assert.equal(row.result, MISSING_VALUE_TEXT);
    assert.equal(row.flag, 'unavailable');
    // The unit and the reference band are still shown so the row stays interpretable.
    assert.ok(row.unit.length > 0);
    assert.ok(row.reference.length > 0);
  }
});

test('sleep is labelled a behavioral target, not a laboratory reference range', () => {
  const rows = buildReportVitalRows({
    astronaut,
    latestVital: vitals[vitals.length - 1],
    latestCheckIn: checkIns[checkIns.length - 1],
  });
  const sleep = rows.find((row) => row.id === 'sleep_duration');
  assert.ok(sleep);
  assert.match(sleep!.reference, /behavioral target/);
  assert.match(sleep!.reference, /not a laboratory interval/);
  assert.equal(sleep!.unit, 'h');
});

test('reference matrix separates categories and flags missing laboratory sources for review', () => {
  const rows = buildReportReferenceMatrix(astronaut);
  const categories = new Set(rows.map((row) => row.category));

  assert.ok(categories.has('laboratory_reference_interval'));
  assert.ok(categories.has('clinical_decision_threshold'));
  assert.ok(categories.has('personal_baseline'));
  assert.ok(categories.has('behavioral_target'));
  assert.ok(categories.has('demonstration_threshold'));

  for (const row of rows) {
    assert.ok(row.categoryLabel.length > 0);
    assert.ok(row.sourceLabel.length > 0);
    assert.ok(row.applicability.length > 0);
  }

  const labRows = rows.filter((row) => row.category === 'laboratory_reference_interval');
  assert.ok(labRows.length > 0);
  for (const row of labRows) {
    // No laboratory interval exists in the project sources: say so instead of inventing one.
    assert.equal(row.rangeText, SOURCE_NOT_CONFIGURED_TEXT);
  }

  // Behavioral targets must never be presented as laboratory ranges.
  const behavioral = rows.filter((row) => row.category === 'behavioral_target');
  assert.ok(behavioral.length >= 2);
  for (const row of behavioral) {
    assert.match(row.sourceLabel, /not a laboratory range/);
  }
});

test('report chart transformation preserves explicit nulls for missing daily observations', () => {
  const series = buildReportTrendSeries({
    vitals,
    checkIns,
    startDay: 1,
    endDay: 14,
    sourceLabel: 'test source',
  });

  assert.ok(series.length >= 5);
  for (const item of series) {
    assert.equal(item.points.length, 14);
    assert.equal(item.points[0].missionDay, 1);
    assert.equal(item.points[13].missionDay, 14);
    assert.equal(item.points[0].label, 'D1');
  }

  // AST-02 has an explicit missing body-mass value on day 7. Daily slots are intended here.
  const patel = SEED_ASTRONAUTS[1];
  const patelSeries = buildReportTrendSeries({
    vitals: SEED_VITALS_BY_ASTRONAUT[patel.id],
    checkIns: SEED_CHECKINS_BY_ASTRONAUT[patel.id],
    startDay: 1,
    endDay: 14,
    sourceLabel: 'test source',
  });
  const glucoseSeries = patelSeries.find((item) => item.id === 'spo2');
  assert.ok(glucoseSeries, 'daily SpO₂ series should exist');
  // Use the actual transformer with a missing daily value, without changing its intended cadence.
  const withGap = { ...glucoseSeries, points: glucoseSeries.points.map((point) =>
    point.missionDay === 7 ? { ...point, value: null } : point
  ) };
  const plotted = toReportChartData(withGap);
  assert.equal(plotted.length, 14);
  assert.equal(plotted[6].label, 'D7');
  assert.equal(plotted[6].value, null);
  assert.equal(typeof plotted[6].value, 'object');
});

test('barcode payload carries the report identifier only', () => {
  const { checkInsWindow, vitalsWindow } = filterDataForReportPeriod(
    checkIns,
    vitals,
    SEED_MISSION.currentDay,
    '7d'
  );
  const assessment = evaluateHealthAssessment(astronaut, checkInsWindow, vitalsWindow, SEED_MISSION);
  const report = buildStructuredReport({
    astronaut,
    assessment,
    mission: SEED_MISSION,
    vitalsWindow,
    checkInsWindow,
    format: 'flight_surgeon_sbar',
    preparedForRole: 'Flight Surgeon',
    period: '7d',
  });

  const payload = barcodePayloadForReport(report.id);
  assert.equal(payload, report.id);
  assert.equal(payload.includes(astronaut.fullName), false);
  assert.equal(payload.includes('bpm'), false);

  // The report carries an immutable snapshot of the observations it was built from.
  assert.equal(report.snapshotVitals?.length, vitalsWindow.length);
  assert.equal(report.snapshotCheckIns?.length, checkInsWindow.length);

  const before = report.snapshotVitals![0].heartRateBpm;
  vitals[0].heartRateBpm = 200;
  assert.equal(report.snapshotVitals![0].heartRateBpm, before);
  vitals[0].heartRateBpm = before ?? null;
});
