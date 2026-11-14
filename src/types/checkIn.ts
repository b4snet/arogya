export type SymptomTag =
  | 'none'
  | 'chest_pain'
  | 'shortness_of_breath'
  | 'severe_shortness_of_breath'
  | 'fainting'
  | 'severe_allergic_reaction'
  | 'rapidly_worsening'
  | 'fever_chills'
  | 'headache'
  | 'visual_blur'
  | 'nasal_congestion'
  | 'dizziness'
  | 'muscle_soreness'
  | 'sleep_fragmentation'
  | 'nausea'
  | 'back_pain'
  | 'skin_irritation'
  | 'poor_concentration'
  | 'anxiety'
  | 'low_mood';

export type PainLevel = 'none' | 'mild' | 'moderate' | 'severe';
export type AppetiteLevel = 'poor' | 'normal' | 'increased';

export interface CheckIn {
  id: string;
  astronautId: string;
  missionDay: number;
  timestampIso: string;
  sleepHours: number;
  sleepQuality: 1 | 2 | 3 | 4 | 5;
  moodScore: 1 | 2 | 3 | 4 | 5;
  stressLevel: 1 | 2 | 3 | 4 | 5;
  cognitiveFocus: 1 | 2 | 3 | 4 | 5;
  fatigueLevel: 1 | 2 | 3 | 4 | 5;
  hydrationLiters: number;
  caloriesKcal: number;
  proteinGrams: number;
  exerciseMinutes: number;
  exerciseCompleted: boolean;
  resistanceTrainingCompleted: boolean;
  resistanceMinutes?: number;
  painScore: number; // 0 - 10
  painLevel?: PainLevel;
  appetite?: AppetiteLevel;
  symptoms: SymptomTag[];
  crewNotes: string;
  shareWithMedicalLead?: boolean;
  syncedToGround: boolean;
}
