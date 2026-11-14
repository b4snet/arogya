export interface ReferenceSource {
  id: string;
  title: string;
  organization: string;
  topic: string;
  url: string;
  summary: string;
}

export interface SpaceflightHazard {
  id: string;
  name: string;
  nasaCategory: string;
  physiologicalImpact: string;
  arogyaMonitoring: string;
}

export interface LicenseItem {
  name: string;
  category:
    | 'UI & Routing'
    | '3D Graphics'
    | 'Charts & Icons'
    | 'State & Cloud'
    | 'Typography'
    | 'Build Tooling';
  versionOrSource: string;
  license: string;
}

export interface AssetAttribution {
  id: string;
  assetName: string;
  type: '3D Geometry' | 'Background Media' | 'Typography';
  source: string;
  license: string;
  notes: string;
}

export const HOW_IT_WORKS_STEPS = [
  {
    step: '01',
    title: '60–90 Second Daily Check-In & Biometrics',
    detail:
      'Crew members log mood, stress, fatigue, pain, sleep, hydration, exercise, symptoms, and optional vital measurements. Unmeasured channels remain explicitly flagged as MISSING.',
  },
  {
    step: '02',
    title: 'Transparent Rule-Based Assessment Engine',
    detail:
      'Every input is evaluated deterministically against both the astronaut’s personal pre-flight baseline and general adult educational ranges across 8 physiological and behavioral systems.',
  },
  {
    step: '03',
    title: '3D Health Atlas & Longitudinal Vitals',
    detail:
      'Findings map directly onto an interactive 3D anatomical atlas (brain, heart, lungs, full body) and 7/14/30-day Recharts trend panels with spaceflight hazard explanations.',
  },
  {
    step: '04',
    title: 'Offline SBAR Briefings & Escalation Handoff',
    detail:
      'When warning indicators or mandatory escalation criteria appear, Arogya prepares structured Markdown, JSON, CSV, and printable PDF reports resilient to Mars communication lag.',
  },
] as const;

export const HEALTH_INDICATORS_GROUPS = [
  {
    group: 'Physiological Vital Signs',
    items: [
      'Resting heart rate (bpm) & HRV (ms)',
      'Systolic & diastolic blood pressure (mmHg)',
      'Body temperature (°C / °F)',
      'Oxygen saturation SpO₂ (%) & respiratory rate (/min)',
      'Blood glucose (mg/dL / mmol/L)',
      'Body mass stability (kg / lb)',
      'Daily & cumulative ionizing radiation dose (mSv)',
    ],
  },
  {
    group: 'Behavioral & Countermeasure Check-In',
    items: [
      'Sleep duration (hours) & subjective sleep quality (1–5)',
      'Mood, stress, fatigue & cognitive focus ratings (1–5)',
      'Pain severity & targeted symptom screening chips',
      'Appetite & daily fluid intake (liters / cups)',
      'Aerobic countermeasure minutes & ARED resistance sessions',
    ],
  },
  {
    group: 'Habitat & Transit Environment',
    items: [
      'Cabin CO₂ partial pressure (pCO₂ mmHg)',
      'Cabin pressure (kPa), oxygen (%), temperature & humidity',
      'Solar Particle Event (SPE) alert level',
      'One-way & round-trip Earth communication delay',
    ],
  },
] as const;

export const NASA_FIVE_HAZARDS: SpaceflightHazard[] = [
  {
    id: 'hazard-radiation',
    name: '1. Space Radiation',
    nasaCategory: 'Galactic Cosmic Rays & Solar Particle Events',
    physiologicalImpact:
      'Increased cumulative ionizing dose beyond Earth’s magnetosphere raises acute radiation sickness risk during SPEs and long-term degenerative tissue risk.',
    arogyaMonitoring:
      'Tracks daily mSv dosimetry, cumulative ALARA mission budget utilization, and solar particle shelter alerts.',
  },
  {
    id: 'hazard-isolation',
    name: '2. Isolation and Confinement',
    nasaCategory: 'Behavioral Health & Performance',
    physiologicalImpact:
      'Extended confinement, circadian desynchrony, and high workload can elevate stress, fragment sleep, and erode mood or cognitive focus.',
    arogyaMonitoring:
      'Monitors multi-day sleep debt, mood/stress drift, cognitive focus, and recommends protected recovery blocks.',
  },
  {
    id: 'hazard-distance',
    name: '3. Distance from Earth',
    nasaCategory: 'Autonomous Care & Communication Latency',
    physiologicalImpact:
      'Up to ~22-minute one-way light-time lag prevents real-time ground telemedicine during acute events.',
    arogyaMonitoring:
      'Operates 100% offline-first in local storage, surfaces next-best preventive actions, and formats SBAR handoffs for asynchronous flight surgeon review.',
  },
  {
    id: 'hazard-gravity',
    name: '4. Gravity Fields',
    nasaCategory: 'Microgravity & Altered-Gravity Adaptation',
    physiologicalImpact:
      'Cephalad fluid shifts contribute to Spaceflight Associated Neuro-ocular Syndrome (SANS), plasma volume loss, cardiovascular deconditioning, and bone/muscle unloading.',
    arogyaMonitoring:
      'Screens visual blur + headache combinations, tracks resting HR/BP shifts from personal baseline, and monitors ARED resistance & aerobic adherence.',
  },
  {
    id: 'hazard-environment',
    name: '5. Hostile / Closed Environments',
    nasaCategory: 'Closed-Loop Spacecraft Habitat',
    physiologicalImpact:
      'Elevated cabin pCO₂, closed air/water loops, and altered microbial ecology can trigger headaches, dyspnea, respiratory irritation, or fever.',
    arogyaMonitoring:
      'Pairs cabin pCO₂ telemetry with respiratory rate, SpO₂, body temperature, and symptom escalation triggers.',
  },
];

export const SPACEFLIGHT_REFERENCES: ReferenceSource[] = [
  {
    id: 'nasa-hrp-5-hazards',
    title: 'NASA Human Research Program: 5 Hazards of Human Spaceflight',
    organization: 'NASA Human Research Program (HRP)',
    topic: 'Core Deep-Space Hazard Framework',
    url: 'https://www.nasa.gov/hrp/5-hazards-of-human-spaceflight/',
    summary:
      'Foundational classification of Radiation, Isolation & Confinement, Distance from Earth, Gravity Fields, and Hostile/Closed Environments used to structure Arogya’s eight body-system assessments.',
  },
  {
    id: 'nasa-hrp-risks',
    title: 'NASA Human Research Program: Risks of Human Spaceflight (Human Research Roadmap)',
    organization: 'NASA Human Research Program (HRP)',
    topic: 'Human System Risk Evidence Base',
    url: 'https://humanresearchroadmap.nasa.gov/',
    summary:
      'Comprehensive evidence database detailing clinical, behavioral, sensorimotor, and environmental risks monitored across long-duration transit and planetary missions.',
  },
  {
    id: 'nasa-hrp-sans',
    title: 'Risk of Spaceflight Associated Neuro-ocular Syndrome (SANS)',
    organization: 'NASA Human Research Program (HRP)',
    topic: 'Neuro-Ocular & Cephalad Fluid Shift',
    url: 'https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=105',
    summary:
      'Documents microgravity cephalad fluid shifts and supports early symptom screening when headache co-occurs with visual changes.',
  },
  {
    id: 'nasa-hrp-cardio',
    title: 'Risk of Orthostatic Intolerance & Cardiovascular Deconditioning',
    organization: 'NASA Human Research Program (HRP)',
    topic: 'Cardiovascular & Plasma Volume',
    url: 'https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=88',
    summary:
      'Characterizes resting heart rate shifts, reduced HRV, and orthostatic stress across prolonged microgravity exposure.',
  },
  {
    id: 'nasa-hrp-co2',
    title: 'Spacecraft Maximum Allowable Concentrations & CO₂ Exposure',
    organization: 'NASA Johnson Space Center Toxicology & Environmental Chemistry',
    topic: 'Closed-Loop Cabin Atmosphere',
    url: 'https://www.nasa.gov/reference/spacecraft-maximum-allowable-concentrations/',
    summary:
      'Informs operational cabin partial pressure pCO₂ watch thresholds (< 3.0 mmHg) associated with headache and cognitive fatigue.',
  },
  {
    id: 'nasa-hrp-rad',
    title: 'Risk of Radiation Carcinogenesis & Acute Radiation Syndromes',
    organization: 'NASA Space Radiation Analysis Group (SRAG)',
    topic: 'GCR & Solar Particle Events',
    url: 'https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=95',
    summary:
      'Supports daily ionizing dosimetry surveillance, ALARA mission planning budgets, and solar particle storm-shelter protocols.',
  },
  {
    id: 'nasa-hrp-bhpc',
    title: 'Risk of Adverse Cognitive or Behavioral Conditions & Psychiatric Disorders',
    organization: 'NASA HRP Behavioral Health & Performance Element',
    topic: 'Sleep, Circadian Alignment & Mood',
    url: 'https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=99',
    summary:
      'Guides brief self-reported sleep, mood, fatigue, and stress check-ins for early preventive countermeasure adjustments.',
  },
];

export const THIRD_PARTY_ASSET_ATTRIBUTIONS: AssetAttribution[] = [
  {
    id: 'asset-procedural-3d',
    assetName: 'Anatomical 3D Crew & Organ Meshes (Astronaut, Brain, Heart, Lungs, Skeleton)',
    type: '3D Geometry',
    source: 'Authored procedural Three.js geometry in src/components/three/ProceduralOrganModels.tsx',
    license: 'MIT License (Project Source)',
    notes:
      'Provides guaranteed offline 3D visualization with zero external network reliance when optional /models/*.glb files are not present.',
  },
  {
    id: 'asset-drive-glb',
    assetName: 'Local 3D .glb Models (Astronaut, Brain, Heart, Lungs)',
    type: '3D Geometry',
    source: 'Project-provided files copied from 3d-models/',
    license: 'Unverified; confirm each original license before redistribution',
    notes:
      'Original asset files are preserved. Source and license records were not present in the workspace at audit time.',
  },
  {
    id: 'asset-poster-img',
    assetName: 'Dashboard Orbital Horizon Fallback Poster (dashboard_poster_1794643417554.jpg)',
    type: 'Background Media',
    source: 'Generated locally for Arogya Dashboard static backdrop',
    license: 'Bundled project asset (Offline)',
    notes:
      'Displayed automatically during reduced-motion mode, initial pre-load, or when no background video is supplied.',
  },
  {
    id: 'asset-drive-video',
    assetName: 'Dashboard Background Video (dashboard-background.mp4)',
    type: 'Background Media',
    source: 'Project-provided dashboard-background.mp4',
    license: 'Unverified; confirm the original creator and license before redistribution',
    notes:
      'Loaded locally with the supplied poster fallback, lazy loading, muted playback, tab-visibility pause, and reduced-motion suppression.',
  },
  {
    id: 'asset-fonts',
    assetName: 'IBM Plex Sans & IBM Plex Mono',
    type: 'Typography',
    source: 'IBM Corporation via Google Fonts',
    license: 'SIL Open Font License 1.1 (OFL-1.1)',
    notes:
      'Used for clinical body legibility and tabular numeric telemetry alignment.',
  },
];

export const OPEN_SOURCE_LICENSES: LicenseItem[] = [
  { name: 'React & React DOM', category: 'UI & Routing', versionOrSource: '^19.0.1', license: 'MIT License' },
  { name: 'React Router (react-router-dom)', category: 'UI & Routing', versionOrSource: '^7.18.5', license: 'MIT License' },
  { name: 'React Markdown', category: 'UI & Routing', versionOrSource: '10.1.0', license: 'MIT License' },
  { name: 'Tailwind CSS & @tailwindcss/vite', category: 'UI & Routing', versionOrSource: '^4.3.3', license: 'MIT License' },
  { name: 'Motion', category: 'UI & Routing', versionOrSource: '^12.23.24', license: 'MIT License' },
  { name: 'Three.js & @types/three', category: '3D Graphics', versionOrSource: '^0.187.0', license: 'MIT License' },
  { name: 'React Three Fiber (@react-three/fiber)', category: '3D Graphics', versionOrSource: '^9', license: 'MIT License' },
  { name: 'Drei (@react-three/drei)', category: '3D Graphics', versionOrSource: '^10', license: 'MIT License' },
  { name: 'Recharts', category: 'Charts & Icons', versionOrSource: '^3.10.1', license: 'MIT License' },
  { name: 'Lucide Icons (lucide-react)', category: 'Charts & Icons', versionOrSource: '^0.546.0', license: 'ISC License' },
  { name: 'Zustand', category: 'State & Cloud', versionOrSource: '^5.1.0', license: 'MIT License' },
  { name: 'Firebase JS SDK', category: 'State & Cloud', versionOrSource: '^13.3.0', license: 'Apache-2.0 License' },
  { name: 'IBM Plex Sans & IBM Plex Mono', category: 'Typography', versionOrSource: 'Google Fonts', license: 'SIL OFL 1.1' },
  { name: 'Vite & React plugin', category: 'Build Tooling', versionOrSource: 'Vite ^8.3.0 · @vitejs/plugin-react ^6.1.1', license: 'MIT License' },
  { name: 'TypeScript & esbuild', category: 'Build Tooling', versionOrSource: 'TypeScript ^7.0.2 · esbuild ^0.28.2', license: 'Apache-2.0 / MIT' },
  { name: 'Vitest', category: 'Build Tooling', versionOrSource: '5.1.0', license: 'MIT License' },
];
