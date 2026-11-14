import type { Astronaut, HealthStatusLevel, VitalReading } from '../types';
import { CLINICAL_THRESHOLDS, REFERENCE_RANGE_DISCLAIMER } from './thresholds';
import { celsiusToFahrenheit, kgToLb, mgDlToMmolL } from '../utils/unitConversions';

export type VitalsTrendDirection = 'rising' | 'falling' | 'stable' | 'insufficient';
export type VitalRowStatus = HealthStatusLevel | 'missing';

export interface VitalReferenceRow {
  id:
    | 'resting_hr'
    | 'systolic_bp'
    | 'diastolic_bp'
    | 'body_temp'
    | 'blood_glucose'
    | 'body_mass'
    | 'radiation'
    | 'spo2';
  name: string;
  latestNumeric: number | null;
  latestFormatted: string;
  unit: string;
  generalReferenceRange: string;
  personalBaseline: string;
  trendDirection: VitalsTrendDirection;
  trendLabel: string;
  status: VitalRowStatus;
  statusLabel: string;
  explanation: string;
  recommendedAction: string;
  escalationThreshold: string;
  latestDay: number | null;
}

export const VITALS_REFERENCE_TABLE_NOTE = REFERENCE_RANGE_DISCLAIMER;

function isPresent(v: number | null | undefined): v is number {
  return typeof v === 'number' && !Number.isNaN(v);
}

function computeTrend(
  readings: VitalReading[],
  extractor: (v: VitalReading) => number | null | undefined,
  stableTolerance: number,
  decimals: number,
  unitSuffix: string
): { direction: VitalsTrendDirection; label: string } {
  const valid = readings
    .map((r) => ({ day: r.missionDay, val: extractor(r) }))
    .filter((item): item is { day: number; val: number } => isPresent(item.val));

  if (valid.length < 2) {
    return { direction: 'insufficient', label: 'Insufficient data' };
  }

  const latest = valid[valid.length - 1].val;
  const baselineSlice = valid.slice(0, Math.max(1, valid.length - 1));
  const priorAvg =
    baselineSlice.reduce((sum, item) => sum + item.val, 0) / baselineSlice.length;
  const delta = latest - priorAvg;

  if (Math.abs(delta) <= stableTolerance) {
    return { direction: 'stable', label: `Stable (${delta >= 0 ? '+' : ''}${delta.toFixed(decimals)} ${unitSuffix})` };
  }
  if (delta > 0) {
    return {
      direction: 'rising',
      label: `Rising (+${delta.toFixed(decimals)} ${unitSuffix})`,
    };
  }
  return {
    direction: 'falling',
    label: `Falling (${delta.toFixed(decimals)} ${unitSuffix})`,
  };
}

function formatStatusLabel(status: VitalRowStatus): string {
  switch (status) {
    case 'red':
      return 'Medical Review';
    case 'orange':
      return 'Caution';
    case 'yellow':
      return 'Monitor';
    case 'missing':
      return 'Missing';
    default:
      return 'Nominal';
  }
}

export function buildVitalReferenceRows(
  astronaut: Astronaut,
  windowReadings: VitalReading[],
  allReadings: VitalReading[],
  units: 'metric' | 'imperial' = 'metric'
): VitalReferenceRow[] {
  const sortedAll = [...allReadings].sort((a, b) => a.missionDay - b.missionDay);
  const sortedWin = [...windowReadings].sort((a, b) => a.missionDay - b.missionDay);
  const latest = sortedAll[sortedAll.length - 1] ?? null;
  const prev = sortedAll.length >= 2 ? sortedAll[sortedAll.length - 2] : null;

  const isImperial = units === 'imperial';

  // 1. Resting Heart Rate
  const hr = latest?.heartRateBpm ?? null;
  const hrBaseline = astronaut.baseline.restingHeartRateBpm;
  const hrTrend = computeTrend(sortedWin, (v) => v.heartRateBpm, 3, 0, 'bpm');
  let hrStatus: VitalRowStatus = 'green';
  let hrExplanation =
    'Reading aligns with both your personal resting baseline and commonly used adult reference ranges.';
  let hrAction = 'Continue routine resting morning pulse check and scheduled aerobic countermeasures.';

  if (!isPresent(hr)) {
    hrStatus = 'missing';
    hrExplanation =
      'No resting heart rate measurement is logged for the latest cycle. Missing data is flagged rather than assumed normal.';
    hrAction = 'Capture a calm seated resting pulse measurement when sensor access is available.';
  } else {
    const outOfGeneral =
      hr < CLINICAL_THRESHOLDS.generalRestingHrMin || hr > CLINICAL_THRESHOLDS.generalRestingHrMax;
    const delta = hr - hrBaseline;
    const repeatedHigh =
      isPresent(prev?.heartRateBpm) &&
      (prev.heartRateBpm > CLINICAL_THRESHOLDS.generalRestingHrMax ||
        prev.heartRateBpm - hrBaseline >= CLINICAL_THRESHOLDS.hrDeltaOrangeBpm) &&
      (hr > CLINICAL_THRESHOLDS.generalRestingHrMax ||
        delta >= CLINICAL_THRESHOLDS.hrDeltaOrangeBpm);

    if (repeatedHigh || hr > 110 || hr < 42) {
      hrStatus = 'red';
      hrExplanation =
        'This value is outside a commonly used reference range and may warrant monitoring or medical review, especially given persistence across consecutive checks.';
      hrAction =
        'Rest quietly for 5 minutes, repeat measurement, and prepare a summary for the crew medical officer or flight surgeon.';
    } else if (outOfGeneral || delta >= CLINICAL_THRESHOLDS.hrDeltaOrangeBpm) {
      hrStatus = 'orange';
      hrExplanation = outOfGeneral
        ? 'This value is outside a commonly used reference range and may warrant monitoring or medical review.'
        : 'Within general adult bounds, but elevated relative to your personal pre-flight baseline; fluid shifts, sleep debt, or workload may contribute.';
      hrAction = 'Verify hydration status, prioritize recovery rest, and re-check after calm rest.';
    } else if (Math.abs(delta) >= CLINICAL_THRESHOLDS.hrDeltaYellowBpm) {
      hrStatus = 'yellow';
      hrExplanation =
        'Within commonly used adult reference ranges, though shifted from your personal baseline; tracking next readings is advisable.';
      hrAction = 'Compare with sleep duration and recent EVA/exercise recovery.';
    }
  }

  // 2. Systolic Blood Pressure
  const sys = latest?.systolicBpMmHg ?? null;
  const sysBaseline = astronaut.baseline.systolicBpMmHg;
  const sysTrend = computeTrend(sortedWin, (v) => v.systolicBpMmHg, 4, 0, 'mmHg');
  let sysStatus: VitalRowStatus = 'green';
  let sysExplanation =
    'Systolic pressure is consistent with your personal baseline and general adult reference expectations.';
  let sysAction = 'Continue scheduled seated cuff verification under calm conditions.';

  if (!isPresent(sys)) {
    sysStatus = 'missing';
    sysExplanation =
      'Latest systolic blood pressure reading is missing. Missing values are flagged and never treated as normal.';
    sysAction = 'Log a seated resting cuff reading with arm positioned at heart level.';
  } else {
    const outOfGeneral =
      sys < CLINICAL_THRESHOLDS.generalSystolicMin || sys > CLINICAL_THRESHOLDS.generalSystolicMax;
    const repeatedElevated =
      isPresent(prev?.systolicBpMmHg) &&
      (prev.systolicBpMmHg >= 140 || prev.systolicBpMmHg - sysBaseline >= 20) &&
      (sys >= 140 || sys - sysBaseline >= 20);

    if (repeatedElevated || sys >= 160 || sys < 85) {
      sysStatus = 'red';
      sysExplanation =
        'This value is outside a commonly used reference range and may warrant monitoring or medical review across consecutive readings.';
      sysAction =
        'Repeat seated measurement after 5 minutes of quiet rest and contact the crew medical officer.';
    } else if (sys >= 140 || sys - sysBaseline >= 20) {
      sysStatus = 'orange';
      sysExplanation =
        'This value is outside a commonly used reference range and may warrant monitoring or medical review.';
      sysAction = 'Re-measure after 5 minutes of seated calm rest and verify cuff fit.';
    } else if (outOfGeneral || Math.abs(sys - sysBaseline) >= 12) {
      sysStatus = 'yellow';
      sysExplanation = outOfGeneral
        ? 'This value is outside a commonly used reference range and may warrant monitoring or medical review.'
        : 'Within general adult limits, though noticeably shifted from your personal baseline.';
      sysAction = 'Monitor paired with hydration, sodium intake, and sleep debt.';
    }
  }

  // 3. Diastolic Blood Pressure
  const dia = latest?.diastolicBpMmHg ?? null;
  const diaBaseline = astronaut.baseline.diastolicBpMmHg;
  const diaTrend = computeTrend(sortedWin, (v) => v.diastolicBpMmHg, 3, 0, 'mmHg');
  let diaStatus: VitalRowStatus = 'green';
  let diaExplanation =
    'Diastolic pressure aligns with your personal baseline and commonly used adult reference ranges.';
  let diaAction = 'Maintain standard resting cuff measurement cadence.';

  if (!isPresent(dia)) {
    diaStatus = 'missing';
    diaExplanation =
      'Latest diastolic blood pressure reading is missing. Missing measurements are marked explicitly.';
    diaAction = 'Record seated resting blood pressure when available.';
  } else {
    const outOfGeneral =
      dia < CLINICAL_THRESHOLDS.generalDiastolicMin || dia > CLINICAL_THRESHOLDS.generalDiastolicMax;
    const repeatedElevated =
      isPresent(prev?.diastolicBpMmHg) && prev.diastolicBpMmHg >= 90 && dia >= 90;

    if (repeatedElevated || dia >= 100 || dia < 50) {
      diaStatus = 'red';
      diaExplanation =
        'This value is outside a commonly used reference range and may warrant monitoring or medical review.';
      diaAction = 'Repeat calm seated measurement and escalate to the crew medical lead.';
    } else if (dia >= 90) {
      diaStatus = 'orange';
      diaExplanation =
        'This value is outside a commonly used reference range and may warrant monitoring or medical review.';
      diaAction = 'Repeat measurement after rest and track alongside systolic trend.';
    } else if (outOfGeneral || Math.abs(dia - diaBaseline) >= 10) {
      diaStatus = 'yellow';
      diaExplanation = outOfGeneral
        ? 'This value is outside a commonly used reference range and may warrant monitoring or medical review.'
        : 'Within commonly used reference limits, though shifted relative to personal baseline.';
      diaAction = 'Continue monitoring at daily resting check.';
    }
  }

  // 4. Temperature
  const tempC = latest?.bodyTempC ?? null;
  const tempDisplay = isPresent(tempC)
    ? isImperial
      ? celsiusToFahrenheit(tempC).toFixed(1)
      : tempC.toFixed(1)
    : 'MISSING';
  const tempBaselineDisplay = isImperial
    ? `${celsiusToFahrenheit(astronaut.baseline.bodyTempC).toFixed(1)} °F`
    : `${astronaut.baseline.bodyTempC.toFixed(1)} °C`;
  const tempUnit = isImperial ? '°F' : '°C';
  const tempTrend = computeTrend(
    sortedWin,
    (v) =>
      isPresent(v.bodyTempC)
        ? isImperial
          ? celsiusToFahrenheit(v.bodyTempC)
          : v.bodyTempC
        : null,
    isImperial ? 0.5 : 0.3,
    1,
    tempUnit
  );
  let tempStatus: VitalRowStatus = 'green';
  let tempExplanation =
    'Temperature sits within your personal baseline band and typical adult oral/tympanic ranges.';
  let tempAction = 'Continue routine morning thermometry.';

  if (!isPresent(tempC)) {
    tempStatus = 'missing';
    tempExplanation =
      'Body temperature reading is missing for the latest cycle; missing values are never assumed normal.';
    tempAction = 'Log an oral or tympanic temperature reading using calibrated spacecraft equipment.';
  } else {
    const outOfGeneral =
      tempC < CLINICAL_THRESHOLDS.generalTempMinC || tempC > CLINICAL_THRESHOLDS.generalTempMaxC;
    const repeatedFever =
      isPresent(prev?.bodyTempC) &&
      prev.bodyTempC >= CLINICAL_THRESHOLDS.feverThresholdC &&
      tempC >= CLINICAL_THRESHOLDS.feverThresholdC;

    if (tempC >= CLINICAL_THRESHOLDS.highFeverThresholdC || repeatedFever || tempC < 35.0) {
      tempStatus = 'red';
      tempExplanation =
        'This value is outside a commonly used reference range and may warrant monitoring or medical review promptly.';
      tempAction =
        'Recheck temperature, document any accompanying symptoms, and contact the crew medical officer.';
    } else if (tempC >= CLINICAL_THRESHOLDS.feverThresholdC) {
      tempStatus = 'orange';
      tempExplanation =
        'This value is outside a commonly used reference range and may warrant monitoring or medical review.';
      tempAction = 'Re-check temperature in 2 hours and complete a symptom check-in.';
    } else if (outOfGeneral || Math.abs(tempC - astronaut.baseline.bodyTempC) >= 0.6) {
      tempStatus = 'yellow';
      tempExplanation = outOfGeneral
        ? 'This value is outside a commonly used reference range and may warrant monitoring or medical review.'
        : 'Within general adult bounds, though shifted from personal baseline; consider post-exercise timing.';
      tempAction = 'Verify measurement timing relative to exercise or EVA suit cooling.';
    }
  }

  // 5. Blood Glucose
  const bgMgDl = latest?.bloodGlucoseMgDl ?? null;
  const bgDisplay = isPresent(bgMgDl)
    ? isImperial
      ? mgDlToMmolL(bgMgDl).toFixed(1)
      : String(bgMgDl)
    : 'MISSING';
  const bgUnit = isImperial ? 'mmol/L' : 'mg/dL';
  const bgBaselineDisplay = isImperial
    ? `${mgDlToMmolL(astronaut.baseline.fastingGlucoseMgDl).toFixed(1)} mmol/L fasting`
    : `${astronaut.baseline.fastingGlucoseMgDl} mg/dL fasting`;
  const bgGeneralRef = isImperial ? '3.9–6.9 mmol/L (fasting)' : '70–125 mg/dL (fasting)';
  const bgTrend = computeTrend(
    sortedWin,
    (v) =>
      isPresent(v.bloodGlucoseMgDl)
        ? isImperial
          ? mgDlToMmolL(v.bloodGlucoseMgDl)
          : v.bloodGlucoseMgDl
        : null,
    isImperial ? 0.6 : 10,
    isImperial ? 1 : 0,
    bgUnit
  );
  let bgStatus: VitalRowStatus = 'green';
  let bgExplanation =
    'Reading aligns with your personal fasting baseline and commonly used adult fasting ranges.';
  let bgAction = 'Continue standard pre-meal morning sampling cadence.';

  if (!isPresent(bgMgDl)) {
    bgStatus = 'missing';
    bgExplanation =
      'Latest blood glucose reading is missing. Missing metabolic readings are flagged rather than assumed normal.';
    bgAction = 'Confirm whether reading was skipped or schedule next fasting measurement.';
  } else {
    const outOfGeneral =
      bgMgDl < CLINICAL_THRESHOLDS.generalGlucoseMinMgDl ||
      bgMgDl > CLINICAL_THRESHOLDS.generalGlucoseMaxMgDl;
    const repeatedElevated =
      isPresent(prev?.bloodGlucoseMgDl) &&
      (prev.bloodGlucoseMgDl >= CLINICAL_THRESHOLDS.glucoseElevatedMgDl ||
        prev.bloodGlucoseMgDl <= CLINICAL_THRESHOLDS.glucoseCriticalLowMgDl) &&
      (bgMgDl >= CLINICAL_THRESHOLDS.glucoseElevatedMgDl ||
        bgMgDl <= CLINICAL_THRESHOLDS.glucoseCriticalLowMgDl);

    if (
      bgMgDl >= CLINICAL_THRESHOLDS.glucoseCriticalHighMgDl ||
      bgMgDl <= CLINICAL_THRESHOLDS.glucoseCriticalLowMgDl ||
      repeatedElevated
    ) {
      bgStatus = 'red';
      bgExplanation =
        'This value is outside a commonly used reference range and may warrant monitoring or medical review across consecutive checks.';
      bgAction =
        'Confirm fasting vs post-meal timing, repeat reading, and consult the crew medical officer.';
    } else if (
      bgMgDl >= CLINICAL_THRESHOLDS.glucoseElevatedMgDl ||
      bgMgDl < CLINICAL_THRESHOLDS.generalGlucoseMinMgDl
    ) {
      bgStatus = 'orange';
      bgExplanation =
        'This value is outside a commonly used reference range and may warrant monitoring or medical review.';
      bgAction = 'Note timing relative to meals or high-stress EVA and repeat fasting check.';
    } else if (outOfGeneral || Math.abs(bgMgDl - astronaut.baseline.fastingGlucoseMgDl) >= 22) {
      bgStatus = 'yellow';
      bgExplanation = outOfGeneral
        ? 'This value is outside a commonly used reference range and may warrant monitoring or medical review.'
        : 'Within general adult limits, though elevated relative to personal fasting baseline.';
      bgAction = 'Review caloric composition, sleep quality, and repeat at next fasting window.';
    }
  }

  // 6. Body Mass
  const massKg = latest?.bodyMassKg ?? null;
  const baselineMassKg = astronaut.baseline.bodyMassKg;
  const massUnit = isImperial ? 'lb' : 'kg';
  const massDisplay = isPresent(massKg)
    ? isImperial
      ? kgToLb(massKg).toFixed(1)
      : massKg.toFixed(1)
    : 'MISSING';
  const massBaselineDisplay = isPresent(baselineMassKg)
    ? isImperial
      ? `${kgToLb(baselineMassKg).toFixed(1)} lb pre-flight`
      : `${baselineMassKg.toFixed(1)} kg pre-flight`
    : 'Pre-flight baseline unrecorded';
  const massTrend = computeTrend(
    sortedWin,
    (v) =>
      isPresent(v.bodyMassKg) ? (isImperial ? kgToLb(v.bodyMassKg) : v.bodyMassKg) : null,
    isImperial ? 1.1 : 0.5,
    1,
    massUnit
  );
  let massStatus: VitalRowStatus = 'green';
  let massExplanation =
    'Body mass remains within expected stability relative to pre-flight baseline.';
  let massAction = 'Maintain adequate daily caloric and resistance countermeasure targets.';

  if (!isPresent(massKg)) {
    massStatus = 'missing';
    massExplanation =
      'Body mass measurement is not recorded for the latest cycle. Microgravity mass checks use specialized inertial devices.';
    massAction = 'Log a weekly inertial body mass measurement when schedule permits.';
  } else if (isPresent(baselineMassKg)) {
    const pctChange = ((massKg - baselineMassKg) / baselineMassKg) * 100;
    if (pctChange <= -5) {
      massStatus = 'orange';
      massExplanation =
        'This value is outside a commonly used reference range (>= 5% unintentional loss from baseline) and may warrant monitoring or medical review.';
      massAction = 'Review daily caloric intake, hydration, and appetite logs with crew medical lead.';
    } else if (Math.abs(pctChange) >= 2.5) {
      massStatus = 'yellow';
      massExplanation =
        'Mild shift relative to pre-flight body mass baseline; microgravity fluid shift or energy deficit may be factors.';
      massAction = 'Verify nutrition and hydration consistency over the next 3–5 mission days.';
    }
  }

  // 7. Radiation Exposure
  const dailyRad = latest?.dailyRadiationMsv ?? null;
  const cumRad = latest?.cumulativeRadiationMsv ?? null;
  const radBudget = astronaut.baseline.radiationBudgetMsv;
  const radTrend = computeTrend(sortedWin, (v) => v.dailyRadiationMsv, 0.15, 2, 'mSv/d');
  let radStatus: VitalRowStatus = 'green';
  let radExplanation =
    'Daily ionizing dose is within nominal galactic cosmic ray background expectations.';
  let radAction = 'Continue standard personal dosimeter logging.';

  if (!isPresent(dailyRad)) {
    radStatus = 'missing';
    radExplanation =
      'Daily dosimetry reading is missing; unverified radiation exposure is flagged rather than assumed nominal.';
    radAction = 'Sync personal active dosimeter or record manual dosimeter value.';
  } else {
    const budgetPct = isPresent(cumRad) ? (cumRad / radBudget) * 100 : 0;
    if (dailyRad >= CLINICAL_THRESHOLDS.dailyRadiationOrangeMsv || budgetPct >= 85) {
      radStatus = 'orange';
      radExplanation =
        'This value is outside a commonly used reference range for daily cruise dosimetry and may warrant monitoring or medical review.';
      radAction = 'Verify storm-shelter shielding compliance and notify flight surgeon/radiation officer.';
    } else if (dailyRad >= CLINICAL_THRESHOLDS.dailyRadiationWatchMsv || budgetPct >= 65) {
      radStatus = 'yellow';
      radExplanation =
        'Elevated daily dosimetry compared with nominal cruise background (e.g. EVA or heightened solar activity).';
      radAction = 'Track cumulative ALARA budget closely and avoid unnecessary unshielded hull time.';
    }
  }

  // 8. Oxygen Saturation (SpO2, if available)
  const spo2 = latest?.spo2Percent ?? null;
  const spo2Baseline = astronaut.baseline.spo2Percent;
  const spo2Trend = computeTrend(sortedWin, (v) => v.spo2Percent, 1, 0, '%');
  let spo2Status: VitalRowStatus = 'green';
  let spo2Explanation =
    'Peripheral oxygen saturation aligns with your personal baseline and general adult reference ranges.';
  let spo2Action = 'Continue routine pulse oximetry when available.';

  if (!isPresent(spo2)) {
    spo2Status = 'missing';
    spo2Explanation =
      'Oxygen saturation sensor reading is unavailable for the latest cycle; marked missing rather than normal.';
    spo2Action = 'Capture finger pulse oximetry reading when sensor is available, especially if fatigued.';
  } else {
    const outOfGeneral = spo2 < CLINICAL_THRESHOLDS.generalSpo2Min;
    const repeatedLow =
      isPresent(prev?.spo2Percent) &&
      prev.spo2Percent < CLINICAL_THRESHOLDS.generalSpo2Min &&
      outOfGeneral;

    if (spo2 < CLINICAL_THRESHOLDS.spo2CriticalPercent || repeatedLow) {
      spo2Status = 'red';
      spo2Explanation =
        'This value is outside a commonly used reference range and may warrant monitoring or medical review immediately.';
      spo2Action =
        'Remain at rest, verify sensor warming/placement, check cabin O₂/pCO₂, and contact crew medical officer.';
    } else if (outOfGeneral) {
      spo2Status = 'yellow';
      spo2Explanation =
        'This value is outside a commonly used reference range and may warrant monitoring or medical review.';
      spo2Action = 'Re-measure with warm hands at rest and cross-check cabin atmosphere telemetry.';
    } else if (spo2Baseline - spo2 >= 3) {
      spo2Status = 'yellow';
      spo2Explanation =
        'Within general adult expectations, though slightly lower than personal baseline; continue monitoring.';
      spo2Action = 'Monitor respiratory comfort and cabin pCO₂ trends.';
    }
  }

  return [
    {
      id: 'resting_hr',
      name: 'Resting heart rate',
      latestNumeric: hr,
      latestFormatted: isPresent(hr) ? `${hr} bpm` : 'MISSING',
      unit: 'bpm',
      generalReferenceRange: `${CLINICAL_THRESHOLDS.generalRestingHrMin}–${CLINICAL_THRESHOLDS.generalRestingHrMax} bpm (adult resting)`,
      personalBaseline: `${hrBaseline} bpm personal resting`,
      trendDirection: hrTrend.direction,
      trendLabel: hrTrend.label,
      status: hrStatus,
      statusLabel: formatStatusLabel(hrStatus),
      explanation: hrExplanation,
      recommendedAction: hrAction,
      escalationThreshold: '> 100 bpm sustained, < 45 bpm, or >= +20 bpm over baseline on consecutive days',
      latestDay: latest?.missionDay ?? null,
    },
    {
      id: 'systolic_bp',
      name: 'Systolic blood pressure',
      latestNumeric: sys,
      latestFormatted: isPresent(sys) ? `${sys} mmHg` : 'MISSING',
      unit: 'mmHg',
      generalReferenceRange: `${CLINICAL_THRESHOLDS.generalSystolicMin}–${CLINICAL_THRESHOLDS.generalSystolicMax} mmHg (seated adult)`,
      personalBaseline: `${sysBaseline} mmHg personal baseline`,
      trendDirection: sysTrend.direction,
      trendLabel: sysTrend.label,
      status: sysStatus,
      statusLabel: formatStatusLabel(sysStatus),
      explanation: sysExplanation,
      recommendedAction: sysAction,
      escalationThreshold: '>= 140 mmHg on consecutive readings, >= 160 mmHg single, or < 85 mmHg',
      latestDay: latest?.missionDay ?? null,
    },
    {
      id: 'diastolic_bp',
      name: 'Diastolic blood pressure',
      latestNumeric: dia,
      latestFormatted: isPresent(dia) ? `${dia} mmHg` : 'MISSING',
      unit: 'mmHg',
      generalReferenceRange: `${CLINICAL_THRESHOLDS.generalDiastolicMin}–${CLINICAL_THRESHOLDS.generalDiastolicMax} mmHg (seated adult)`,
      personalBaseline: `${diaBaseline} mmHg personal baseline`,
      trendDirection: diaTrend.direction,
      trendLabel: diaTrend.label,
      status: diaStatus,
      statusLabel: formatStatusLabel(diaStatus),
      explanation: diaExplanation,
      recommendedAction: diaAction,
      escalationThreshold: '>= 90 mmHg on consecutive readings, >= 100 mmHg single, or < 50 mmHg',
      latestDay: latest?.missionDay ?? null,
    },
    {
      id: 'body_temp',
      name: 'Temperature',
      latestNumeric: tempC,
      latestFormatted: isPresent(tempC) ? `${tempDisplay} ${tempUnit}` : 'MISSING',
      unit: tempUnit,
      generalReferenceRange: isImperial ? '97.0–99.5 °F (oral adult)' : '36.1–37.5 °C (oral adult)',
      personalBaseline: `${tempBaselineDisplay} personal baseline`,
      trendDirection: tempTrend.direction,
      trendLabel: tempTrend.label,
      status: tempStatus,
      statusLabel: formatStatusLabel(tempStatus),
      explanation: tempExplanation,
      recommendedAction: tempAction,
      escalationThreshold: '>= 38.0 °C (100.4 °F) with symptoms, repeated >= 38.0 °C, or >= 38.8 °C',
      latestDay: latest?.missionDay ?? null,
    },
    {
      id: 'blood_glucose',
      name: 'Blood glucose',
      latestNumeric: bgMgDl,
      latestFormatted: isPresent(bgMgDl) ? `${bgDisplay} ${bgUnit}` : 'MISSING',
      unit: bgUnit,
      generalReferenceRange: bgGeneralRef,
      personalBaseline: bgBaselineDisplay,
      trendDirection: bgTrend.direction,
      trendLabel: bgTrend.label,
      status: bgStatus,
      statusLabel: formatStatusLabel(bgStatus),
      explanation: bgExplanation,
      recommendedAction: bgAction,
      escalationThreshold: '<= 60 mg/dL, >= 200 mg/dL, or >= 140 mg/dL repeated fasting',
      latestDay: latest?.missionDay ?? null,
    },
    {
      id: 'body_mass',
      name: 'Body mass',
      latestNumeric: massKg,
      latestFormatted: isPresent(massKg) ? `${massDisplay} ${massUnit}` : 'MISSING',
      unit: massUnit,
      generalReferenceRange: 'Within +/- 5% of pre-flight crew stability',
      personalBaseline: massBaselineDisplay,
      trendDirection: massTrend.direction,
      trendLabel: massTrend.label,
      status: massStatus,
      statusLabel: formatStatusLabel(massStatus),
      explanation: massExplanation,
      recommendedAction: massAction,
      escalationThreshold: '>= 5% unplanned reduction from pre-flight baseline',
      latestDay: latest?.missionDay ?? null,
    },
    {
      id: 'radiation',
      name: 'Radiation exposure',
      latestNumeric: dailyRad,
      latestFormatted: isPresent(dailyRad)
        ? `${dailyRad.toFixed(2)} mSv/d${isPresent(cumRad) ? ` (${cumRad.toFixed(1)} mSv cum.)` : ''}`
        : 'MISSING',
      unit: 'mSv/d · mSv cum.',
      generalReferenceRange: '< 1.20 mSv/day LEO/cruise operational watch threshold',
      personalBaseline: `${radBudget} mSv mission ALARA budget`,
      trendDirection: radTrend.direction,
      trendLabel: radTrend.label,
      status: radStatus,
      statusLabel: formatStatusLabel(radStatus),
      explanation: radExplanation,
      recommendedAction: radAction,
      escalationThreshold: '>= 2.00 mSv/day, SPE storm shelter alert, or >= 85% mission budget',
      latestDay: latest?.missionDay ?? null,
    },
    {
      id: 'spo2',
      name: 'Oxygen saturation (if available)',
      latestNumeric: spo2,
      latestFormatted: isPresent(spo2) ? `${spo2}%` : 'MISSING',
      unit: '%',
      generalReferenceRange: '95–100% (sea-level adult)',
      personalBaseline: `${spo2Baseline}% personal baseline`,
      trendDirection: spo2Trend.direction,
      trendLabel: spo2Trend.label,
      status: spo2Status,
      statusLabel: formatStatusLabel(spo2Status),
      explanation: spo2Explanation,
      recommendedAction: spo2Action,
      escalationThreshold: '< 92% single reading or < 95% across consecutive days / with dyspnea',
      latestDay: latest?.missionDay ?? null,
    },
  ];
}

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return 'MISSING';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildVitalsCsv(astronaut: Astronaut, readings: VitalReading[]): string {
  const sorted = [...readings].sort((a, b) => a.missionDay - b.missionDay);
  const headers = [
    'astronaut_id',
    'astronaut_name',
    'mission_day',
    'timestamp_iso',
    'source',
    'resting_hr_bpm',
    'baseline_hr_bpm',
    'hrv_ms',
    'systolic_bp_mmhg',
    'baseline_systolic_mmhg',
    'diastolic_bp_mmhg',
    'baseline_diastolic_mmhg',
    'spo2_percent',
    'baseline_spo2_percent',
    'respiratory_rate_bpm',
    'body_temp_c',
    'baseline_temp_c',
    'blood_glucose_mg_dl',
    'baseline_glucose_mg_dl',
    'body_mass_kg',
    'baseline_mass_kg',
    'daily_radiation_msv',
    'cumulative_radiation_msv',
    'radiation_budget_msv',
  ];

  const rows = sorted.map((r) => [
    astronaut.id,
    astronaut.fullName,
    r.missionDay,
    r.timestampIso,
    r.source,
    r.heartRateBpm,
    astronaut.baseline.restingHeartRateBpm,
    r.hrvMs,
    r.systolicBpMmHg,
    astronaut.baseline.systolicBpMmHg,
    r.diastolicBpMmHg,
    astronaut.baseline.diastolicBpMmHg,
    r.spo2Percent,
    astronaut.baseline.spo2Percent,
    r.respiratoryRateBpm,
    r.bodyTempC,
    astronaut.baseline.bodyTempC,
    r.bloodGlucoseMgDl,
    astronaut.baseline.fastingGlucoseMgDl,
    r.bodyMassKg ?? null,
    astronaut.baseline.bodyMassKg ?? null,
    r.dailyRadiationMsv,
    r.cumulativeRadiationMsv,
    astronaut.baseline.radiationBudgetMsv,
  ]);

  return [headers, ...rows]
    .map((line) => line.map(escapeCsvCell).join(','))
    .join('\n');
}
