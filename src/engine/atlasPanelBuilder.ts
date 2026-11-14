import type {
  ActionItem,
  Astronaut,
  BodySystemId,
  CheckIn,
  HealthAssessment,
  HealthStatusLevel,
  Mission,
  OrganTarget,
  SymptomTag,
  SystemAssessment,
  VitalReading,
} from '../types';
import { ATLAS_HEALTH_CONTENT, ATLAS_REFERENCE_RANGE_NOTE } from '../data/atlasHealthContent';
import { CLINICAL_THRESHOLDS, worstStatus } from './thresholds';
import { celsiusToFahrenheit, mgDlToMmolL } from '../utils/unitConversions';

export type IndicatorTrendDirection = 'rising' | 'falling' | 'stable' | 'insufficient';
export type IndicatorAttentionLevel = 'nominal' | 'watch' | 'caution' | 'missing';

export interface AtlasIndicatorItem {
  id: string;
  label: string;
  latestValue: string;
  unit: string;
  trendDirection: IndicatorTrendDirection;
  trendLabel: string;
  personalBaseline: string;
  generalReferenceRange: string | null;
  isMissing: boolean;
  attentionLevel: IndicatorAttentionLevel;
}

export interface AtlasTrendDatum {
  day: string;
  value: number | null;
  secondary?: number | null;
}

export interface AtlasTrendSeries {
  id: string;
  tabLabel: string;
  title: string;
  unit: string;
  primaryName: string;
  primaryColor: string;
  secondaryName?: string;
  secondaryColor?: string;
  baselineValue?: number;
  baselineLabel?: string;
  data: AtlasTrendDatum[];
}

export interface AtlasSystemOverviewRow {
  systemId: BodySystemId;
  label: string;
  score: number;
  status: HealthStatusLevel;
  targetOrgan: OrganTarget;
}

export interface AtlasQuickLink {
  to: string;
  label: string;
}

export interface AtlasPanelViewModel {
  organ: OrganTarget;
  title: string;
  subtitle: string;
  status: HealthStatusLevel;
  statusPillLabel: string;
  statusActionCopy: string;
  score: number;
  scoreLabel: string;
  plainLanguageSummary: string;
  indicators: AtlasIndicatorItem[];
  referenceDistinctionNote: string;
  trendSeries: AtlasTrendSeries[];
  spaceflightRelevancePoints: string[];
  relatedNasaHazardTitle: string;
  relatedNasaHazardDetail: string;
  recommendedActions: string[];
  escalationGuidance: string;
  explainDetails: {
    formulaNote: string;
    findings: string[];
    missingIndicators: string[];
    completenessPercent: number;
    qualityNote: string;
  };
  systemOverviewList?: AtlasSystemOverviewRow[];
  topPriorities?: ActionItem[];
  completedHealthActions?: string[];
  missedHealthActions?: string[];
  quickLinks: AtlasQuickLink[];
}

export const STATUS_GUIDANCE_COPY: Record<HealthStatusLevel, string> = {
  green: 'Maintain current routine.',
  yellow: 'Monitor this trend and take preventive action.',
  orange: 'Notify the crew medical lead and monitor closely.',
  red: 'Follow the urgent escalation workflow and seek medical support.',
};

export const STATUS_PILL_LABELS: Record<HealthStatusLevel, string> = {
  green: 'Green · Nominal',
  yellow: 'Yellow · Monitor',
  orange: 'Orange · Caution',
  red: 'Red · Urgent Escalation',
};

const SYMPTOM_LABELS: Record<SymptomTag, string> = {
  none: 'None',
  chest_pain: 'Chest discomfort / pain',
  shortness_of_breath: 'Shortness of breath',
  severe_shortness_of_breath: 'Severe shortness of breath',
  fainting: 'Fainting / syncope',
  severe_allergic_reaction: 'Severe allergic reaction',
  rapidly_worsening: 'Rapidly worsening symptoms',
  fever_chills: 'Feverish feeling / chills',
  headache: 'Headache',
  visual_blur: 'Vision changes',
  nasal_congestion: 'Nasal congestion',
  dizziness: 'Dizziness',
  muscle_soreness: 'Muscle or joint soreness',
  sleep_fragmentation: 'Sleep fragmentation',
  nausea: 'Nausea',
  back_pain: 'Back pain',
  skin_irritation: 'Skin irritation',
  poor_concentration: 'Poor concentration',
  anxiety: 'Anxiety',
  low_mood: 'Low mood',
};

function isPresent(val: number | null | undefined): val is number {
  return typeof val === 'number' && !Number.isNaN(val);
}

function formatSymptomsList(symptoms: SymptomTag[] | undefined, filterTags?: SymptomTag[]): string {
  if (!symptoms || symptoms.length === 0) return 'None reported';
  const cleaned = symptoms.filter((s) => s !== 'none');
  const matched = filterTags ? cleaned.filter((s) => filterTags.includes(s)) : cleaned;
  if (matched.length === 0) return 'None reported';
  return matched.map((s) => SYMPTOM_LABELS[s] ?? s.replace(/_/g, ' ')).join(', ');
}

function computeSeriesTrend(
  values: Array<number | null | undefined>,
  tolerance: number,
  decimals: number,
  unit: string
): { direction: IndicatorTrendDirection; label: string } {
  const valid = values.filter((v): v is number => isPresent(v));
  if (valid.length < 2) {
    return { direction: 'insufficient', label: 'Insufficient data' };
  }
  const latest = valid[valid.length - 1];
  const prior = valid.slice(0, -1);
  const priorAvg = prior.reduce((sum, n) => sum + n, 0) / prior.length;
  const delta = latest - priorAvg;
  if (Math.abs(delta) <= tolerance) {
    return {
      direction: 'stable',
      label: `Stable (${delta >= 0 ? '+' : ''}${delta.toFixed(decimals)} ${unit})`.trim(),
    };
  }
  if (delta > 0) {
    return {
      direction: 'rising',
      label: `Rising (+${delta.toFixed(decimals)} ${unit})`.trim(),
    };
  }
  return {
    direction: 'falling',
    label: `Falling (${delta.toFixed(decimals)} ${unit})`.trim(),
  };
}

function getMindSystemStatus(assessment: HealthAssessment): HealthStatusLevel {
  return worstStatus(assessment.systems.brain.status, assessment.systems.behavioral.status);
}

function buildMindPanel(params: {
  astronaut: Astronaut;
  assessment: HealthAssessment;
  checkIns7d: CheckIn[];
}): AtlasPanelViewModel {
  const { astronaut, assessment, checkIns7d } = params;
  const content = ATLAS_HEALTH_CONTENT.brain;
  const brainSys = assessment.systems.brain;
  const behSys = assessment.systems.behavioral;
  const status = getMindSystemStatus(assessment);
  const combinedScore = Math.round((brainSys.score + behSys.score) / 2);
  const latestCheckIn = checkIns7d[checkIns7d.length - 1];

  const sleepTrend = computeSeriesTrend(checkIns7d.map((c) => c.sleepHours), 0.4, 1, 'h');
  const qualityTrend = computeSeriesTrend(checkIns7d.map((c) => c.sleepQuality), 0.4, 1, '/5');
  const moodTrend = computeSeriesTrend(checkIns7d.map((c) => c.moodScore), 0.4, 1, '/5');
  const stressTrend = computeSeriesTrend(checkIns7d.map((c) => c.stressLevel), 0.4, 1, '/5');
  const fatigueTrend = computeSeriesTrend(checkIns7d.map((c) => c.fatigueLevel), 0.4, 1, '/5');
  const focusTrend = computeSeriesTrend(checkIns7d.map((c) => c.cognitiveFocus), 0.4, 1, '/5');

  const sleepDeficit = latestCheckIn
    ? astronaut.baseline.sleepTargetHours - latestCheckIn.sleepHours
    : 0;

  const mindSymptomTags: SymptomTag[] = [
    'headache',
    'poor_concentration',
    'anxiety',
    'low_mood',
    'sleep_fragmentation',
    'visual_blur',
  ];
  const mindSymptomsText = latestCheckIn
    ? formatSymptomsList(latestCheckIn.symptoms, mindSymptomTags)
    : 'MISSING';
  const hasMindSymptoms =
    Boolean(latestCheckIn) &&
    latestCheckIn.symptoms.some((s) => mindSymptomTags.includes(s));

  const indicators: AtlasIndicatorItem[] = [
    {
      id: 'sleep-hours',
      label: 'Sleep hours',
      latestValue: latestCheckIn ? latestCheckIn.sleepHours.toFixed(1) : 'MISSING',
      unit: 'h',
      trendDirection: sleepTrend.direction,
      trendLabel: sleepTrend.label,
      personalBaseline: `${astronaut.baseline.sleepTargetHours.toFixed(1)} h target`,
      generalReferenceRange: '7.0–8.5 h (adult nightly)',
      isMissing: !latestCheckIn,
      attentionLevel: !latestCheckIn
        ? 'missing'
        : sleepDeficit >= CLINICAL_THRESHOLDS.sleepDeficitOrangeHours
        ? 'caution'
        : sleepDeficit >= CLINICAL_THRESHOLDS.sleepDeficitYellowHours
        ? 'watch'
        : 'nominal',
    },
    {
      id: 'sleep-quality',
      label: 'Sleep quality',
      latestValue: latestCheckIn ? String(latestCheckIn.sleepQuality) : 'MISSING',
      unit: '/ 5',
      trendDirection: qualityTrend.direction,
      trendLabel: qualityTrend.label,
      personalBaseline: '>= 3 / 5 restorative rest baseline',
      generalReferenceRange: '3–5 / 5 (self-reported scale)',
      isMissing: !latestCheckIn,
      attentionLevel: !latestCheckIn
        ? 'missing'
        : latestCheckIn.sleepQuality <= 2
        ? 'watch'
        : 'nominal',
    },
    {
      id: 'mood',
      label: 'Mood',
      latestValue: latestCheckIn ? String(latestCheckIn.moodScore) : 'MISSING',
      unit: '/ 5',
      trendDirection: moodTrend.direction,
      trendLabel: moodTrend.label,
      personalBaseline: '>= 3 / 5 expected crew baseline',
      generalReferenceRange: '3–5 / 5 (higher is steadier)',
      isMissing: !latestCheckIn,
      attentionLevel: !latestCheckIn
        ? 'missing'
        : latestCheckIn.moodScore <= 2
        ? 'watch'
        : 'nominal',
    },
    {
      id: 'stress',
      label: 'Stress',
      latestValue: latestCheckIn ? String(latestCheckIn.stressLevel) : 'MISSING',
      unit: '/ 5',
      trendDirection: stressTrend.direction,
      trendLabel: stressTrend.label,
      personalBaseline: '<= 3 / 5 expected crew baseline',
      generalReferenceRange: '1–3 / 5 (lower is calmer)',
      isMissing: !latestCheckIn,
      attentionLevel: !latestCheckIn
        ? 'missing'
        : latestCheckIn.stressLevel >= 4
        ? 'watch'
        : 'nominal',
    },
    {
      id: 'fatigue',
      label: 'Fatigue',
      latestValue: latestCheckIn ? String(latestCheckIn.fatigueLevel) : 'MISSING',
      unit: '/ 5',
      trendDirection: fatigueTrend.direction,
      trendLabel: fatigueTrend.label,
      personalBaseline: '<= 3 / 5 rested shift baseline',
      generalReferenceRange: '1–3 / 5 (lower indicates less fatigue)',
      isMissing: !latestCheckIn,
      attentionLevel: !latestCheckIn
        ? 'missing'
        : latestCheckIn.fatigueLevel >= 4
        ? 'watch'
        : 'nominal',
    },
    {
      id: 'concentration',
      label: 'Concentration self-report',
      latestValue: latestCheckIn ? String(latestCheckIn.cognitiveFocus) : 'MISSING',
      unit: '/ 5',
      trendDirection: focusTrend.direction,
      trendLabel: focusTrend.label,
      personalBaseline: '>= 3 / 5 operational readiness',
      generalReferenceRange: null,
      isMissing: !latestCheckIn,
      attentionLevel: !latestCheckIn
        ? 'missing'
        : latestCheckIn.cognitiveFocus <= 2
        ? 'watch'
        : 'nominal',
    },
    {
      id: 'mind-symptoms',
      label: 'Symptoms (headache, concentration, anxiety, low mood)',
      latestValue: mindSymptomsText,
      unit: '',
      trendDirection: 'stable',
      trendLabel: hasMindSymptoms ? 'Active symptom logged' : 'No active neuro/mood symptoms',
      personalBaseline: 'No persistent neurological or mood symptoms',
      generalReferenceRange: null,
      isMissing: !latestCheckIn,
      attentionLevel: !latestCheckIn
        ? 'missing'
        : latestCheckIn.symptoms.includes('headache') &&
          latestCheckIn.symptoms.includes('visual_blur')
        ? 'caution'
        : hasMindSymptoms
        ? 'watch'
        : 'nominal',
    },
  ];

  const allFindings = [...brainSys.findings, ...behSys.findings];
  const allMissing = [...brainSys.missingIndicators, ...behSys.missingIndicators];

  const plainLanguageSummary =
    allFindings.length > 0
      ? `${allFindings.join(' ')} These indicators may warrant attention and continued monitoring relative to your personal baseline.`
      : allMissing.length > 0
      ? `Some check-in telemetry (${allMissing.join(', ')}) is missing today and is flagged rather than assumed normal.`
      : 'Sleep hours, sleep quality, mood, stress, fatigue, and concentration self-reports currently align with your personal crew baseline.';

  const dynamicActions = assessment.prioritizedActions
    .filter((a) => a.systemId === 'brain' || a.systemId === 'behavioral')
    .map((a) => `${a.title}: ${a.detail}`);

  const recommendedActions = Array.from(
    new Set([...dynamicActions, ...content.recommendedActions])
  );

  const trendSeries: AtlasTrendSeries[] = [
    {
      id: 'sleep',
      tabLabel: 'Sleep (h)',
      title: '7-Day Sleep Duration vs Personal Target',
      unit: 'h',
      primaryName: 'Sleep',
      primaryColor: '#38BDF8',
      baselineValue: astronaut.baseline.sleepTargetHours,
      baselineLabel: `Target ${astronaut.baseline.sleepTargetHours.toFixed(1)}h`,
      data: checkIns7d.map((c) => ({
        day: `D${c.missionDay}`,
        value: c.sleepHours,
      })),
    },
    {
      id: 'mood-stress',
      tabLabel: 'Mood & Stress',
      title: '7-Day Mood & Stress Scores (/ 5)',
      unit: '/5',
      primaryName: 'Mood',
      primaryColor: '#22C55E',
      secondaryName: 'Stress',
      secondaryColor: '#F97316',
      data: checkIns7d.map((c) => ({
        day: `D${c.missionDay}`,
        value: c.moodScore,
        secondary: c.stressLevel,
      })),
    },
    {
      id: 'fatigue-focus',
      tabLabel: 'Fatigue & Focus',
      title: '7-Day Fatigue & Concentration (/ 5)',
      unit: '/5',
      primaryName: 'Concentration',
      primaryColor: '#22D3EE',
      secondaryName: 'Fatigue',
      secondaryColor: '#EAB308',
      data: checkIns7d.map((c) => ({
        day: `D${c.missionDay}`,
        value: c.cognitiveFocus,
        secondary: c.fatigueLevel,
      })),
    },
  ];

  return {
    organ: 'brain',
    title: content.title,
    subtitle: content.subtitle,
    status,
    statusPillLabel: STATUS_PILL_LABELS[status],
    statusActionCopy: STATUS_GUIDANCE_COPY[status],
    score: combinedScore,
    scoreLabel: 'Combined Neuro & Behavioral Score',
    plainLanguageSummary,
    indicators,
    referenceDistinctionNote: ATLAS_REFERENCE_RANGE_NOTE,
    trendSeries,
    spaceflightRelevancePoints: content.spaceflightRelevance,
    relatedNasaHazardTitle: content.nasaHazardTitle,
    relatedNasaHazardDetail: content.nasaHazardSummary,
    recommendedActions,
    escalationGuidance: content.escalationGuidance,
    explainDetails: {
      formulaNote:
        'Combined from the existing Brain/Neuro-Ocular and Behavioral Health assessments in Arogya’s rule-based engine. Status reflects the highest caution level across sleep debt, neuro-ocular symptoms, mood, and stress.',
      findings: allFindings,
      missingIndicators: allMissing,
      completenessPercent: assessment.dataQuality.completenessPercent,
      qualityNote: assessment.dataQuality.note,
    },
    quickLinks: [
      { to: '/check-in', label: 'Daily Check-In' },
      { to: '/reports', label: 'Health Reports' },
    ],
  };
}

function buildHeartPanel(params: {
  astronaut: Astronaut;
  assessment: HealthAssessment;
  vitals7d: VitalReading[];
  checkIns7d: CheckIn[];
}): AtlasPanelViewModel {
  const { astronaut, assessment, vitals7d, checkIns7d } = params;
  const content = ATLAS_HEALTH_CONTENT.heart;
  const sys = assessment.systems.cardiovascular;
  const latestVital = vitals7d[vitals7d.length - 1];
  const latestCheckIn = checkIns7d[checkIns7d.length - 1];

  const hrTrend = computeSeriesTrend(vitals7d.map((v) => v.heartRateBpm), 3, 0, 'bpm');
  const sysTrend = computeSeriesTrend(vitals7d.map((v) => v.systolicBpMmHg), 4, 0, 'mmHg');
  const diaTrend = computeSeriesTrend(vitals7d.map((v) => v.diastolicBpMmHg), 3, 0, 'mmHg');
  const exTrend = computeSeriesTrend(checkIns7d.map((c) => c.exerciseMinutes), 8, 0, 'min');
  const hydroTrend = computeSeriesTrend(checkIns7d.map((c) => c.hydrationLiters), 0.25, 1, 'L');

  const hrVal = latestVital?.heartRateBpm ?? null;
  const sysVal = latestVital?.systolicBpMmHg ?? null;
  const diaVal = latestVital?.diastolicBpMmHg ?? null;

  const cardioSymptomTags: SymptomTag[] = [
    'chest_pain',
    'dizziness',
    'fainting',
    'shortness_of_breath',
    'severe_shortness_of_breath',
  ];
  const cardioSymptomsText = latestCheckIn
    ? formatSymptomsList(latestCheckIn.symptoms, cardioSymptomTags)
    : 'MISSING';
  const hasCardioSymptom =
    Boolean(latestCheckIn) &&
    latestCheckIn.symptoms.some((s) => cardioSymptomTags.includes(s));

  const indicators: AtlasIndicatorItem[] = [
    {
      id: 'resting-hr',
      label: 'Resting heart rate',
      latestValue: isPresent(hrVal) ? String(hrVal) : 'MISSING',
      unit: 'bpm',
      trendDirection: hrTrend.direction,
      trendLabel: hrTrend.label,
      personalBaseline: `${astronaut.baseline.restingHeartRateBpm} bpm personal resting`,
      generalReferenceRange: `${CLINICAL_THRESHOLDS.generalRestingHrMin}–${CLINICAL_THRESHOLDS.generalRestingHrMax} bpm (adult resting)`,
      isMissing: !isPresent(hrVal),
      attentionLevel: !isPresent(hrVal)
        ? 'missing'
        : hrVal - astronaut.baseline.restingHeartRateBpm >= CLINICAL_THRESHOLDS.hrDeltaOrangeBpm ||
          hrVal > CLINICAL_THRESHOLDS.generalRestingHrMax
        ? 'caution'
        : hrVal - astronaut.baseline.restingHeartRateBpm >= CLINICAL_THRESHOLDS.hrDeltaYellowBpm
        ? 'watch'
        : 'nominal',
    },
    {
      id: 'systolic-bp',
      label: 'Systolic blood pressure',
      latestValue: isPresent(sysVal) ? String(sysVal) : 'MISSING',
      unit: 'mmHg',
      trendDirection: sysTrend.direction,
      trendLabel: sysTrend.label,
      personalBaseline: `${astronaut.baseline.systolicBpMmHg} mmHg personal baseline`,
      generalReferenceRange: `${CLINICAL_THRESHOLDS.generalSystolicMin}–${CLINICAL_THRESHOLDS.generalSystolicMax} mmHg (seated adult)`,
      isMissing: !isPresent(sysVal),
      attentionLevel: !isPresent(sysVal)
        ? 'missing'
        : sysVal >= 140 || sysVal - astronaut.baseline.systolicBpMmHg >= 20
        ? 'caution'
        : sysVal > CLINICAL_THRESHOLDS.generalSystolicMax ||
          sysVal < CLINICAL_THRESHOLDS.generalSystolicMin
        ? 'watch'
        : 'nominal',
    },
    {
      id: 'diastolic-bp',
      label: 'Diastolic blood pressure',
      latestValue: isPresent(diaVal) ? String(diaVal) : 'MISSING',
      unit: 'mmHg',
      trendDirection: diaTrend.direction,
      trendLabel: diaTrend.label,
      personalBaseline: `${astronaut.baseline.diastolicBpMmHg} mmHg personal baseline`,
      generalReferenceRange: `${CLINICAL_THRESHOLDS.generalDiastolicMin}–${CLINICAL_THRESHOLDS.generalDiastolicMax} mmHg (seated adult)`,
      isMissing: !isPresent(diaVal),
      attentionLevel: !isPresent(diaVal)
        ? 'missing'
        : diaVal >= 90
        ? 'caution'
        : diaVal > CLINICAL_THRESHOLDS.generalDiastolicMax ||
          diaVal < CLINICAL_THRESHOLDS.generalDiastolicMin
        ? 'watch'
        : 'nominal',
    },
    {
      id: 'exercise-minutes',
      label: 'Exercise minutes',
      latestValue: latestCheckIn ? String(latestCheckIn.exerciseMinutes) : 'MISSING',
      unit: 'min',
      trendDirection: exTrend.direction,
      trendLabel: exTrend.label,
      personalBaseline: `${astronaut.baseline.exerciseTargetMinutes} min/day target`,
      generalReferenceRange: '45–90 min/day crew countermeasure',
      isMissing: !latestCheckIn,
      attentionLevel: !latestCheckIn
        ? 'missing'
        : latestCheckIn.exerciseMinutes < astronaut.baseline.exerciseTargetMinutes * 0.7
        ? 'watch'
        : 'nominal',
    },
    {
      id: 'hydration-cardio',
      label: 'Hydration',
      latestValue: latestCheckIn ? latestCheckIn.hydrationLiters.toFixed(1) : 'MISSING',
      unit: 'L',
      trendDirection: hydroTrend.direction,
      trendLabel: hydroTrend.label,
      personalBaseline: `${astronaut.baseline.hydrationTargetLiters.toFixed(1)} L/day target`,
      generalReferenceRange: '2.0–3.0 L/day (adult crew range)',
      isMissing: !latestCheckIn,
      attentionLevel: !latestCheckIn
        ? 'missing'
        : latestCheckIn.hydrationLiters < astronaut.baseline.hydrationTargetLiters * 0.8
        ? 'watch'
        : 'nominal',
    },
    {
      id: 'cardio-symptoms',
      label: 'Symptoms (chest discomfort, dizziness, shortness of breath)',
      latestValue: cardioSymptomsText,
      unit: '',
      trendDirection: 'stable',
      trendLabel: hasCardioSymptom ? 'Symptom flagged' : 'No cardiovascular symptoms logged',
      personalBaseline: 'No chest discomfort, dizziness, or dyspnea',
      generalReferenceRange: null,
      isMissing: !latestCheckIn,
      attentionLevel: !latestCheckIn
        ? 'missing'
        : latestCheckIn.symptoms.includes('chest_pain') ||
          latestCheckIn.symptoms.includes('severe_shortness_of_breath') ||
          latestCheckIn.symptoms.includes('fainting')
        ? 'caution'
        : hasCardioSymptom
        ? 'watch'
        : 'nominal',
    },
  ];

  const plainLanguageSummary =
    sys.findings.length > 0
      ? `${sys.findings.join(' ')} Consider monitoring resting readings after calm hydration and contacting the crew medical lead if patterns persist.`
      : sys.missingIndicators.length > 0
      ? `Latest cardiovascular telemetry has missing fields (${sys.missingIndicators.join(', ')}). Missing values are flagged rather than assumed normal.`
      : sys.plainLanguageSummary;

  const dynamicActions = assessment.prioritizedActions
    .filter((a) => a.systemId === 'cardiovascular')
    .map((a) => `${a.title}: ${a.detail}`);

  const trendSeries: AtlasTrendSeries[] = [
    {
      id: 'hr',
      tabLabel: 'Heart Rate',
      title: '7-Day Resting Heart Rate (bpm)',
      unit: 'bpm',
      primaryName: 'Resting HR',
      primaryColor: '#EF4444',
      baselineValue: astronaut.baseline.restingHeartRateBpm,
      baselineLabel: `Baseline ${astronaut.baseline.restingHeartRateBpm}`,
      data: vitals7d.map((v) => ({
        day: `D${v.missionDay}`,
        value: v.heartRateBpm,
      })),
    },
    {
      id: 'bp',
      tabLabel: 'Blood Pressure',
      title: '7-Day Systolic & Diastolic BP (mmHg)',
      unit: 'mmHg',
      primaryName: 'Systolic',
      primaryColor: '#F97316',
      secondaryName: 'Diastolic',
      secondaryColor: '#38BDF8',
      baselineValue: astronaut.baseline.systolicBpMmHg,
      baselineLabel: `Sys Base ${astronaut.baseline.systolicBpMmHg}`,
      data: vitals7d.map((v) => ({
        day: `D${v.missionDay}`,
        value: v.systolicBpMmHg,
        secondary: v.diastolicBpMmHg,
      })),
    },
    {
      id: 'hrv',
      tabLabel: 'HRV',
      title: '7-Day Heart Rate Variability (ms)',
      unit: 'ms',
      primaryName: 'HRV',
      primaryColor: '#22D3EE',
      data: vitals7d.map((v) => ({
        day: `D${v.missionDay}`,
        value: v.hrvMs,
      })),
    },
  ];

  return {
    organ: 'heart',
    title: content.title,
    subtitle: content.subtitle,
    status: sys.status,
    statusPillLabel: STATUS_PILL_LABELS[sys.status],
    statusActionCopy: STATUS_GUIDANCE_COPY[sys.status],
    score: sys.score,
    scoreLabel: 'Cardiovascular Readiness Score',
    plainLanguageSummary,
    indicators,
    referenceDistinctionNote: ATLAS_REFERENCE_RANGE_NOTE,
    trendSeries,
    spaceflightRelevancePoints: content.spaceflightRelevance,
    relatedNasaHazardTitle: content.nasaHazardTitle,
    relatedNasaHazardDetail: content.nasaHazardSummary,
    recommendedActions: Array.from(new Set([...dynamicActions, ...content.recommendedActions])),
    escalationGuidance: content.escalationGuidance,
    explainDetails: {
      formulaNote:
        'Evaluated by Arogya’s cardiovascular rules comparing resting heart rate and blood pressure against personal pre-flight baselines and general adult reference ranges, plus mandatory escalation rules for chest discomfort or consecutive abnormal days.',
      findings: sys.findings,
      missingIndicators: sys.missingIndicators,
      completenessPercent: assessment.dataQuality.completenessPercent,
      qualityNote: assessment.dataQuality.note,
    },
    quickLinks: [
      { to: '/vitals', label: 'Vitals & Baselines' },
      { to: '/reports', label: 'Health Reports' },
    ],
  };
}

function buildLungsPanel(params: {
  astronaut: Astronaut;
  assessment: HealthAssessment;
  mission: Mission;
  vitals7d: VitalReading[];
  checkIns7d: CheckIn[];
  units: 'metric' | 'imperial';
}): AtlasPanelViewModel {
  const { astronaut, assessment, mission, vitals7d, checkIns7d, units } = params;
  const content = ATLAS_HEALTH_CONTENT.lungs;
  const sys = assessment.systems.respiratory;
  const latestVital = vitals7d[vitals7d.length - 1];
  const latestCheckIn = checkIns7d[checkIns7d.length - 1];
  const isImperial = units === 'imperial';

  const spo2Trend = computeSeriesTrend(vitals7d.map((v) => v.spo2Percent), 1, 0, '%');
  const rrTrend = computeSeriesTrend(vitals7d.map((v) => v.respiratoryRateBpm), 2, 0, '/min');
  const tempTrend = computeSeriesTrend(
    vitals7d.map((v) =>
      isPresent(v.bodyTempC)
        ? isImperial
          ? celsiusToFahrenheit(v.bodyTempC)
          : v.bodyTempC
        : null
    ),
    isImperial ? 0.5 : 0.3,
    1,
    isImperial ? '°F' : '°C'
  );

  const spo2Val = latestVital?.spo2Percent ?? null;
  const tempUnit = isImperial ? '°F' : '°C';
  const tempBaselineNum = isImperial
    ? Number(celsiusToFahrenheit(astronaut.baseline.bodyTempC).toFixed(1))
    : Number(astronaut.baseline.bodyTempC.toFixed(1));
  const co2 = mission.environment.cabinCo2MmHg;

  const hasSob = Boolean(
    latestCheckIn?.symptoms.includes('shortness_of_breath') ||
      latestCheckIn?.symptoms.includes('severe_shortness_of_breath')
  );
  const sobLabel = latestCheckIn
    ? latestCheckIn.symptoms.includes('severe_shortness_of_breath')
      ? 'Severe shortness of breath'
      : latestCheckIn.symptoms.includes('shortness_of_breath')
      ? 'Mild/moderate shortness of breath'
      : 'None reported'
    : 'MISSING';

  const hasCoughNote = Boolean(
    latestCheckIn?.crewNotes && /cough/i.test(latestCheckIn.crewNotes)
  );
  const coughLabel = !latestCheckIn
    ? 'MISSING'
    : hasCoughNote
    ? 'Mentioned in crew note'
    : 'None reported';

  const hasChestDiscomfort = Boolean(latestCheckIn?.symptoms.includes('chest_pain'));
  const chestLabel = !latestCheckIn
    ? 'MISSING'
    : hasChestDiscomfort
    ? 'Chest discomfort reported'
    : 'None reported';

  const activityToleranceLabel = !latestCheckIn
    ? 'MISSING'
    : hasSob || latestCheckIn.fatigueLevel >= 4
    ? 'Reduced tolerance'
    : latestCheckIn.exerciseMinutes >= astronaut.baseline.exerciseTargetMinutes * 0.8
    ? 'Nominal tolerance'
    : 'Light activity day';

  const hasEnvSymptoms = Boolean(
    latestCheckIn?.symptoms.some((s) =>
      ['nasal_congestion', 'headache', 'skin_irritation'].includes(s)
    )
  );
  const envLabel = !latestCheckIn
    ? `Cabin pCO₂ ${co2.toFixed(1)} mmHg`
    : hasEnvSymptoms
    ? `${formatSymptomsList(latestCheckIn.symptoms, ['nasal_congestion', 'headache', 'skin_irritation'])} · pCO₂ ${co2.toFixed(1)} mmHg`
    : `Clear · Cabin pCO₂ ${co2.toFixed(1)} mmHg`;

  const indicators: AtlasIndicatorItem[] = [
    {
      id: 'resp-sob',
      label: 'Shortness of breath',
      latestValue: sobLabel,
      unit: '',
      trendDirection: 'stable',
      trendLabel: hasSob ? 'Breathing symptom flagged' : 'No dyspnea reported',
      personalBaseline: 'Comfortable breathing at rest & scheduled exercise',
      generalReferenceRange: null,
      isMissing: !latestCheckIn,
      attentionLevel: !latestCheckIn
        ? 'missing'
        : latestCheckIn.symptoms.includes('severe_shortness_of_breath')
        ? 'caution'
        : hasSob
        ? 'watch'
        : 'nominal',
    },
    {
      id: 'resp-cough',
      label: 'Cough',
      latestValue: coughLabel,
      unit: '',
      trendDirection: 'stable',
      trendLabel: hasCoughNote ? 'Logged in crew notes' : 'Clear airway report',
      personalBaseline: 'No persistent cough',
      generalReferenceRange: null,
      isMissing: !latestCheckIn,
      attentionLevel: !latestCheckIn ? 'missing' : hasCoughNote ? 'watch' : 'nominal',
    },
    {
      id: 'resp-chest',
      label: 'Chest discomfort',
      latestValue: chestLabel,
      unit: '',
      trendDirection: 'stable',
      trendLabel: hasChestDiscomfort ? 'Urgent safety escalation' : 'No chest discomfort',
      personalBaseline: 'No chest discomfort',
      generalReferenceRange: null,
      isMissing: !latestCheckIn,
      attentionLevel: !latestCheckIn ? 'missing' : hasChestDiscomfort ? 'caution' : 'nominal',
    },
    {
      id: 'spo2',
      label: 'Oxygen saturation, if available (SpO₂)',
      latestValue: isPresent(spo2Val) ? String(spo2Val) : 'MISSING',
      unit: '%',
      trendDirection: spo2Trend.direction,
      trendLabel: spo2Trend.label,
      personalBaseline: `${astronaut.baseline.spo2Percent}% personal baseline`,
      generalReferenceRange: '95–100% (sea-level adult)',
      isMissing: !isPresent(spo2Val),
      attentionLevel: !isPresent(spo2Val)
        ? 'missing'
        : spo2Val < CLINICAL_THRESHOLDS.spo2CriticalPercent
        ? 'caution'
        : spo2Val < CLINICAL_THRESHOLDS.generalSpo2Min
        ? 'watch'
        : 'nominal',
    },
    {
      id: 'activity-tolerance',
      label: 'Activity tolerance',
      latestValue: activityToleranceLabel,
      unit: latestCheckIn ? `(${latestCheckIn.exerciseMinutes} min)` : '',
      trendDirection: rrTrend.direction,
      trendLabel: `Resp rate ${rrTrend.label}`,
      personalBaseline: `${astronaut.baseline.exerciseTargetMinutes} min aerobic target`,
      generalReferenceRange: `${CLINICAL_THRESHOLDS.generalRespRateMin}–${CLINICAL_THRESHOLDS.generalRespRateMax} /min resting resp rate`,
      isMissing: !latestCheckIn,
      attentionLevel: !latestCheckIn
        ? 'missing'
        : hasSob || latestCheckIn.fatigueLevel >= 4
        ? 'watch'
        : 'nominal',
    },
    {
      id: 'env-symptoms',
      label: 'Environmental symptoms & cabin air',
      latestValue: envLabel,
      unit: '',
      trendDirection: tempTrend.direction,
      trendLabel: `Temp ${tempTrend.label}`,
      personalBaseline: 'Cabin pCO₂ < 3.0 mmHg · O₂ 20.5–21.5%',
      generalReferenceRange: '< 3.0 mmHg spacecraft pCO₂ watch ceiling',
      isMissing: false,
      attentionLevel:
        co2 >= CLINICAL_THRESHOLDS.cabinCo2ElevatedMmHg
          ? 'caution'
          : co2 >= CLINICAL_THRESHOLDS.cabinCo2WatchMmHg || hasEnvSymptoms
          ? 'watch'
          : 'nominal',
    },
  ];

  const plainLanguageSummary =
    sys.findings.length > 0
      ? `${sys.findings.join(' ')} Consider monitoring breathing comfort, activity tolerance, and cabin airflow, and contact the crew medical lead if symptoms persist.`
      : sys.missingIndicators.length > 0
      ? `Some respiratory indicators (${sys.missingIndicators.join(', ')}) are missing for the latest cycle and are flagged rather than assumed normal.`
      : sys.plainLanguageSummary;

  const dynamicActions = assessment.prioritizedActions
    .filter((a) => a.systemId === 'respiratory')
    .map((a) => `${a.title}: ${a.detail}`);

  const trendSeries: AtlasTrendSeries[] = [
    {
      id: 'spo2',
      tabLabel: 'SpO₂ (%)',
      title: '7-Day Oxygen Saturation (SpO₂ %)',
      unit: '%',
      primaryName: 'SpO₂',
      primaryColor: '#22D3EE',
      baselineValue: astronaut.baseline.spo2Percent,
      baselineLabel: `Base ${astronaut.baseline.spo2Percent}%`,
      data: vitals7d.map((v) => ({
        day: `D${v.missionDay}`,
        value: v.spo2Percent,
      })),
    },
    {
      id: 'resp-rate',
      tabLabel: 'Resp Rate',
      title: '7-Day Respiratory Rate (/min)',
      unit: '/min',
      primaryName: 'Breaths/min',
      primaryColor: '#38BDF8',
      data: vitals7d.map((v) => ({
        day: `D${v.missionDay}`,
        value: v.respiratoryRateBpm,
      })),
    },
    {
      id: 'temp',
      tabLabel: `Temp (${tempUnit})`,
      title: `7-Day Body Temperature (${tempUnit})`,
      unit: tempUnit,
      primaryName: 'Temperature',
      primaryColor: '#EAB308',
      baselineValue: tempBaselineNum,
      baselineLabel: `Base ${tempBaselineNum}${tempUnit}`,
      data: vitals7d.map((v) => ({
        day: `D${v.missionDay}`,
        value: isPresent(v.bodyTempC)
          ? Number(
              (isImperial ? celsiusToFahrenheit(v.bodyTempC) : v.bodyTempC).toFixed(1)
            )
          : null,
      })),
    },
  ];

  return {
    organ: 'lungs',
    title: content.title,
    subtitle: content.subtitle,
    status: sys.status,
    statusPillLabel: STATUS_PILL_LABELS[sys.status],
    statusActionCopy: STATUS_GUIDANCE_COPY[sys.status],
    score: sys.score,
    scoreLabel: 'Respiratory Readiness Score',
    plainLanguageSummary,
    indicators,
    referenceDistinctionNote: ATLAS_REFERENCE_RANGE_NOTE,
    trendSeries,
    spaceflightRelevancePoints: content.spaceflightRelevance,
    relatedNasaHazardTitle: content.nasaHazardTitle,
    relatedNasaHazardDetail: content.nasaHazardSummary,
    recommendedActions: Array.from(new Set([...dynamicActions, ...content.recommendedActions])),
    escalationGuidance: content.escalationGuidance,
    explainDetails: {
      formulaNote:
        'Evaluated from pulse oximetry (SpO₂), respiratory rate, body temperature, cabin pCO₂, and reported breathing symptoms with mandatory escalation safeguards.',
      findings: sys.findings,
      missingIndicators: sys.missingIndicators,
      completenessPercent: assessment.dataQuality.completenessPercent,
      qualityNote: assessment.dataQuality.note,
    },
    quickLinks: [
      { to: '/vitals', label: 'Vitals & Cabin Air' },
      { to: '/reports', label: 'Health Reports' },
    ],
  };
}

function buildFullBodyPanel(params: {
  astronaut: Astronaut;
  assessment: HealthAssessment;
  vitals7d: VitalReading[];
  checkIns7d: CheckIn[];
  units: 'metric' | 'imperial';
}): AtlasPanelViewModel {
  const { astronaut, assessment, vitals7d, checkIns7d, units } = params;
  const content = ATLAS_HEALTH_CONTENT.full_body;
  const isImperial = units === 'imperial';
  const latestCheckIn = checkIns7d[checkIns7d.length - 1];
  const latestVital = vitals7d[vitals7d.length - 1];

  const sleepTrend = computeSeriesTrend(checkIns7d.map((c) => c.sleepHours), 0.4, 1, 'h');
  const moodTrend = computeSeriesTrend(checkIns7d.map((c) => c.moodScore), 0.4, 1, '/5');
  const stressTrend = computeSeriesTrend(checkIns7d.map((c) => c.stressLevel), 0.4, 1, '/5');
  const hydroTrend = computeSeriesTrend(checkIns7d.map((c) => c.hydrationLiters), 0.25, 1, 'L');
  const exTrend = computeSeriesTrend(checkIns7d.map((c) => c.exerciseMinutes), 8, 0, 'min');
  const hrTrend = computeSeriesTrend(vitals7d.map((v) => v.heartRateBpm), 3, 0, 'bpm');
  const sysTrend = computeSeriesTrend(vitals7d.map((v) => v.systolicBpMmHg), 4, 0, 'mmHg');
  const tempTrend = computeSeriesTrend(
    vitals7d.map((v) =>
      isPresent(v.bodyTempC)
        ? isImperial
          ? celsiusToFahrenheit(v.bodyTempC)
          : v.bodyTempC
        : null
    ),
    isImperial ? 0.5 : 0.3,
    1,
    isImperial ? '°F' : '°C'
  );
  const bgTrend = computeSeriesTrend(
    vitals7d.map((v) =>
      isPresent(v.bloodGlucoseMgDl)
        ? isImperial
          ? mgDlToMmolL(v.bloodGlucoseMgDl)
          : v.bloodGlucoseMgDl
        : null
    ),
    isImperial ? 0.6 : 10,
    isImperial ? 1 : 0,
    isImperial ? 'mmol/L' : 'mg/dL'
  );
  const radTrend = computeSeriesTrend(vitals7d.map((v) => v.dailyRadiationMsv), 0.15, 2, 'mSv/d');

  const weeklyResSessions = checkIns7d.filter((c) => c.resistanceTrainingCompleted).length;
  const hrVal = latestVital?.heartRateBpm ?? null;
  const sysVal = latestVital?.systolicBpMmHg ?? null;
  const diaVal = latestVital?.diastolicBpMmHg ?? null;
  const tempC = latestVital?.bodyTempC ?? null;
  const tempUnit = isImperial ? '°F' : '°C';
  const tempBaselineStr = isImperial
    ? `${celsiusToFahrenheit(astronaut.baseline.bodyTempC).toFixed(1)} °F`
    : `${astronaut.baseline.bodyTempC.toFixed(1)} °C`;
  const bgVal = latestVital?.bloodGlucoseMgDl ?? null;
  const bgUnit = isImperial ? 'mmol/L' : 'mg/dL';
  const bgBaselineStr = isImperial
    ? `${mgDlToMmolL(astronaut.baseline.fastingGlucoseMgDl).toFixed(1)} mmol/L fasting`
    : `${astronaut.baseline.fastingGlucoseMgDl} mg/dL fasting`;
  const dailyRad = latestVital?.dailyRadiationMsv ?? null;
  const cumRad = latestVital?.cumulativeRadiationMsv ?? null;
  const allSymptomsText = latestCheckIn ? formatSymptomsList(latestCheckIn.symptoms) : 'MISSING';
  const hasAnySymptom =
    Boolean(latestCheckIn) && latestCheckIn.symptoms.some((s) => s !== 'none');

  const indicators: AtlasIndicatorItem[] = [
    {
      id: 'overall-readiness',
      label: 'Overall readiness score',
      latestValue: String(assessment.overallReadinessScore),
      unit: '/ 100',
      trendDirection: 'stable',
      trendLabel: STATUS_PILL_LABELS[assessment.overallStatus],
      personalBaseline: '>= 85 / 100 nominal mission baseline',
      generalReferenceRange: null,
      isMissing: false,
      attentionLevel:
        assessment.overallStatus === 'red' || assessment.overallStatus === 'orange'
          ? 'caution'
          : assessment.overallStatus === 'yellow'
          ? 'watch'
          : 'nominal',
    },
    {
      id: 'fb-sleep',
      label: 'Sleep',
      latestValue: latestCheckIn ? latestCheckIn.sleepHours.toFixed(1) : 'MISSING',
      unit: 'h',
      trendDirection: sleepTrend.direction,
      trendLabel: sleepTrend.label,
      personalBaseline: `${astronaut.baseline.sleepTargetHours.toFixed(1)} h target`,
      generalReferenceRange: '7.0–8.5 h (adult nightly)',
      isMissing: !latestCheckIn,
      attentionLevel: !latestCheckIn
        ? 'missing'
        : latestCheckIn.sleepHours < astronaut.baseline.sleepTargetHours - 1
        ? 'watch'
        : 'nominal',
    },
    {
      id: 'fb-mood',
      label: 'Mood',
      latestValue: latestCheckIn ? String(latestCheckIn.moodScore) : 'MISSING',
      unit: '/ 5',
      trendDirection: moodTrend.direction,
      trendLabel: moodTrend.label,
      personalBaseline: '>= 3 / 5 crew baseline',
      generalReferenceRange: '3–5 / 5',
      isMissing: !latestCheckIn,
      attentionLevel: !latestCheckIn
        ? 'missing'
        : latestCheckIn.moodScore <= 2
        ? 'watch'
        : 'nominal',
    },
    {
      id: 'fb-stress',
      label: 'Stress',
      latestValue: latestCheckIn ? String(latestCheckIn.stressLevel) : 'MISSING',
      unit: '/ 5',
      trendDirection: stressTrend.direction,
      trendLabel: stressTrend.label,
      personalBaseline: '<= 3 / 5 crew baseline',
      generalReferenceRange: '1–3 / 5',
      isMissing: !latestCheckIn,
      attentionLevel: !latestCheckIn
        ? 'missing'
        : latestCheckIn.stressLevel >= 4
        ? 'watch'
        : 'nominal',
    },
    {
      id: 'fb-hydration',
      label: 'Hydration',
      latestValue: latestCheckIn ? latestCheckIn.hydrationLiters.toFixed(1) : 'MISSING',
      unit: 'L',
      trendDirection: hydroTrend.direction,
      trendLabel: hydroTrend.label,
      personalBaseline: `${astronaut.baseline.hydrationTargetLiters.toFixed(1)} L/day target`,
      generalReferenceRange: '2.0–3.0 L/day',
      isMissing: !latestCheckIn,
      attentionLevel: !latestCheckIn
        ? 'missing'
        : latestCheckIn.hydrationLiters < astronaut.baseline.hydrationTargetLiters * 0.8
        ? 'watch'
        : 'nominal',
    },
    {
      id: 'fb-exercise',
      label: 'Exercise',
      latestValue: latestCheckIn ? String(latestCheckIn.exerciseMinutes) : 'MISSING',
      unit: 'min/d',
      trendDirection: exTrend.direction,
      trendLabel: exTrend.label,
      personalBaseline: `${astronaut.baseline.exerciseTargetMinutes} min/day target`,
      generalReferenceRange: '45–90 min/day crew countermeasure',
      isMissing: !latestCheckIn,
      attentionLevel: !latestCheckIn
        ? 'missing'
        : latestCheckIn.exerciseMinutes < astronaut.baseline.exerciseTargetMinutes * 0.7
        ? 'watch'
        : 'nominal',
    },
    {
      id: 'fb-resistance',
      label: 'Resistance training',
      latestValue: checkIns7d.length > 0 ? String(weeklyResSessions) : 'MISSING',
      unit: '/ 7d',
      trendDirection: 'stable',
      trendLabel: `${weeklyResSessions} of ${astronaut.baseline.resistanceTargetSessionsPerWeek} target`,
      personalBaseline: `${astronaut.baseline.resistanceTargetSessionsPerWeek} sessions/wk target`,
      generalReferenceRange: '4–6 sessions/wk spaceflight bone protection',
      isMissing: checkIns7d.length === 0,
      attentionLevel:
        checkIns7d.length === 0
          ? 'missing'
          : weeklyResSessions < astronaut.baseline.resistanceTargetSessionsPerWeek - 1
          ? 'watch'
          : 'nominal',
    },
    {
      id: 'fb-hr',
      label: 'Heart rate',
      latestValue: isPresent(hrVal) ? String(hrVal) : 'MISSING',
      unit: 'bpm',
      trendDirection: hrTrend.direction,
      trendLabel: hrTrend.label,
      personalBaseline: `${astronaut.baseline.restingHeartRateBpm} bpm resting`,
      generalReferenceRange: '50–90 bpm (adult resting)',
      isMissing: !isPresent(hrVal),
      attentionLevel: !isPresent(hrVal)
        ? 'missing'
        : hrVal - astronaut.baseline.restingHeartRateBpm >= CLINICAL_THRESHOLDS.hrDeltaOrangeBpm
        ? 'caution'
        : hrVal - astronaut.baseline.restingHeartRateBpm >= CLINICAL_THRESHOLDS.hrDeltaYellowBpm
        ? 'watch'
        : 'nominal',
    },
    {
      id: 'fb-bp',
      label: 'Blood pressure',
      latestValue: isPresent(sysVal) && isPresent(diaVal) ? `${sysVal}/${diaVal}` : 'MISSING',
      unit: 'mmHg',
      trendDirection: sysTrend.direction,
      trendLabel: sysTrend.label,
      personalBaseline: `${astronaut.baseline.systolicBpMmHg}/${astronaut.baseline.diastolicBpMmHg} mmHg`,
      generalReferenceRange: '95–130 / 60–85 mmHg (seated adult)',
      isMissing: !isPresent(sysVal) || !isPresent(diaVal),
      attentionLevel:
        !isPresent(sysVal) || !isPresent(diaVal)
          ? 'missing'
          : sysVal >= 140 || diaVal >= 90
          ? 'caution'
          : sysVal > CLINICAL_THRESHOLDS.generalSystolicMax
          ? 'watch'
          : 'nominal',
    },
    {
      id: 'fb-temp',
      label: 'Temperature',
      latestValue: isPresent(tempC)
        ? (isImperial ? celsiusToFahrenheit(tempC) : tempC).toFixed(1)
        : 'MISSING',
      unit: tempUnit,
      trendDirection: tempTrend.direction,
      trendLabel: tempTrend.label,
      personalBaseline: `${tempBaselineStr} personal baseline`,
      generalReferenceRange: isImperial ? '97.0–99.5 °F (oral adult)' : '36.1–37.5 °C (oral adult)',
      isMissing: !isPresent(tempC),
      attentionLevel: !isPresent(tempC)
        ? 'missing'
        : tempC >= CLINICAL_THRESHOLDS.feverThresholdC
        ? 'caution'
        : 'nominal',
    },
    {
      id: 'fb-glucose',
      label: 'Blood glucose',
      latestValue: isPresent(bgVal)
        ? isImperial
          ? mgDlToMmolL(bgVal).toFixed(1)
          : String(bgVal)
        : 'MISSING',
      unit: bgUnit,
      trendDirection: bgTrend.direction,
      trendLabel: bgTrend.label,
      personalBaseline: bgBaselineStr,
      generalReferenceRange: isImperial ? '3.9–6.9 mmol/L (fasting)' : '70–125 mg/dL (fasting)',
      isMissing: !isPresent(bgVal),
      attentionLevel: !isPresent(bgVal)
        ? 'missing'
        : bgVal >= CLINICAL_THRESHOLDS.glucoseElevatedMgDl ||
          bgVal < CLINICAL_THRESHOLDS.generalGlucoseMinMgDl
        ? 'caution'
        : bgVal > CLINICAL_THRESHOLDS.generalGlucoseMaxMgDl
        ? 'watch'
        : 'nominal',
    },
    {
      id: 'fb-radiation',
      label: 'Radiation exposure',
      latestValue: isPresent(dailyRad)
        ? `${dailyRad.toFixed(2)}${isPresent(cumRad) ? ` (${cumRad.toFixed(1)} cum)` : ''}`
        : 'MISSING',
      unit: 'mSv/d',
      trendDirection: radTrend.direction,
      trendLabel: radTrend.label,
      personalBaseline: `${astronaut.baseline.radiationBudgetMsv} mSv mission ALARA budget`,
      generalReferenceRange: '< 1.20 mSv/day nominal cruise watch band',
      isMissing: !isPresent(dailyRad),
      attentionLevel: !isPresent(dailyRad)
        ? 'missing'
        : dailyRad >= CLINICAL_THRESHOLDS.dailyRadiationOrangeMsv
        ? 'caution'
        : dailyRad >= CLINICAL_THRESHOLDS.dailyRadiationWatchMsv
        ? 'watch'
        : 'nominal',
    },
    {
      id: 'fb-symptoms',
      label: 'Symptoms',
      latestValue: allSymptomsText,
      unit: '',
      trendDirection: 'stable',
      trendLabel: hasAnySymptom ? 'Active symptom logged' : 'No symptoms reported',
      personalBaseline: 'Asymptomatic baseline',
      generalReferenceRange: null,
      isMissing: !latestCheckIn,
      attentionLevel: !latestCheckIn ? 'missing' : hasAnySymptom ? 'watch' : 'nominal',
    },
  ];

  // Compute completed & missed health actions from current day's check-in & vitals
  const completedHealthActions: string[] = [];
  const missedHealthActions: string[] = [];

  if (assessment.dataQuality.hasTodayCheckIn) {
    completedHealthActions.push('Daily crew check-in completed');
  } else {
    missedHealthActions.push('Daily crew check-in pending for current mission day');
  }

  if (assessment.dataQuality.hasTodayVitals) {
    completedHealthActions.push('Daily vital telemetry logged');
  } else {
    missedHealthActions.push('Current mission day vital signs incomplete');
  }

  if (latestCheckIn) {
    if (latestCheckIn.exerciseMinutes >= astronaut.baseline.exerciseTargetMinutes * 0.85) {
      completedHealthActions.push(
        `Aerobic exercise target met (${latestCheckIn.exerciseMinutes}/${astronaut.baseline.exerciseTargetMinutes} min)`
      );
    } else {
      missedHealthActions.push(
        `Aerobic exercise below target (${latestCheckIn.exerciseMinutes}/${astronaut.baseline.exerciseTargetMinutes} min)`
      );
    }

    if (weeklyResSessions >= astronaut.baseline.resistanceTargetSessionsPerWeek - 1) {
      completedHealthActions.push(
        `Weekly resistance training on track (${weeklyResSessions}/${astronaut.baseline.resistanceTargetSessionsPerWeek} sessions)`
      );
    } else {
      missedHealthActions.push(
        `Resistance training behind weekly target (${weeklyResSessions}/${astronaut.baseline.resistanceTargetSessionsPerWeek} sessions)`
      );
    }

    if (latestCheckIn.hydrationLiters >= astronaut.baseline.hydrationTargetLiters * 0.85) {
      completedHealthActions.push(
        `Hydration target met (${latestCheckIn.hydrationLiters.toFixed(1)}/${astronaut.baseline.hydrationTargetLiters.toFixed(1)} L)`
      );
    } else {
      missedHealthActions.push(
        `Hydration below target (${latestCheckIn.hydrationLiters.toFixed(1)}/${astronaut.baseline.hydrationTargetLiters.toFixed(1)} L)`
      );
    }

    if (latestCheckIn.sleepHours >= astronaut.baseline.sleepTargetHours - 0.5) {
      completedHealthActions.push(
        `Sleep target achieved (${latestCheckIn.sleepHours.toFixed(1)}/${astronaut.baseline.sleepTargetHours.toFixed(1)} h)`
      );
    } else {
      missedHealthActions.push(
        `Sleep below personal target (${latestCheckIn.sleepHours.toFixed(1)}/${astronaut.baseline.sleepTargetHours.toFixed(1)} h)`
      );
    }
  }

  const wholeBodyFindings = Array.from(
    new Set([
      ...assessment.alerts.map((a) => a.title),
      ...assessment.systems.bone_muscle.findings,
      ...assessment.systems.hydration.findings,
      ...assessment.systems.nutrition.findings,
      ...assessment.systems.radiation.findings,
    ])
  );

  const plainLanguageSummary =
    wholeBodyFindings.length > 0
      ? `Overall readiness is ${assessment.overallReadinessScore}/100 across 8 monitored body systems. Notable items: ${wholeBodyFindings.slice(0, 3).join(' ')} Review individual organ panels or contact the crew medical lead if patterns persist.`
      : `Overall mission readiness is ${assessment.overallReadinessScore}/100 with all 8 physiological systems tracking close to personal baselines and scheduled countermeasure targets.`;

  const systemOverviewList: AtlasSystemOverviewRow[] = (
    Object.values(assessment.systems) as SystemAssessment[]
  ).map((s) => ({
    systemId: s.systemId,
    label: s.label,
    score: s.score,
    status: s.status,
    targetOrgan: s.organTarget,
  }));

  const topPriorities = assessment.prioritizedActions.slice(0, 3);
  const recommendedActions = Array.from(
    new Set([
      ...topPriorities.map((a) => `${a.title}: ${a.detail}`),
      ...content.recommendedActions,
    ])
  );

  const escalationText =
    assessment.escalationReasons.length > 0
      ? `Active escalation triggers: ${assessment.escalationReasons.join('; ')}. ${content.escalationGuidance}`
      : content.escalationGuidance;

  const trendSeries: AtlasTrendSeries[] = [
    {
      id: 'exercise',
      tabLabel: 'Exercise',
      title: '7-Day Countermeasure Exercise (min)',
      unit: 'min',
      primaryName: 'Exercise',
      primaryColor: '#22C55E',
      baselineValue: astronaut.baseline.exerciseTargetMinutes,
      baselineLabel: `Target ${astronaut.baseline.exerciseTargetMinutes}m`,
      data: checkIns7d.map((c) => ({
        day: `D${c.missionDay}`,
        value: c.exerciseMinutes,
      })),
    },
    {
      id: 'hydration',
      tabLabel: 'Hydration',
      title: '7-Day Hydration Intake (L)',
      unit: 'L',
      primaryName: 'Hydration',
      primaryColor: '#22D3EE',
      baselineValue: astronaut.baseline.hydrationTargetLiters,
      baselineLabel: `Target ${astronaut.baseline.hydrationTargetLiters.toFixed(1)}L`,
      data: checkIns7d.map((c) => ({
        day: `D${c.missionDay}`,
        value: c.hydrationLiters,
      })),
    },
    {
      id: 'radiation',
      tabLabel: 'Radiation',
      title: '7-Day Daily Radiation Dose (mSv/day)',
      unit: 'mSv',
      primaryName: 'Daily Dose',
      primaryColor: '#EAB308',
      baselineValue: CLINICAL_THRESHOLDS.dailyRadiationWatchMsv,
      baselineLabel: 'Watch 1.20',
      data: vitals7d.map((v) => ({
        day: `D${v.missionDay}`,
        value: v.dailyRadiationMsv,
      })),
    },
  ];

  return {
    organ: 'full_body',
    title: content.title,
    subtitle: content.subtitle,
    status: assessment.overallStatus,
    statusPillLabel: STATUS_PILL_LABELS[assessment.overallStatus],
    statusActionCopy: STATUS_GUIDANCE_COPY[assessment.overallStatus],
    score: assessment.overallReadinessScore,
    scoreLabel: 'Overall Mission Readiness Score',
    plainLanguageSummary,
    indicators,
    referenceDistinctionNote: ATLAS_REFERENCE_RANGE_NOTE,
    trendSeries,
    spaceflightRelevancePoints: content.spaceflightRelevance,
    relatedNasaHazardTitle: content.nasaHazardTitle,
    relatedNasaHazardDetail: content.nasaHazardSummary,
    recommendedActions,
    escalationGuidance: escalationText,
    explainDetails: {
      formulaNote:
        'Weighted readiness across all 8 physiological systems (Brain, Cardiovascular, Respiratory, Bone/Muscle, Behavioral, Hydration, Nutrition, Radiation). Safety overrides enforce Red status whenever urgent escalation criteria trigger.',
      findings: wholeBodyFindings,
      missingIndicators: assessment.dataQuality.missingFields,
      completenessPercent: assessment.dataQuality.completenessPercent,
      qualityNote: assessment.dataQuality.note,
    },
    systemOverviewList,
    topPriorities,
    completedHealthActions,
    missedHealthActions,
    quickLinks: [
      { to: '/check-in', label: 'Check-In' },
      { to: '/vitals', label: 'Vitals' },
      { to: '/reports', label: 'Reports' },
      { to: '/mission', label: 'Mission' },
    ],
  };
}

export function buildAtlasPanelViewModel(params: {
  organ: OrganTarget;
  astronaut: Astronaut;
  assessment: HealthAssessment;
  mission: Mission;
  vitals14d: VitalReading[];
  checkIns14d: CheckIn[];
  units: 'metric' | 'imperial';
}): AtlasPanelViewModel {
  const vitals7d = [...params.vitals14d]
    .sort((a, b) => a.missionDay - b.missionDay)
    .slice(-7);
  const checkIns7d = [...params.checkIns14d]
    .sort((a, b) => a.missionDay - b.missionDay)
    .slice(-7);

  switch (params.organ) {
    case 'brain':
      return buildMindPanel({
        astronaut: params.astronaut,
        assessment: params.assessment,
        checkIns7d,
      });
    case 'heart':
      return buildHeartPanel({
        astronaut: params.astronaut,
        assessment: params.assessment,
        vitals7d,
        checkIns7d,
      });
    case 'lungs':
      return buildLungsPanel({
        astronaut: params.astronaut,
        assessment: params.assessment,
        mission: params.mission,
        vitals7d,
        checkIns7d,
        units: params.units,
      });
    case 'full_body':
    default:
      return buildFullBodyPanel({
        astronaut: params.astronaut,
        assessment: params.assessment,
        vitals7d,
        checkIns7d,
        units: params.units,
      });
  }
}

export function getOrganSelectorStatus(
  organ: OrganTarget,
  assessment: HealthAssessment
): HealthStatusLevel {
  switch (organ) {
    case 'brain':
      return getMindSystemStatus(assessment);
    case 'heart':
      return assessment.systems.cardiovascular.status;
    case 'lungs':
      return assessment.systems.respiratory.status;
    case 'full_body':
    default:
      return assessment.overallStatus;
  }
}
