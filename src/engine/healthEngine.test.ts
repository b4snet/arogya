import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateHealthAssessment } from './healthEngine.ts';
import { SEED_ASTRONAUTS } from '../data/astronauts.ts';
import { SEED_MISSION } from '../data/missionData.ts';
import type { CheckIn, Mission, VitalReading } from '../types/index.ts';

const sharma = SEED_ASTRONAUTS[0];

function makeCheckIn(overrides: Partial<CheckIn> = {}): CheckIn {
  return {
    id: 'chk-test',
    astronautId: sharma.id,
    missionDay: 14,
    timestampIso: '2026-11-13T20:00:00Z',
    sleepHours: 7.5,
    sleepQuality: 4,
    moodScore: 4,
    stressLevel: 2,
    cognitiveFocus: 5,
    fatigueLevel: 2,
    hydrationLiters: 2.5,
    caloriesKcal: 2650,
    proteinGrams: 98,
    exerciseMinutes: 60,
    exerciseCompleted: true,
    resistanceTrainingCompleted: true,
    painScore: 0,
    symptoms: ['none'],
    crewNotes: '',
    syncedToGround: false,
    ...overrides,
  };
}

function makeVital(overrides: Partial<VitalReading> = {}): VitalReading {
  return {
    id: 'vit-test',
    astronautId: sharma.id,
    missionDay: 14,
    timestampIso: '2026-11-13T08:00:00Z',
    source: 'wearable_mock',
    heartRateBpm: 62,
    hrvMs: 58,
    systolicBpMmHg: 116,
    diastolicBpMmHg: 74,
    spo2Percent: 98,
    respiratoryRateBpm: 15,
    bodyTempC: 36.7,
    bloodGlucoseMgDl: 90,
    dailyRadiationMsv: 0.48,
    cumulativeRadiationMsv: 6.8,
    ...overrides,
  };
}

test('Baseline nominal crew member scores green with zero escalation', () => {
  const res = evaluateHealthAssessment(sharma, [makeCheckIn()], [makeVital()], SEED_MISSION);
  assert.equal(res.overallStatus, 'green');
  assert.equal(res.escalationRequired, false);
  assert.equal(res.dataQuality.qualityTier, 'complete');
  assert.equal(Object.keys(res.systems).length, 8);
});

test('Scenario 1: Sleep debt degrades Brain system and generates sleep recovery action', () => {
  const checkIns = [
    makeCheckIn({ missionDay: 13, sleepHours: 5.1 }),
    makeCheckIn({ missionDay: 14, sleepHours: 4.9 }),
  ];
  const res = evaluateHealthAssessment(sharma, checkIns, [makeVital()], SEED_MISSION);
  assert.ok(['yellow', 'orange'].includes(res.systems.brain.status));
  assert.ok(res.systems.brain.findings.some((f) => f.toLowerCase().includes('sleep debt')));
  assert.ok(res.prioritizedActions.some((a) => a.systemId === 'brain'));
});

test('Scenario 2: Exercise & resistance deficit flags Bone & Muscle system', () => {
  const checkIns = [
    makeCheckIn({ missionDay: 12, exerciseMinutes: 10, resistanceTrainingCompleted: false }),
    makeCheckIn({ missionDay: 13, exerciseMinutes: 0, resistanceTrainingCompleted: false }),
    makeCheckIn({ missionDay: 14, exerciseMinutes: 15, resistanceTrainingCompleted: false }),
  ];
  const res = evaluateHealthAssessment(sharma, checkIns, [makeVital()], SEED_MISSION);
  assert.notEqual(res.systems.bone_muscle.status, 'green');
  assert.ok(res.systems.bone_muscle.findings.some((f) => f.includes('Exercise deficit')));
});

test('Scenario 3: High blood pressure (single orange, repeated red escalation)', () => {
  const singleHigh = evaluateHealthAssessment(
    sharma,
    [makeCheckIn()],
    [makeVital({ systolicBpMmHg: 146, diastolicBpMmHg: 94 })],
    SEED_MISSION
  );
  assert.equal(singleHigh.systems.cardiovascular.status, 'orange');
  assert.equal(singleHigh.escalationRequired, false);

  const repeatedHigh = evaluateHealthAssessment(
    sharma,
    [makeCheckIn()],
    [
      makeVital({ missionDay: 13, systolicBpMmHg: 144, diastolicBpMmHg: 92 }),
      makeVital({ missionDay: 14, systolicBpMmHg: 148, diastolicBpMmHg: 95 }),
    ],
    SEED_MISSION
  );
  assert.equal(repeatedHigh.systems.cardiovascular.status, 'red');
  assert.equal(repeatedHigh.escalationRequired, true);
});

test('Scenario 4: Fever with concerning symptoms escalates to red', () => {
  const res = evaluateHealthAssessment(
    sharma,
    [makeCheckIn({ symptoms: ['fever_chills', 'headache'] })],
    [makeVital({ bodyTempC: 38.4 })],
    SEED_MISSION
  );
  assert.equal(res.overallStatus, 'red');
  assert.equal(res.escalationRequired, true);
  assert.ok(res.escalationReasons.some((r) => r.toLowerCase().includes('fever')));
});

test('Scenario 5: Abnormal blood glucose flags Nutrition & repeated abnormal escalates', () => {
  const singleAbnormal = evaluateHealthAssessment(
    sharma,
    [makeCheckIn()],
    [makeVital({ bloodGlucoseMgDl: 158 })],
    SEED_MISSION
  );
  assert.equal(singleAbnormal.systems.nutrition.status, 'orange');

  const repeatedAbnormal = evaluateHealthAssessment(
    sharma,
    [makeCheckIn()],
    [
      makeVital({ missionDay: 13, bloodGlucoseMgDl: 162 }),
      makeVital({ missionDay: 14, bloodGlucoseMgDl: 170 }),
    ],
    SEED_MISSION
  );
  assert.equal(repeatedAbnormal.systems.nutrition.status, 'red');
  assert.equal(repeatedAbnormal.escalationRequired, true);
});

test('Scenario 6: Radiation exposure spike & SPE storm shelter', () => {
  const stormMission: Mission = {
    ...SEED_MISSION,
    environment: { ...SEED_MISSION.environment, solarParticleAlert: 'storm_shelter' },
  };
  const res = evaluateHealthAssessment(
    sharma,
    [makeCheckIn()],
    [makeVital({ dailyRadiationMsv: 2.35, cumulativeRadiationMsv: 132 })],
    stormMission
  );
  assert.equal(res.systems.radiation.status, 'orange');
  assert.equal(res.escalationRequired, true);
});

test('Scenario 7: Sustained low mood and high stress flags Behavioral Health', () => {
  const checkIns = [
    makeCheckIn({ missionDay: 12, moodScore: 2, stressLevel: 4 }),
    makeCheckIn({ missionDay: 13, moodScore: 2, stressLevel: 5 }),
    makeCheckIn({ missionDay: 14, moodScore: 2, stressLevel: 4 }),
  ];
  const res = evaluateHealthAssessment(sharma, checkIns, [makeVital()], SEED_MISSION);
  assert.notEqual(res.systems.behavioral.status, 'green');
  assert.ok(res.alerts.some((a) => a.systemId === 'behavioral'));
});

test('Scenario 8: Chest pain, severe shortness of breath, and missing data safety rules', () => {
  const chestPain = evaluateHealthAssessment(
    sharma,
    [makeCheckIn({ symptoms: ['chest_pain'] })],
    [makeVital()],
    SEED_MISSION
  );
  assert.equal(chestPain.overallStatus, 'red');
  assert.equal(chestPain.escalationRequired, true);

  const sob = evaluateHealthAssessment(
    sharma,
    [makeCheckIn({ symptoms: ['severe_shortness_of_breath'] })],
    [makeVital()],
    SEED_MISSION
  );
  assert.equal(sob.overallStatus, 'red');
  assert.equal(sob.escalationRequired, true);

  // Missing data must NEVER be treated as normal
  const missingVitals = evaluateHealthAssessment(
    sharma,
    [makeCheckIn()],
    [makeVital({ bloodGlucoseMgDl: null, systolicBpMmHg: null, bodyTempC: null })],
    SEED_MISSION
  );
  assert.ok(missingVitals.dataQuality.completenessPercent < 100);
  assert.ok(missingVitals.dataQuality.missingFields.includes('Blood Glucose'));
  assert.ok(missingVitals.systems.nutrition.missingIndicators.length > 0);
});

test('Scenario 9: Fainting, severe allergic reaction, and rapidly worsening symptoms unconditionally escalate to red', () => {
  for (const urgentSymptom of [
    'fainting',
    'severe_allergic_reaction',
    'rapidly_worsening',
  ] as const) {
    const res = evaluateHealthAssessment(
      sharma,
      [makeCheckIn({ symptoms: [urgentSymptom] })],
      [makeVital()],
      SEED_MISSION
    );
    assert.equal(res.overallStatus, 'red', `${urgentSymptom} must set overallStatus red`);
    assert.equal(res.escalationRequired, true, `${urgentSymptom} must trigger escalation`);
    assert.ok(
      res.prioritizedActions.some((a) => a.priority === 'immediate'),
      `${urgentSymptom} must include immediate escalation action`
    );
    assert.ok(
      res.nextBestAction.toLowerCase().includes('crew medical') ||
        res.nextBestAction.toLowerCase().includes('flight surgeon'),
      `${urgentSymptom} nextBestAction must direct to crew medical officer or flight surgeon`
    );
  }
});
