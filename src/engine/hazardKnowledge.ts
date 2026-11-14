import type { BodySystemId, OrganTarget } from '../types';

export interface SystemKnowledge {
  systemId: BodySystemId;
  organTarget: OrganTarget;
  title: string;
  nasaHazard: string;
  whyItMatters: string;
  spaceflightHazard: string;
  plainLanguageExplanation: string;
  preventiveActions: string[];
  escalationGuidance: string;
}

export const SYSTEM_HAZARD_KNOWLEDGE: Record<BodySystemId, SystemKnowledge> = {
  brain: {
    systemId: 'brain',
    organTarget: 'brain',
    title: 'Brain & Neuro-Ocular',
    nasaHazard:
      'NASA HRP Risk: Spaceflight Associated Neuro-ocular Syndrome (SANS) & Sleep / Circadian Misalignment',
    whyItMatters:
      'Alertness, spatial orientation, and complex spacecraft procedure safety depend directly on restorative sleep and stable intracranial fluid balance.',
    spaceflightHazard:
      'Microgravity shifts body fluids toward the head (cephalad shift), which can contribute to Spaceflight Associated Neuro-ocular Syndrome (SANS), while 90-minute light cycles and elevated cabin CO₂ impair restorative sleep.',
    plainLanguageExplanation:
      'Tracking sleep duration against personal targets alongside headache or visual changes helps detect circadian debt and fluid-shift strain early.',
    preventiveActions: [
      'Protect scheduled sleep blocks and dim cabin task lighting 60 minutes prior to rest.',
      'Check local rack ventilation and cabin pCO₂ if waking headaches occur.',
    ],
    escalationGuidance:
      'Persistent headache paired with visual blur or sleep below target across multiple days warrants review with the crew medical officer.',
  },
  cardiovascular: {
    systemId: 'cardiovascular',
    organTarget: 'heart',
    title: 'Cardiovascular',
    nasaHazard:
      'NASA HRP Risk: Cardiovascular Adaptations, Arrhythmia Screening & Orthostatic Intolerance',
    whyItMatters:
      'Maintaining autonomic reserve and stable blood pressure is critical for high-workload EVAs and safe transition back into planetary gravity.',
    spaceflightHazard:
      'Microgravity reduces plasma volume by 10–15% and alters baroreceptor tone, which can elevate resting heart rate, lower HRV, or shift blood pressure.',
    plainLanguageExplanation:
      'Comparing heart rate and blood pressure to both general limits and your personal pre-flight baseline distinguishes normal exertion from sustained autonomic strain.',
    preventiveActions: [
      'Maintain consistent daily fluid and electrolyte intake, especially post-EVA.',
      'Capture resting heart rate and blood pressure seated before stimulants.',
    ],
    escalationGuidance:
      'Chest pain, dizziness, or repeated elevated blood pressure / tachycardia across consecutive days requires immediate crew medical officer escalation.',
  },
  respiratory: {
    systemId: 'respiratory',
    organTarget: 'lungs',
    title: 'Respiratory & Cabin Air',
    nasaHazard:
      'NASA HRP Risk: Closed-Loop Spacecraft Atmosphere, CO₂ Pockets & Particulate / Suit Dust Exposure',
    whyItMatters:
      'Without natural Earth convection in microgravity, exhaled CO₂ can pool around crew members and silently trigger headaches, air hunger, or cognitive slowing.',
    spaceflightHazard:
      'Closed-loop spacecraft environments can develop localized CO₂ pockets, and suit/surface dust can irritate upper airways.',
    plainLanguageExplanation:
      'Pulse oximetry (SpO₂), breathing rate, and cabin pCO₂ together show whether symptoms relate to air circulation or personal gas exchange.',
    preventiveActions: [
      'Confirm sleeping-quarter airflow fans are clear and running nominally.',
      'Re-check SpO₂ after 5 minutes of calm rest if a single border reading appears.',
    ],
    escalationGuidance:
      'Severe shortness of breath or SpO₂ below 92% requires immediate medical escalation.',
  },
  bone_muscle: {
    systemId: 'bone_muscle',
    organTarget: 'full_body',
    title: 'Bone & Muscle',
    nasaHazard:
      'NASA HRP Risk: Skeletal Bone Mineral Loss & Microgravity Muscle Atrophy',
    whyItMatters:
      'Preserving bone density and core/lower-limb strength prevents fractures and ensures crew members can perform emergency egress and Mars surface operations.',
    spaceflightHazard:
      'Mechanical unloading in microgravity accelerates bone mineral resorption and skeletal muscle atrophy unless countered by daily aerobic and ARED resistive exercise.',
    plainLanguageExplanation:
      'Tracking daily exercise minutes and weekly resistance-training sessions preserves musculoskeletal strength for EVA and landing.',
    preventiveActions: [
      'Complete scheduled ARED resistive and treadmill/cycle countermeasure blocks.',
      'Log muscle soreness early so training loads can be adjusted safely.',
    ],
    escalationGuidance:
      'Multi-day exercise deficits or high musculoskeletal pain (>= 7/10) should be reviewed with the crew medical officer.',
  },
  behavioral: {
    systemId: 'behavioral',
    organTarget: 'brain',
    title: 'Behavioral Health',
    nasaHazard:
      'NASA HRP Risk: Isolation, Confinement, Communication Latency & Behavioral Performance Decrement',
    whyItMatters:
      'On deep-space Mars transits, up to 20+ minute one-way communication delays require crews to spot cumulative stress and fatigue early and self-regulate.',
    spaceflightHazard:
      'Isolation, confinement, communication latency, and high mission tempo can compound stress, fatigue, and mood drift over multi-month transits.',
    plainLanguageExplanation:
      'Short daily mood, stress, and cognitive-focus check-ins catch gradual strain before it degrades crew cohesion or decision quality.',
    preventiveActions: [
      'Schedule protected personal downtime and asynchronous family video messages.',
      'Flag workload bottlenecks during daily crew coordination.',
    ],
    escalationGuidance:
      'Sustained low mood (<= 2/5) or high stress (>= 4/5) across 3+ days warrants supportive review with the crew medical officer or behavioral flight lead.',
  },
  hydration: {
    systemId: 'hydration',
    organTarget: 'full_body',
    title: 'Hydration',
    nasaHazard:
      'NASA HRP Risk: Renal Stone Formation & Altered Fluid/Electrolyte Regulation',
    whyItMatters:
      'Microgravity bone calcium loss combined with low fluid intake significantly raises kidney stone risk during long-duration missions.',
    spaceflightHazard:
      'Blunted thirst signaling in microgravity and heavy EVA cooling-garment perspiration increase dehydration and renal stone risk.',
    plainLanguageExplanation:
      'Meeting daily liter targets protects plasma volume, thermoregulation, and cognitive alertness.',
    preventiveActions: [
      'Use timed fluid intake reminders across work shifts and post-exercise recovery.',
    ],
    escalationGuidance:
      'Persistent hydration below 65% of personal target paired with lightheadedness warrants medical officer guidance.',
  },
  nutrition: {
    systemId: 'nutrition',
    organTarget: 'full_body',
    title: 'Nutrition & Metabolism',
    nasaHazard:
      'NASA HRP Risk: Inadequate Nutrition, Lean Mass Loss & Metabolic Stress Dysregulation',
    whyItMatters:
      'Sustained caloric or protein shortfalls accelerate muscle loss, immune suppression, and fatigue across multi-month spaceflight.',
    spaceflightHazard:
      'Spaceflight altered taste perception and schedule pressure can lead to caloric deficit, while stress hormones and sleep debt can perturb blood glucose.',
    plainLanguageExplanation:
      'Tracking daily calorie intake and blood glucose against both general ranges and personal fasting baselines supports metabolic stability.',
    preventiveActions: [
      'Pair complex carbohydrates with adequate protein (target >= 80 g/day) around resistive training.',
      'Re-check fasting glucose prior to meal intake if an out-of-range value is flagged.',
    ],
    escalationGuidance:
      'Repeatedly abnormal glucose (< 60 or > 200 mg/dL, or repeated > 140 mg/dL) warrants flight surgeon consultation.',
  },
  radiation: {
    systemId: 'radiation',
    organTarget: 'full_body',
    title: 'Radiation Dosimetry',
    nasaHazard:
      'NASA HRP Risk: Space Radiation Carcinogenesis, Acute Solar Particle Events (SPE) & CNS Effects',
    whyItMatters:
      'Once outside Earth’s protective geomagnetic field, crews require continuous dosimetry tracking to trigger storm-shelter procedures promptly.',
    spaceflightHazard:
      'Beyond Earth’s magnetosphere, Galactic Cosmic Rays (GCR) and Solar Particle Events (SPE) elevate cumulative ionizing dose.',
    plainLanguageExplanation:
      'Monitoring daily mSv exposure against the mission ALARA budget ensures timely storm-shelter precautions.',
    preventiveActions: [
      'Verify personal dosimeter badge placement and follow vehicle shielding alerts promptly.',
    ],
    escalationGuidance:
      'Daily dose > 2.0 mSv, active SPE storm alert, or cumulative dose >= 85% of mission budget warrants flight surgeon review.',
  },
};

export const ORGAN_HAZARD_KNOWLEDGE = {
  brain: {
    organ: 'brain' as OrganTarget,
    title: SYSTEM_HAZARD_KNOWLEDGE.brain.title,
    subtitle: 'Circadian alignment, cephalad fluid shift, and behavioral load',
    spaceflightHazard: SYSTEM_HAZARD_KNOWLEDGE.brain.spaceflightHazard,
    plainLanguageExplanation: SYSTEM_HAZARD_KNOWLEDGE.brain.plainLanguageExplanation,
    preventiveActions: SYSTEM_HAZARD_KNOWLEDGE.brain.preventiveActions,
    escalationGuidance: SYSTEM_HAZARD_KNOWLEDGE.brain.escalationGuidance,
    referenceSummary: 'Sleep vs personal target · Mood >= 3/5 · Cabin pCO₂ < 3.0 mmHg',
  },
  heart: {
    organ: 'heart' as OrganTarget,
    title: SYSTEM_HAZARD_KNOWLEDGE.cardiovascular.title,
    subtitle: 'Resting HR, HRV autonomic tone, and blood pressure',
    spaceflightHazard: SYSTEM_HAZARD_KNOWLEDGE.cardiovascular.spaceflightHazard,
    plainLanguageExplanation: SYSTEM_HAZARD_KNOWLEDGE.cardiovascular.plainLanguageExplanation,
    preventiveActions: SYSTEM_HAZARD_KNOWLEDGE.cardiovascular.preventiveActions,
    escalationGuidance: SYSTEM_HAZARD_KNOWLEDGE.cardiovascular.escalationGuidance,
    referenceSummary: 'General HR 50–90 bpm · General BP 95–130 / 60–85 mmHg',
  },
  lungs: {
    organ: 'lungs' as OrganTarget,
    title: SYSTEM_HAZARD_KNOWLEDGE.respiratory.title,
    subtitle: 'Oxygen saturation, breathing rate, and cabin pCO₂',
    spaceflightHazard: SYSTEM_HAZARD_KNOWLEDGE.respiratory.spaceflightHazard,
    plainLanguageExplanation: SYSTEM_HAZARD_KNOWLEDGE.respiratory.plainLanguageExplanation,
    preventiveActions: SYSTEM_HAZARD_KNOWLEDGE.respiratory.preventiveActions,
    escalationGuidance: SYSTEM_HAZARD_KNOWLEDGE.respiratory.escalationGuidance,
    referenceSummary: 'SpO₂ 95–100% · Resp Rate 12–20 /min · Cabin pCO₂ < 3.0 mmHg',
  },
  full_body: {
    organ: 'full_body' as OrganTarget,
    title: 'Whole-Body Systems (Bone/Muscle, Hydration, Nutrition, Radiation)',
    subtitle: 'Countermeasures, metabolic balance, and ionizing dose',
    spaceflightHazard: SYSTEM_HAZARD_KNOWLEDGE.bone_muscle.spaceflightHazard,
    plainLanguageExplanation: SYSTEM_HAZARD_KNOWLEDGE.bone_muscle.plainLanguageExplanation,
    preventiveActions: [
      ...SYSTEM_HAZARD_KNOWLEDGE.bone_muscle.preventiveActions,
      ...SYSTEM_HAZARD_KNOWLEDGE.hydration.preventiveActions,
    ],
    escalationGuidance: SYSTEM_HAZARD_KNOWLEDGE.radiation.escalationGuidance,
    referenceSummary: 'ARED + Aerobic targets · Hydration & Calorie targets · ALARA Budget',
  },
};
