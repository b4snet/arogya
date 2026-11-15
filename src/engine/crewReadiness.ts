import type {
  Astronaut,
  CheckIn,
  CrewAlertRollup,
  CrewDataGap,
  CrewMemberReadiness,
  CrewMetricSummary,
  CrewReadiness,
  CrewReadinessWindowDays,
  CrewTrendDirection,
  CrewTrendSummary,
  HealthAssessment,
  HealthStatusLevel,
  Mission,
  RecoveryBand,
  RecoveryFactorId,
  VitalReading,
} from '../types';
import { evaluateHealthAssessment } from './healthEngine';
import { buildRecoveryReadiness } from './recoveryReadiness';
import {
  computeObservationWindow,
  filterByObservationWindow,
} from '../utils/observationWindow';

export const CREW_READINESS_WINDOW_OPTIONS: readonly CrewReadinessWindowDays[] = [7, 14];

export const CREW_READINESS_DISCLAIMER =
  'Crew readiness bands and trends are monitoring support, not medical diagnosis, clinical clearance, prediction, or live monitoring. Demonstration weights and thresholds only.';

export const CREW_READINESS_PRIVACY_NOTE =
  'Private crew notes, free-text check-in comments, symptom details, and share settings are not read or copied into this overview. Open-flag counts are aggregated; alert titles, rationales, and recommended actions stay in each crew member’s individual record.';

export const CREW_READINESS_SOURCE_NOTE =
  'Crew metrics use recorded browser-local check-ins and vitals only. Simulated demonstration streams are excluded from every crew metric and band, and research context is not used.';

const CREW_TREND_THRESHOLDS = {
  checkInPercentagePoints: 5,
  sleepHours: 0.3,
  exerciseMinutes: 5,
  fatiguePoints: 0.3,
} as const;

const TREND_LABELS: Record<CrewTrendDirection, string> = {
  improving: 'Improving',
  worsening: 'Worsening',
  stable: 'Stable',
  insufficient: 'Not enough data',
};

const FACTOR_LABELS: Partial<Record<RecoveryFactorId, string>> = {
  check_in_adherence: 'Check-in adherence',
  sleep_regularity: 'Sleep regularity',
  exercise_adherence: 'Exercise adherence',
  hydration_nutrition_entries: 'Hydration & nutrition entries',
  workload_fatigue: 'Workload & fatigue self-report',
  recorded_vitals: 'Recorded vitals coverage',
};

const SEVERITY_ORDER: HealthStatusLevel[] = ['red', 'orange', 'yellow', 'green'];

interface HalfWindow {
  startDay: number;
  endDay: number;
  days: number;
}

export interface CrewReadinessInput {
  astronauts: Astronaut[];
  checkInsByAstronaut: Record<string, CheckIn[]>;
  vitalsByAstronaut: Record<string, VitalReading[]>;
  mission: Mission;
  windowDays?: CrewReadinessWindowDays;
}

interface MemberContext {
  astronaut: Astronaut;
  checkIns: CheckIn[];
  assessment: HealthAssessment;
  readiness: ReturnType<typeof buildRecoveryReadiness>;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function uniqueCheckInsByDay(items: CheckIn[]): CheckIn[] {
  const byDay = new Map<number, CheckIn>();
  [...items]
    .sort(
      (a, b) =>
        a.missionDay - b.missionDay || a.timestampIso.localeCompare(b.timestampIso)
    )
    .forEach((item) => byDay.set(item.missionDay, item));
  return [...byDay.values()].sort((a, b) => a.missionDay - b.missionDay);
}

function splitWindow(startDay: number, endDay: number): { first: HalfWindow; second: HalfWindow } {
  const mid = Math.floor((startDay + endDay) / 2);
  return {
    first: { startDay, endDay: mid, days: mid - startDay + 1 },
    second: { startDay: mid + 1, endDay, days: endDay - mid },
  };
}

function openCountLabel(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function directionFromDelta(delta: number, threshold: number): CrewTrendDirection {
  if (delta >= threshold) return 'improving';
  if (delta <= -threshold) return 'worsening';
  return 'stable';
}

function insufficientTrend(detail: string): CrewTrendSummary {
  return {
    direction: 'insufficient',
    label: TREND_LABELS.insufficient,
    detail,
    firstHalfValue: null,
    secondHalfValue: null,
  };
}

function evidenceStatus(membersWithEvidence: number, memberCount: number): 'recorded' | 'partial' | 'missing' {
  if (membersWithEvidence === 0) return 'missing';
  return membersWithEvidence < memberCount ? 'partial' : 'recorded';
}

function buildFactorTrend(
  id: 'sleep_regularity' | 'exercise_adherence' | 'workload_fatigue',
  firstHalf: CheckIn[],
  secondHalf: CheckIn[],
  halves: { first: HalfWindow; second: HalfWindow }
): CrewTrendSummary {
  const firstValue = average(
    firstHalf.map((day) => (id === 'sleep_regularity' ? day.sleepHours : id === 'exercise_adherence' ? day.exerciseMinutes : day.fatigueLevel))
  );
  const secondValue = average(
    secondHalf.map((day) => (id === 'sleep_regularity' ? day.sleepHours : id === 'exercise_adherence' ? day.exerciseMinutes : day.fatigueLevel))
  );

  if (firstValue == null || secondValue == null) {
    return insufficientTrend(
      'A crew trend needs recorded check-ins in both halves of the window; missing data is not imputed.'
    );
  }

  const delta = secondValue - firstValue;
  const isFatigue = id === 'workload_fatigue';
  const direction = isFatigue
    ? directionFromDelta(-delta, CREW_TREND_THRESHOLDS.fatiguePoints)
    : id === 'sleep_regularity'
      ? directionFromDelta(delta, CREW_TREND_THRESHOLDS.sleepHours)
      : directionFromDelta(delta, CREW_TREND_THRESHOLDS.exerciseMinutes);

  const unit = id === 'sleep_regularity' ? 'h' : id === 'exercise_adherence' ? 'min/day' : '/5';
  const metricLabel =
    id === 'sleep_regularity'
      ? 'Average recorded sleep'
      : id === 'exercise_adherence'
        ? 'Average recorded exercise'
        : 'Average self-reported fatigue (higher is more fatigue)';

  return {
    direction,
    label: TREND_LABELS[direction],
    detail: `${metricLabel} was ${roundOne(firstValue)} ${unit} in Day ${halves.first.startDay}–${halves.first.endDay} and ${roundOne(secondValue)} ${unit} in Day ${halves.second.startDay}–${halves.second.endDay}.`,
    firstHalfValue: roundOne(firstValue),
    secondHalfValue: roundOne(secondValue),
  };
}

function buildCheckInTrend(
  contexts: MemberContext[],
  halves: { first: HalfWindow; second: HalfWindow }
): CrewTrendSummary {
  if (contexts.length === 0) {
    return insufficientTrend('No crew members are loaded, so no crew trend can be calculated.');
  }

  const countInHalf = (half: HalfWindow): number =>
    contexts.reduce(
      (sum, context) =>
        sum +
        context.checkIns.filter(
          (day) => day.missionDay >= half.startDay && day.missionDay <= half.endDay
        ).length,
      0
    );

  const firstCount = countInHalf(halves.first);
  const secondCount = countInHalf(halves.second);
  const firstExpected = contexts.length * halves.first.days;
  const secondExpected = contexts.length * halves.second.days;

  if (firstCount === 0 || secondCount === 0) {
    return insufficientTrend(
      'A crew trend needs recorded check-ins from the crew in both halves of the window; missing days are not imputed.'
    );
  }

  const firstPercent = Math.round((firstCount / firstExpected) * 100);
  const secondPercent = Math.round((secondCount / secondExpected) * 100);
  const direction = directionFromDelta(
    secondPercent - firstPercent,
    CREW_TREND_THRESHOLDS.checkInPercentagePoints
  );

  return {
    direction,
    label: TREND_LABELS[direction],
    detail: `Crew check-in completion was ${firstPercent}% in Day ${halves.first.startDay}–${halves.first.endDay} and ${secondPercent}% in Day ${halves.second.startDay}–${halves.second.endDay}.`,
    firstHalfValue: firstPercent,
    secondHalfValue: secondPercent,
  };
}

function buildAlertRollup(contexts: MemberContext[]): CrewAlertRollup {
  const bySeverity: Record<HealthStatusLevel, number> = {
    green: 0,
    yellow: 0,
    orange: 0,
    red: 0,
  };
  let openCount = 0;
  let membersWithAlerts = 0;
  let escalatingMembers = 0;

  contexts.forEach((context) => {
    const alerts = context.assessment.alerts;
    openCount += alerts.length;
    if (alerts.length > 0) membersWithAlerts += 1;
    if (context.assessment.escalationRequired) escalatingMembers += 1;
    alerts.forEach((alert) => {
      bySeverity[alert.severity] += 1;
    });
  });

  const severitySummary = SEVERITY_ORDER.filter((severity) => bySeverity[severity] > 0)
    .map((severity) => `${bySeverity[severity]} ${severity}`)
    .join(', ');

  const detail =
    openCount === 0
      ? 'No active recorded assessment flags in the latest crew evaluation. This is not evidence that nothing is wrong.'
      : `${openCountLabel(openCount, 'active recorded flag')} across ${openCountLabel(
          membersWithAlerts,
          'crew member'
        )} (${severitySummary}). Current evaluation only, not scoped to the observation window. Alert titles and rationales stay in each individual record.`;

  return {
    openCount,
    membersWithAlerts,
    escalatingMembers,
    bySeverity,
    detail,
  };
}

function buildMemberReadiness(context: MemberContext): CrewMemberReadiness {
  const { astronaut, readiness, assessment } = context;
  const hasBand = readiness.score != null;

  return {
    astronautId: astronaut.id,
    callSign: astronaut.callSign,
    fullName: astronaut.fullName,
    role: astronaut.role,
    band: hasBand ? readiness.band : null,
    bandLabel: hasBand ? readiness.bandLabel : 'Not scored',
    bandReason: hasBand
      ? readiness.bandReason
      : 'No readiness band is assigned because no check-ins were recorded in this window.',
    score: readiness.score,
    dayCoveragePercent: readiness.dayCoveragePercent,
    recordedDays: readiness.window.recordedDays,
    coveredDays: readiness.window.coveredDays,
    missingDays: readiness.missingDays,
    openAlertCount: assessment.alerts.length,
    escalationLevel: readiness.escalation.level,
    recommendation: readiness.recommendation,
  };
}

function buildDataGaps(
  contexts: MemberContext[],
  window: ReturnType<typeof computeObservationWindow>,
  windowDays: CrewReadinessWindowDays
): CrewDataGap[] {
  const gaps: CrewDataGap[] = [];

  if (window.coveredDays < windowDays) {
    gaps.push({
      id: 'window-coverage',
      kind: 'window',
      label: `${windowDays}-day window shortened to ${openCountLabel(window.coveredDays, 'day')}`,
      detail: `Mission day ${window.endDay} only allows ${openCountLabel(
        window.coveredDays,
        'day'
      )} since mission start. Pre-mission days are not fabricated.`,
    });
  }

  contexts.forEach(({ astronaut, readiness }) => {
    const recordedDays = readiness.window.recordedDays;
    if (recordedDays === 0) {
      gaps.push({
        id: `member-${astronaut.id}-no-checkin`,
        kind: 'member',
        label: `${astronaut.callSign} has no recorded check-ins`,
        detail: `${astronaut.fullName} has no check-in in this window; the readiness band is withheld and nothing is assumed normal.`,
      });
      return;
    }

    if (readiness.dayCoveragePercent < 60) {
      gaps.push({
        id: `member-${astronaut.id}-low-coverage`,
        kind: 'member',
        label: `${astronaut.callSign} day coverage is ${readiness.dayCoveragePercent}%`,
        detail: `${recordedDays} of ${readiness.window.coveredDays} days ${
          recordedDays === 1 ? 'has' : 'have'
        } a check-in, below the 60% needed for a Ready band. Missing days are not imputed.`,
      });
    } else if (readiness.missingDays.length > 0) {
      gaps.push({
        id: `member-${astronaut.id}-missing-days`,
        kind: 'member',
        label: `${astronaut.callSign} is missing ${openCountLabel(
          readiness.missingDays.length,
          'check-in day'
        )}`,
        detail: `${
          readiness.missingDays.length === 1 ? 'Day' : 'Days'
        } ${readiness.missingDays.join(', ')} ${
          readiness.missingDays.length === 1 ? 'has' : 'have'
        } no check-in. Gaps are not imputed and are not treated as normal.`,
      });
    }
  });

  const factorGaps = new Map<RecoveryFactorId, string[]>();
  contexts.forEach(({ astronaut, readiness }) => {
    readiness.factors.forEach((factor) => {
      if (factor.status !== 'missing') return;
      const callSigns = factorGaps.get(factor.id) ?? [];
      callSigns.push(astronaut.callSign);
      factorGaps.set(factor.id, callSigns);
    });
  });

  factorGaps.forEach((callSigns, factorId) => {
    const label = FACTOR_LABELS[factorId] ?? factorId;
    gaps.push({
      id: `factor-${factorId}`,
      kind: 'factor',
      label:
        callSigns.length === contexts.length
          ? `${label} is missing for the full crew`
          : `${label} is missing for ${callSigns.join(', ')}`,
      detail: `${callSigns.length} of ${contexts.length} crew members ${
        callSigns.length === 1 ? 'has' : 'have'
      } no recorded evidence for this factor. It is excluded from crew averages and never assumed normal; simulated streams cannot fill the gap.`,
    });
  });

  return gaps;
}

export function buildCrewReadiness({
  astronauts,
  checkInsByAstronaut,
  vitalsByAstronaut,
  mission,
  windowDays = 7,
}: CrewReadinessInput): CrewReadiness {
  const window = computeObservationWindow(mission.currentDay, windowDays);
  const halves = splitWindow(window.startDay, window.endDay);

  const contexts: MemberContext[] = astronauts.map((astronaut) => {
    const memberCheckIns = checkInsByAstronaut[astronaut.id] ?? [];
    const memberVitals = vitalsByAstronaut?.[astronaut.id] ?? [];
    const assessment = evaluateHealthAssessment(
      astronaut,
      memberCheckIns,
      memberVitals,
      mission
    );
    const readiness = buildRecoveryReadiness({
      astronaut,
      checkIns: memberCheckIns,
      missionDay: mission.currentDay,
      windowDays,
      vitals: memberVitals,
      escalation: {
        required: assessment.escalationRequired,
        reasons: assessment.escalationReasons,
      },
    });

    const windowCheckIns = uniqueCheckInsByDay(
      filterByObservationWindow(
        memberCheckIns.filter((item) => item.astronautId === astronaut.id),
        window
      )
    );

    return {
      astronaut,
      checkIns: windowCheckIns,
      assessment,
      readiness,
    };
  });

  const members = contexts.map(buildMemberReadiness);
  const memberCount = members.length;
  const bandCounts: Record<RecoveryBand | 'unscored', number> = {
    ready: 0,
    monitor: 0,
    rest: 0,
    unscored: 0,
  };
  members.forEach((member) => {
    if (member.band) bandCounts[member.band] += 1;
    else bandCounts.unscored += 1;
  });
  const bandedCount = memberCount - bandCounts.unscored;

  const totalRecordedCrewDays = contexts.reduce(
    (sum, context) => sum + context.readiness.window.recordedDays,
    0
  );
  const expectedCrewDays = memberCount * window.coveredDays;
  const checkInPercent =
    expectedCrewDays > 0 ? Math.round((totalRecordedCrewDays / expectedCrewDays) * 100) : null;
  const checkInEvidence = contexts.filter(
    (context) => context.readiness.window.recordedDays > 0
  ).length;

  const factorMetric = (
    id: 'sleep_regularity' | 'exercise_adherence' | 'workload_fatigue',
    label: string,
    factorLabel: string,
    caveat: string
  ): CrewMetricSummary => {
    const evidence = contexts
      .map((context) => context.readiness.factors.find((factor) => factor.id === id))
      .filter((factor): factor is NonNullable<typeof factor> => factor?.score != null);
    const score = average(evidence.map((factor) => factor.score as number));
    const status = evidenceStatus(evidence.length, memberCount);
    const allDays = contexts.flatMap((context) => context.checkIns);
    const firstHalf = allDays.filter(
      (day) => day.missionDay >= halves.first.startDay && day.missionDay <= halves.first.endDay
    );
    const secondHalf = allDays.filter(
      (day) => day.missionDay >= halves.second.startDay && day.missionDay <= halves.second.endDay
    );
    const measured =
      id === 'sleep_regularity'
        ? average(allDays.map((day) => day.sleepHours))
        : id === 'exercise_adherence'
          ? average(allDays.map((day) => day.exerciseMinutes))
          : average(allDays.map((day) => day.fatigueLevel));
    const measuredUnit = id === 'sleep_regularity' ? 'h average' : id === 'exercise_adherence' ? 'min/day average' : '/5 average fatigue';

    const summary =
      score == null
        ? `No crew member has recorded ${factorLabel.toLowerCase()} evidence in this window; no value is assumed.`
        : `${measured == null ? 'No measured average' : `${roundOne(measured)} ${measuredUnit}`}; ${Math.round(
            score
          )}/100 is the average across ${evidence.length} of ${memberCount} crew members with recorded ${factorLabel.toLowerCase()} evidence.`;

    return {
      id,
      label,
      score: score == null ? null : Math.round(score),
      status,
      membersWithEvidence: evidence.length,
      memberCount,
      summary,
      caveat,
      trend: buildFactorTrend(id, firstHalf, secondHalf, halves),
    };
  };

  const metrics: CrewMetricSummary[] = [
    {
      id: 'check_in_completion',
      label: 'Check-in completion',
      score: checkInPercent,
      status: evidenceStatus(checkInEvidence, memberCount),
      membersWithEvidence: checkInEvidence,
      memberCount,
      summary:
        checkInPercent == null
          ? 'No crew members are loaded, so completion cannot be calculated.'
          : `${totalRecordedCrewDays} of ${expectedCrewDays} crew-days have a recorded check-in (${checkInPercent}%).`,
      caveat:
        'One check-in per crew member per mission day is counted; missing days are never assumed complete.',
      trend: buildCheckInTrend(contexts, halves),
    },
    factorMetric(
      'sleep_regularity',
      'Sleep regularity',
      'Sleep regularity',
      'Sleep regularity uses recorded duration and quality consistency; bedtime and wake time are not recorded.'
    ),
    factorMetric(
      'exercise_adherence',
      'Exercise adherence',
      'Exercise adherence',
      'Self-reported minutes and completion; an adherence view, not a fitness measurement.'
    ),
    factorMetric(
      'workload_fatigue',
      'Workload & fatigue',
      'Workload and fatigue',
      'Fatigue, stress, focus, and mood are self-reported; no objective workload input is recorded.'
    ),
  ];

  const alerts = buildAlertRollup(contexts);
  const dataGaps = buildDataGaps(contexts, window, windowDays);
  const dataGapNote =
    dataGaps.length === 0
      ? 'No recorded-data gaps in this window. Missing data was not assumed normal.'
      : `${openCountLabel(dataGaps.length, 'recorded-data gap')} in this window. Missing data is not imputed or treated as normal.`;

  let crewRecommendation: string;
  if (alerts.escalatingMembers > 0) {
    crewRecommendation =
      'Follow mission medical escalation procedures for the flagged crew member, then review the crew pattern with the crew medical lead.';
  } else if (bandCounts.unscored > 0) {
    crewRecommendation =
      'Record a check-in for every crew member before comparing readiness; an unscored member is never assigned a band by default.';
  } else if (bandCounts.rest > 0 || bandCounts.monitor > 0) {
    crewRecommendation =
      'Review the crew members outside the Ready band and close recorded-data gaps. Bands are monitoring support, not clinical clearance.';
  } else {
    crewRecommendation =
      'Keep the current countermeasure cadence across the crew and continue daily recording.';
  }

  return {
    window: {
      requestedDays: window.requestedDays,
      startDay: window.startDay,
      endDay: window.endDay,
      coveredDays: window.coveredDays,
    },
    memberCount,
    bandedCount,
    bandCounts,
    members,
    metrics,
    alerts,
    dataGaps,
    dataGapNote,
    crewRecommendation,
    privacyNote: CREW_READINESS_PRIVACY_NOTE,
    sourceNote: CREW_READINESS_SOURCE_NOTE,
    disclaimer: CREW_READINESS_DISCLAIMER,
  };
}
