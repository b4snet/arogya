/**
 * Full mission-profile phases for the Mission Control Center.
 *
 * Only the outbound transit segment is simulated by the current mission engine.
 * Every other phase is explicit planned context, never inferred telemetry.
 */

export const MISSION_PHASE_IDS = [
  'pre-launch',
  'launch',
  'earth-orbit',
  'transit',
  'station-operations',
  'return',
  'post-flight-recovery',
] as const;

export type MissionPhaseId = (typeof MISSION_PHASE_IDS)[number];
export type MissionPhaseStatus = 'completed' | 'active' | 'upcoming';
export type PhaseResearchStatus = 'direct' | 'context-only' | 'not-represented';

export interface MissionPhaseResearchContext {
  status: PhaseResearchStatus;
  badgeLabel: string;
  detail: string;
  timepoints: string[];
  analytes: string[];
}

export interface MissionPhaseDefinition {
  id: MissionPhaseId;
  label: string;
  plannedDurationDays: number;
  description: string;
  healthConsiderations: string[];
  research: MissionPhaseResearchContext;
}

export interface MissionPhaseTimelineItem extends MissionPhaseDefinition {
  profileStartDay: number;
  profileEndDay: number;
  status: MissionPhaseStatus;
  statusLabel: string;
  elapsedLabel: string;
  plannedDurationLabel: string;
}

export interface MissionPhaseTimeline {
  phases: MissionPhaseTimelineItem[];
  currentPhaseId: MissionPhaseId;
  transitDay: number;
  transitDurationDays: number;
  profileTotalDays: number;
  simulatedScopeNote: string;
}

const PLANNED_DURATIONS: Record<Exclude<MissionPhaseId, 'transit'>, number> = {
  'pre-launch': 30,
  launch: 1,
  'earth-orbit': 14,
  'station-operations': 300,
  return: 260,
  'post-flight-recovery': 30,
};

const OSD_575_TIME_POINTS = {
  preFlight: ['L-92', 'L-44', 'L-3'],
  postFlight: ['R+1', 'R+45', 'R+82', 'R+194'],
} as const;

const CMP_ANALYTES = [
  'glucose',
  'calcium',
  'creatinine',
  'eGFR',
  'ALT',
  'AST',
  'albumin',
  'sodium',
  'potassium',
] as const;

export const MISSION_PHASE_DEFINITIONS: MissionPhaseDefinition[] = [
  {
    id: 'pre-launch',
    label: 'Pre-launch',
    plannedDurationDays: PLANNED_DURATIONS['pre-launch'],
    description:
      'Final preparation before launch: crew baseline measurements, suit and seat checks, sleep scheduling, and confirmation that sensor and check-in workflows are ready.',
    healthConsiderations: [
      'Confirm personal baseline heart rate, blood pressure, sleep, hydration, and body mass before departure.',
      'Check wearable fit and the daily check-in workflow; missing readings must remain visibly missing.',
    ],
    research: {
      status: 'direct',
      badgeLabel: 'Research observation',
      detail:
        'The bundled OSD-575 serum CMP includes pre-flight timepoints L-92, L-44, and L-3. These are archived observations from a separate Earth-orbital mission, not this crew.',
      timepoints: [...OSD_575_TIME_POINTS.preFlight],
      analytes: [...CMP_ANALYTES],
    },
  },
  {
    id: 'launch',
    label: 'Launch',
    plannedDurationDays: PLANNED_DURATIONS.launch,
    description:
      'Launch and ascent. The simulation treats this as a short transition into Earth orbit and does not model launch physics or ascent telemetry.',
    healthConsiderations: [
      'Anticipate brief heart-rate and breathing-rate increases during ascent; compare only with the crew member’s own baseline.',
      'Confirm sensor contact and a complete first in-flight check-in before relying on any trend.',
    ],
    research: {
      status: 'context-only',
      badgeLabel: 'Research context only',
      detail:
        'OSD-575 contains no launch-day serum sample. The nearest bundled timepoint is L-3 pre-flight; no launch or in-flight change can be inferred.',
      timepoints: ['L-3'],
      analytes: [],
    },
  },
  {
    id: 'earth-orbit',
    label: 'Earth orbit',
    plannedDurationDays: PLANNED_DURATIONS['earth-orbit'],
    description:
      'Initial orbital checkout: the crew settles into the vehicle, exercises, sleeps on the mission schedule, and establishes in-flight baselines.',
    healthConsiderations: [
      'Watch for early fluid-shift effects, sleep disruption, and reduced exercise adherence.',
      'Track radiation dose, hydration, and appetite with explicit missing-data states.',
    ],
    research: {
      status: 'context-only',
      badgeLabel: 'Research context only',
      detail:
        'OSD-575 is an Earth-orbital mission, but the bundled CMP extract contains pre-flight and post-flight serum timepoints only. No in-orbit panel is included.',
      timepoints: [],
      analytes: [],
    },
  },
  {
    id: 'transit',
    label: 'Transit',
    plannedDurationDays: 0,
    description:
      'Outbound Mars transit under microgravity and closed-loop life support. Radiation, sleep, exercise, nutrition, and isolation are tracked through simulated check-ins and vitals.',
    healthConsiderations: [
      'Monitor cardiovascular deconditioning, musculoskeletal unloading, sleep debt, mood or stress drift, and cumulative radiation dose.',
      'Use check-in adherence and exercise logs as context, not as evidence of fitness for duty.',
    ],
    research: {
      status: 'not-represented',
      badgeLabel: 'No bundled OSD-575 sample',
      detail:
        'OSD-575 contains no Mars-transit serum samples. Its pre-flight and post-flight CMP observations cannot establish change during transit.',
      timepoints: [],
      analytes: [],
    },
  },
  {
    id: 'station-operations',
    label: 'Station operations',
    plannedDurationDays: PLANNED_DURATIONS['station-operations'],
    description:
      'Mars station operations after arrival: surface or orbital work, EVA planning, habitat upkeep, and recovery between task cycles. This phase is planned context only in the current transit-focused build.',
    healthConsiderations: [
      'Consider EVA workload, musculoskeletal fatigue, dust exposure, sleep timing, and recovery between operations.',
      'Station and surface operations are not simulated here; values remain illustrative or explicitly missing.',
    ],
    research: {
      status: 'not-represented',
      badgeLabel: 'No bundled OSD-575 sample',
      detail:
        'OSD-575 does not include Mars station or surface operations. Its serum timepoints cannot be used as station-operation observations.',
      timepoints: [],
      analytes: [],
    },
  },
  {
    id: 'return',
    label: 'Return',
    plannedDurationDays: PLANNED_DURATIONS.return,
    description:
      'Return leg from Mars. The simulation does not model return-leg trajectory or communications; this phase describes planned monitoring context only.',
    healthConsiderations: [
      'Monitor orthostatic symptoms, sleep and circadian re-adaptation, exercise tolerance, and recovery trends.',
      'No return-leg sensor data is simulated; do not infer change from the outbound-transit trend.',
    ],
    research: {
      status: 'context-only',
      badgeLabel: 'Research context only',
      detail:
        'OSD-575 post-flight recovery begins at R+1; no in-flight return-leg sample is included. R+1 is post-flight context, not return-leg monitoring.',
      timepoints: ['R+1'],
      analytes: [],
    },
  },
  {
    id: 'post-flight-recovery',
    label: 'Post-flight recovery',
    plannedDurationDays: PLANNED_DURATIONS['post-flight-recovery'],
    description:
      'Post-flight recovery and reintegration: gradual return to Earth gravity, sleep and activity re-adaptation, and follow-up of research observations.',
    healthConsiderations: [
      'Track return-to-baseline trends in vitals, sleep, mood, and activity; keep unresolved observations open for clinical review.',
      'Post-flight values are simulated; OSD-575 recovery samples are archived research context, not a medical finding.',
    ],
    research: {
      status: 'direct',
      badgeLabel: 'Research observation',
      detail:
        'Bundled OSD-575 recovery timepoints are R+1, R+45, R+82, and R+194, covering glucose, calcium, renal, liver, and electrolyte markers as archived research observations.',
      timepoints: [...OSD_575_TIME_POINTS.postFlight],
      analytes: [...CMP_ANALYTES],
    },
  },
];

const STATUS_LABELS: Record<MissionPhaseStatus, string> = {
  completed: 'Completed',
  active: 'Current phase',
  upcoming: 'Upcoming',
};

const SIMULATED_SCOPE_NOTE =
  'Only the outbound transit segment is simulated in this build. Pre-launch, launch, Earth-orbit, station, return, and recovery phases are planned profile context.';

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function formatDayWindow(startDay: number, endDay: number): string {
  return startDay === endDay ? `Profile day ${startDay}` : `Profile days ${startDay}–${endDay}`;
}

export function buildMissionPhaseTimeline(params: {
  transitDay: number;
  transitDurationDays: number;
}): MissionPhaseTimeline {
  const transitDurationDays = clampInteger(params.transitDurationDays, 60, 500);
  const transitDay = clampInteger(params.transitDay, 1, transitDurationDays);
  const profileTotalDays =
    PLANNED_DURATIONS['pre-launch'] +
    PLANNED_DURATIONS.launch +
    PLANNED_DURATIONS['earth-orbit'] +
    transitDurationDays +
    PLANNED_DURATIONS['station-operations'] +
    PLANNED_DURATIONS.return +
    PLANNED_DURATIONS['post-flight-recovery'];

  let cursor = 1;
  const phases = MISSION_PHASE_DEFINITIONS.map((definition) => {
    const duration = definition.id === 'transit' ? transitDurationDays : definition.plannedDurationDays;
    const profileStartDay = cursor;
    const profileEndDay = cursor + duration - 1;
    cursor = profileEndDay + 1;

    const status: MissionPhaseStatus =
      definition.id === 'transit'
        ? 'active'
        : definition.id === 'pre-launch' ||
            definition.id === 'launch' ||
            definition.id === 'earth-orbit'
          ? 'completed'
          : 'upcoming';

    const elapsedLabel =
      status === 'active'
        ? transitDay === transitDurationDays
          ? `Transit day ${transitDay} of ${transitDurationDays} · arrival day`
          : `Transit day ${transitDay} of ${transitDurationDays} simulated`
        : status === 'completed'
          ? 'Complete before transit day 1'
          : 'Not started';

    return {
      ...definition,
      plannedDurationDays: duration,
      profileStartDay,
      profileEndDay,
      status,
      statusLabel: STATUS_LABELS[status],
      elapsedLabel,
      plannedDurationLabel: `${duration} day${duration === 1 ? '' : 's'} planned`,
    };
  });

  return {
    phases,
    currentPhaseId: 'transit',
    transitDay,
    transitDurationDays,
    profileTotalDays,
    simulatedScopeNote: SIMULATED_SCOPE_NOTE,
  };
}

export function formatPhaseProfileWindow(phase: MissionPhaseTimelineItem): string {
  return formatDayWindow(phase.profileStartDay, phase.profileEndDay);
}

/** Roving-tab keyboard model for the timeline buttons. */
export function getPhaseNavigationIndex(
  currentIndex: number,
  key: string,
  phaseCount: number
): number | null {
  if (phaseCount <= 0) return null;
  const index = clampInteger(currentIndex, 0, phaseCount - 1);
  if (key === 'ArrowRight') return (index + 1) % phaseCount;
  if (key === 'ArrowLeft') return (index - 1 + phaseCount) % phaseCount;
  if (key === 'Home') return 0;
  if (key === 'End') return phaseCount - 1;
  return null;
}
