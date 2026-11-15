import type {
  Astronaut,
  CountermeasureItem,
  HealthAssessment,
  Mission,
  MissionHealthBrief,
  ReportDataGap,
  ReportDecisionWindow,
  ReportExecutiveSummary,
  ReportPeriod,
  ReportReferenceContext,
  RecoveryWindowDays,
} from '../types';
import { computeObservationWindow } from '../utils/observationWindow';
import { buildCountermeasureCoach } from './countermeasureCoach';
import { buildRecoveryReadiness } from './recoveryReadiness';
import { STATUS_META } from './thresholds';

export const REPORT_DECISION_SOURCE_NOTE =
  'Recorded means browser-local check-ins and vitals captured for this crew member. Simulated demonstration streams are excluded from every decision-support section and export. Research references are labelled background only and never count as crew evidence.';

export const REPORT_DECISION_DISCLAIMER =
  'This decision support is monitoring and planning support, not a medical diagnosis. It contains no treatment, medication, or dosage guidance, and it does not replace the crew medical lead.';

export interface ReportDecisionSupportInput {
  astronaut: Astronaut;
  assessment: HealthAssessment;
  mission: Mission;
  checkIns: ReportDecisionWindow['checkIns'];
  vitals: ReportDecisionWindow['vitals'];
  period?: ReportPeriod;
  /** Recorded window for recovery and countermeasure context. */
  windowDays?: RecoveryWindowDays;
  healthBrief?: MissionHealthBrief;
}

export interface ReportDecisionSupport {
  executiveSummary: ReportExecutiveSummary;
  recoveryReadiness: ReturnType<typeof buildRecoveryReadiness>;
  countermeasures: ReturnType<typeof buildCountermeasureCoach>;
  dataGaps: ReportDataGap[];
  referenceContext: ReportReferenceContext[];
}

function requestedReportDays(period: ReportPeriod, missionDay: number): number {
  if (period === 'today') return 1;
  if (period === '7d') return 7;
  if (period === '14d') return 14;
  return missionDay;
}

function decisionWindowDays(
  period: ReportPeriod,
  windowDays?: RecoveryWindowDays
): RecoveryWindowDays {
  if (windowDays) return windowDays;
  return period === '14d' || period === 'full_mission' ? 14 : 7;
}

function countByStatus(items: CountermeasureItem[], status: CountermeasureItem['status']): number {
  return items.filter((item) => item.status === status).length;
}

function reviewPrompt(assessment: HealthAssessment, recoveryLevel: string): string {
  if (assessment.escalationRequired) {
    return 'Promptly — an escalation criterion is met. Follow mission medical escalation procedures now and transmit this report through mission medical channels.';
  }
  if (recoveryLevel === 'review') {
    return 'At the next scheduled medical review; sooner if symptoms persist, worsen, or recorded readings move outside their usual pattern.';
  }
  return 'At the next scheduled medical review, or sooner if symptoms or recorded readings change.';
}

function escalationLine(assessment: HealthAssessment, recoveryReasons: string[]): string {
  if (assessment.escalationRequired) {
    return `Recorded escalation trigger: ${assessment.escalationReasons.join('; ')}.`;
  }
  if (recoveryReasons.length > 0) {
    return `Recovery review prompt: ${recoveryReasons.join('; ')}.`;
  }
  return 'No configured escalation criterion met.';
}

function buildExecutiveSummary(
  input: ReportDecisionSupportInput,
  recovery: ReturnType<typeof buildRecoveryReadiness>,
  countermeasures: ReturnType<typeof buildCountermeasureCoach>,
  gaps: ReportDataGap[]
): ReportExecutiveSummary {
  const { astronaut, assessment, mission, healthBrief } = input;
  const hasScore = recovery.score != null;
  const headline = assessment.escalationRequired
    ? `Medical review requested for ${astronaut.callSign}`
    : recovery.escalation.level === 'review'
    ? `Recovery review prompt for ${astronaut.callSign}`
    : !hasScore
    ? `Recovery readiness not scored for ${astronaut.callSign}`
    : `${astronaut.callSign} · ${recovery.bandLabel} recovery band`;

  const overview = `Mission Day ${mission.currentDay} aboard ${mission.name}. Overall status: ${
    STATUS_META[assessment.overallStatus].label
  }. Recovery readiness is ${recovery.bandLabel}${
    recovery.score != null ? ` at ${recovery.score}/100` : ' without a score'
  }, based on ${recovery.window.recordedDays} of ${
    recovery.window.coveredDays
  } recorded mission days in the ${recovery.window.requestedDays}-day decision window.`;

  const keyPoints: string[] = [recovery.bandReason];
  const weakest = recovery.factors.find((factor) => factor.id === recovery.weakestFactorId);
  if (weakest) {
    keyPoints.push(`Lowest-scoring recorded factor: ${weakest.label} — ${weakest.summary}`);
  }
  const onTrack = countByStatus(countermeasures.items, 'on_track');
  const review = countByStatus(countermeasures.items, 'review');
  const missing = countByStatus(countermeasures.items, 'missing');
  keyPoints.push(
    `Countermeasure adherence: ${onTrack} on track, ${review} need review, ${missing} lack recorded data.`
  );
  const focusItem = countermeasures.items.find((item) => item.id === countermeasures.focusItemId);
  if (focusItem) {
    keyPoints.push(`Suggested planning focus: ${focusItem.label}.`);
  }
  if (healthBrief) {
    keyPoints.push(
      `Mission health brief confidence: ${healthBrief.weekly.confidence.label} for the weekly view and ${healthBrief.daily.confidence.label} for today.`
    );
  }
  keyPoints.push(
    gaps.length > 0
      ? `${gaps.length} recorded data gap${gaps.length === 1 ? '' : 's'} ${
          gaps.length === 1 ? 'is' : 'are'
        } listed below; missing values were not assumed.`
      : 'All six recovery factors were scored from recorded data in this window.'
  );

  const confidenceLine = `${assessment.dataQuality.completenessPercent}% telemetry completeness (${
    assessment.dataQuality.qualityTier
  }); ${recovery.evidenceCoveragePercent}% of recovery factor weight is backed by recorded data and ${
    recovery.dayCoveragePercent
  }% of window days have a check-in.${
    healthBrief ? ` Weekly brief confidence: ${healthBrief.weekly.confidence.label}.` : ''
  }`;

  return {
    headline,
    overview,
    keyPoints: [...new Set(keyPoints)],
    confidenceLine,
    reviewPrompt: reviewPrompt(assessment, recovery.escalation.level),
    escalationLine: escalationLine(assessment, recovery.escalation.reasons),
    source: 'recorded',
  };
}

function buildDataGaps(
  input: ReportDecisionSupportInput,
  recovery: ReturnType<typeof buildRecoveryReadiness>,
  countermeasures: ReturnType<typeof buildCountermeasureCoach>
): ReportDataGap[] {
  const { astronaut, assessment, mission, checkIns, period = '14d' } = input;
  const gaps: ReportDataGap[] = [];
  const seenDetails = new Set<string>();

  const push = (gap: ReportDataGap) => {
    const key = gap.detail.trim().toLowerCase();
    if (seenDetails.has(key)) return;
    seenDetails.add(key);
    gaps.push(gap);
  };

  const requestedDays = requestedReportDays(period, mission.currentDay);
  const window = computeObservationWindow(mission.currentDay, requestedDays);
  if (window.preMissionDays > 0) {
    push({
      id: 'gap-shortened-window',
      kind: 'window',
      label: `${requestedDays}-day report period requested`,
      detail: `Only ${window.coveredDays} mission day${
        window.coveredDays === 1 ? '' : 's'
      } have elapsed. Pre-mission days are not fabricated.`,
      source: 'recorded',
    });
  }

  if (recovery.missingDays.length > 0) {
    push({
      id: 'gap-check-in-coverage',
      kind: 'check_in',
      label: `Check-in coverage ${recovery.window.recordedDays} of ${recovery.window.coveredDays} mission days`,
      detail: `${recovery.missingDays.length} of ${
        recovery.window.coveredDays
      } days have no check-in (${recovery.missingDays
        .map((day) => `Sol ${day}`)
        .join(', ')}). Missing days are not imputed or treated as normal.`,
      source: 'recorded',
    });
  }

  const todayRecorded = checkIns.some(
    (item) => item.astronautId === astronaut.id && item.missionDay === mission.currentDay
  );
  if (!todayRecorded) {
    push({
      id: 'gap-today-check-in',
      kind: 'check_in',
      label: "Today's check-in is not recorded",
      detail: `No check-in is recorded for Sol ${mission.currentDay}. No today value was assumed.`,
      source: 'recorded',
    });
  }

  const vitalsFactor = recovery.factors.find((factor) => factor.id === 'recorded_vitals');
  if (vitalsFactor && vitalsFactor.status !== 'scored') {
    push({
      id: 'gap-vitals-coverage',
      kind: 'vitals',
      label:
        vitalsFactor.status === 'missing'
          ? 'No recorded vitals in the recovery window'
          : 'Partial recorded-vitals coverage',
      detail:
        vitalsFactor.missingReason ??
        'Recorded vitals coverage is incomplete; simulated streams cannot fill the gap.',
      source: 'recorded',
    });
  }

  if (assessment.dataQuality.missingFields.length > 0) {
    push({
      id: 'gap-vital-channels',
      kind: 'vitals',
      label: 'Vital channels missing in the report window',
      detail: `${assessment.dataQuality.missingFields.join(
        ', '
      )} not recorded. No value was assumed and reference ranges are not applied to missing data.`,
      source: 'recorded',
    });
  }

  recovery.factors
    .filter(
      (factor) =>
        factor.id !== 'recorded_vitals' && factor.status !== 'scored' && factor.missingReason
    )
    .forEach((factor) => {
      push({
        id: `gap-factor-${factor.id}`,
        kind: 'factor',
        label: `${factor.label} not fully scored`,
        detail: factor.missingReason as string,
        source: 'recorded',
      });
    });

  countermeasures.items
    .filter((item) => item.status === 'missing' && item.missingDataNote)
    .forEach((item) => {
      push({
        id: `gap-countermeasure-${item.id}`,
        kind: 'countermeasure',
        label: `${item.label}: no recorded data`,
        detail: item.missingDataNote as string,
        source: 'recorded',
      });
    });

  return gaps;
}

function buildReferenceContext(
  healthBrief: MissionHealthBrief | undefined,
  countermeasures: ReturnType<typeof buildCountermeasureCoach>
): ReportReferenceContext[] {
  const byId = new Map<
    string,
    { title: string; organization: string; url: string; usedFor: Set<string> }
  >();

  const add = (
    reference: { id: string; title: string; organization: string; url: string },
    usedFor: string
  ) => {
    const existing = byId.get(reference.id);
    if (existing) {
      existing.usedFor.add(usedFor);
      return;
    }
    byId.set(reference.id, {
      title: reference.title,
      organization: reference.organization,
      url: reference.url,
      usedFor: new Set([usedFor]),
    });
  };

  healthBrief?.researchReferences.forEach((reference) =>
    add(reference, 'Mission health brief background')
  );
  countermeasures.items.forEach((item) =>
    item.researchContext.forEach((reference) => add(reference, item.label))
  );

  return [...byId.entries()].map(([id, reference]) => ({
    id,
    title: reference.title,
    organization: reference.organization,
    url: reference.url,
    usedFor: [...reference.usedFor].join('; '),
    source: 'research',
  }));
}

export function buildReportDecisionSupport(
  input: ReportDecisionSupportInput
): ReportDecisionSupport {
  const recoveryReadiness = buildRecoveryReadiness({
    astronaut: input.astronaut,
    checkIns: input.checkIns,
    vitals: input.vitals,
    missionDay: input.mission.currentDay,
    windowDays: decisionWindowDays(input.period ?? '14d', input.windowDays),
    escalation: {
      required: input.assessment.escalationRequired,
      reasons: input.assessment.escalationReasons,
    },
  });
  const countermeasures = buildCountermeasureCoach({
    astronaut: input.astronaut,
    checkIns: input.checkIns,
    missionDay: input.mission.currentDay,
    windowDays: 7,
  });
  const dataGaps = buildDataGaps(input, recoveryReadiness, countermeasures);
  const referenceContext = buildReferenceContext(input.healthBrief, countermeasures);

  return {
    executiveSummary: buildExecutiveSummary(
      input,
      recoveryReadiness,
      countermeasures,
      dataGaps
    ),
    recoveryReadiness,
    countermeasures,
    dataGaps,
    referenceContext,
  };
}
