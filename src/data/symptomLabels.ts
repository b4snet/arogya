import type { SymptomTag } from '../types';

export const SYMPTOM_LABELS: Record<SymptomTag, string> = {
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
