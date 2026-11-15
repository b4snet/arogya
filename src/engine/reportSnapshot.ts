import type { Astronaut, CheckIn, VitalReading } from '../types';
import { CLINICAL_THRESHOLDS } from './thresholds';
import { SPACEFLIGHT_REFERENCES } from '../data/references';

/**
 * Report snapshot builders.
 *
 * Everything here is a *presentation* concern: it formats values that already exist in the
 * mission record into canonical clinical units and labels every range with the category and
 * provenance it actually has. No range, threshold, diagnosis or unit is invented, and a
 * missing project source is reported as "review required" instead of being filled in.
 */

export const REPORT_CANONICAL_UNIT_NOTE =
  'Report values use canonical clinical units (°C, mmHg, bpm, %, mg/dL, h, kg, mSv). The interactive display-unit preference never changes report values.';

export const REPORT_SAFETY_STATEMENT =
  'Decision-support prototype. This is not a diagnosis, not a certified laboratory report, and not clinically validated.';

export const REPORT_PROVENANCE_LABEL =
  'Source: Arogya on-device mission record (self-reported check-ins and optional device/wearable readings).';

export const REPORT_PROTOTYPE_LABEL =
  'Prototype observation report — not a certified laboratory report';

export const MISSING_VALUE_TEXT = 'Not recorded';
export const NOT_PROVIDED_TEXT = 'Not provided';
export const NOT_APPLICABLE_TEXT = 'Not applicable';
export const SOURCE_NOT_CONFIGURED_TEXT = 'Not configured in project sources — review required';

export type ReportRangeCategory =
  | 'laboratory_reference_interval'
  | 'clinical_decision_threshold'
  | 'personal_baseline'
  | 'behavioral_target'
  | 'demonstration_threshold';

export const RANGE_CATEGORY_LABELS: Record<ReportRangeCategory, string> = {
  laboratory_reference_interval: 'Laboratory reference interval',
  clinical_decision_threshold: 'Clinical decision threshold',
  personal_baseline: 'Personal baseline',
  behavioral_target: 'Behavioral target',
  demonstration_threshold: 'Demonstration threshold',
};

export type ReportValueFlag = 'within' | 'above' | 'below' | 'unavailable';

export interface ReportVitalRow {
  id: string;
  test: string;
  /** Formatted value in canonical units, or "Not recorded". */
  result: string;
  unit: string;
  /** Reference range or target, always labelled with its category. */
  reference: string;
  flag: ReportValueFlag;
  flagLabel: string;
  /** Provenance of the value (device/source + measurement context). */
  method: string;
  /** Observation timestamp for this specific value, if one exists. */
  observedLabel: string | null;
  context?: string;
}

export interface ReportReferenceMatrixRow {
  id: string;
  parameter: string;
  rangeText: string;
  category: ReportRangeCategory;
  categoryLabel: string;
  sourceLabel: string;
  sourceUrl?: string;
  applicability: string;
}

const FLAG_LABELS: Record<ReportValueFlag, string> = {
  within: 'Within range',
  above: 'Above range',
  below: 'Below range',
  unavailable: 'Not recorded',
};

const SOURCE_METHOD_LABELS: Record<VitalReading['source'], string> = {
  wearable_mock: 'Wearable biometric suite',
  cabin_sensor_mock: 'Cabin environmental sensor',
  manual_entry: 'Manual crew entry',
  device_ble: 'BLE medical device',
  spacecraft_bus: 'Spacecraft telemetry bus',
};

function observedLabel(timestampIso: string | undefined, missionDay: number | undefined): string | null {
  if (missionDay == null) return null;
  const time =
    timestampIso != null && Number.isFinite(new Date(timestampIso).getTime())
      ? new Date(timestampIso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
      : null;
  return `Sol ${missionDay}${time ? ` · ${time}` : ''}`;
}

function flagFromBand(
  value: number | null,
  min: number | null,
  max: number | null
): ReportValueFlag {
  if (value == null) return 'unavailable';
  if (min != null && value < min) return 'below';
  if (max != null && value > max) return 'above';
  return 'within';
}

function vitalById(
  vitals: VitalReading[]
): { latest: VitalReading | null; previous: VitalReading | null } {
  const sorted = [...vitals].sort((a, b) => a.missionDay - b.missionDay);
  return {
    latest: sorted[sorted.length - 1] ?? null,
    previous: sorted.length >= 2 ? sorted[sorted.length - 2] : null,
  };
}

/**
 * Current vital signs snapshot in canonical units.
 * Every supported measurement that exists in the record is included; nothing is derived.
 */
export function buildReportVitalRows(params: {
  astronaut: Astronaut;
  latestVital: VitalReading | null;
  latestCheckIn: CheckIn | null;
}): ReportVitalRow[] {
  const { astronaut, latestVital, latestCheckIn } = params;
  const baseline = astronaut.baseline;
  const method = latestVital ? SOURCE_METHOD_LABELS[latestVital.source] : 'No biometric source recorded';
  const observed = observedLabel(latestVital?.timestampIso, latestVital?.missionDay);
  const checkInObserved = observedLabel(latestCheckIn?.timestampIso, latestCheckIn?.missionDay);

  const hr = latestVital?.heartRateBpm ?? null;
  const sys = latestVital?.systolicBpMmHg ?? null;
  const dia = latestVital?.diastolicBpMmHg ?? null;
  const spo2 = latestVital?.spo2Percent ?? null;
  const tempC = latestVital?.bodyTempC ?? null;
  const glucose = latestVital?.bloodGlucoseMgDl ?? null;
  const respRate = latestVital?.respiratoryRateBpm ?? null;
  const massKg = latestVital?.bodyMassKg ?? null;
  const dailyRad = latestVital?.dailyRadiationMsv ?? null;
  const cumulativeRad = latestVital?.cumulativeRadiationMsv ?? null;
  const sleepHours = latestCheckIn?.sleepHours ?? null;

  const rows: ReportVitalRow[] = [
    {
      id: 'heart_rate',
      test: 'Heart rate (resting)',
      result: hr != null ? String(hr) : MISSING_VALUE_TEXT,
      unit: 'bpm',
      reference: `${CLINICAL_THRESHOLDS.generalRestingHrMin}–${CLINICAL_THRESHOLDS.generalRestingHrMax} bpm general adult band (demonstration threshold)`,
      flag: flagFromBand(hr, CLINICAL_THRESHOLDS.generalRestingHrMin, CLINICAL_THRESHOLDS.generalRestingHrMax),
      flagLabel: FLAG_LABELS[flagFromBand(hr, CLINICAL_THRESHOLDS.generalRestingHrMin, CLINICAL_THRESHOLDS.generalRestingHrMax)],
      method: `${method} · resting spot reading`,
      observedLabel: observed,
    },
    {
      id: 'systolic_bp',
      test: 'Blood pressure, systolic',
      result: sys != null ? String(sys) : MISSING_VALUE_TEXT,
      unit: 'mmHg',
      reference: `${CLINICAL_THRESHOLDS.generalSystolicMin}–${CLINICAL_THRESHOLDS.generalSystolicMax} mmHg seated adult band (demonstration threshold)`,
      flag: flagFromBand(sys, CLINICAL_THRESHOLDS.generalSystolicMin, CLINICAL_THRESHOLDS.generalSystolicMax),
      flagLabel: FLAG_LABELS[flagFromBand(sys, CLINICAL_THRESHOLDS.generalSystolicMin, CLINICAL_THRESHOLDS.generalSystolicMax)],
      method: `${method} · intermittent cuff reading`,
      observedLabel: observed,
    },
    {
      id: 'diastolic_bp',
      test: 'Blood pressure, diastolic',
      result: dia != null ? String(dia) : MISSING_VALUE_TEXT,
      unit: 'mmHg',
      reference: `${CLINICAL_THRESHOLDS.generalDiastolicMin}–${CLINICAL_THRESHOLDS.generalDiastolicMax} mmHg seated adult band (demonstration threshold)`,
      flag: flagFromBand(dia, CLINICAL_THRESHOLDS.generalDiastolicMin, CLINICAL_THRESHOLDS.generalDiastolicMax),
      flagLabel: FLAG_LABELS[flagFromBand(dia, CLINICAL_THRESHOLDS.generalDiastolicMin, CLINICAL_THRESHOLDS.generalDiastolicMax)],
      method: `${method} · intermittent cuff reading`,
      observedLabel: observed,
    },
    {
      id: 'spo2',
      test: 'SpO₂ — oxygen saturation',
      result: spo2 != null ? String(spo2) : MISSING_VALUE_TEXT,
      unit: '%',
      reference: `≥ ${CLINICAL_THRESHOLDS.generalSpo2Min}% at rest (demonstration threshold)`,
      flag: spo2 == null ? 'unavailable' : spo2 < CLINICAL_THRESHOLDS.generalSpo2Min ? 'below' : 'within',
      flagLabel:
        spo2 == null
          ? FLAG_LABELS.unavailable
          : spo2 < CLINICAL_THRESHOLDS.generalSpo2Min
          ? FLAG_LABELS.below
          : FLAG_LABELS.within,
      method: `${method} · pulse oximetry`,
      observedLabel: observed,
    },
    {
      id: 'temperature',
      test: 'Body temperature',
      result: tempC != null ? tempC.toFixed(1) : MISSING_VALUE_TEXT,
      unit: '°C',
      reference: `${CLINICAL_THRESHOLDS.generalTempMinC.toFixed(1)}–${CLINICAL_THRESHOLDS.generalTempMaxC.toFixed(1)} °C general adult band (demonstration threshold)`,
      flag: flagFromBand(tempC, CLINICAL_THRESHOLDS.generalTempMinC, CLINICAL_THRESHOLDS.generalTempMaxC),
      flagLabel: FLAG_LABELS[flagFromBand(tempC, CLINICAL_THRESHOLDS.generalTempMinC, CLINICAL_THRESHOLDS.generalTempMaxC)],
      method: `${method} · oral/tympanic reading`,
      observedLabel: observed,
    },
    {
      id: 'blood_glucose',
      test: 'Blood glucose',
      result: glucose != null ? String(glucose) : MISSING_VALUE_TEXT,
      unit: 'mg/dL',
      reference: `${CLINICAL_THRESHOLDS.generalGlucoseMinMgDl}–${CLINICAL_THRESHOLDS.generalGlucoseMaxMgDl} mg/dL fasting band (demonstration threshold)`,
      flag: flagFromBand(glucose, CLINICAL_THRESHOLDS.generalGlucoseMinMgDl, CLINICAL_THRESHOLDS.generalGlucoseMaxMgDl),
      flagLabel: FLAG_LABELS[flagFromBand(glucose, CLINICAL_THRESHOLDS.generalGlucoseMinMgDl, CLINICAL_THRESHOLDS.generalGlucoseMaxMgDl)],
      method: `${method} · fasting/random context not recorded`,
      context:
        'Meal context is not captured by the app, so the fasting band is shown only as a general adult comparison.',
      observedLabel: observed,
    },
    {
      id: 'sleep_duration',
      test: 'Sleep duration (daily check-in)',
      result: sleepHours != null ? sleepHours.toFixed(1) : MISSING_VALUE_TEXT,
      unit: 'h',
      reference: `${baseline.sleepTargetHours.toFixed(1)} h personal behavioral target (not a laboratory interval)`,
      flag:
        sleepHours == null
          ? 'unavailable'
          : sleepHours < baseline.sleepTargetHours
          ? 'below'
          : 'within',
      flagLabel:
        sleepHours == null
          ? FLAG_LABELS.unavailable
          : sleepHours < baseline.sleepTargetHours
          ? 'Below personal target'
          : 'At or above personal target',
      method: 'Daily crew check-in · self-reported sleep period',
      context: 'Behavioral target, not a laboratory reference range.',
      observedLabel: checkInObserved,
    },
    {
      id: 'respiratory_rate',
      test: 'Respiratory rate',
      result: respRate != null ? String(respRate) : MISSING_VALUE_TEXT,
      unit: 'breaths/min',
      reference: `${CLINICAL_THRESHOLDS.generalRespRateMin}–${CLINICAL_THRESHOLDS.generalRespRateMax} /min general adult band (demonstration threshold)`,
      flag: flagFromBand(respRate, CLINICAL_THRESHOLDS.generalRespRateMin, CLINICAL_THRESHOLDS.generalRespRateMax),
      flagLabel: FLAG_LABELS[flagFromBand(respRate, CLINICAL_THRESHOLDS.generalRespRateMin, CLINICAL_THRESHOLDS.generalRespRateMax)],
      method: `${method} · counted at rest`,
      observedLabel: observed,
    },
    {
      id: 'body_mass',
      test: 'Body mass',
      result: massKg != null ? massKg.toFixed(1) : MISSING_VALUE_TEXT,
      unit: 'kg',
      reference:
        baseline.bodyMassKg != null
          ? `±5% of ${baseline.bodyMassKg.toFixed(1)} kg pre-flight baseline (demonstration threshold)`
          : 'Pre-flight baseline not recorded — review required',
      flag:
        massKg == null || baseline.bodyMassKg == null
          ? 'unavailable'
          : Math.abs(((massKg - baseline.bodyMassKg) / baseline.bodyMassKg) * 100) > 5
          ? massKg < baseline.bodyMassKg
            ? 'below'
            : 'above'
          : 'within',
      flagLabel:
        massKg == null || baseline.bodyMassKg == null
          ? FLAG_LABELS.unavailable
          : Math.abs(((massKg - baseline.bodyMassKg) / baseline.bodyMassKg) * 100) > 5
          ? 'Outside ±5% band'
          : FLAG_LABELS.within,
      method: `${method} · periodic inertial mass measurement`,
      observedLabel: observed,
    },
    {
      id: 'radiation',
      test: 'Ionizing radiation, daily dose',
      result: dailyRad != null ? dailyRad.toFixed(2) : MISSING_VALUE_TEXT,
      unit: 'mSv/day',
      reference: `< ${CLINICAL_THRESHOLDS.dailyRadiationWatchMsv.toFixed(2)} mSv/day operational watch threshold (demonstration threshold)`,
      flag:
        dailyRad == null
          ? 'unavailable'
          : dailyRad >= CLINICAL_THRESHOLDS.dailyRadiationWatchMsv
          ? 'above'
          : 'within',
      flagLabel:
        dailyRad == null
          ? FLAG_LABELS.unavailable
          : dailyRad >= CLINICAL_THRESHOLDS.dailyRadiationWatchMsv
          ? FLAG_LABELS.above
          : FLAG_LABELS.within,
      method: `${method} · active dosimeter`,
      context:
        cumulativeRad != null
          ? `Cumulative ${cumulativeRad.toFixed(2)} mSv against ${baseline.radiationBudgetMsv} mSv mission ALARA budget.`
          : undefined,
      observedLabel: observed,
    },
  ];

  return rows;
}

function projectSource(id: string): { label: string; url?: string } {
  const ref = SPACEFLIGHT_REFERENCES.find((item) => item.id === id);
  if (!ref) return { label: SOURCE_NOT_CONFIGURED_TEXT };
  return { label: `${ref.organization} — ${ref.title}`, url: ref.url };
}

const DEMO_BAND_SOURCE = 'Arogya thresholds.ts — demonstration bands (not validated operational thresholds)';
const ESCALATION_SOURCE = 'Arogya escalation rules — demonstration logic, not clinically validated';

/**
 * Reference-range and escalation matrix.
 * Laboratory intervals, decision thresholds, personal baselines, behavioral targets and
 * demonstration bands are separate rows, each with its own category and source.
 */
export function buildReportReferenceMatrix(astronaut: Astronaut): ReportReferenceMatrixRow[] {
  const b = astronaut.baseline;
  const cardio = projectSource('nasa-hrp-cardio');
  const radiation = projectSource('nasa-hrp-rad');
  const behaviour = projectSource('nasa-hrp-bhpc');
  const respiratory = projectSource('nasa-hrp-risks');

  const rows: Array<Omit<ReportReferenceMatrixRow, 'categoryLabel'>> = [
    // Heart rate
    {
      id: 'hr-lab',
      parameter: 'Heart rate — laboratory reference interval',
      rangeText: SOURCE_NOT_CONFIGURED_TEXT,
      category: 'laboratory_reference_interval',
      sourceLabel: 'No laboratory interval is configured for this prototype',
      applicability: 'Resting adult, seated, calm conditions',
    },
    {
      id: 'hr-demo',
      parameter: 'Heart rate — demonstration band',
      rangeText: `${CLINICAL_THRESHOLDS.generalRestingHrMin}–${CLINICAL_THRESHOLDS.generalRestingHrMax} bpm`,
      category: 'demonstration_threshold',
      sourceLabel: DEMO_BAND_SOURCE,
      applicability: 'Resting adult, educational band only',
    },
    {
      id: 'hr-baseline',
      parameter: 'Heart rate — personal baseline',
      rangeText: `${b.restingHeartRateBpm} bpm pre-flight resting`,
      category: 'personal_baseline',
      sourceLabel: 'Crew profile baseline (this mission record)',
      applicability: 'Same subject, same posture when possible',
    },
    {
      id: 'hr-escalation',
      parameter: 'Heart rate — escalation rule',
      rangeText: `≥ +${CLINICAL_THRESHOLDS.hrDeltaOrangeBpm} bpm over baseline on consecutive days, or outside the band with symptoms`,
      category: 'clinical_decision_threshold',
      sourceLabel: ESCALATION_SOURCE,
      sourceUrl: cardio.url,
      applicability: 'Triggers an internal review prompt only',
    },

    // Systolic BP
    {
      id: 'sbp-lab',
      parameter: 'Systolic blood pressure — laboratory reference interval',
      rangeText: SOURCE_NOT_CONFIGURED_TEXT,
      category: 'laboratory_reference_interval',
      sourceLabel: 'No laboratory interval is configured for this prototype',
      applicability: 'Seated adult, correct cuff size',
    },
    {
      id: 'sbp-demo',
      parameter: 'Systolic blood pressure — demonstration band',
      rangeText: `${CLINICAL_THRESHOLDS.generalSystolicMin}–${CLINICAL_THRESHOLDS.generalSystolicMax} mmHg`,
      category: 'demonstration_threshold',
      sourceLabel: DEMO_BAND_SOURCE,
      applicability: 'Seated adult, educational band only',
    },
    {
      id: 'sbp-baseline',
      parameter: 'Systolic blood pressure — personal baseline',
      rangeText: `${b.systolicBpMmHg} mmHg`,
      category: 'personal_baseline',
      sourceLabel: 'Crew profile baseline (this mission record)',
      applicability: 'Same subject and cuff protocol',
    },

    // Diastolic BP
    {
      id: 'dbp-lab',
      parameter: 'Diastolic blood pressure — laboratory reference interval',
      rangeText: SOURCE_NOT_CONFIGURED_TEXT,
      category: 'laboratory_reference_interval',
      sourceLabel: 'No laboratory interval is configured for this prototype',
      applicability: 'Seated adult, correct cuff size',
    },
    {
      id: 'dbp-demo',
      parameter: 'Diastolic blood pressure — demonstration band',
      rangeText: `${CLINICAL_THRESHOLDS.generalDiastolicMin}–${CLINICAL_THRESHOLDS.generalDiastolicMax} mmHg`,
      category: 'demonstration_threshold',
      sourceLabel: DEMO_BAND_SOURCE,
      applicability: 'Seated adult, educational band only',
    },
    {
      id: 'dbp-baseline',
      parameter: 'Diastolic blood pressure — personal baseline',
      rangeText: `${b.diastolicBpMmHg} mmHg`,
      category: 'personal_baseline',
      sourceLabel: 'Crew profile baseline (this mission record)',
      applicability: 'Same subject and cuff protocol',
    },

    // SpO2
    {
      id: 'spo2-lab',
      parameter: 'SpO₂ — laboratory reference interval',
      rangeText: SOURCE_NOT_CONFIGURED_TEXT,
      category: 'laboratory_reference_interval',
      sourceLabel: 'No laboratory interval is configured for this prototype',
      applicability: 'Sea-level resting adult comparison only',
    },
    {
      id: 'spo2-demo',
      parameter: 'SpO₂ — demonstration threshold',
      rangeText: `≥ ${CLINICAL_THRESHOLDS.generalSpo2Min}% at rest; < ${CLINICAL_THRESHOLDS.spo2CriticalPercent}% flagged for review`,
      category: 'demonstration_threshold',
      sourceLabel: DEMO_BAND_SOURCE,
      sourceUrl: respiratory.url,
      applicability: 'Pulse oximetry, warm hands, at rest',
    },
    {
      id: 'spo2-baseline',
      parameter: 'SpO₂ — personal baseline',
      rangeText: `${b.spo2Percent}%`,
      category: 'personal_baseline',
      sourceLabel: 'Crew profile baseline (this mission record)',
      applicability: 'Same sensor and site when possible',
    },

    // Temperature
    {
      id: 'temp-lab',
      parameter: 'Body temperature — laboratory reference interval',
      rangeText: SOURCE_NOT_CONFIGURED_TEXT,
      category: 'laboratory_reference_interval',
      sourceLabel: 'No laboratory interval is configured for this prototype',
      applicability: 'Oral/tympanic, resting',
    },
    {
      id: 'temp-demo',
      parameter: 'Body temperature — demonstration band',
      rangeText: `${CLINICAL_THRESHOLDS.generalTempMinC.toFixed(1)}–${CLINICAL_THRESHOLDS.generalTempMaxC.toFixed(1)} °C`,
      category: 'demonstration_threshold',
      sourceLabel: DEMO_BAND_SOURCE,
      applicability: 'Oral/tympanic adult, educational band only',
    },
    {
      id: 'temp-baseline',
      parameter: 'Body temperature — personal baseline',
      rangeText: `${b.bodyTempC.toFixed(1)} °C`,
      category: 'personal_baseline',
      sourceLabel: 'Crew profile baseline (this mission record)',
      applicability: 'Same measurement route where possible',
    },

    // Glucose
    {
      id: 'glucose-lab',
      parameter: 'Blood glucose — laboratory reference interval',
      rangeText: SOURCE_NOT_CONFIGURED_TEXT,
      category: 'laboratory_reference_interval',
      sourceLabel: 'No laboratory interval is configured for this prototype',
      applicability: 'Fasting vs random context must be known',
    },
    {
      id: 'glucose-demo',
      parameter: 'Blood glucose — demonstration band',
      rangeText: `${CLINICAL_THRESHOLDS.generalGlucoseMinMgDl}–${CLINICAL_THRESHOLDS.generalGlucoseMaxMgDl} mg/dL fasting`,
      category: 'demonstration_threshold',
      sourceLabel: DEMO_BAND_SOURCE,
      applicability: 'Fasting comparison only; the app does not record meal context',
    },
    {
      id: 'glucose-baseline',
      parameter: 'Blood glucose — personal baseline',
      rangeText: `${b.fastingGlucoseMgDl} mg/dL fasting`,
      category: 'personal_baseline',
      sourceLabel: 'Crew profile baseline (this mission record)',
      applicability: 'Fasting sampling',
    },

    // Sleep
    {
      id: 'sleep-target',
      parameter: 'Sleep duration — behavioral target',
      rangeText: `${b.sleepTargetHours.toFixed(1)} h per night`,
      category: 'behavioral_target',
      sourceLabel: 'Crew countermeasure target (not a laboratory range)',
      sourceUrl: behaviour.url,
      applicability: 'Self-reported sleep period per 24 h',
    },
    {
      id: 'sleep-escalation',
      parameter: 'Sleep duration — escalation rule',
      rangeText: `≥ ${CLINICAL_THRESHOLDS.sleepDeficitYellowHours.toFixed(1)} h below target flagged for monitoring`,
      category: 'clinical_decision_threshold',
      sourceLabel: ESCALATION_SOURCE,
      sourceUrl: behaviour.url,
      applicability: 'Triggers an internal review prompt only',
    },

    // Hydration
    {
      id: 'hydration-target',
      parameter: 'Hydration — behavioral target',
      rangeText: `${b.hydrationTargetLiters.toFixed(1)} L per day`,
      category: 'behavioral_target',
      sourceLabel: 'Crew countermeasure target (not a laboratory range)',
      applicability: 'Daily fluid intake log',
    },

    // Radiation
    {
      id: 'radiation-demo',
      parameter: 'Radiation — demonstration threshold',
      rangeText: `< ${CLINICAL_THRESHOLDS.dailyRadiationWatchMsv.toFixed(2)} mSv/day watch; ≥ ${CLINICAL_THRESHOLDS.dailyRadiationOrangeMsv.toFixed(2)} mSv/day elevated`,
      category: 'demonstration_threshold',
      sourceLabel: DEMO_BAND_SOURCE,
      sourceUrl: radiation.url,
      applicability: 'Daily cruise dosimetry',
    },
    {
      id: 'radiation-baseline',
      parameter: 'Radiation — personal ALARA budget',
      rangeText: `${b.radiationBudgetMsv} mSv mission cumulative`,
      category: 'personal_baseline',
      sourceLabel: 'Crew profile baseline (this mission record)',
      applicability: 'Cumulative mission dose',
    },
  ];

  return rows.map((row) => ({
    ...row,
    categoryLabel: RANGE_CATEGORY_LABELS[row.category],
  }));
}

export interface ReportTrendSeriesPoint {
  missionDay: number;
  label: string;
  value: number | null;
}

export interface ReportTrendSeries {
  id: string;
  title: string;
  unit: string;
  sourceLabel: string;
  points: ReportTrendSeriesPoint[];
}

/**
 * Trend series for the report. One slot per mission day in the window so a missing day is a
 * visible gap rather than an interpolated value.
 */
export function buildReportTrendSeries(params: {
  vitals: VitalReading[];
  checkIns: CheckIn[];
  startDay: number;
  endDay: number;
  sourceLabel: string;
}): ReportTrendSeries[] {
  const { vitals, checkIns, startDay, endDay, sourceLabel } = params;
  const days: number[] = [];
  for (let day = startDay; day <= endDay; day += 1) days.push(day);

  const vitalByDay = new Map<number, VitalReading>();
  vitals.forEach((v) => vitalByDay.set(v.missionDay, v));
  const checkInByDay = new Map<number, CheckIn>();
  checkIns.forEach((c) => checkInByDay.set(c.missionDay, c));

  const series = (
    id: string,
    title: string,
    unit: string,
    extract: (day: number) => number | null
  ): ReportTrendSeries => ({
    id,
    title,
    unit,
    sourceLabel,
    points: days.map((day) => ({ missionDay: day, label: `D${day}`, value: extract(day) })),
  });

  return [
    series('heart_rate', 'Heart rate', 'bpm', (day) => vitalByDay.get(day)?.heartRateBpm ?? null),
    series('systolic_bp', 'Systolic blood pressure', 'mmHg', (day) => vitalByDay.get(day)?.systolicBpMmHg ?? null),
    series('spo2', 'SpO₂ — oxygen saturation', '%', (day) => vitalByDay.get(day)?.spo2Percent ?? null),
    series('temperature', 'Body temperature', '°C', (day) => vitalByDay.get(day)?.bodyTempC ?? null),
    series('sleep', 'Sleep duration', 'h', (day) => checkInByDay.get(day)?.sleepHours ?? null),
  ];
}

/** Barcode payload: the report identifier only — never names, metrics, or diagnoses. */
export function barcodePayloadForReport(reportId: string): string {
  return reportId;
}
