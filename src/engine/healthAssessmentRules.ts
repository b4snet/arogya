import type {
  ActionItem,
  Alert,
  Astronaut,
  BodySystemId,
  CheckIn,
  HealthAssessment,
  HealthStatusLevel,
  Mission,
  SystemAssessment,
  VitalReading,
} from '../types';
import { extractMarkdownListItems, extractMarkdownSection, HEALTH_CONTENT } from '../content/healthContent';
import { PERSONAL_BASELINE_STANDARD_DEVIATIONS } from './thresholds';

const STATUS_RANK: Record<HealthStatusLevel, number> = {
  green: 0,
  yellow: 1,
  orange: 2,
  red: 3,
};

const URGENT_SYMPTOM_SYSTEMS: Partial<Record<CheckIn['symptoms'][number], BodySystemId>> = {
  chest_pain: 'cardiovascular',
  severe_shortness_of_breath: 'respiratory',
  fainting: 'brain',
  severe_allergic_reaction: 'respiratory',
  rapidly_worsening: 'cardiovascular',
};

interface BaselineDeviation {
  systemId: BodySystemId;
  metric: string;
  value: number;
  baseline: number;
  standardDeviation: number;
  unit: string;
  outsideGreenRange: boolean;
}

function nextStatus(status: HealthStatusLevel): HealthStatusLevel {
  if (status === 'green') return 'yellow';
  if (status === 'yellow') return 'orange';
  return 'red';
}

function worstStatus(a: HealthStatusLevel, b: HealthStatusLevel): HealthStatusLevel {
  return STATUS_RANK[a] >= STATUS_RANK[b] ? a : b;
}

function getBaselineDeviations(
  astronaut: Astronaut,
  checkIn: CheckIn | undefined,
  vital: VitalReading | undefined
): BaselineDeviation[] {
  const baseline = astronaut.baseline;
  const std = PERSONAL_BASELINE_STANDARD_DEVIATIONS;
  const candidates: BaselineDeviation[] = [];

  const add = (
    systemId: BodySystemId,
    metric: string,
    value: number | null | undefined,
    expected: number,
    standardDeviation: number,
    unit: string,
    outsideGreenRange: (value: number) => boolean
  ) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return;
    if (Math.abs(value - expected) <= standardDeviation * 2 || !outsideGreenRange(value)) return;
    candidates.push({
      systemId,
      metric,
      value,
      baseline: expected,
      standardDeviation,
      unit,
      outsideGreenRange: true,
    });
  };

  add('cardiovascular', 'Resting heart rate', vital?.heartRateBpm, baseline.restingHeartRateBpm, std.heartRateBpm, 'bpm', (value) =>
    value < 50 || value > 90
  );
  add('cardiovascular', 'Systolic blood pressure', vital?.systolicBpMmHg, baseline.systolicBpMmHg, std.systolicBpMmHg, 'mmHg', (value) =>
    value < 95 || value > 130
  );
  add('cardiovascular', 'Diastolic blood pressure', vital?.diastolicBpMmHg, baseline.diastolicBpMmHg, std.diastolicBpMmHg, 'mmHg', (value) =>
    value < 60 || value > 85
  );
  add('respiratory', 'Oxygen saturation', vital?.spo2Percent, baseline.spo2Percent, std.spo2Percent, '%', (value) =>
    value < 95
  );
  add('respiratory', 'Respiratory rate', vital?.respiratoryRateBpm, 16, std.respiratoryRateBpm, '/min', (value) =>
    value < 12 || value > 20
  );
  add('respiratory', 'Body temperature', vital?.bodyTempC, baseline.bodyTempC, std.bodyTempC, '°C', (value) =>
    value < 36.1 || value > 37.5
  );
  add('nutrition', 'Blood glucose', vital?.bloodGlucoseMgDl, baseline.fastingGlucoseMgDl, std.bloodGlucoseMgDl, 'mg/dL', (value) =>
    value < 70 || value > 125
  );
  add('brain', 'Sleep duration', checkIn?.sleepHours, baseline.sleepTargetHours, std.sleepHours, 'h', (value) =>
    value < 6.5 || value > 9
  );
  add('hydration', 'Daily fluid intake', checkIn?.hydrationLiters, baseline.hydrationTargetLiters, std.hydrationLiters, 'L', (value) =>
    value < 2
  );
  add('bone_muscle', 'Exercise minutes', checkIn?.exerciseMinutes, baseline.exerciseTargetMinutes, std.exerciseMinutes, 'min', (value) =>
    value < baseline.exerciseTargetMinutes * 0.8
  );
  add('nutrition', 'Daily energy intake', checkIn?.caloriesKcal, baseline.calorieTargetKcal, std.caloriesKcal, 'kcal', (value) =>
    value < baseline.calorieTargetKcal * 0.82
  );

  return candidates;
}

function addRuleAlert(
  alerts: Alert[],
  deviation: BaselineDeviation,
  severity: HealthStatusLevel,
  missionDay: number
): void {
  alerts.push({
    id: `alt-baseline-${deviation.systemId}-${deviation.metric.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-d${missionDay}`,
    systemId: deviation.systemId,
    organTarget:
      deviation.systemId === 'cardiovascular'
        ? 'heart'
        : deviation.systemId === 'respiratory'
          ? 'lungs'
          : deviation.systemId === 'brain' || deviation.systemId === 'behavioral'
            ? 'brain'
            : 'full_body',
    severity,
    escalationRequired: severity === 'red',
    title: `${deviation.metric} is outside the personal baseline`,
    rationale: `${deviation.value} ${deviation.unit} is more than two configured standard deviations from the ${deviation.baseline} ${deviation.unit} baseline and outside the demonstration green range.`,
    recommendedAction:
      extractMarkdownListItems(
        extractMarkdownSection(HEALTH_CONTENT.safeActions, 'General actions')
      ).find((action) => /contact the crew medical lead/i.test(action)) ??
      'Contact the crew medical lead if the concern persists or worsens.',
  });
}

function hasThreeDayYellowStreak(
  systemId: BodySystemId,
  currentDay: number,
  astronaut: Astronaut,
  checkIns: CheckIn[],
  vitalReadings: VitalReading[],
  mission: Mission,
  evaluateDay: (
    astronaut: Astronaut,
    checkIns: CheckIn[],
    vitalReadings: VitalReading[],
    mission: Mission
  ) => HealthAssessment
): boolean {
  for (let day = currentDay - 2; day <= currentDay; day += 1) {
    if (day < 1) return false;
    const dayCheckIns = checkIns.filter((item) => item.missionDay <= day);
    const dayVitals = vitalReadings.filter((item) => item.missionDay <= day);
    const hasCheckInToday = dayCheckIns.some((item) => item.missionDay === day);
    const hasVitalsToday = dayVitals.some((item) => item.missionDay === day);
    const checkInSystems: BodySystemId[] = [
      'brain',
      'bone_muscle',
      'behavioral',
      'hydration',
    ];
    const vitalSystems: BodySystemId[] = ['cardiovascular', 'respiratory', 'radiation'];
    if (
      (checkInSystems.includes(systemId) && !hasCheckInToday) ||
      (vitalSystems.includes(systemId) && !hasVitalsToday) ||
      (systemId === 'nutrition' && (!hasCheckInToday || !hasVitalsToday))
    ) {
      return false;
    }

    const assessment = evaluateDay(astronaut, dayCheckIns, dayVitals, {
      ...mission,
      currentDay: day,
    });
    if (assessment.systems[systemId].status !== 'yellow') return false;
  }
  return true;
}

function deriveSystemStatus(system: SystemAssessment, alerts: Alert[]): HealthStatusLevel {
  const relatedAlerts = alerts.filter((alert) => alert.systemId === system.systemId);
  const yellowCount = relatedAlerts.filter((alert) => alert.severity === 'yellow').length;
  let status = system.status;

  if (relatedAlerts.some((alert) => alert.severity === 'red')) status = 'red';
  else if (relatedAlerts.some((alert) => alert.severity === 'orange') || yellowCount >= 2) {
    status = worstStatus(status, 'orange');
  } else if (yellowCount === 1) {
    status = worstStatus(status, 'yellow');
  }

  return status;
}

export function applyHealthAssessmentRules(
  assessment: HealthAssessment,
  astronaut: Astronaut,
  checkIns: CheckIn[],
  vitalReadings: VitalReading[],
  mission: Mission,
  evaluateDay: (
    astronaut: Astronaut,
    checkIns: CheckIn[],
    vitalReadings: VitalReading[],
    mission: Mission
  ) => HealthAssessment
): HealthAssessment {
  const latestCheckIn = [...checkIns]
    .filter((item) => item.missionDay === mission.currentDay)
    .sort((a, b) => a.missionDay - b.missionDay)
    .at(-1);
  const latestVital = [...vitalReadings]
    .filter((item) => item.missionDay === mission.currentDay)
    .sort((a, b) => a.missionDay - b.missionDay)
    .at(-1);
  const alerts = [...assessment.alerts];
  const actions = [...assessment.prioritizedActions];
  const escalationReasons = [...assessment.escalationReasons];
  const systems = { ...assessment.systems };
  const deviations = getBaselineDeviations(astronaut, latestCheckIn, latestVital);
  const deviationsBySystem = new Map<BodySystemId, BaselineDeviation[]>();

  for (const deviation of deviations) {
    const items = deviationsBySystem.get(deviation.systemId) ?? [];
    items.push(deviation);
    deviationsBySystem.set(deviation.systemId, items);
  }

  for (const systemId of Object.keys(systems) as BodySystemId[]) {
    const system = { ...systems[systemId] };
    const systemDeviations = deviationsBySystem.get(systemId) ?? [];
    const baseStatus = system.status;

    for (const deviation of systemDeviations) {
        const severity = nextStatus(baseStatus);
        addRuleAlert(alerts, deviation, severity, mission.currentDay);
        if (severity === 'red') {
          const alert = alerts[alerts.length - 1];
          escalationReasons.push(alert.title);
          actions.push({
            id: `act-${alert.id}`,
            priority: 'immediate',
            systemId,
            title: alert.title,
            detail: alert.recommendedAction,
          });
        }
        system.findings = [
          ...system.findings,
        `${deviation.metric} is more than two standard deviations from personal baseline and outside the demonstration green range.`,
      ];
    }

    system.status = deriveSystemStatus(system, alerts);
    if (
      system.status === 'yellow' &&
      hasThreeDayYellowStreak(
        systemId,
        mission.currentDay,
        astronaut,
        checkIns,
        vitalReadings,
        mission,
        evaluateDay
      )
    ) {
      system.status = 'orange';
      alerts.push({
        id: `alt-persistent-yellow-${systemId}-d${mission.currentDay}`,
        systemId,
        organTarget: system.organTarget,
        severity: 'orange',
        escalationRequired: false,
        title: `${system.label} warning persisted for three or more days`,
        rationale: 'A yellow-level rule has remained active across at least three consecutive mission days.',
        recommendedAction: 'Reduce avoidable workload and contact the crew medical lead for review.',
      });
    }

    systems[systemId] = system;
  }

  const systemLevels = Object.values(systems).map((system) => system.status);
  let overallStatus = systemLevels.reduce(worstStatus, 'green' as HealthStatusLevel);
  const escalationRequired = assessment.escalationRequired || escalationReasons.length > 0;
  if (escalationRequired) overallStatus = 'red';

  let overallReadinessScore = assessment.overallReadinessScore;
  if (overallStatus === 'red') overallReadinessScore = Math.min(overallReadinessScore, 40);
  if (overallStatus === 'orange') overallReadinessScore = Math.min(overallReadinessScore, 70);

  const priorityRank: Record<ActionItem['priority'], number> = {
    immediate: 0,
    today: 1,
    monitor: 2,
  };
  actions.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
  const nextBestAction =
    actions[0] == null
      ? assessment.nextBestAction
      : `${actions[0].title} — ${actions[0].detail}`;

  return {
    ...assessment,
    systems,
    alerts,
    prioritizedActions: actions,
    ruleResults: alerts.map((alert) => ({
      id: alert.id,
      systemId: alert.systemId,
      severity: alert.severity,
      triggered: true,
      summary: alert.rationale,
    })),
    overallStatus,
    overallReadinessScore,
    escalationRequired,
    escalationReasons,
    nextBestAction,
  };
}
