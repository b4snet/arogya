import type {
  Astronaut,
  CheckIn,
  RecoveryBand,
  RecoveryEscalationPathway,
  RecoveryFactor,
  RecoveryFactorId,
  RecoveryReadiness,
  RecoveryTrendDirection,
  RecoveryWindowDays,
  SimulatedRecoveryTrend,
  VitalReading,
} from '../types';
import {
  computeObservationWindow,
  filterByObservationWindow,
} from '../utils/observationWindow';
import { getSimulationScenario } from '../utils/simulatedTelemetry';
import type { SimulatedSample } from '../utils/simulatedTelemetry';
import { summarizeCheckInAdherence } from './missionStatus';
import { formatVitalSourceLabel } from './missionHealthPanels';

export const RECOVERY_WINDOW_OPTIONS: readonly RecoveryWindowDays[] = [7, 14];

export const RECOVERY_FACTOR_WEIGHTS: Record<RecoveryFactorId, number> = {
  check_in_adherence: 10,
  sleep_regularity: 25,
  exercise_adherence: 20,
  hydration_nutrition_entries: 15,
  workload_fatigue: 20,
  recorded_vitals: 10,
};

export const RECOVERY_BAND_THRESHOLDS = {
  ready: 80,
  rest: 60,
  readyMinDayCoveragePercent: 60,
} as const;

const BAND_LABELS: Record<RecoveryBand, string> = {
  ready: 'Ready',
  monitor: 'Monitor',
  rest: 'Rest and recover',
};

const DISCLAIMER =
  'This is monitoring support, not a medical diagnosis, clinical clearance, or prediction. Demonstration decision support only; banding uses configured demonstration weights and thresholds.';

const SIMULATED_EXCLUSION =
  'Simulated demonstration stream; excluded from banding and never written to recorded vitals, reports, or exports.';

export interface RecoveryReadinessEscalationInput {
  required: boolean;
  reasons: string[];
}

export interface RecoveryReadinessInput {
  astronaut: Astronaut;
  checkIns: CheckIn[];
  missionDay: number;
  windowDays?: RecoveryWindowDays;
  /** Recorded vitals only. Simulated samples are supplied through `simulated`. */
  vitals?: VitalReading[];
  escalation?: RecoveryReadinessEscalationInput;
  simulated?: {
    points: SimulatedSample[];
    sessionAstronautId: string | null;
  };
}

export interface SimulatedRecoveryTrendContext {
  astronautId: string;
  sessionAstronautId: string | null;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function populationStandardDeviation(values: number[]): number | null {
  if (values.length < 2) return null;
  const mean = average(values);
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/** Target ratios never award extra credit above the planning target. */
function ratioPercent(value: number, target: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(target) || target <= 0) return 0;
  return clamp((value / target) * 100);
}

function uniqueDays(items: CheckIn[]): CheckIn[] {
  const byDay = new Map<number, CheckIn>();
  [...items]
    .sort(
      (a, b) =>
        a.missionDay - b.missionDay || a.timestampIso.localeCompare(b.timestampIso)
    )
    .forEach((item) => byDay.set(item.missionDay, item));
  return [...byDay.values()].sort((a, b) => a.missionDay - b.missionDay);
}

function uniqueVitalDays(items: VitalReading[]): VitalReading[] {
  const byDay = new Map<number, VitalReading>();
  [...items]
    .sort(
      (a, b) =>
        a.missionDay - b.missionDay || a.timestampIso.localeCompare(b.timestampIso)
    )
    .forEach((item) => byDay.set(item.missionDay, item));
  return [...byDay.values()].sort((a, b) => a.missionDay - b.missionDay);
}

function daysBetweenNotice(count: number): string {
  return count === 1 ? '1 mission day' : `${count} mission days`;
}

function missingFactor(
  id: RecoveryFactorId,
  label: string,
  recommendation: string,
  reason: string
): RecoveryFactor {
  return {
    id,
    label,
    weight: RECOVERY_FACTOR_WEIGHTS[id],
    score: null,
    points: null,
    status: 'missing',
    summary: reason,
    inputs: [],
    recommendation,
    missingReason: reason,
  };
}

function buildAdherenceFactor(
  astronautCheckIns: CheckIn[],
  missionDay: number,
  windowDays: RecoveryWindowDays,
  recordedDays: number
): RecoveryFactor {
  const adherence = summarizeCheckInAdherence(astronautCheckIns, missionDay, windowDays);
  const recommendation =
    'Record a check-in on each mission day so recovery factors are based on complete data.';

  if (recordedDays === 0) {
    return missingFactor(
      'check_in_adherence',
      'Check-in adherence',
      recommendation,
      'No check-ins were recorded in this window.'
    );
  }

  return {
    id: 'check_in_adherence',
    label: 'Check-in adherence',
    weight: RECOVERY_FACTOR_WEIGHTS.check_in_adherence,
    score: adherence.percent,
    points: roundOne((adherence.percent * RECOVERY_FACTOR_WEIGHTS.check_in_adherence) / 100),
    status: 'scored',
    summary: adherence.label,
    inputs: [
      {
        label: 'Recorded check-ins',
        value: `${adherence.recordedDays} of ${adherence.expectedDays} mission days`,
        note:
          adherence.expectedDays < adherence.windowDays
            ? `${adherence.windowDays}-day window selected; ${adherence.expectedDays} days available. Gaps are not imputed.`
            : 'Counted once per mission day; gaps are not imputed.',
        source: 'recorded',
      },
    ],
    recommendation,
  };
}

function buildSleepFactor(days: CheckIn[], astronaut: Astronaut): RecoveryFactor {
  const recommendation =
    'Protect a consistent sleep opportunity and record sleep daily. Arogya records duration and quality, not bedtime or wake time.';

  if (days.length === 0) {
    return missingFactor(
      'sleep_regularity',
      'Sleep regularity',
      recommendation,
      'No recorded sleep entries in this window.'
    );
  }

  const sleepHours = days.map((day) => day.sleepHours);
  const quality = days.map((day) => day.sleepQuality);
  const target = astronaut.baseline.sleepTargetHours;
  const averageHours = average(sleepHours);
  const averageQuality = average(quality);
  const spread = populationStandardDeviation(sleepHours);
  const adequacy = ratioPercent(averageHours, target);
  const qualityScore = clamp((averageQuality / 5) * 100);

  let score: number;
  let status: 'scored' | 'partial';
  let missingReason: string | undefined;
  let consistency: number | null = null;

  if (spread == null) {
    score = Math.round(adequacy * 0.7 + qualityScore * 0.3);
    status = 'partial';
    missingReason =
      'Only one recorded night; night-to-night variation needs at least two recorded nights.';
  } else {
    consistency = clamp(100 - (spread / 1.5) * 100);
    score = Math.round(adequacy * 0.45 + consistency * 0.35 + qualityScore * 0.2);
    status = 'scored';
  }

  return {
    id: 'sleep_regularity',
    label: 'Sleep regularity',
    weight: RECOVERY_FACTOR_WEIGHTS.sleep_regularity,
    score,
    points: roundOne((score * RECOVERY_FACTOR_WEIGHTS.sleep_regularity) / 100),
    status,
    summary: `${averageHours.toFixed(1)} h average vs ${target.toFixed(1)} h target; ${
      spread == null ? 'variation unavailable' : `±${spread.toFixed(1)} h night-to-night`
    }.`,
    inputs: [
      {
        label: 'Recorded sleep',
        value: `${averageHours.toFixed(1)} h average`,
        note: `${daysBetweenNotice(days.length)} recorded.`,
        source: 'recorded',
      },
      {
        label: 'Night-to-night variation',
        value: spread == null ? 'Not enough nights' : `±${spread.toFixed(1)} h`,
        note: 'Calculated from recorded sleep durations; bedtime and wake time are not recorded.',
        source: 'recorded',
      },
      {
        label: 'Sleep quality',
        value: `${averageQuality.toFixed(1)} / 5`,
        note: 'Self-reported 1–5 scale.',
        source: 'recorded',
      },
    ],
    caveat: `Sleep regularity here means duration and quality consistency. Bedtime and wake time are not recorded. The ${target.toFixed(1)} h reference is a mission planning baseline, not a clinical prescription.`,
    recommendation,
    missingReason,
  };
}

function buildExerciseFactor(
  days: CheckIn[],
  astronaut: Astronaut,
  coveredDays: number
): RecoveryFactor {
  const recommendation =
    'Follow the mission countermeasure plan and record the completed block. This is an adherence view, not a fitness measurement.';

  if (days.length === 0) {
    return missingFactor(
      'exercise_adherence',
      'Exercise adherence',
      recommendation,
      'No recorded exercise entries in this window.'
    );
  }

  const targetMinutes = astronaut.baseline.exerciseTargetMinutes;
  const resistanceTarget = astronaut.baseline.resistanceTargetSessionsPerWeek;
  const averageMinutes = average(days.map((day) => day.exerciseMinutes));
  const activeDays = days.filter((day) => day.exerciseCompleted).length;
  const resistanceSessions = days.filter((day) => day.resistanceTrainingCompleted).length;
  const expectedResistance = (resistanceTarget * coveredDays) / 7;
  const aerobicPercent = ratioPercent(averageMinutes, targetMinutes);
  const activePercent = (activeDays / days.length) * 100;
  const resistancePercent =
    expectedResistance > 0 ? clamp((resistanceSessions / expectedResistance) * 100) : 100;
  const score = Math.round(
    aerobicPercent * 0.5 + activePercent * 0.3 + resistancePercent * 0.2
  );

  return {
    id: 'exercise_adherence',
    label: 'Exercise adherence',
    weight: RECOVERY_FACTOR_WEIGHTS.exercise_adherence,
    score,
    points: roundOne((score * RECOVERY_FACTOR_WEIGHTS.exercise_adherence) / 100),
    status: 'scored',
    summary: `${averageMinutes.toFixed(0)} min/day average vs ${targetMinutes} min target; ${activeDays} of ${days.length} recorded days active; ${resistanceSessions} resistance sessions vs ${expectedResistance.toFixed(1)} expected.`,
    inputs: [
      {
        label: 'Aerobic minutes',
        value: `${averageMinutes.toFixed(0)} min/day average`,
        note: `Self-reported daily minutes; planning target ${targetMinutes} min.`,
        source: 'recorded',
      },
      {
        label: 'Active recorded days',
        value: `${activeDays} of ${days.length}`,
        note: 'Self-reported completion flag.',
        source: 'recorded',
      },
      {
        label: 'Resistance sessions',
        value: `${resistanceSessions} recorded`,
        note: `${expectedResistance.toFixed(1)} expected across ${daysBetweenNotice(coveredDays)} at ${resistanceTarget}/week.`,
        source: 'recorded',
      },
    ],
    caveat: `Minutes and completion are self-reported. The ${targetMinutes} min/day and ${resistanceTarget}/week references are mission planning baselines, not clinical prescriptions. This is an adherence view, not a fitness measurement.`,
    recommendation,
  };
}

function buildHydrationNutritionFactor(
  days: CheckIn[],
  astronaut: Astronaut
): RecoveryFactor {
  const recommendation =
    'Record hydration and nutrition daily. If intake stays low or appetite has changed, discuss it with the crew medical lead.';

  if (days.length === 0) {
    return missingFactor(
      'hydration_nutrition_entries',
      'Hydration & nutrition entries',
      recommendation,
      'No recorded hydration or nutrition entries in this window.'
    );
  }

  const target = astronaut.baseline.hydrationTargetLiters;
  const averageHydration = average(days.map((day) => day.hydrationLiters));
  const nutritionEntryDays = days.filter(
    (day) =>
      (Number.isFinite(day.caloriesKcal) && day.caloriesKcal > 0) ||
      (Number.isFinite(day.proteinGrams) && day.proteinGrams > 0)
  ).length;
  const hydrationPercent = ratioPercent(averageHydration, target);
  const entryPercent = (nutritionEntryDays / days.length) * 100;
  const score = Math.round(hydrationPercent * 0.7 + entryPercent * 0.3);

  return {
    id: 'hydration_nutrition_entries',
    label: 'Hydration & nutrition entries',
    weight: RECOVERY_FACTOR_WEIGHTS.hydration_nutrition_entries,
    score,
    points: roundOne(
      (score * RECOVERY_FACTOR_WEIGHTS.hydration_nutrition_entries) / 100
    ),
    status: 'scored',
    summary: `${averageHydration.toFixed(1)} L/day average vs ${target.toFixed(1)} L target; a nutrition entry was present on ${nutritionEntryDays} of ${days.length} recorded days.`,
    inputs: [
      {
        label: 'Hydration',
        value: `${averageHydration.toFixed(1)} L/day average`,
        note: `Self-reported volume; planning target ${target.toFixed(1)} L/day.`,
        source: 'recorded',
      },
      {
        label: 'Nutrition entries',
        value: `${nutritionEntryDays} of ${days.length} recorded days`,
        note: 'Entry presence only; this is not an intake-adequacy measure.',
        source: 'recorded',
      },
    ],
    caveat: `Nutrition is scored by entry presence only. Calorie and protein values are app-derived estimates, not measured intake, and are not used as adequacy evidence. The ${target.toFixed(1)} L/day hydration reference is a mission planning baseline, not a clinical prescription.`,
    recommendation,
  };
}

function buildWorkloadFatigueFactor(days: CheckIn[]): RecoveryFactor {
  const recommendation =
    'Plan a recovery block and reduce avoidable workload where the mission allows. If high fatigue persists, review it with the crew medical lead.';

  if (days.length === 0) {
    return missingFactor(
      'workload_fatigue',
      'Workload & fatigue self-report',
      recommendation,
      'No recorded fatigue or stress entries in this window.'
    );
  }

  const fatigue = average(days.map((day) => day.fatigueLevel));
  const stress = average(days.map((day) => day.stressLevel));
  const focus = average(days.map((day) => day.cognitiveFocus));
  const mood = average(days.map((day) => day.moodScore));
  const fatigueScore = clamp(((5 - fatigue) / 4) * 100);
  const stressScore = clamp(((5 - stress) / 4) * 100);
  const focusScore = clamp(((focus - 1) / 4) * 100);
  const moodScore = clamp(((mood - 1) / 4) * 100);
  const score = Math.round(
    fatigueScore * 0.4 + stressScore * 0.3 + focusScore * 0.15 + moodScore * 0.15
  );

  return {
    id: 'workload_fatigue',
    label: 'Workload & fatigue self-report',
    weight: RECOVERY_FACTOR_WEIGHTS.workload_fatigue,
    score,
    points: roundOne((score * RECOVERY_FACTOR_WEIGHTS.workload_fatigue) / 100),
    status: 'scored',
    summary: `Fatigue ${fatigue.toFixed(1)}/5, stress ${stress.toFixed(1)}/5, focus ${focus.toFixed(1)}/5, mood ${mood.toFixed(1)}/5.`,
    inputs: [
      {
        label: 'Fatigue',
        value: `${fatigue.toFixed(1)} / 5`,
        note: 'Self-reported; higher is more fatigue.',
        source: 'recorded',
      },
      {
        label: 'Stress',
        value: `${stress.toFixed(1)} / 5`,
        note: 'Self-reported; higher is more stress.',
        source: 'recorded',
      },
      {
        label: 'Cognitive focus',
        value: `${focus.toFixed(1)} / 5`,
        note: 'Self-reported; higher is better focus.',
        source: 'recorded',
      },
      {
        label: 'Mood',
        value: `${mood.toFixed(1)} / 5`,
        note: 'Self-reported; higher is better mood.',
        source: 'recorded',
      },
    ],
    caveat:
      'Fatigue, stress, cognitive focus, and mood are self-reports. No objective workload input is recorded.',
    recommendation,
  };
}

function buildVitalsFactor(
  vitalDays: VitalReading[],
  coveredDays: number
): RecoveryFactor {
  const recommendation =
    'Continue scheduled vitals recording so recovery evidence stays complete. If a reading concerns you, review it on Vitals and use the existing escalation pathway.';

  if (vitalDays.length === 0) {
    return missingFactor(
      'recorded_vitals',
      'Recorded vitals coverage',
      recommendation,
      'No recorded vitals in this window; simulated samples are excluded and cannot fill the gap.'
    );
  }

  const latest = vitalDays[vitalDays.length - 1];
  const sourceLabel = formatVitalSourceLabel(latest.source);
  const score = Math.round((vitalDays.length / coveredDays) * 100);
  const partial = vitalDays.length < 2;

  return {
    id: 'recorded_vitals',
    label: 'Recorded vitals coverage',
    weight: RECOVERY_FACTOR_WEIGHTS.recorded_vitals,
    score,
    points: roundOne((score * RECOVERY_FACTOR_WEIGHTS.recorded_vitals) / 100),
    status: partial ? 'partial' : 'scored',
    summary: `${vitalDays.length} of ${daysBetweenNotice(coveredDays)} have recorded vitals${
      sourceLabel ? `; latest source: ${sourceLabel}` : ''
    }.`,
    inputs: [
      {
        label: 'Recorded vital days',
        value: `${vitalDays.length} of ${coveredDays} mission days`,
        note: 'One reading per mission day is counted; simulated samples are excluded.',
        source: 'recorded',
      },
      {
        label: 'Latest recorded day',
        value: `Day ${latest.missionDay}`,
        note: `${sourceLabel ? `${sourceLabel}; ` : ''}recording availability only. Values remain on Vitals and are not interpreted as a diagnosis here.`,
        source: 'recorded',
      },
    ],
    caveat:
      'Coverage only. This factor does not judge whether a vital value is normal, and a single reading is not interpreted as a diagnosis.',
    recommendation,
    missingReason: partial
      ? 'Only one recorded vital day; coverage is partial and simulated samples are not used.'
      : undefined,
  };
}

function hasConsecutiveRun(
  days: CheckIn[],
  predicate: (day: CheckIn) => boolean
): boolean {
  let run = 0;
  let previousDay: number | null = null;

  for (const day of days) {
    if (!predicate(day)) {
      run = 0;
      previousDay = day.missionDay;
      continue;
    }

    run = previousDay != null && day.missionDay === previousDay + 1 ? run + 1 : 1;
    if (run >= 3) return true;
    previousDay = day.missionDay;
  }

  return false;
}

function buildEscalation(
  days: CheckIn[],
  escalation?: RecoveryReadinessEscalationInput
): RecoveryEscalationPathway {
  if (escalation?.required) {
    return {
      level: 'urgent',
      title: 'Follow mission medical escalation procedures now',
      detail:
        'A recorded observation crosses the configured safety boundary. Notify the Crew Medical Lead and follow mission medical escalation procedures.',
      reasons: [...new Set(escalation.reasons)],
      action: 'escalation_report',
    };
  }

  const lowSleepRun = hasConsecutiveRun(days, (day) => day.sleepHours < 6);
  const highFatigueRun = hasConsecutiveRun(days, (day) => day.fatigueLevel >= 4);
  const reasons: string[] = [];

  if (lowSleepRun) {
    reasons.push('Recorded sleep was below 6 hours on at least three consecutive mission days.');
  }
  if (highFatigueRun) {
    reasons.push(
      'Self-reported fatigue was 4 or higher on at least three consecutive mission days.'
    );
  }

  if (reasons.length > 0) {
    return {
      level: 'review',
      title: 'Consider a recovery review with the crew medical lead',
      detail:
        'This is a review prompt based on recorded self-report, not a diagnosis. If symptoms are severe or worsening, follow mission medical escalation procedures.',
      reasons,
      action: 'review_report',
    };
  }

  return {
    level: 'none',
    title: 'No configured recovery-review pattern met',
    detail:
      'If symptoms are severe or worsening, follow mission medical escalation procedures.',
    reasons: [],
    action: 'none',
  };
}

function unavailableSimulatedTrend(detail: string): SimulatedRecoveryTrend {
  return {
    available: false,
    includedInBand: false,
    sampleCount: 0,
    latestHeartRateBpm: null,
    latestSpo2Percent: null,
    direction: 'insufficient',
    directionLabel: 'Not available',
    scenarioLabel: null,
    series: [],
    detail,
  };
}

export function buildSimulatedRecoveryTrend(
  points: SimulatedSample[],
  context: SimulatedRecoveryTrendContext
): SimulatedRecoveryTrend {
  if (
    context.sessionAstronautId !== null &&
    context.sessionAstronautId !== context.astronautId
  ) {
    return unavailableSimulatedTrend(
      'The active simulated stream belongs to a different crew profile; its values are withheld.'
    );
  }

  if (context.sessionAstronautId === null && points.length > 0) {
    return unavailableSimulatedTrend(
      'The active simulated stream has no crew assignment; its values are withheld.'
    );
  }

  if (points.length < 2) {
    return unavailableSimulatedTrend(
      'No active simulated session for this crew. Start one from the dashboard monitor to view the demonstration trend.'
    );
  }

  const series = points.slice(-40).map((point) => point.heartRateBpm);
  const half = Math.max(1, Math.floor(series.length / 2));
  const delta = average(series.slice(-half)) - average(series.slice(0, half));
  const direction: RecoveryTrendDirection =
    delta <= -2 ? 'falling' : delta >= 2 ? 'rising' : 'stable';
  const directionLabel =
    direction === 'falling' ? 'Falling' : direction === 'rising' ? 'Rising' : 'Stable';
  const latest = points[points.length - 1];

  return {
    available: true,
    includedInBand: false,
    sampleCount: points.length,
    latestHeartRateBpm: latest.heartRateBpm,
    latestSpo2Percent: latest.spo2Percent,
    direction,
    directionLabel,
    scenarioLabel: getSimulationScenario(latest.scenario).label,
    series,
    detail: `Simulated heart rate is ${direction} across the current demo window. This is an interface demonstration stream, not a recovery measurement, and it is excluded from the band.`,
  };
}

export function buildRecoveryReadiness({
  astronaut,
  checkIns,
  missionDay,
  windowDays = 7,
  vitals = [],
  escalation,
  simulated,
}: RecoveryReadinessInput): RecoveryReadiness {
  const astronautCheckIns = checkIns.filter((item) => item.astronautId === astronaut.id);
  const window = computeObservationWindow(missionDay, windowDays);
  const days = uniqueDays(filterByObservationWindow(astronautCheckIns, window));
  const vitalDays = uniqueVitalDays(
    filterByObservationWindow(
      vitals.filter((reading) => reading.astronautId === astronaut.id),
      window
    )
  );
  const recordedDays = days.length;
  const recordedDaySet = new Set(days.map((day) => day.missionDay));
  const missingDays: number[] = [];

  for (let day = window.startDay; day <= window.endDay; day += 1) {
    if (!recordedDaySet.has(day)) missingDays.push(day);
  }

  const factors: RecoveryFactor[] = [
    buildAdherenceFactor(astronautCheckIns, missionDay, windowDays, recordedDays),
    buildSleepFactor(days, astronaut),
    buildExerciseFactor(days, astronaut, window.coveredDays),
    buildHydrationNutritionFactor(days, astronaut),
    buildWorkloadFatigueFactor(days),
    buildVitalsFactor(vitalDays, window.coveredDays),
  ];

  const scoredFactors = factors.filter(
    (factor): factor is RecoveryFactor & { score: number; points: number } =>
      factor.score != null && factor.points != null
  );
  const scoredWeight = scoredFactors.reduce((sum, factor) => sum + factor.weight, 0);
  const score =
    recordedDays > 0 && scoredWeight > 0
      ? Math.round(
          (scoredFactors.reduce((sum, factor) => sum + factor.points, 0) / scoredWeight) *
            100
        )
      : null;
  const evidenceCoveragePercent = scoredWeight;
  const dayCoveragePercent =
    window.coveredDays > 0 ? Math.round((recordedDays / window.coveredDays) * 100) : 0;
  const escalationPathway = buildEscalation(days, escalation);

  let band: RecoveryBand;
  let bandReason: string;

  if (score == null) {
    band = 'monitor';
    bandReason =
      'Recovery readiness is not scored because no check-ins were recorded in this window.';
  } else if (score < RECOVERY_BAND_THRESHOLDS.rest) {
    band = 'rest';
    bandReason = `Recorded factors score ${score}/100, below the demonstration Rest threshold of ${RECOVERY_BAND_THRESHOLDS.rest}.`;
  } else if (
    score >= RECOVERY_BAND_THRESHOLDS.ready &&
    dayCoveragePercent >= RECOVERY_BAND_THRESHOLDS.readyMinDayCoveragePercent
  ) {
    band = 'ready';
    bandReason = `Recorded factors score ${score}/100 with ${dayCoveragePercent}% day coverage.`;
  } else {
    band = 'monitor';
    bandReason =
      score >= RECOVERY_BAND_THRESHOLDS.ready
        ? `Recorded factors score ${score}/100, but only ${dayCoveragePercent}% of days have a check-in. The band is capped at Monitor until coverage reaches ${RECOVERY_BAND_THRESHOLDS.readyMinDayCoveragePercent}%.`
        : `Recorded factors score ${score}/100, within the Monitor band.`;
  }

  if (escalationPathway.level === 'urgent') {
    band = 'rest';
    bandReason = `${bandReason} The band is set to Rest and recover because a recorded safety escalation applies.`;
  }

  scoredFactors.sort((a, b) => a.score - b.score);
  const weakest = scoredFactors[0] ?? null;

  let recommendation: string;
  if (escalationPathway.level === 'urgent') {
    recommendation =
      'Follow mission medical escalation procedures now and continue recording check-ins so recovery factors stay complete.';
  } else if (score == null) {
    recommendation = 'Record a daily check-in to establish a recovery baseline.';
  } else if (band === 'rest') {
    recommendation =
      'Prioritize recovery: protect sleep, follow mission guidance on adjusting activity, and review the pattern with the crew medical lead.';
  } else if (band === 'monitor' && dayCoveragePercent < RECOVERY_BAND_THRESHOLDS.readyMinDayCoveragePercent) {
    recommendation =
      'Record the missing days before treating this as a stable trend; the band stays at Monitor until coverage improves.';
  } else if (band === 'monitor' && weakest) {
    recommendation = `Focus first on ${weakest.label.toLowerCase()} and keep recording daily.`;
  } else {
    recommendation = 'Keep the current countermeasure cadence and continue recording daily.';
  }

  const missingNotes: string[] = [];
  if (recordedDays === 0) {
    missingNotes.push(
      'No check-ins were recorded in this window; no factor was assumed normal.'
    );
    missingNotes.push(
      vitalDays.length === 0
        ? 'No recorded vitals were available either; simulated samples cannot fill the gap.'
        : 'Vitals were recorded, but a readiness band is not produced without check-ins.'
    );
  } else {
    if (missingDays.length > 0) {
      missingNotes.push(
        `${missingDays.length} of ${window.coveredDays} mission days have no check-in. Missing days are not imputed and are not treated as normal.`
      );
    }
    factors
      .filter((factor) => factor.status !== 'scored' && factor.missingReason)
      .forEach((factor) => missingNotes.push(factor.missingReason as string));
  }

  return {
    astronautId: astronaut.id,
    missionDay,
    window: {
      requestedDays: window.requestedDays,
      startDay: window.startDay,
      endDay: window.endDay,
      coveredDays: window.coveredDays,
      recordedDays,
      coverageNotice:
        recordedDays < window.requestedDays
          ? `${window.requestedDays}-day window selected; ${recordedDays} day${
              recordedDays === 1 ? '' : 's'
            } of observations available.`
          : null,
    },
    band,
    bandLabel: BAND_LABELS[band],
    bandReason,
    score,
    evidenceCoveragePercent,
    dayCoveragePercent,
    missingDays,
    factors,
    weakestFactorId: weakest?.id ?? null,
    recommendation,
    missingDataNote:
      missingNotes.length > 0
        ? missingNotes.join(' ')
        : 'All six factors were scored from recorded check-ins and vitals in this window.',
    escalation: escalationPathway,
    simulatedTrend: simulated
      ? buildSimulatedRecoveryTrend(simulated.points, {
          astronautId: astronaut.id,
          sessionAstronautId: simulated.sessionAstronautId,
        })
      : unavailableSimulatedTrend(SIMULATED_EXCLUSION),
    disclaimer: DISCLAIMER,
  };
}
