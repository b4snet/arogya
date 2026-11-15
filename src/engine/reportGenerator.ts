import type {
  Astronaut,
  BodySystemId,
  CheckIn,
  HealthAssessment,
  Mission,
  Report,
  ReportFormat,
  ReportPeriod,
  ReportSymptomEntry,
  ReportSystemSnapshot,
  ReportTrendItem,
  SymptomTag,
  VitalReading,
} from '../types';
import { CLINICAL_THRESHOLDS, SAFETY_DISCLAIMER, STATUS_META } from './thresholds';
import { STATUS_GUIDANCE_COPY } from './atlasPanelBuilder';

export const REPORTS_EXACT_DISCLAIMER =
  'This report is an educational decision-support summary generated from self-reported and optional device data. It is not a medical diagnosis. Reference ranges are general educational ranges and may not reflect individual baselines, spaceflight conditions, or clinical standards. Contact qualified medical personnel for interpretation and care.';

export const REPORT_PERIOD_LABELS: Record<ReportPeriod, string> = {
  today: 'Today (Current Mission Day)',
  '7d': 'Last 7 Days',
  '14d': 'Last 14 Days',
  full_mission: 'Full Mission',
};

const SYMPTOM_LABELS: Record<SymptomTag, string> = {
  none: 'None',
  chest_pain: 'Chest discomfort / pain',
  shortness_of_breath: 'Shortness of breath',
  severe_shortness_of_breath: 'Severe shortness of breath',
  fainting: 'Fainting / loss of consciousness',
  severe_allergic_reaction: 'Severe allergic reaction',
  rapidly_worsening: 'Rapidly worsening symptoms',
  fever_chills: 'Feverish feeling / chills',
  headache: 'Headache',
  visual_blur: 'Vision changes / blur',
  nasal_congestion: 'Nasal / sinus congestion',
  dizziness: 'Dizziness',
  muscle_soreness: 'Muscle or joint pain',
  sleep_fragmentation: 'Sleep fragmentation',
  nausea: 'Nausea',
  back_pain: 'Back pain',
  skin_irritation: 'Skin irritation',
  poor_concentration: 'Poor concentration',
  anxiety: 'Anxiety',
  low_mood: 'Low mood',
};

const SYSTEM_ORDER: BodySystemId[] = [
  'brain',
  'cardiovascular',
  'respiratory',
  'bone_muscle',
  'behavioral',
  'hydration',
  'nutrition',
  'radiation',
];

export function filterDataForReportPeriod(
  checkIns: CheckIn[],
  vitals: VitalReading[],
  currentDay: number,
  period: ReportPeriod
): {
  checkInsWindow: CheckIn[];
  vitalsWindow: VitalReading[];
  startDay: number;
  endDay: number;
  expectedDays: number;
} {
  const endDay = Math.max(1, currentDay);
  const startDay =
    period === 'today'
      ? endDay
      : period === '7d'
      ? Math.max(1, endDay - 6)
      : period === '14d'
      ? Math.max(1, endDay - 13)
      : 1;

  const checkInsWindow = [...checkIns]
    .filter((c) => c.missionDay >= startDay && c.missionDay <= endDay)
    .sort((a, b) => a.missionDay - b.missionDay);

  const vitalsWindow = [...vitals]
    .filter((v) => v.missionDay >= startDay && v.missionDay <= endDay)
    .sort((a, b) => a.missionDay - b.missionDay);

  return {
    checkInsWindow,
    vitalsWindow,
    startDay,
    endDay,
    expectedDays: endDay - startDay + 1,
  };
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

function isPresent(n: number | null | undefined): n is number {
  return typeof n === 'number' && !Number.isNaN(n);
}

function buildTrends(
  astronaut: Astronaut,
  checkInsWindow: CheckIn[],
  vitalsWindow: VitalReading[]
): ReportTrendItem[] {
  const items: ReportTrendItem[] = [];

  // Sleep
  const sleeps = checkInsWindow.map((c) => c.sleepHours);
  const sleepAvg = avg(sleeps);
  if (sleepAvg === null) {
    items.push({
      metric: 'Sleep Duration',
      periodSummary: 'No sleep check-in logs in period',
      baselineComparison: `Target ${astronaut.baseline.sleepTargetHours.toFixed(1)} h/night`,
      direction: 'insufficient',
    });
  } else {
    const delta = sleepAvg - astronaut.baseline.sleepTargetHours;
    items.push({
      metric: 'Sleep Duration',
      periodSummary: `Avg ${sleepAvg.toFixed(1)} h/night (${sleeps.length} log${sleeps.length === 1 ? '' : 's'})`,
      baselineComparison: `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} h vs ${astronaut.baseline.sleepTargetHours.toFixed(1)} h target`,
      direction: delta <= -0.8 ? 'worsening' : delta >= 0.3 ? 'improving' : 'stable',
    });
  }

  // Resting HR
  const hrs = vitalsWindow.map((v) => v.heartRateBpm).filter(isPresent);
  const hrAvg = avg(hrs);
  if (hrAvg === null) {
    items.push({
      metric: 'Resting Heart Rate',
      periodSummary: 'No resting HR readings in period',
      baselineComparison: `Personal baseline ${astronaut.baseline.restingHeartRateBpm} bpm`,
      direction: 'insufficient',
    });
  } else {
    const first = hrs[0];
    const last = hrs[hrs.length - 1];
    const shift = last - first;
    const vsBase = hrAvg - astronaut.baseline.restingHeartRateBpm;
    items.push({
      metric: 'Resting Heart Rate',
      periodSummary:
        hrs.length > 1
          ? `Avg ${Math.round(hrAvg)} bpm (${first} -> ${last} bpm)`
          : `${last} bpm`,
      baselineComparison: `${vsBase >= 0 ? '+' : ''}${Math.round(vsBase)} bpm vs ${astronaut.baseline.restingHeartRateBpm} bpm personal baseline`,
      direction: shift >= 8 || vsBase >= 12 ? 'worsening' : shift <= -6 ? 'improving' : 'stable',
    });
  }

  // Blood Pressure
  const sysList = vitalsWindow.map((v) => v.systolicBpMmHg).filter(isPresent);
  const diaList = vitalsWindow.map((v) => v.diastolicBpMmHg).filter(isPresent);
  const sysAvg = avg(sysList);
  const diaAvg = avg(diaList);
  if (sysAvg === null || diaAvg === null) {
    items.push({
      metric: 'Blood Pressure',
      periodSummary: 'Blood pressure readings missing in period',
      baselineComparison: `Personal baseline ${astronaut.baseline.systolicBpMmHg}/${astronaut.baseline.diastolicBpMmHg} mmHg`,
      direction: 'insufficient',
    });
  } else {
    const sysDelta = Math.round(sysAvg - astronaut.baseline.systolicBpMmHg);
    const lastSys = sysList[sysList.length - 1];
    const lastDia = diaList[diaList.length - 1];
    items.push({
      metric: 'Blood Pressure',
      periodSummary: `Avg ${Math.round(sysAvg)}/${Math.round(diaAvg)} mmHg (latest ${lastSys}/${lastDia} mmHg)`,
      baselineComparison: `${sysDelta >= 0 ? '+' : ''}${sysDelta} mmHg systolic vs personal baseline`,
      direction:
        lastSys >= 135 || sysDelta >= 12 ? 'worsening' : 'stable',
    });
  }

  // Hydration
  const hydros = checkInsWindow.map((c) => c.hydrationLiters);
  const hydroAvg = avg(hydros);
  if (hydroAvg === null) {
    items.push({
      metric: 'Hydration Intake',
      periodSummary: 'No hydration logs in period',
      baselineComparison: `Target ${astronaut.baseline.hydrationTargetLiters.toFixed(1)} L/day`,
      direction: 'insufficient',
    });
  } else {
    const delta = hydroAvg - astronaut.baseline.hydrationTargetLiters;
    items.push({
      metric: 'Hydration Intake',
      periodSummary: `Avg ${hydroAvg.toFixed(1)} L/day`,
      baselineComparison: `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} L vs ${astronaut.baseline.hydrationTargetLiters.toFixed(1)} L target`,
      direction: delta <= -0.5 ? 'worsening' : delta >= 0 ? 'improving' : 'stable',
    });
  }

  // Countermeasure Exercise
  const exMins = checkInsWindow.map((c) => c.exerciseMinutes);
  const exAvg = avg(exMins);
  if (exAvg === null) {
    items.push({
      metric: 'Countermeasure Exercise',
      periodSummary: 'No exercise logs in period',
      baselineComparison: `Target ${astronaut.baseline.exerciseTargetMinutes} min/day`,
      direction: 'insufficient',
    });
  } else {
    const delta = Math.round(exAvg - astronaut.baseline.exerciseTargetMinutes);
    items.push({
      metric: 'Countermeasure Exercise',
      periodSummary: `Avg ${Math.round(exAvg)} min/day`,
      baselineComparison: `${delta >= 0 ? '+' : ''}${delta} min/day vs ${astronaut.baseline.exerciseTargetMinutes} min target`,
      direction: delta <= -15 ? 'worsening' : delta >= 0 ? 'improving' : 'stable',
    });
  }

  // Blood Glucose
  const bgs = vitalsWindow.map((v) => v.bloodGlucoseMgDl).filter(isPresent);
  const bgAvg = avg(bgs);
  if (bgAvg === null) {
    items.push({
      metric: 'Blood Glucose',
      periodSummary: 'No glucose readings recorded in period',
      baselineComparison: `Personal fasting ${astronaut.baseline.fastingGlucoseMgDl} mg/dL`,
      direction: 'insufficient',
    });
  } else {
    const lastBg = bgs[bgs.length - 1];
    const delta = Math.round(bgAvg - astronaut.baseline.fastingGlucoseMgDl);
    items.push({
      metric: 'Blood Glucose',
      periodSummary: `Avg ${Math.round(bgAvg)} mg/dL (latest ${lastBg} mg/dL)`,
      baselineComparison: `${delta >= 0 ? '+' : ''}${delta} mg/dL vs personal fasting baseline`,
      direction: lastBg >= CLINICAL_THRESHOLDS.glucoseElevatedMgDl || delta >= 20 ? 'worsening' : 'stable',
    });
  }

  // Radiation Exposure
  const dailyRads = vitalsWindow.map((v) => v.dailyRadiationMsv).filter(isPresent);
  const cumRads = vitalsWindow.map((v) => v.cumulativeRadiationMsv).filter(isPresent);
  const radAvg = avg(dailyRads);
  if (radAvg === null) {
    items.push({
      metric: 'Radiation Exposure',
      periodSummary: 'Dosimetry data missing in period',
      baselineComparison: `Mission budget ${astronaut.baseline.radiationBudgetMsv} mSv`,
      direction: 'insufficient',
    });
  } else {
    const latestCum = cumRads[cumRads.length - 1] ?? 0;
    const pct = Math.round((latestCum / astronaut.baseline.radiationBudgetMsv) * 100);
    items.push({
      metric: 'Radiation Exposure',
      periodSummary: `Avg ${radAvg.toFixed(2)} mSv/day · Cumulative ${latestCum.toFixed(2)} mSv`,
      baselineComparison: `${pct}% of ${astronaut.baseline.radiationBudgetMsv} mSv mission ALARA budget`,
      direction:
        Math.max(...dailyRads) >= CLINICAL_THRESHOLDS.dailyRadiationWatchMsv ? 'worsening' : 'stable',
    });
  }

  return items;
}

function buildActionTracking(
  astronaut: Astronaut,
  checkInsWindow: CheckIn[],
  vitalsWindow: VitalReading[],
  expectedDays: number
): { completed: string[]; missed: string[] } {
  const completed: string[] = [];
  const missed: string[] = [];

  // 1. Daily check-ins
  const checkInCount = checkInsWindow.length;
  if (checkInCount > 0) {
    completed.push(
      `Daily symptom & behavioral check-in logged on ${checkInCount} of ${expectedDays} day${expectedDays === 1 ? '' : 's'}.`
    );
  }
  if (checkInCount < expectedDays) {
    const missingDays = expectedDays - checkInCount;
    missed.push(
      `Missed daily check-in on ${missingDays} day${missingDays === 1 ? '' : 's'} within period.`
    );
  }

  // 2. Aerobic/cardio exercise target
  const exerciseMetDays = checkInsWindow.filter(
    (c) => c.exerciseMinutes >= Math.round(astronaut.baseline.exerciseTargetMinutes * 0.85)
  ).length;
  const exerciseMissedDays = checkInCount - exerciseMetDays;
  if (exerciseMetDays > 0) {
    completed.push(
      `Aerobic/countermeasure exercise target met on ${exerciseMetDays} of ${checkInCount} logged day${checkInCount === 1 ? '' : 's'} (>= ${Math.round(astronaut.baseline.exerciseTargetMinutes * 0.85)} min).`
    );
  }
  if (exerciseMissedDays > 0) {
    missed.push(
      `Below personal exercise target (${astronaut.baseline.exerciseTargetMinutes} min) on ${exerciseMissedDays} logged day${exerciseMissedDays === 1 ? '' : 's'}.`
    );
  }

  // 3. ARED Resistance sessions
  const resistanceCount = checkInsWindow.filter((c) => c.resistanceTrainingCompleted).length;
  const expectedResTarget = Math.max(
    1,
    Math.round((astronaut.baseline.resistanceTargetSessionsPerWeek / 7) * expectedDays)
  );
  if (resistanceCount > 0) {
    completed.push(
      `Completed ${resistanceCount} ARED resistance-training session${resistanceCount === 1 ? '' : 's'} (period prorated target ~${expectedResTarget}).`
    );
  }
  if (resistanceCount < expectedResTarget) {
    missed.push(
      `${expectedResTarget - resistanceCount} scheduled resistance-training session${expectedResTarget - resistanceCount === 1 ? '' : 's'} short of target cadence.`
    );
  }

  // 4. Hydration target
  const hydrationMetDays = checkInsWindow.filter(
    (c) => c.hydrationLiters >= astronaut.baseline.hydrationTargetLiters * 0.85
  ).length;
  const hydrationMissedDays = checkInCount - hydrationMetDays;
  if (hydrationMetDays > 0) {
    completed.push(
      `Hydration target met on ${hydrationMetDays} of ${checkInCount} logged day${checkInCount === 1 ? '' : 's'}.`
    );
  }
  if (hydrationMissedDays > 0) {
    missed.push(
      `Hydration intake below target (${astronaut.baseline.hydrationTargetLiters.toFixed(1)} L) on ${hydrationMissedDays} day${hydrationMissedDays === 1 ? '' : 's'}.`
    );
  }

  // 5. Sleep target
  const sleepMetDays = checkInsWindow.filter(
    (c) => c.sleepHours >= astronaut.baseline.sleepTargetHours - 0.5
  ).length;
  const sleepMissedDays = checkInCount - sleepMetDays;
  if (sleepMetDays > 0) {
    completed.push(
      `Sleep target achieved on ${sleepMetDays} of ${checkInCount} logged night${checkInCount === 1 ? '' : 's'}.`
    );
  }
  if (sleepMissedDays > 0) {
    missed.push(
      `Sleep duration fell short of personal target (${astronaut.baseline.sleepTargetHours.toFixed(1)} h) on ${sleepMissedDays} night${sleepMissedDays === 1 ? '' : 's'}.`
    );
  }

  // 6. Vital sensor completeness
  const missingSensorReadings = vitalsWindow.filter(
    (v) =>
      v.bloodGlucoseMgDl == null ||
      v.heartRateBpm == null ||
      v.systolicBpMmHg == null ||
      v.bodyTempC == null ||
      v.spo2Percent == null
  ).length;
  if (vitalsWindow.length > 0 && missingSensorReadings === 0) {
    completed.push(`All scheduled core biometric sensor channels captured across ${vitalsWindow.length} day${vitalsWindow.length === 1 ? '' : 's'}.`);
  } else if (missingSensorReadings > 0) {
    missed.push(
      `Incomplete biometric sensor capture on ${missingSensorReadings} day${missingSensorReadings === 1 ? '' : 's'} (missing channels flagged).`
    );
  }

  return { completed, missed };
}

function buildSymptomsTimeline(
  checkInsWindow: CheckIn[],
  includePrivateNotes = false
): ReportSymptomEntry[] {
  const entries: ReportSymptomEntry[] = [];
  checkInsWindow.forEach((c) => {
    const active = c.symptoms.filter((s) => s !== 'none');
    const noteText = includePrivateNotes ? c.crewNotes?.trim() : undefined;
    if (active.length > 0 || noteText) {
      entries.push({
        missionDay: c.missionDay,
        symptoms: active.length > 0 ? active.map((s) => SYMPTOM_LABELS[s] ?? s) : ['No active symptoms'],
        notes: noteText || undefined,
      });
    }
  });
  return entries;
}

function buildRiskFactors(
  astronaut: Astronaut,
  assessment: HealthAssessment,
  mission: Mission,
  vitalsWindow: VitalReading[]
): string[] {
  const risks: string[] = [];

  if (mission.environment.cabinCo2MmHg > CLINICAL_THRESHOLDS.cabinCo2WatchMmHg) {
    risks.push(
      `Elevated habitat CO₂ partial pressure (${mission.environment.cabinCo2MmHg.toFixed(1)} mmHg vs < 3.0 mmHg watch threshold).`
    );
  }
  if (mission.environment.solarParticleAlert !== 'quiet') {
    risks.push(
      `Active Solar Particle Event status: ${mission.environment.solarParticleAlert.replace('_', ' ')} — elevated radiation monitoring required.`
    );
  }
  const latestVitals = vitalsWindow[vitalsWindow.length - 1];
  if (latestVitals?.cumulativeRadiationMsv != null) {
    const pct = (latestVitals.cumulativeRadiationMsv / astronaut.baseline.radiationBudgetMsv) * 100;
    if (pct >= 65) {
      risks.push(
        `Cumulative radiation dose reached ${pct.toFixed(0)}% (${latestVitals.cumulativeRadiationMsv.toFixed(1)}/${astronaut.baseline.radiationBudgetMsv} mSv) of mission ALARA budget.`
      );
    }
  }
  assessment.alerts.forEach((a) => {
    risks.push(`${a.title} (${a.rationale})`);
  });
  if (assessment.dataQuality.missingFields.length > 0) {
    risks.push(
      `Incomplete telemetry (${assessment.dataQuality.missingFields.join(', ')}) reduces confidence and prevents assuming normal status.`
    );
  }

  if (risks.length === 0) {
    risks.push('No acute environmental or physiological risk triggers identified in the active window; continue routine microgravity countermeasure surveillance.');
  }

  return Array.from(new Set(risks));
}

export function buildStructuredReport(params: {
  astronaut: Astronaut;
  assessment: HealthAssessment;
  mission: Mission;
  vitalsWindow: VitalReading[];
  checkInsWindow: CheckIn[];
  format: ReportFormat;
  preparedForRole: 'Flight Surgeon' | 'Crew Medical Officer';
  period?: ReportPeriod;
  includePrivateNotes?: boolean;
  conciseMedicalMode?: boolean;
}): Report {
  const {
    astronaut,
    assessment,
    mission,
    vitalsWindow,
    checkInsWindow,
    format,
    preparedForRole,
    period = '14d',
    includePrivateNotes = false,
    conciseMedicalMode = false,
  } = params;

  const sortedVitals = [...vitalsWindow].sort((a, b) => a.missionDay - b.missionDay);
  const sortedCheckIns = [...checkInsWindow].sort((a, b) => a.missionDay - b.missionDay);

  const latestVitals = sortedVitals[sortedVitals.length - 1];
  const latestCheckIn = sortedCheckIns[sortedCheckIns.length - 1];
  const statusLabel = STATUS_META[assessment.overallStatus].label;

  const endDay = mission.currentDay;
  const startDay =
    period === 'today'
      ? endDay
      : period === '7d'
      ? Math.max(1, endDay - 6)
      : period === '14d'
      ? Math.max(1, endDay - 13)
      : 1;
  const expectedDays = Math.max(1, endDay - startDay + 1);

  const alertSummaries =
    assessment.alerts.length > 0
      ? assessment.alerts.map((a) => `- [${a.severity.toUpperCase()}] ${a.title}: ${a.rationale}`).join('\n')
      : '- All 8 physiological and behavioral systems within expected baseline.';

  const situation = assessment.escalationRequired
    ? `PRIORITY ESCALATION for ${astronaut.fullName} (${astronaut.role}) on Mission Day ${mission.currentDay} (${REPORT_PERIOD_LABELS[period]}). Status: ${statusLabel}. Escalation triggers: ${assessment.escalationReasons.join('; ')}.`
    : format === 'anomaly_brief' && assessment.alerts.length > 0
    ? `${astronaut.fullName} (${astronaut.role}) on Mission Day ${mission.currentDay} (${REPORT_PERIOD_LABELS[period]}) shows ${statusLabel} (Readiness ${assessment.overallReadinessScore}/100). Primary flag: ${assessment.alerts[0].title}.`
    : `Structured ${REPORT_PERIOD_LABELS[period].toLowerCase()} health brief for ${astronaut.fullName} (${astronaut.role}) aboard ${mission.name} on Mission Day ${mission.currentDay}. Overall status: ${statusLabel} (Readiness ${assessment.overallReadinessScore}/100).`;

  const background = [
    `Personal Baseline: Resting HR ${astronaut.baseline.restingHeartRateBpm} bpm, BP ${astronaut.baseline.systolicBpMmHg}/${astronaut.baseline.diastolicBpMmHg} mmHg, Sleep ${astronaut.baseline.sleepTargetHours} h, Exercise ${astronaut.baseline.exerciseTargetMinutes} min/d, Resistance ${astronaut.baseline.resistanceTargetSessionsPerWeek}/wk, Rad Budget ${astronaut.baseline.radiationBudgetMsv} mSv.`,
    `Data Quality: ${assessment.dataQuality.completenessPercent}% complete (${assessment.dataQuality.qualityTier}). ${assessment.dataQuality.note}`,
    latestVitals
      ? `Latest Vitals (Day ${latestVitals.missionDay}): HR ${latestVitals.heartRateBpm ?? 'MISSING'} bpm, BP ${latestVitals.systolicBpMmHg ?? 'MISSING'}/${latestVitals.diastolicBpMmHg ?? 'MISSING'} mmHg, SpO₂ ${latestVitals.spo2Percent ?? 'MISSING'}%, Temp ${latestVitals.bodyTempC ?? 'MISSING'} °C, Glucose ${latestVitals.bloodGlucoseMgDl ?? 'MISSING'} mg/dL, Body Mass ${latestVitals.bodyMassKg ?? 'MISSING'} kg, Cumul Rad ${latestVitals.cumulativeRadiationMsv ?? 'MISSING'} mSv.`
      : 'No vitals logged in window.',
    latestCheckIn
      ? `Latest Check-In (Day ${latestCheckIn.missionDay}): Sleep ${latestCheckIn.sleepHours.toFixed(1)} h, Mood ${latestCheckIn.moodScore}/5, Stress ${latestCheckIn.stressLevel}/5, Hydration ${latestCheckIn.hydrationLiters.toFixed(1)} L, Calories ${latestCheckIn.caloriesKcal} kcal, Exercise ${latestCheckIn.exerciseMinutes} min.`
      : 'No check-in logged in window.',
  ].join('\n');

  const assessmentSummary = `${alertSummaries}\n\nNote: ${SAFETY_DISCLAIMER}`;

  const recommendations = [
    ...assessment.prioritizedActions.map((act) => `[${act.priority.toUpperCase()}] ${act.title}: ${act.detail}`),
    `Transmit with ${Math.round((mission.oneWayLightDelaySec * 2) / 60)} min round-trip comms delay context (${mission.vehicleName}).`,
  ];

  const systemSnapshots: ReportSystemSnapshot[] = SYSTEM_ORDER.map((id) => {
    const sys = assessment.systems[id];
    return {
      systemId: id,
      label: sys.label,
      status: sys.status,
      score: sys.score,
      summary: sys.plainLanguageSummary,
      statusMessage: STATUS_GUIDANCE_COPY[sys.status],
    };
  });

  const allFindings: string[] = [];
  SYSTEM_ORDER.forEach((id) => {
    const sys = assessment.systems[id];
    sys.findings.forEach((f) => allFindings.push(`${sys.label}: ${f}`));
  });
  if (allFindings.length === 0) {
    allFindings.push(
      'All tracked systems remained within expected personal baseline and general reference tolerances during this period.'
    );
  }
  const keyFindings = conciseMedicalMode ? allFindings.slice(0, 5) : allFindings;

  const allTrends = buildTrends(astronaut, sortedCheckIns, sortedVitals);
  const trends = conciseMedicalMode
    ? allTrends.filter((t) => t.direction !== 'stable').length > 0
      ? allTrends.filter((t) => t.direction !== 'stable')
      : allTrends.slice(0, 4)
    : allTrends;
  const actionTracking = buildActionTracking(astronaut, sortedCheckIns, sortedVitals, expectedDays);
  const symptomsTimeline = buildSymptomsTimeline(sortedCheckIns, includePrivateNotes);
  const riskFactors = buildRiskFactors(astronaut, assessment, mission, sortedVitals);
  const finalRecommendations = conciseMedicalMode
    ? recommendations.slice(0, 4)
    : recommendations;

  return {
    id: `RPT-${astronaut.id}-D${mission.currentDay}-${Date.now()}`,
    astronautId: astronaut.id,
    astronautName: astronaut.fullName,
    astronautRole: astronaut.role,
    missionName: mission.name,
    missionDay: mission.currentDay,
    createdAtIso: new Date().toISOString(),
    format,
    period,
    periodLabel: REPORT_PERIOD_LABELS[period],
    windowStartDay: startDay,
    windowEndDay: endDay,
    readinessScoreAtGeneration: assessment.overallReadinessScore,
    overallStatus: assessment.overallStatus,
    escalationRequired: assessment.escalationRequired,
    escalationReasons: assessment.escalationReasons,
    situation,
    background,
    assessmentSummary,
    recommendations: finalRecommendations,
    attachedVitalsWindowDays: sortedVitals.length,
    preparedForRole,
    exportedOffline: true,
    systemSnapshots: conciseMedicalMode
      ? systemSnapshots.filter((s) => s.status !== 'green').length > 0
        ? systemSnapshots.filter((s) => s.status !== 'green')
        : systemSnapshots
      : systemSnapshots,
    keyFindings,
    trends,
    actionTracking,
    symptomsTimeline,
    riskFactors,
    dataQualityNote: assessment.dataQuality.note,
    dataCompletenessPercent: assessment.dataQuality.completenessPercent,
    includePrivateNotes,
    conciseMedicalMode,
    // Immutable copies keep a printed report stable while the mission record keeps growing.
    snapshotVitals: sortedVitals.map((reading) => ({ ...reading })),
    snapshotCheckIns: sortedCheckIns.map((checkIn) => ({ ...checkIn })),
  };
}

export function reportToMarkdown(report: Report, astronautNameFallback: string): string {
  const name = report.astronautName ?? astronautNameFallback;
  const role = report.astronautRole ?? 'Crew Member';
  const mission = report.missionName ?? 'Active Space Mission';
  const periodLabel = report.periodLabel ?? `Last ${report.attachedVitalsWindowDays} Days`;

  const lines: string[] = [
    `# Arogya Astronaut Health Report — ${name}`,
    '',
    `- **Report ID:** ${report.id}`,
    `- **Astronaut:** ${name} (${role})`,
    `- **Mission & Day:** ${mission} — Mission Day ${report.missionDay}`,
    `- **Report Period:** ${periodLabel}${
      report.windowStartDay != null && report.windowEndDay != null
        ? ` (Days ${report.windowStartDay}–${report.windowEndDay})`
        : ''
    }`,
    `- **Prepared For:** ${report.preparedForRole}`,
    `- **Generated:** ${new Date(report.createdAtIso).toLocaleString()}`,
    `- **Overall Status:** ${STATUS_META[report.overallStatus].label}`,
    `- **Mission-Readiness Score:** ${report.readinessScoreAtGeneration}/100`,
    `- **Escalation Status:** ${
      report.escalationRequired
        ? `ESCALATION REQUIRED (${report.escalationReasons?.join('; ') || 'See findings'})`
        : 'Routine Monitoring — No automatic escalation triggered'
    }`,
    '',
    '## Executive Summary (SBAR Situation)',
    report.situation,
    '',
  ];

  if (report.systemSnapshots && report.systemSnapshots.length > 0) {
    lines.push('## Body-System Status Overview');
    report.systemSnapshots.forEach((sys) => {
      lines.push(
        `- **${sys.label}** — [${STATUS_META[sys.status].shortLabel.toUpperCase()}] (${sys.score}/100): ${sys.summary} _Status Guidance:_ "${sys.statusMessage ?? STATUS_GUIDANCE_COPY[sys.status]}"`
      );
    });
    lines.push('');
  }

  if (report.keyFindings && report.keyFindings.length > 0) {
    lines.push('## Key Findings');
    report.keyFindings.forEach((f) => lines.push(`- ${f}`));
    lines.push('');
  }

  if (report.trends && report.trends.length > 0) {
    lines.push('## Trends');
    report.trends.forEach((t) => {
      const dirLabel =
        t.direction === 'improving'
          ? 'IMPROVING'
          : t.direction === 'worsening'
          ? 'WORSENING'
          : t.direction === 'insufficient'
          ? 'INSUFFICIENT DATA'
          : 'STABLE';
      lines.push(`- **${t.metric}** [${dirLabel}]: ${t.periodSummary} (${t.baselineComparison})`);
    });
    lines.push('');
  }

  if (report.actionTracking) {
    lines.push('## Completed & Missed Health Actions');
    lines.push('### Completed');
    if (report.actionTracking.completed.length > 0) {
      report.actionTracking.completed.forEach((c) => lines.push(`- [x] ${c}`));
    } else {
      lines.push('- No completed actions logged in this window.');
    }
    lines.push('### Missed / Incomplete');
    if (report.actionTracking.missed.length > 0) {
      report.actionTracking.missed.forEach((m) => lines.push(`- [ ] ${m}`));
    } else {
      lines.push('- No missed actions identified in this window.');
    }
    lines.push('');
  }

  lines.push('## Symptoms Timeline');
  if (!report.includePrivateNotes) {
    lines.push('_Private free-text crew notes excluded per astronaut privacy preference._');
  }
  if (report.symptomsTimeline && report.symptomsTimeline.length > 0) {
    report.symptomsTimeline.forEach((s) => {
      lines.push(
        `- **Day ${s.missionDay}:** ${s.symptoms.join(', ')}${
          report.includePrivateNotes && s.notes ? ` — Note: "${s.notes}"` : ''
        }`
      );
    });
  } else {
    lines.push('- No active symptoms recorded across this period.');
  }
  lines.push('');

  if (report.riskFactors && report.riskFactors.length > 0) {
    lines.push('## Risk Factors');
    report.riskFactors.forEach((r) => lines.push(`- ${r}`));
    lines.push('');
  }

  lines.push('## Recommendations');
  report.recommendations.forEach((r) => lines.push(`- ${r}`));
  lines.push('');

  lines.push('## Data-Quality Notes');
  lines.push(
    `- Telemetry Completeness: ${report.dataCompletenessPercent ?? 'N/A'}% — ${
      report.dataQualityNote ?? report.background
    }`
  );
  lines.push('');
  lines.push('---');
  lines.push(REPORTS_EXACT_DISCLAIMER);

  return lines.join('\n');
}
