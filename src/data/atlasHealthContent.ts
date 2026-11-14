import type { OrganTarget } from '../types';

export const ATLAS_REFERENCE_RANGE_NOTE =
  'Reference ranges are general adult educational ranges and may not apply to spaceflight, individual physiology, measurement conditions, or an astronaut’s personal baseline. Arogya does not diagnose conditions. Contact your crew medical officer or flight surgeon for interpretation and care.';

export interface AtlasContentSpec {
  organ: OrganTarget;
  title: string;
  subtitle: string;
  expectedIndicators: string[];
  spaceflightRelevance: string[];
  recommendedActions: string[];
  nasaHazardTitle: string;
  nasaHazardSummary: string;
  escalationGuidance: string;
}

export const ATLAS_HEALTH_CONTENT: Record<OrganTarget, AtlasContentSpec> = {
  brain: {
    organ: 'brain',
    title: 'Mind, Sleep & Behavior',
    subtitle: 'Brain · Sleep Quality, Stress Load, Cognition & Behavioral Health',
    expectedIndicators: [
      'Sleep hours',
      'Sleep quality',
      'Mood',
      'Stress',
      'Fatigue',
      'Concentration self-report',
      'Symptoms: headache, poor concentration, anxiety, low mood',
    ],
    spaceflightRelevance: [
      'Isolation and confinement can affect mood, stress, sleep, and social connection.',
      'Sleep disruption can affect alertness, decision-making, and performance.',
      'Workload, noise, light exposure, and confinement may affect sleep quality.',
    ],
    recommendedActions: [
      'Follow a consistent sleep schedule.',
      'Reduce screen exposure before sleep.',
      'Use relaxation or breathing exercises.',
      'Schedule a crew connection check-in.',
      'Log symptoms and monitor trends.',
      'Contact behavioral-health support if symptoms persist or worsen.',
    ],
    nasaHazardTitle:
      'NASA HRP Risks: Behavioral Medicine, Isolation & Confinement, Sleep/Circadian Misalignment & SANS',
    nasaHazardSummary:
      'Microgravity cephalad fluid shifts, non-24-hour orbital lighting cycles, habitat noise, and deep-space communication latency can jointly strain sleep architecture, neuro-ocular comfort, and behavioral resilience.',
    escalationGuidance:
      'Persistent headache paired with visual changes, multi-day sleep deficit, or sustained low mood and stress may warrant attention—consider monitoring closely and contact the crew medical lead or behavioral-health support.',
  },
  heart: {
    organ: 'heart',
    title: 'Cardiovascular Health',
    subtitle: 'Heart · Resting Pulse, Blood Pressure, Activity & Fluid Balance',
    expectedIndicators: [
      'Resting heart rate',
      'Systolic blood pressure',
      'Diastolic blood pressure',
      'Exercise minutes',
      'Hydration',
      'Symptoms: chest discomfort, dizziness, shortness of breath',
    ],
    spaceflightRelevance: [
      'Altered gravity can contribute to cardiovascular deconditioning.',
      'Regular exercise supports cardiovascular and musculoskeletal health.',
      'Hydration and activity levels can affect heart-rate and blood-pressure readings.',
    ],
    recommendedActions: [
      'Recheck readings after rest and hydration when appropriate.',
      'Follow scheduled countermeasure exercise routines.',
      'Monitor trends rather than reacting to one isolated reading.',
      'Notify the crew medical lead for persistent abnormal readings or concerning symptoms.',
    ],
    nasaHazardTitle:
      'NASA HRP Risk: Cardiovascular Adaptations, Plasma Volume Shift & Orthostatic Intolerance',
    nasaHazardSummary:
      'Reduced gravitational loading lowers plasma volume and alters baroreceptor responsiveness, which can shift resting heart rate and blood pressure trends during transit and re-entry.',
    escalationGuidance:
      'Chest discomfort, dizziness, shortness of breath, or repeated resting heart rate or blood pressure readings outside expected bounds across consecutive days require contacting the crew medical lead promptly.',
  },
  lungs: {
    organ: 'lungs',
    title: 'Respiratory Health',
    subtitle: 'Lungs · Breathing Comfort, Oxygen Saturation & Cabin Environment',
    expectedIndicators: [
      'Shortness of breath',
      'Cough',
      'Chest discomfort',
      'Oxygen saturation, if available',
      'Activity tolerance',
      'Environmental symptoms',
    ],
    spaceflightRelevance: [
      'Closed environments require attention to air quality, ventilation, and respiratory symptoms.',
      'Respiratory symptoms should be monitored alongside activity tolerance and environmental conditions.',
    ],
    recommendedActions: [
      'Rest and monitor symptoms.',
      'Review recent activity, environment, and symptom history.',
      'Seek medical guidance for persistent or worsening respiratory symptoms.',
      'Escalate immediately for severe shortness of breath, chest pain, or fainting.',
    ],
    nasaHazardTitle:
      'NASA HRP Risk: Closed-Loop Spacecraft Atmosphere, Localized CO₂ Pockets & Particulate Exposure',
    nasaHazardSummary:
      'Without natural thermal convection in microgravity, exhaled carbon dioxide can accumulate in poorly ventilated zones, while dry cabin air or suit particulates can irritate airways.',
    escalationGuidance:
      'Persistent or worsening breathing symptoms, reduced activity tolerance, or lower SpO₂ readings warrant medical guidance. Escalate immediately for severe shortness of breath, chest pain, or fainting.',
  },
  full_body: {
    organ: 'full_body',
    title: 'Full-Body Health Overview',
    subtitle: 'Astronaut Body · Integrated Readiness, Vitals, Countermeasures & Radiation',
    expectedIndicators: [
      'Overall readiness score',
      'Sleep',
      'Mood',
      'Stress',
      'Hydration',
      'Exercise',
      'Resistance training',
      'Heart rate',
      'Blood pressure',
      'Temperature',
      'Blood glucose',
      'Radiation exposure',
      'Symptoms',
    ],
    spaceflightRelevance: [
      'Long-duration transit combines altered gravity, ionizing radiation, isolation, closed environmental systems, and distance from Earth medical support.',
      'Consistent daily sleep, hydration, nutrition, and aerobic plus resistive countermeasures work together to sustain mission readiness.',
      'Tracking multi-system trends against personal baselines helps spot early drift before symptoms escalate.',
    ],
    recommendedActions: [
      'Prioritize today’s top 2–3 countermeasure and monitoring actions.',
      'Review completed and missed health actions across sleep, hydration, and exercise.',
      'Complete daily check-ins and scheduled vital measurements consistently.',
      'Contact the crew medical lead early when multi-day trends drift or escalation flags appear.',
    ],
    nasaHazardTitle:
      'NASA HRP 5 Spaceflight Hazards · Altered Gravity, Radiation, Isolation, Closed Environment & Distance',
    nasaHazardSummary:
      'Integrated physiological monitoring links musculoskeletal countermeasures, fluid/metabolic balance, dosimetry budgets, and neuro-cardiorespiratory status into a single crew readiness overview.',
    escalationGuidance:
      'Chest pain, severe shortness of breath, fever with concerning symptoms, or repeated abnormal vital readings across consecutive days trigger the urgent escalation workflow—contact the crew medical lead immediately.',
  },
};
