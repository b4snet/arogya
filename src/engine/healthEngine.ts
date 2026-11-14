import type {
  ActionItem,
  Alert,
  Astronaut,
  BodySystemId,
  CheckIn,
  DataQualitySummary,
  HealthAssessment,
  HealthStatusLevel,
  Mission,
  ReferenceRange,
  SystemAssessment,
  VitalReading,
} from '../types';
import {
  CLINICAL_THRESHOLDS,
  SAFETY_DISCLAIMER,
  SYSTEM_WEIGHTS,
  statusFromScore,
  worstStatus,
} from './thresholds';
import { SYSTEM_HAZARD_KNOWLEDGE } from './hazardKnowledge';

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function isPresent(val: number | null | undefined): val is number {
  return typeof val === 'number' && !Number.isNaN(val);
}

function checkRepeatedAbnormal(
  readings: VitalReading[],
  predicate: (v: VitalReading) => boolean
): boolean {
  if (readings.length < 2) return false;
  const lastTwo = readings.slice(-2);
  return lastTwo.every(predicate);
}

function buildRange(params: {
  metric: string;
  unit: string;
  value: number | null | undefined;
  formatter?: (n: number) => string;
  generalReferenceRange: string;
  personalBaseline: string;
  withinGeneral?: (n: number) => boolean;
  withinPersonal?: (n: number) => boolean;
}): ReferenceRange {
  const missing = !isPresent(params.value);
  const fmt = params.formatter ?? ((n: number) => String(n));
  return {
    metric: params.metric,
    unit: params.unit,
    currentValue: missing ? 'MISSING' : `${fmt(params.value as number)} ${params.unit}`.trim(),
    generalReferenceRange: params.generalReferenceRange,
    personalBaseline: params.personalBaseline,
    isMissing: missing,
    withinGeneralRange: missing || !params.withinGeneral ? null : params.withinGeneral(params.value as number),
    withinPersonalBaseline:
      missing || !params.withinPersonal ? null : params.withinPersonal(params.value as number),
  };
}

export function evaluateHealthAssessment(
  astronaut: Astronaut,
  checkIns: CheckIn[],
  vitalReadings: VitalReading[],
  mission: Mission
): HealthAssessment {
  const sortedVitals = [...vitalReadings].sort((a, b) => a.missionDay - b.missionDay);
  const sortedCheckIns = [...checkIns].sort((a, b) => a.missionDay - b.missionDay);

  const latestVital = sortedVitals[sortedVitals.length - 1];
  const latestCheckIn = sortedCheckIns[sortedCheckIns.length - 1];
  const missionDay = mission.currentDay;

  const hasTodayCheckIn = latestCheckIn?.missionDay === missionDay;
  const hasTodayVitals = latestVital?.missionDay === missionDay;

  // --- Data Quality Evaluation (Missing data is NEVER treated as normal) ---
  const missingFields: string[] = [];
  if (!hasTodayCheckIn) missingFields.push(`Mission Day ${missionDay} daily check-in`);
  if (!latestVital) {
    missingFields.push('All vital readings');
  } else {
    if (!hasTodayVitals) missingFields.push(`Mission Day ${missionDay} vital readings`);
    if (!isPresent(latestVital.heartRateBpm)) missingFields.push('Heart Rate');
    if (!isPresent(latestVital.systolicBpMmHg) || !isPresent(latestVital.diastolicBpMmHg)) {
      missingFields.push('Blood Pressure');
    }
    if (!isPresent(latestVital.spo2Percent)) missingFields.push('SpO₂');
    if (!isPresent(latestVital.respiratoryRateBpm)) missingFields.push('Respiratory Rate');
    if (!isPresent(latestVital.bodyTempC)) missingFields.push('Body Temperature');
    if (!isPresent(latestVital.bloodGlucoseMgDl)) missingFields.push('Blood Glucose');
    if (!isPresent(latestVital.dailyRadiationMsv)) missingFields.push('Daily Radiation Dose');
  }

  const totalCheckedSlots = 9;
  const completenessPercent = Math.max(
    0,
    Math.round(((totalCheckedSlots - Math.min(totalCheckedSlots, missingFields.length)) / totalCheckedSlots) * 100)
  );
  const qualityTier: DataQualitySummary['qualityTier'] =
    completenessPercent >= 90 ? 'complete' : completenessPercent >= 60 ? 'partial' : 'insufficient';

  const dataQuality: DataQualitySummary = {
    completenessPercent,
    missingFields,
    hasTodayCheckIn,
    hasTodayVitals,
    qualityTier,
    note:
      missingFields.length > 0
        ? `Incomplete telemetry: missing ${missingFields.join(', ')}. Missing readings are flagged and never assumed normal.`
        : `Complete telemetry verified for Mission Day ${missionDay}.`,
  };

  const alerts: Alert[] = [];
  const actions: ActionItem[] = [];
  const escalationReasons: string[] = [];

  const pushAlert = (alert: Alert) => {
    alerts.push(alert);
    if (alert.escalationRequired) {
      escalationReasons.push(alert.title);
    }
  };

  const recent3CheckIns = sortedCheckIns.slice(-3);
  const recent7CheckIns = sortedCheckIns.slice(-7);

  // =========================================================================
  // 1. BRAIN & NEURO-OCULAR
  // =========================================================================
  let brainScore = 100;
  const brainFindings: string[] = [];
  const brainMissing: string[] = [];
  let brainStatusOverride: HealthStatusLevel | null = null;

  if (!latestCheckIn) {
    brainScore -= 25;
    brainMissing.push('Daily sleep & neurological symptom check-in missing');
    brainFindings.push('Missing sleep and symptom check-in; neuro-ocular baseline unverified.');
  } else {
    const sleepDeficit = astronaut.baseline.sleepTargetHours - latestCheckIn.sleepHours;
    const avgSleep3d =
      recent3CheckIns.reduce((acc, c) => acc + c.sleepHours, 0) / recent3CheckIns.length;
    const multiDaySleepDebt =
      recent3CheckIns.filter((c) => astronaut.baseline.sleepTargetHours - c.sleepHours >= 1.0)
        .length >= 2;

    if (sleepDeficit >= CLINICAL_THRESHOLDS.sleepDeficitOrangeHours || avgSleep3d < 5.5) {
      brainScore -= 35;
      brainFindings.push(
        `Significant sleep debt: ${latestCheckIn.sleepHours.toFixed(1)} h vs ${astronaut.baseline.sleepTargetHours.toFixed(1)} h personal target (3d avg ${avgSleep3d.toFixed(1)} h).`
      );
      actions.push({
        id: 'act-brain-sleep-orange',
        priority: 'today',
        systemId: 'brain',
        title: 'Protect extended sleep recovery window',
        detail: `Schedule >= ${astronaut.baseline.sleepTargetHours.toFixed(1)} h uninterrupted rest and reduce non-critical late tasks.`,
      });
    } else if (sleepDeficit >= CLINICAL_THRESHOLDS.sleepDeficitYellowHours || multiDaySleepDebt) {
      brainScore -= 20;
      brainFindings.push(
        `Sleep debt detected: ${latestCheckIn.sleepHours.toFixed(1)} h (${sleepDeficit.toFixed(1)} h below personal target).`
      );
      actions.push({
        id: 'act-brain-sleep-yellow',
        priority: 'today',
        systemId: 'brain',
        title: 'Re-align circadian lighting & sleep shift',
        detail: 'Minimize blue light 60 min prior to scheduled sleep block.',
      });
    }

    if (
      latestCheckIn.symptoms.includes('visual_blur') &&
      latestCheckIn.symptoms.includes('headache')
    ) {
      brainScore -= 32;
      brainStatusOverride = 'orange';
      brainFindings.push(
        'Headache paired with visual blur reported — warrants cephalad fluid-shift / SANS monitoring.'
      );
      pushAlert({
        id: 'alt-brain-sans',
        systemId: 'brain',
        organTarget: 'brain',
        severity: 'orange',
        escalationRequired: false,
        title: 'Neuro-ocular symptoms (headache + visual blur) warrant monitoring',
        rationale: 'May relate to microgravity cephalad fluid shift or elevated cabin pCO₂.',
        recommendedAction: 'Consider reviewing with Crew Medical Officer and checking cabin pCO₂.',
      });
    } else if (latestCheckIn.symptoms.includes('headache')) {
      brainScore -= 12;
      brainFindings.push('Mild headache logged on check-in.');
    }

    // Mandatory Safety Rule: Fainting / syncope ALWAYS escalates to RED
    if (latestCheckIn.symptoms.includes('fainting')) {
      brainScore = Math.min(brainScore, 20);
      brainStatusOverride = 'red';
      brainFindings.push('SAFETY ESCALATION: Fainting or near-fainting reported on crew check-in.');
      pushAlert({
        id: 'alt-brain-fainting',
        systemId: 'brain',
        organTarget: 'brain',
        severity: 'red',
        escalationRequired: true,
        title: 'Fainting / syncope reported — immediate medical escalation required',
        rationale: 'Fainting or loss of consciousness requires immediate evaluation by qualified medical personnel.',
        recommendedAction: 'Alert Crew Medical Officer immediately, ensure crew safety posture, and notify Flight Surgeon.',
      });
      actions.push({
        id: 'act-escalate-fainting',
        priority: 'immediate',
        systemId: 'brain',
        title: 'Initiate immediate Crew Medical Officer & Flight Surgeon escalation',
        detail: 'Rest safely, avoid solo EVA or hazardous tasks, and transmit SBAR brief immediately.',
      });
    }
  }

  const brainStatus = brainStatusOverride
    ? worstStatus(statusFromScore(clamp(brainScore)), brainStatusOverride)
    : statusFromScore(clamp(brainScore));

  const brainRanges: ReferenceRange[] = [
    buildRange({
      metric: 'Sleep Duration',
      unit: 'h',
      value: latestCheckIn?.sleepHours ?? null,
      formatter: (n) => n.toFixed(1),
      generalReferenceRange: '7.0–8.5 h',
      personalBaseline: `${astronaut.baseline.sleepTargetHours.toFixed(1)} h target`,
      withinGeneral: (n) => n >= 6.5 && n <= 9.0,
      withinPersonal: (n) => n >= astronaut.baseline.sleepTargetHours - 0.8,
    }),
    buildRange({
      metric: 'Cabin pCO₂',
      unit: 'mmHg',
      value: mission.environment.cabinCo2MmHg,
      formatter: (n) => n.toFixed(1),
      generalReferenceRange: '< 3.0 mmHg',
      personalBaseline: 'Habitat shared threshold',
      withinGeneral: (n) => n <= CLINICAL_THRESHOLDS.cabinCo2WatchMmHg,
      withinPersonal: (n) => n <= CLINICAL_THRESHOLDS.cabinCo2WatchMmHg,
    }),
  ];

  // =========================================================================
  // 2. CARDIOVASCULAR (BP, HR, HRV, Chest Pain Escalation, Repeated Abnormals)
  // =========================================================================
  let cardioScore = 100;
  const cardioFindings: string[] = [];
  const cardioMissing: string[] = [];
  let cardioStatusOverride: HealthStatusLevel | null = null;

  if (!latestVital) {
    cardioScore -= 30;
    cardioMissing.push('Heart rate, HRV, and blood pressure missing');
  } else {
    if (!isPresent(latestVital.heartRateBpm)) {
      cardioScore -= 15;
      cardioMissing.push('Heart Rate missing');
    } else {
      const hr = latestVital.heartRateBpm;
      const hrDelta = hr - astronaut.baseline.restingHeartRateBpm;
      const repeatedHighHr = checkRepeatedAbnormal(
        sortedVitals,
        (v) =>
          isPresent(v.heartRateBpm) &&
          (v.heartRateBpm > CLINICAL_THRESHOLDS.generalRestingHrMax ||
            v.heartRateBpm - astronaut.baseline.restingHeartRateBpm >=
              CLINICAL_THRESHOLDS.hrDeltaOrangeBpm)
      );

      if (repeatedHighHr) {
        cardioScore -= 45;
        cardioStatusOverride = 'red';
        cardioFindings.push(
          `Repeated elevated resting heart rate across consecutive days (latest ${hr} bpm vs ${astronaut.baseline.restingHeartRateBpm} bpm baseline).`
        );
        pushAlert({
          id: 'alt-cardio-repeated-hr',
          systemId: 'cardiovascular',
          organTarget: 'heart',
          severity: 'red',
          escalationRequired: true,
          title: 'Repeated elevated resting heart rate — escalate for medical review',
          rationale: `HR ${hr} bpm (+${hrDelta} bpm vs personal baseline) persisted across consecutive readings.`,
          recommendedAction: 'Contact Crew Medical Officer and transmit SBAR brief to Flight Surgeon.',
        });
      } else if (hrDelta >= CLINICAL_THRESHOLDS.hrDeltaOrangeBpm || hr > 100) {
        cardioScore -= 30;
        cardioFindings.push(`Resting HR ${hr} bpm (+${hrDelta} bpm above personal baseline).`);
      } else if (hrDelta >= CLINICAL_THRESHOLDS.hrDeltaYellowBpm) {
        cardioScore -= 18;
        cardioFindings.push(`Resting HR mildly elevated (+${hrDelta} bpm vs baseline).`);
      }
    }

    if (!isPresent(latestVital.systolicBpMmHg) || !isPresent(latestVital.diastolicBpMmHg)) {
      cardioScore -= 15;
      cardioMissing.push('Blood Pressure missing');
    } else {
      const sys = latestVital.systolicBpMmHg;
      const dia = latestVital.diastolicBpMmHg;
      const isBpHigh =
        sys >= 140 ||
        dia >= 90 ||
        sys - astronaut.baseline.systolicBpMmHg >= 20;
      const isBpYellow =
        sys > CLINICAL_THRESHOLDS.generalSystolicMax ||
        dia > CLINICAL_THRESHOLDS.generalDiastolicMax ||
        sys < CLINICAL_THRESHOLDS.generalSystolicMin;
      const repeatedHighBp = checkRepeatedAbnormal(
        sortedVitals,
        (v) =>
          isPresent(v.systolicBpMmHg) &&
          isPresent(v.diastolicBpMmHg) &&
          (v.systolicBpMmHg >= 140 ||
            v.diastolicBpMmHg >= 90 ||
            v.systolicBpMmHg - astronaut.baseline.systolicBpMmHg >= 20)
      );

      if (repeatedHighBp) {
        cardioScore -= 45;
        cardioStatusOverride = 'red';
        cardioFindings.push(
          `Repeated elevated blood pressure (${sys}/${dia} mmHg vs ${astronaut.baseline.systolicBpMmHg}/${astronaut.baseline.diastolicBpMmHg} mmHg personal baseline).`
        );
        pushAlert({
          id: 'alt-cardio-repeated-bp',
          systemId: 'cardiovascular',
          organTarget: 'heart',
          severity: 'red',
          escalationRequired: true,
          title: 'Repeated elevated blood pressure — medical escalation required',
          rationale: `Consecutive readings exceed safe threshold (${sys}/${dia} mmHg).`,
          recommendedAction: 'Escalate to Crew Medical Officer and repeat calm seated BP verification.',
        });
      } else if (isBpHigh) {
        cardioScore -= 30;
        cardioStatusOverride = worstStatus(cardioStatusOverride ?? 'green', 'orange');
        cardioFindings.push(
          `High blood pressure reading (${sys}/${dia} mmHg vs ${astronaut.baseline.systolicBpMmHg}/${astronaut.baseline.diastolicBpMmHg} mmHg baseline).`
        );
        actions.push({
          id: 'act-cardio-bp',
          priority: 'today',
          systemId: 'cardiovascular',
          title: 'Repeat seated resting blood pressure check',
          detail: 'Verify cuff size and re-measure after 5 minutes of calm rest.',
        });
      } else if (isBpYellow) {
        cardioScore -= 18;
        cardioFindings.push(`Blood pressure (${sys}/${dia} mmHg) outside general target band.`);
      }
    }
  }

  // Mandatory Safety Rule: Chest pain ALWAYS escalates to RED
  if (latestCheckIn?.symptoms.includes('chest_pain')) {
    cardioScore = Math.min(cardioScore, 25);
    cardioStatusOverride = 'red';
    cardioFindings.push('SAFETY ESCALATION: Chest pain reported on crew check-in.');
    pushAlert({
      id: 'alt-cardio-chest-pain',
      systemId: 'cardiovascular',
      organTarget: 'heart',
      severity: 'red',
      escalationRequired: true,
      title: 'Chest pain reported — immediate medical escalation required',
      rationale: 'Chest pain requires immediate professional medical evaluation.',
      recommendedAction: 'Alert Crew Medical Officer immediately and initiate Flight Surgeon priority consult.',
    });
    actions.push({
      id: 'act-escalate-chest-pain',
      priority: 'immediate',
      systemId: 'cardiovascular',
      title: 'Initiate immediate Crew Medical Officer & Flight Surgeon escalation',
      detail: 'Pause physical exertion, monitor continuous vitals, and transmit SBAR brief immediately.',
    });
  }

  const cardioStatus = cardioStatusOverride
    ? worstStatus(statusFromScore(clamp(cardioScore)), cardioStatusOverride)
    : statusFromScore(clamp(cardioScore));

  const cardioRanges: ReferenceRange[] = [
    buildRange({
      metric: 'Resting Heart Rate',
      unit: 'bpm',
      value: latestVital?.heartRateBpm,
      generalReferenceRange: '50–90 bpm',
      personalBaseline: `${astronaut.baseline.restingHeartRateBpm} bpm`,
      withinGeneral: (n) => n >= 50 && n <= 90,
      withinPersonal: (n) => Math.abs(n - astronaut.baseline.restingHeartRateBpm) < 12,
    }),
    buildRange({
      metric: 'Blood Pressure (Sys)',
      unit: 'mmHg',
      value: latestVital?.systolicBpMmHg,
      generalReferenceRange: '95–130 mmHg',
      personalBaseline: `${astronaut.baseline.systolicBpMmHg} mmHg`,
      withinGeneral: (n) => n >= 95 && n <= 130,
      withinPersonal: (n) => Math.abs(n - astronaut.baseline.systolicBpMmHg) < 15,
    }),
    buildRange({
      metric: 'Blood Pressure (Dia)',
      unit: 'mmHg',
      value: latestVital?.diastolicBpMmHg,
      generalReferenceRange: '60–85 mmHg',
      personalBaseline: `${astronaut.baseline.diastolicBpMmHg} mmHg`,
      withinGeneral: (n) => n >= 60 && n <= 85,
      withinPersonal: (n) => Math.abs(n - astronaut.baseline.diastolicBpMmHg) < 10,
    }),
  ];

  // =========================================================================
  // 3. RESPIRATORY (SpO2, Resp Rate, Shortness of Breath Escalation, Fever Check)
  // =========================================================================
  let respScore = 100;
  const respFindings: string[] = [];
  const respMissing: string[] = [];
  let respStatusOverride: HealthStatusLevel | null = null;

  if (!latestVital || !isPresent(latestVital.spo2Percent)) {
    respScore -= 20;
    respMissing.push('SpO₂ reading missing');
  } else {
    const spo2 = latestVital.spo2Percent;
    const repeatedLowSpo2 = checkRepeatedAbnormal(
      sortedVitals,
      (v) => isPresent(v.spo2Percent) && v.spo2Percent < CLINICAL_THRESHOLDS.generalSpo2Min
    );

    if (spo2 < CLINICAL_THRESHOLDS.spo2CriticalPercent || repeatedLowSpo2) {
      respScore -= 50;
      respStatusOverride = 'red';
      respFindings.push(
        `Low oxygen saturation (SpO₂ ${spo2}%${repeatedLowSpo2 ? ', repeated across consecutive days' : ''}).`
      );
      pushAlert({
        id: 'alt-resp-spo2-red',
        systemId: 'respiratory',
        organTarget: 'lungs',
        severity: 'red',
        escalationRequired: true,
        title: 'Low SpO₂ requires medical escalation',
        rationale: `SpO₂ ${spo2}% is below safe operational range.`,
        recommendedAction: 'Contact Crew Medical Officer immediately and verify supplemental O₂ / cabin air.',
      });
    } else if (spo2 < CLINICAL_THRESHOLDS.generalSpo2Min) {
      respScore -= 22;
      respFindings.push(`SpO₂ at ${spo2}% (< 95% general threshold) — warrants monitoring.`);
    }
  }

  if (!latestVital || !isPresent(latestVital.respiratoryRateBpm)) {
    respScore -= 12;
    respMissing.push('Respiratory rate missing');
  } else if (latestVital.respiratoryRateBpm > CLINICAL_THRESHOLDS.generalRespRateMax) {
    respScore -= 16;
    respFindings.push(
      `Elevated respiratory rate (${latestVital.respiratoryRateBpm} /min) with cabin pCO₂ ${mission.environment.cabinCo2MmHg.toFixed(1)} mmHg.`
    );
  }

  // Mandatory Safety Rule: Severe shortness of breath ALWAYS escalates to RED
  if (
    latestCheckIn?.symptoms.includes('severe_shortness_of_breath') ||
    (latestCheckIn?.symptoms.includes('shortness_of_breath') &&
      isPresent(latestVital?.spo2Percent) &&
      (latestVital?.spo2Percent as number) < 95)
  ) {
    respScore = Math.min(respScore, 25);
    respStatusOverride = 'red';
    respFindings.push('SAFETY ESCALATION: Severe shortness of breath reported.');
    pushAlert({
      id: 'alt-resp-sob',
      systemId: 'respiratory',
      organTarget: 'lungs',
      severity: 'red',
      escalationRequired: true,
      title: 'Severe shortness of breath — immediate medical escalation required',
      rationale: 'Acute breathing difficulty requires immediate medical officer assessment.',
      recommendedAction: 'Alert Crew Medical Officer immediately and inspect cabin O₂ / pCO₂ telemetry.',
    });
    actions.push({
      id: 'act-escalate-sob',
      priority: 'immediate',
      systemId: 'respiratory',
      title: 'Immediate respiratory assessment & Crew Medical Officer alert',
      detail: 'Remain at rest, check SpO₂ and cabin pCO₂, and contact medical lead immediately.',
    });
  }

  // Mandatory Safety Rule: Severe allergic reaction ALWAYS escalates to RED
  if (latestCheckIn?.symptoms.includes('severe_allergic_reaction')) {
    respScore = Math.min(respScore, 20);
    respStatusOverride = 'red';
    respFindings.push('SAFETY ESCALATION: Severe allergic reaction reported.');
    pushAlert({
      id: 'alt-resp-allergy',
      systemId: 'respiratory',
      organTarget: 'lungs',
      severity: 'red',
      escalationRequired: true,
      title: 'Severe allergic reaction — immediate medical escalation required',
      rationale: 'Severe allergic symptoms carry airway and systemic risk requiring immediate medical intervention.',
      recommendedAction: 'Alert Crew Medical Officer and Flight Surgeon immediately; monitor airway, breathing, and BP.',
    });
    actions.push({
      id: 'act-escalate-allergy',
      priority: 'immediate',
      systemId: 'respiratory',
      title: 'Immediate allergic reaction escalation to Crew Medical Lead',
      detail: 'Do not wait for routine review; initiate urgent medical officer evaluation and prepare SBAR brief.',
    });
  }

  // Mandatory Safety Rule: Rapidly worsening symptoms ALWAYS escalate to RED
  if (latestCheckIn?.symptoms.includes('rapidly_worsening')) {
    cardioScore = Math.min(cardioScore, 30);
    cardioStatusOverride = 'red';
    cardioFindings.push('SAFETY ESCALATION: Rapidly worsening symptoms reported.');
    pushAlert({
      id: 'alt-rapid-worsening',
      systemId: 'cardiovascular',
      organTarget: 'full_body',
      severity: 'red',
      escalationRequired: true,
      title: 'Rapidly worsening symptoms — urgent medical escalation required',
      rationale: 'Rapid clinical progression requires prompt review by the Crew Medical Officer and Flight Surgeon.',
      recommendedAction: 'Pause exertion, capture current vitals if available, and alert Crew Medical Lead immediately.',
    });
    actions.push({
      id: 'act-escalate-worsening',
      priority: 'immediate',
      systemId: 'cardiovascular',
      title: 'Escalate rapidly worsening symptoms to Crew Medical Officer',
      detail: 'Initiate urgent escalation workflow and transmit updated vitals and symptoms brief.',
    });
  }

  // Mandatory Safety Rule: Fever (>= 38.0°C) with concerning symptoms escalates to RED
  if (latestVital && isPresent(latestVital.bodyTempC)) {
    const temp = latestVital.bodyTempC;
    const concerningSymptoms = latestCheckIn?.symptoms.some((s) =>
      ['chest_pain', 'shortness_of_breath', 'severe_shortness_of_breath', 'fever_chills', 'dizziness', 'headache', 'nausea'].includes(s)
    );
    const repeatedFever = checkRepeatedAbnormal(
      sortedVitals,
      (v) => isPresent(v.bodyTempC) && v.bodyTempC >= CLINICAL_THRESHOLDS.feverThresholdC
    );

    if ((temp >= CLINICAL_THRESHOLDS.feverThresholdC && concerningSymptoms) || temp >= CLINICAL_THRESHOLDS.highFeverThresholdC || repeatedFever) {
      respScore = Math.min(respScore, 35);
      respStatusOverride = 'red';
      respFindings.push(
        `Fever detected (${temp.toFixed(1)} °C) with ${concerningSymptoms ? 'concerning symptoms' : 'repeated elevation'} — medical escalation required.`
      );
      pushAlert({
        id: 'alt-fever-escalation',
        systemId: 'respiratory',
        organTarget: 'lungs',
        severity: 'red',
        escalationRequired: true,
        title: `Fever (${temp.toFixed(1)} °C) with concerning indicators — escalate`,
        rationale: 'Elevated temperature paired with systemic symptoms requires flight surgeon guidance.',
        recommendedAction: 'Isolate rest if practical, monitor temperature every 2 hours, and contact Crew Medical Officer.',
      });
      actions.push({
        id: 'act-escalate-fever',
        priority: 'immediate',
        systemId: 'respiratory',
        title: 'Escalate fever with symptoms to Crew Medical Officer',
        detail: 'Document symptom onset and transmit structured SBAR brief.',
      });
    } else if (temp >= CLINICAL_THRESHOLDS.feverThresholdC) {
      respScore -= 25;
      respStatusOverride = worstStatus(respStatusOverride ?? 'green', 'orange');
      respFindings.push(`Mild fever detected (${temp.toFixed(1)} °C vs ${astronaut.baseline.bodyTempC.toFixed(1)} °C baseline).`);
      actions.push({
        id: 'act-monitor-fever',
        priority: 'today',
        systemId: 'respiratory',
        title: 'Re-check body temperature and hydration in 2 hours',
        detail: 'Watch closely for chills, headache, or breathing changes.',
      });
    }
  } else {
    respMissing.push('Body Temperature missing');
  }

  const respStatus = respStatusOverride
    ? worstStatus(statusFromScore(clamp(respScore)), respStatusOverride)
    : statusFromScore(clamp(respScore));

  const respRanges: ReferenceRange[] = [
    buildRange({
      metric: 'Oxygen Saturation (SpO₂)',
      unit: '%',
      value: latestVital?.spo2Percent,
      generalReferenceRange: '95–100%',
      personalBaseline: `${astronaut.baseline.spo2Percent}%`,
      withinGeneral: (n) => n >= 95,
      withinPersonal: (n) => n >= astronaut.baseline.spo2Percent - 2,
    }),
    buildRange({
      metric: 'Body Temperature',
      unit: '°C',
      value: latestVital?.bodyTempC,
      formatter: (n) => n.toFixed(1),
      generalReferenceRange: '36.1–37.5 °C',
      personalBaseline: `${astronaut.baseline.bodyTempC.toFixed(1)} °C`,
      withinGeneral: (n) => n >= 36.1 && n <= 37.5,
      withinPersonal: (n) => Math.abs(n - astronaut.baseline.bodyTempC) <= 0.6,
    }),
  ];

  // =========================================================================
  // 4. BONE & MUSCLE (Exercise Deficit & Resistance-Training Target)
  // =========================================================================
  let boneScore = 100;
  const boneFindings: string[] = [];
  const boneMissing: string[] = [];

  if (!latestCheckIn) {
    boneScore -= 20;
    boneMissing.push('Exercise & resistance training log missing');
  } else {
    const recent3MinAvg =
      recent3CheckIns.reduce((acc, c) => acc + c.exerciseMinutes, 0) / recent3CheckIns.length;
    const weeklyResistanceSessions = recent7CheckIns.filter(
      (c) => c.resistanceTrainingCompleted
    ).length;

    if (
      recent3MinAvg < astronaut.baseline.exerciseTargetMinutes * 0.6 ||
      weeklyResistanceSessions < Math.max(2, astronaut.baseline.resistanceTargetSessionsPerWeek - 2)
    ) {
      boneScore -= 28;
      boneFindings.push(
        `Exercise deficit: 3d mean ${Math.round(recent3MinAvg)} min/day (target ${astronaut.baseline.exerciseTargetMinutes} min) · ${weeklyResistanceSessions}/${astronaut.baseline.resistanceTargetSessionsPerWeek} weekly resistance sessions.`
      );
      actions.push({
        id: 'act-bone-exercise',
        priority: 'today',
        systemId: 'bone_muscle',
        title: 'Resume ARED resistance & aerobic countermeasure block',
        detail: `Target ${astronaut.baseline.exerciseTargetMinutes} min today to protect bone mineral density.`,
      });
    } else if (latestCheckIn.exerciseMinutes < astronaut.baseline.exerciseTargetMinutes * 0.8) {
      boneScore -= 15;
      boneFindings.push(
        `Daily exercise below personal target (${latestCheckIn.exerciseMinutes}/${astronaut.baseline.exerciseTargetMinutes} min).`
      );
    }

    if (latestCheckIn.painScore >= 7) {
      boneScore -= 25;
      boneFindings.push(`High physical pain score (${latestCheckIn.painScore}/10) logged.`);
      pushAlert({
        id: 'alt-bone-pain',
        systemId: 'bone_muscle',
        organTarget: 'full_body',
        severity: 'orange',
        escalationRequired: false,
        title: 'High musculoskeletal pain score warrants medical check',
        rationale: `Pain score ${latestCheckIn.painScore}/10 exceeds comfort threshold.`,
        recommendedAction: 'Modify resistive load and consult Crew Medical Officer.',
      });
    }
  }

  const boneStatus = statusFromScore(clamp(boneScore));
  const weeklyRes = recent7CheckIns.filter((c) => c.resistanceTrainingCompleted).length;
  const boneRanges: ReferenceRange[] = [
    buildRange({
      metric: 'Daily Countermeasure Exercise',
      unit: 'min',
      value: latestCheckIn?.exerciseMinutes ?? null,
      generalReferenceRange: '45–90 min/day',
      personalBaseline: `${astronaut.baseline.exerciseTargetMinutes} min/day`,
      withinGeneral: (n) => n >= 45,
      withinPersonal: (n) => n >= astronaut.baseline.exerciseTargetMinutes * 0.85,
    }),
    buildRange({
      metric: 'Weekly Resistance Sessions',
      unit: 'sessions',
      value: recent7CheckIns.length > 0 ? weeklyRes : null,
      generalReferenceRange: '4–6 sessions/wk',
      personalBaseline: `${astronaut.baseline.resistanceTargetSessionsPerWeek} sessions/wk`,
      withinGeneral: (n) => n >= 4,
      withinPersonal: (n) => n >= astronaut.baseline.resistanceTargetSessionsPerWeek - 1,
    }),
  ];

  // =========================================================================
  // 5. BEHAVIORAL HEALTH (Mood & Stress)
  // =========================================================================
  let behScore = 100;
  const behFindings: string[] = [];
  const behMissing: string[] = [];

  if (!latestCheckIn) {
    behScore -= 20;
    behMissing.push('Mood & stress check-in missing');
  } else {
    const lowMoodDays = recent3CheckIns.filter((c) => c.moodScore <= 2).length;
    const highStressDays = recent3CheckIns.filter((c) => c.stressLevel >= 4).length;

    if (lowMoodDays >= 2 && highStressDays >= 2) {
      behScore -= 35;
      behFindings.push(
        `Sustained low mood (${latestCheckIn.moodScore}/5) and elevated stress (${latestCheckIn.stressLevel}/5) across recent days.`
      );
      pushAlert({
        id: 'alt-beh-drift',
        systemId: 'behavioral',
        organTarget: 'brain',
        severity: 'orange',
        escalationRequired: false,
        title: 'Behavioral mood/stress drift detected',
        rationale: 'Multi-day elevated stress with low mood may benefit from schedule relief.',
        recommendedAction: 'Consider private crew check-in with Crew Medical Officer and protected rest.',
      });
      actions.push({
        id: 'act-beh-support',
        priority: 'today',
        systemId: 'behavioral',
        title: 'Schedule protected recovery & private medical check-in',
        detail: 'Reduce non-essential workload and prioritize restorative downtime.',
      });
    } else if (latestCheckIn.moodScore <= 2 || latestCheckIn.stressLevel >= 4) {
      behScore -= 18;
      behFindings.push(
        `Elevated stress (${latestCheckIn.stressLevel}/5) or low mood (${latestCheckIn.moodScore}/5) noted today.`
      );
    }
  }

  const behStatus = statusFromScore(clamp(behScore));
  const behRanges: ReferenceRange[] = [
    buildRange({
      metric: 'Mood Score',
      unit: '/ 5',
      value: latestCheckIn?.moodScore ?? null,
      generalReferenceRange: '3–5 / 5',
      personalBaseline: '>= 3 / 5 expected',
      withinGeneral: (n) => n >= 3,
      withinPersonal: (n) => n >= 3,
    }),
    buildRange({
      metric: 'Stress Level',
      unit: '/ 5',
      value: latestCheckIn?.stressLevel ?? null,
      generalReferenceRange: '1–3 / 5',
      personalBaseline: '<= 3 / 5 expected',
      withinGeneral: (n) => n <= 3,
      withinPersonal: (n) => n <= 3,
    }),
  ];

  // =========================================================================
  // 6. HYDRATION
  // =========================================================================
  let hydroScore = 100;
  const hydroFindings: string[] = [];
  const hydroMissing: string[] = [];

  if (!latestCheckIn) {
    hydroScore -= 20;
    hydroMissing.push('Daily hydration log missing');
  } else {
    const deficitRatio =
      (astronaut.baseline.hydrationTargetLiters - latestCheckIn.hydrationLiters) /
      astronaut.baseline.hydrationTargetLiters;
    if (deficitRatio >= CLINICAL_THRESHOLDS.hydrationDeficitOrangeRatio) {
      hydroScore -= 32;
      hydroFindings.push(
        `Hydration markedly below target (${latestCheckIn.hydrationLiters.toFixed(1)} L vs ${astronaut.baseline.hydrationTargetLiters.toFixed(1)} L).`
      );
      actions.push({
        id: 'act-hydro',
        priority: 'today',
        systemId: 'hydration',
        title: 'Rehydrate +500 mL electrolyte fluid this shift',
        detail: `Current intake ${latestCheckIn.hydrationLiters.toFixed(1)} L is ${Math.round(deficitRatio * 100)}% below baseline.`,
      });
    } else if (deficitRatio >= CLINICAL_THRESHOLDS.hydrationDeficitYellowRatio) {
      hydroScore -= 18;
      hydroFindings.push(
        `Mild hydration deficit (${latestCheckIn.hydrationLiters.toFixed(1)} L vs ${astronaut.baseline.hydrationTargetLiters.toFixed(1)} L target).`
      );
    }
  }

  const hydroStatus = statusFromScore(clamp(hydroScore));
  const hydroRanges: ReferenceRange[] = [
    buildRange({
      metric: 'Daily Fluid Intake',
      unit: 'L',
      value: latestCheckIn?.hydrationLiters ?? null,
      formatter: (n) => n.toFixed(1),
      generalReferenceRange: '2.0–3.0 L/day',
      personalBaseline: `${astronaut.baseline.hydrationTargetLiters.toFixed(1)} L/day`,
      withinGeneral: (n) => n >= 2.0,
      withinPersonal: (n) => n >= astronaut.baseline.hydrationTargetLiters * 0.85,
    }),
  ];

  // =========================================================================
  // 7. NUTRITION & METABOLISM (Calories & Blood Glucose)
  // =========================================================================
  let nutriScore = 100;
  const nutriFindings: string[] = [];
  const nutriMissing: string[] = [];
  let nutriStatusOverride: HealthStatusLevel | null = null;

  if (!latestCheckIn) {
    nutriScore -= 15;
    nutriMissing.push('Calorie & protein intake missing');
  } else {
    const calDeficitRatio =
      (astronaut.baseline.calorieTargetKcal - latestCheckIn.caloriesKcal) /
      astronaut.baseline.calorieTargetKcal;
    if (calDeficitRatio >= CLINICAL_THRESHOLDS.calorieDeficitYellowRatio) {
      nutriScore -= 18;
      nutriFindings.push(
        `Caloric intake below mission target (${latestCheckIn.caloriesKcal} vs ${astronaut.baseline.calorieTargetKcal} kcal).`
      );
    }
  }

  if (!latestVital || !isPresent(latestVital.bloodGlucoseMgDl)) {
    nutriScore -= 15;
    nutriMissing.push('Blood glucose reading missing');
  } else {
    const bg = latestVital.bloodGlucoseMgDl;
    const repeatedAbnormalBg = checkRepeatedAbnormal(
      sortedVitals,
      (v) =>
        isPresent(v.bloodGlucoseMgDl) &&
        (v.bloodGlucoseMgDl >= CLINICAL_THRESHOLDS.glucoseElevatedMgDl ||
          v.bloodGlucoseMgDl <= CLINICAL_THRESHOLDS.glucoseCriticalLowMgDl)
    );

    if (
      bg >= CLINICAL_THRESHOLDS.glucoseCriticalHighMgDl ||
      bg <= CLINICAL_THRESHOLDS.glucoseCriticalLowMgDl ||
      repeatedAbnormalBg
    ) {
      nutriScore -= 45;
      nutriStatusOverride = 'red';
      nutriFindings.push(
        `Abnormal blood glucose (${bg} mg/dL${repeatedAbnormalBg ? ', repeated across consecutive days' : ''}) — medical escalation warranted.`
      );
      pushAlert({
        id: 'alt-nutri-glucose-red',
        systemId: 'nutrition',
        organTarget: 'full_body',
        severity: 'red',
        escalationRequired: true,
        title: 'Repeated or critically abnormal blood glucose — escalate',
        rationale: `Glucose ${bg} mg/dL outside safe metabolic bounds (personal baseline ${astronaut.baseline.fastingGlucoseMgDl} mg/dL).`,
        recommendedAction: 'Repeat fasting glucose check and consult Crew Medical Officer.',
      });
    } else if (
      bg >= CLINICAL_THRESHOLDS.glucoseElevatedMgDl ||
      bg < CLINICAL_THRESHOLDS.generalGlucoseMinMgDl
    ) {
      nutriScore -= 25;
      nutriStatusOverride = 'orange';
      nutriFindings.push(
        `Glucose outside general fasting band (${bg} mg/dL vs ${astronaut.baseline.fastingGlucoseMgDl} mg/dL personal baseline).`
      );
      actions.push({
        id: 'act-nutri-bg',
        priority: 'today',
        systemId: 'nutrition',
        title: 'Confirm fasting blood glucose timing',
        detail: 'Re-measure fasting glucose prior to next meal cycle.',
      });
    } else if (bg > CLINICAL_THRESHOLDS.generalGlucoseMaxMgDl) {
      nutriScore -= 16;
      nutriFindings.push(`Mildly elevated glucose (${bg} mg/dL) — monitor at next check.`);
    }
  }

  const nutriStatus = nutriStatusOverride
    ? worstStatus(statusFromScore(clamp(nutriScore)), nutriStatusOverride)
    : statusFromScore(clamp(nutriScore));

  const nutriRanges: ReferenceRange[] = [
    buildRange({
      metric: 'Blood Glucose',
      unit: 'mg/dL',
      value: latestVital?.bloodGlucoseMgDl,
      generalReferenceRange: '70–125 mg/dL',
      personalBaseline: `${astronaut.baseline.fastingGlucoseMgDl} mg/dL fasting`,
      withinGeneral: (n) => n >= 70 && n <= 125,
      withinPersonal: (n) => Math.abs(n - astronaut.baseline.fastingGlucoseMgDl) <= 20,
    }),
    buildRange({
      metric: 'Daily Energy Intake',
      unit: 'kcal',
      value: latestCheckIn?.caloriesKcal ?? null,
      generalReferenceRange: '2200–3000 kcal',
      personalBaseline: `${astronaut.baseline.calorieTargetKcal} kcal`,
      withinGeneral: (n) => n >= 2000,
      withinPersonal: (n) => n >= astronaut.baseline.calorieTargetKcal * 0.85,
    }),
  ];

  // =========================================================================
  // 8. RADIATION DOSIMETRY
  // =========================================================================
  let radScore = 100;
  const radFindings: string[] = [];
  const radMissing: string[] = [];
  let radStatusOverride: HealthStatusLevel | null = null;

  if (!latestVital || !isPresent(latestVital.dailyRadiationMsv)) {
    radScore -= 15;
    radMissing.push('Daily dosimetry reading missing');
  } else {
    const dailyRad = latestVital.dailyRadiationMsv;
    const cumRad = latestVital.cumulativeRadiationMsv ?? 0;
    const budgetRatio = cumRad / astronaut.baseline.radiationBudgetMsv;

    if (
      dailyRad >= CLINICAL_THRESHOLDS.dailyRadiationOrangeMsv ||
      mission.environment.solarParticleAlert === 'storm_shelter' ||
      budgetRatio >= 0.85
    ) {
      radScore -= 36;
      radStatusOverride = 'orange';
      radFindings.push(
        `Elevated radiation exposure: ${dailyRad.toFixed(2)} mSv/day · Cumulative ${cumRad.toFixed(1)}/${astronaut.baseline.radiationBudgetMsv} mSv budget.`
      );
      pushAlert({
        id: 'alt-rad-orange',
        systemId: 'radiation',
        organTarget: 'full_body',
        severity: 'orange',
        escalationRequired: mission.environment.solarParticleAlert === 'storm_shelter',
        title: 'Radiation exposure / solar particle alert requires shielding action',
        rationale: `Daily dose ${dailyRad.toFixed(2)} mSv or SPE shelter state active.`,
        recommendedAction: 'Move to high-shielding storm zone and log dosimeter reading.',
      });
      actions.push({
        id: 'act-rad-shield',
        priority: 'immediate',
        systemId: 'radiation',
        title: 'Verify storm-shelter shielding & dosimeter sync',
        detail: 'Minimize unshielded EVA/hull-wall exposure until SPE clears.',
      });
    } else if (
      dailyRad >= CLINICAL_THRESHOLDS.dailyRadiationWatchMsv ||
      mission.environment.solarParticleAlert === 'elevated' ||
      budgetRatio >= 0.65
    ) {
      radScore -= 20;
      radFindings.push(
        `Daily dose ${dailyRad.toFixed(2)} mSv (> 1.20 mSv post-EVA/GCR watch band).`
      );
    }
  }

  const radStatus = radStatusOverride
    ? worstStatus(statusFromScore(clamp(radScore)), radStatusOverride)
    : statusFromScore(clamp(radScore));

  const radRanges: ReferenceRange[] = [
    buildRange({
      metric: 'Daily Ionizing Dose',
      unit: 'mSv',
      value: latestVital?.dailyRadiationMsv,
      formatter: (n) => n.toFixed(2),
      generalReferenceRange: '< 1.20 mSv/day',
      personalBaseline: `${astronaut.baseline.radiationBudgetMsv} mSv mission budget`,
      withinGeneral: (n) => n < CLINICAL_THRESHOLDS.dailyRadiationWatchMsv,
      withinPersonal: (n) => n < CLINICAL_THRESHOLDS.dailyRadiationWatchMsv,
    }),
  ];

  // Missing data alert if quality is partial or insufficient
  if (missingFields.length > 0) {
    alerts.push({
      id: `alt-data-quality-d${missionDay}`,
      systemId: 'cardiovascular',
      organTarget: 'full_body',
      severity: qualityTier === 'insufficient' ? 'orange' : 'yellow',
      escalationRequired: false,
      title: `Incomplete telemetry (${completenessPercent}% complete)`,
      rationale: dataQuality.note,
      recommendedAction: 'Capture missing biometric sensors or complete daily check-in.',
    });
  }

  // Assemble 8 Systems
  const makeSystem = (
    systemId: BodySystemId,
    score: number,
    status: HealthStatusLevel,
    referenceRanges: ReferenceRange[],
    findings: string[],
    missingIndicators: string[]
  ): SystemAssessment => {
    const k = SYSTEM_HAZARD_KNOWLEDGE[systemId];
    return {
      systemId,
      organTarget: k.organTarget,
      label: k.title,
      score: clamp(score),
      status,
      referenceRanges,
      findings,
      missingIndicators,
      spaceflightHazard: k.spaceflightHazard,
      plainLanguageSummary:
        findings.length > 0
          ? findings.join(' ')
          : missingIndicators.length > 0
          ? `Missing data (${missingIndicators.join(', ')}) — verify sensors rather than assuming normal.`
          : k.plainLanguageExplanation,
      recommendedActions: k.preventiveActions,
      escalationGuidance: k.escalationGuidance,
    };
  };

  const systems: Record<BodySystemId, SystemAssessment> = {
    brain: makeSystem('brain', brainScore, brainStatus, brainRanges, brainFindings, brainMissing),
    cardiovascular: makeSystem(
      'cardiovascular',
      cardioScore,
      cardioStatus,
      cardioRanges,
      cardioFindings,
      cardioMissing
    ),
    respiratory: makeSystem(
      'respiratory',
      respScore,
      respStatus,
      respRanges,
      respFindings,
      respMissing
    ),
    bone_muscle: makeSystem(
      'bone_muscle',
      boneScore,
      boneStatus,
      boneRanges,
      boneFindings,
      boneMissing
    ),
    behavioral: makeSystem(
      'behavioral',
      behScore,
      behStatus,
      behRanges,
      behFindings,
      behMissing
    ),
    hydration: makeSystem(
      'hydration',
      hydroScore,
      hydroStatus,
      hydroRanges,
      hydroFindings,
      hydroMissing
    ),
    nutrition: makeSystem(
      'nutrition',
      nutriScore,
      nutriStatus,
      nutriRanges,
      nutriFindings,
      nutriMissing
    ),
    radiation: makeSystem(
      'radiation',
      radScore,
      radStatus,
      radRanges,
      radFindings,
      radMissing
    ),
  };

  // Weighted Overall Mission-Readiness Score
  const weightedScore = clamp(
    (Object.keys(systems) as BodySystemId[]).reduce(
      (sum, id) => sum + systems[id].score * SYSTEM_WEIGHTS[id],
      0
    )
  );

  let overallStatus = statusFromScore(weightedScore);
  const escalationRequired = escalationReasons.length > 0;
  if (escalationRequired) {
    overallStatus = 'red';
  } else {
    (Object.values(systems) as SystemAssessment[]).forEach((sys) => {
      if (sys.status === 'red') overallStatus = 'red';
      else if (sys.status === 'orange' && overallStatus === 'green') overallStatus = 'yellow';
    });
  }

  // Sort alerts & actions by severity/priority
  const sevRank: Record<HealthStatusLevel, number> = { red: 0, orange: 1, yellow: 2, green: 3 };
  alerts.sort((a, b) => sevRank[a.severity] - sevRank[b.severity]);

  const priRank: Record<ActionItem['priority'], number> = { immediate: 0, today: 1, monitor: 2 };
  actions.sort((a, b) => priRank[a.priority] - priRank[b.priority]);

  if (actions.length === 0) {
    actions.push({
      id: 'act-nominal-routine',
      priority: 'monitor',
      systemId: 'hydration',
      title: 'Maintain baseline countermeasure & check-in cadence',
      detail: 'Continue scheduled exercise, hydration target, and evening crew check-in.',
    });
  }

  const nextBestAction = actions[0].title + ' — ' + actions[0].detail;

  return {
    astronautId: astronaut.id,
    missionDay,
    overallReadinessScore: weightedScore,
    overallStatus,
    escalationRequired,
    escalationReasons,
    dataQuality,
    systems,
    alerts,
    prioritizedActions: actions,
    nextBestAction,
    disclaimer: SAFETY_DISCLAIMER,
  };
}
