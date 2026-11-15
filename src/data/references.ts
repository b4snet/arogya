import programmeErizonProvenance from './programmeErizonProvenance.json';

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
  creator?: string;
  sourceUrl?: string;
  licenseUrl?: string;
  copyrightNotice?: string;
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
    id: programmeErizonProvenance.id,
    assetName: `${programmeErizonProvenance.title} spacecraft model`,
    type: '3D Geometry',
    source: programmeErizonProvenance.source,
    creator: programmeErizonProvenance.creator,
    sourceUrl: programmeErizonProvenance.sourceUrl,
    license: `${programmeErizonProvenance.licenseShortName} (separate third-party asset license)`,
    licenseUrl: programmeErizonProvenance.licenseUrl,
    notes:
      `Creator, title, source, and license were verified against the official Sketchfab source page on ${programmeErizonProvenance.sourcePageVerifiedAt}. The original GLB is included unchanged (SHA-256 ${programmeErizonProvenance.sha256}), with no re-export, decimation, retopology, or other derivative. ${programmeErizonProvenance.commercialUse} ${programmeErizonProvenance.derivatives} Arogya code MIT licensing does not cover this asset.`,
  },
  {
    id: 'asset-procedural-3d',
    assetName: 'Procedural Astronaut Fallback, Organ Illustrations & Mission Spacecraft Fallback',
    type: '3D Geometry',
    source: 'Arogya-authored Three.js geometry in src/components/three/ProceduralOrganModels.tsx and ProceduralSpaceship.tsx',
    license: 'MIT License (Project Source)',
    notes:
      'Used for Vitals organ illustrations, the static astronaut fallback when WebGL or the GLB fails, and the automatic Mission fallback when the Programme ERIZON GLB cannot load. Illustrative project geometry; no third-party model file is used here.',
  },
  {
    id: 'asset-local-astronaut-glb',
    assetName: 'Astronaut GLB — dashboard model',
    type: '3D Geometry',
    source: 'Sketchfab metadata embedded in the GLB',
    creator: 'Jungle Jim',
    sourceUrl: 'https://sketchfab.com/3d-models/astronaut-by-jungle-jim-c775a977606a4e4e990afe783c6bc845',
    license: 'License unverified — embedded metadata states CC BY 4.0; source page not independently verified',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    notes:
      'Included in the release as models/astronaut.glb (1,804,556 bytes; SHA-256 b60ccce157bbbda177deda47e29bff248e00765f757ebc9fe04e064e50f96046). Embedded title: “Astronaut by Jungle Jim”. The Sketchfab source page was not independently accessible during this pass, so the embedded licence claim is unverified and no redistribution permission is inferred beyond it.',
  },
  {
    id: 'asset-local-brain-glb',
    assetName: 'Brain GLB — local development only',
    type: '3D Geometry',
    source: 'Embedded GLB asset metadata',
    license: 'No creator, source, or license notice found in embedded metadata',
    notes:
      'The embedded generator field identifies Microsoft GLTF Exporter 2.8.3.32, not the model creator or rights holder. Excluded from the public release pending source and permission review.',
  },
  {
    id: 'asset-local-heart-glb',
    assetName: 'Heart GLB — local development only',
    type: '3D Geometry',
    source: 'Sketchfab metadata embedded in the GLB',
    creator: 'neshallads',
    sourceUrl: 'https://sketchfab.com/3d-models/realistic-human-heart-3f8072336ce94d18b3d0d055a1ece089',
    license: 'Embedded metadata states CC BY 4.0; source-page verification pending',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    notes:
      'Embedded title: “Realistic Human Heart”. The Sketchfab source page returned HTTP 403 during this pass. Not included in the public release; no redistribution permission is inferred from the local file.',
  },
  {
    id: 'asset-local-lungs-glb',
    assetName: 'Lungs GLB — local development only',
    type: '3D Geometry',
    source: 'Sketchfab metadata embedded in the GLB',
    creator: 'neshallads',
    sourceUrl: 'https://sketchfab.com/3d-models/realistic-human-lungs-ce09f4099a68467880f46e61eb9a3531',
    license: 'Embedded metadata states CC BY 4.0; source-page verification pending',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    notes:
      'Embedded title: “Realistic Human Lungs”. The Sketchfab source page returned HTTP 403 during this pass. Not included in the public release; no redistribution permission is inferred from the local file.',
  },
  {
    id: 'asset-local-poster-img',
    assetName: 'Dashboard poster image — local development only',
    type: 'Background Media',
    source: 'Local file src/assets/images/dashboard_poster_1794643417554.jpg; no external source record supplied',
    license: 'Unverified; no creator or license record available',
    notes:
      'The prior description called this locally generated, but no provenance or license evidence is recorded. It is not shipped; the public release uses an original CSS starfield instead.',
  },
  {
    id: 'asset-local-dashboard-video',
    assetName: 'Dashboard background video',
    type: 'Background Media',
    source: 'Project-provided dashboard-background.mp4',
    license: 'License unverified — no creator, original source, or license record available',
    notes:
      'Included in the release as videos/dashboard-background.mp4 (965,925 bytes; ≈16.1 s; SHA-256 f3a84c95ed8a17634294e4a6855f14f89c32117d141b9491308129dd70908b0e). Embedded MP4 metadata contains only the Lavf 63.1.101 encoder tag; it does not identify a creator or license. The licence must be verified before relying on this media outside the prototype.',
  },
  {
    id: 'asset-local-unused-aistudio-image',
    assetName: 'Unused AI Studio PNG — not used by the application',
    type: 'Background Media',
    source: 'public/assets/aistudio/image_74130baa.png; no source record supplied',
    license: 'Unverified; no creator, source, or license record available',
    notes:
      'No application runtime reference was found. It is not included in the public release artifact.',
  },
  {
    id: 'asset-fonts',
    assetName: 'IBM Plex Sans & IBM Plex Mono',
    type: 'Typography',
    source: 'IBM Plex — IBM/plex (loaded remotely through Google Fonts)',
    sourceUrl: 'https://github.com/IBM/plex',
    license: 'SIL Open Font License 1.1 (OFL-1.1)',
    licenseUrl: 'https://github.com/IBM/plex/blob/master/LICENSE.txt',
    notes:
      'IBM’s official repository confirms the OFL-1.1 license. Fonts are fetched from Google Fonts at runtime and are not bundled as binary files in the release artifact.',
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
