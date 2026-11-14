export type CrewRole =
  | 'Commander'
  | 'Flight Engineer'
  | 'Mission Specialist'
  | 'Crew Medical Officer';

export interface AstronautBaseline {
  restingHeartRateBpm: number;
  systolicBpMmHg: number;
  diastolicBpMmHg: number;
  spo2Percent: number;
  bodyTempC: number;
  fastingGlucoseMgDl: number;
  sleepTargetHours: number;
  exerciseTargetMinutes: number;        // Daily aerobic/cardio countermeasure target
  resistanceTargetSessionsPerWeek: number; // ARED resistance-training sessions per week
  hydrationTargetLiters: number;
  calorieTargetKcal: number;
  radiationBudgetMsv: number;           // Mission cumulative ALARA budget (mSv)
  bodyMassKg?: number;                  // Pre-flight personal body mass baseline (kg)
}

export interface Astronaut {
  id: string;
  callSign: string;
  fullName: string;
  role: CrewRole;
  missionId: string;
  age: number;
  bloodType: string;
  evaHoursTotal: number;
  baseline: AstronautBaseline;
  focusNotes: string;
}
