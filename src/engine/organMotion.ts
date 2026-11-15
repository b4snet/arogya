/**
 * Logic for the illustrative heart/lung motion panel on the Vitals page.
 *
 * Everything here is deliberately pure so the mapping, timing and accessibility
 * decisions can be tested without a WebGL context.
 *
 * Hard rules encoded below:
 * - A highlighted organ is a *related body system*, never a disease location.
 * - No heart region, coronary territory or lung lobe is ever localized.
 * - Breathing rate comes only from an actual respiratory-rate observation, else it is a
 *   labelled demonstration rate. SpO₂ is never used to infer a breathing rate.
 * - No diagnosis, lesion marker or imaging interpretation is produced.
 */

import type { HealthStatusLevel, VitalReading } from '../types';
import type { VitalReferenceRow } from './vitalsReference';

export const ORGAN_MOTION_DISCLAIMER = 'Illustrative — not diagnostic imaging.';

export const ORGAN_MOTION_LIMITATIONS: readonly string[] = [
  'Mesh scaling is a stylized proxy for a pump or breathing cycle. It does not reproduce cardiac mechanics, chamber contraction, valve motion, or gas exchange.',
  'The model highlights a whole organ only. No heart region, coronary territory or lung lobe is localized, because this app holds no reviewed imaging or localization data.',
  'A highlighted organ means “related body system”, never “disease located here”. Flags are threshold comparisons, not a diagnosis.',
  'No lesion markers, overlays, or diagnostic labels are generated for illustrations or uploaded images.',
  'Demonstration rates are labelled simulated and never written into recorded vitals or reports.',
];

export type OrganSystemId =
  | 'cardiovascular'
  | 'respiratory'
  | 'thermoregulation'
  | 'metabolic'
  | 'musculoskeletal'
  | 'radiation_exposure';

export interface OrganSystemInfo {
  id: OrganSystemId;
  label: string;
  /** Which organ the panel can animate for this system, if any. */
  model: 'heart' | 'lungs' | null;
  /** Why a measurement maps to this system, shown next to the model. */
  relationship: string;
  /** Always null: no reviewed localization data exists, so no region is ever marked. */
  localization: null;
}

const SYSTEMS: Record<OrganSystemId, OrganSystemInfo> = {
  cardiovascular: {
    id: 'cardiovascular',
    label: 'Cardiovascular system',
    model: 'heart',
    relationship:
      'Heart rate and blood pressure describe the cardiovascular system as a whole; they do not locate a finding inside the heart.',
    localization: null,
  },
  respiratory: {
    id: 'respiratory',
    label: 'Respiratory system',
    model: 'lungs',
    relationship:
      'Oxygen saturation and respiratory rate describe gas exchange and ventilation as a whole; they do not locate a finding in a lung lobe.',
    localization: null,
  },
  thermoregulation: {
    id: 'thermoregulation',
    label: 'Thermoregulation',
    model: null,
    relationship:
      'Body temperature is a whole-body thermal signal. It is not attributed to a single organ in this panel.',
    localization: null,
  },
  metabolic: {
    id: 'metabolic',
    label: 'Metabolic / glycaemic regulation',
    model: null,
    relationship:
      'Blood glucose reflects metabolic regulation. This panel does not attribute it to a specific organ.',
    localization: null,
  },
  musculoskeletal: {
    id: 'musculoskeletal',
    label: 'Body composition / musculoskeletal',
    model: null,
    relationship:
      'Body mass tracks fluid and lean-mass change; it is not localized to an organ in this panel.',
    localization: null,
  },
  radiation_exposure: {
    id: 'radiation_exposure',
    label: 'Radiation exposure (whole body)',
    model: null,
    relationship:
      'Dosimetry is a whole-body exposure metric. It is not mapped onto an organ model.',
    localization: null,
  },
};

const ROW_TO_SYSTEM: Record<VitalReferenceRow['id'], OrganSystemId> = {
  resting_hr: 'cardiovascular',
  systolic_bp: 'cardiovascular',
  diastolic_bp: 'cardiovascular',
  spo2: 'respiratory',
  body_temp: 'thermoregulation',
  blood_glucose: 'metabolic',
  body_mass: 'musculoskeletal',
  radiation: 'radiation_exposure',
};

export function mapMeasurementToSystem(rowId: VitalReferenceRow['id']): OrganSystemInfo {
  return SYSTEMS[ROW_TO_SYSTEM[rowId] ?? 'thermoregulation'];
}

export interface OrganFinding {
  rowId: VitalReferenceRow['id'];
  measurementName: string;
  system: OrganSystemInfo;
  modelLink: 'heart' | 'lungs' | null;
  valueLabel: string;
  generalReferenceRange: string;
  status: Exclude<HealthStatusLevel, never>;
  statusLabel: string;
  /** Why this measurement is flagged. */
  flagRationale: string;
  escalationThreshold: string;
  limitations: readonly string[];
  latestDay: number | null;
}

const SEVERITY_ORDER: Record<HealthStatusLevel, number> = {
  green: 0,
  yellow: 1,
  orange: 2,
  red: 3,
};

/** Only non-nominal, non-missing rows are "flagged measurements". */
export function buildOrganFindings(rows: VitalReferenceRow[]): OrganFinding[] {
  return rows
    .filter((row): row is VitalReferenceRow & { status: HealthStatusLevel } =>
      row.status !== 'missing' && row.status !== 'green'
    )
    .sort((a, b) => SEVERITY_ORDER[b.status] - SEVERITY_ORDER[a.status])
    .map((row) => {
      const system = mapMeasurementToSystem(row.id);
      return {
        rowId: row.id,
        measurementName: row.name,
        system,
        modelLink: system.model,
        valueLabel: row.latestFormatted,
        generalReferenceRange: row.generalReferenceRange,
        status: row.status,
        statusLabel: row.statusLabel,
        flagRationale: row.explanation,
        escalationThreshold: row.escalationThreshold,
        limitations: ORGAN_MOTION_LIMITATIONS,
        latestDay: row.latestDay,
      };
    });
}

/** Rows with no recorded value, listed as text so nothing is silently assumed normal. */
export function buildMissingMeasurementNames(rows: VitalReferenceRow[]): string[] {
  return rows.filter((row) => row.status === 'missing').map((row) => row.name);
}

export type OrganMotionSource = 'simulated_stream' | 'recorded_observation' | 'demonstration';

export interface OrganMotionTiming {
  /** Displayed rate in cycles per minute. */
  ratePerMinute: number;
  /** Animation frequency in Hz (clamped to a renderable range). */
  hertz: number;
  source: OrganMotionSource;
  /** Short provenance label for the UI. */
  sourceLabel: string;
  isDemonstration: boolean;
}

const MIN_ANIMATED_HZ = 0.4;
const MAX_ANIMATED_HZ = 2.6;

function clampHz(ratePerMinute: number): number {
  const hz = ratePerMinute / 60;
  return Math.min(MAX_ANIMATED_HZ, Math.max(MIN_ANIMATED_HZ, hz));
}

export const DEMONSTRATION_HEART_RATE_BPM = 60;
export const DEMONSTRATION_RESPIRATORY_RATE_PER_MIN = 12;

/**
 * Beat timing: simulated stream wins when it is actually running, then the latest
 * recorded observation, then a labelled demonstration pace.
 */
export function resolveHeartTiming(params: {
  simulatedHeartRateBpm?: number | null;
  recordedHeartRateBpm?: number | null;
  recordedTimestampIso?: string | null;
}): OrganMotionTiming {
  const simulated = params.simulatedHeartRateBpm;
  if (typeof simulated === 'number' && Number.isFinite(simulated) && simulated > 0) {
    return {
      ratePerMinute: Math.round(simulated),
      hertz: clampHz(simulated),
      source: 'simulated_stream',
      sourceLabel: `Synchronized to the simulated heart-rate stream (${Math.round(simulated)} bpm)`,
      isDemonstration: true,
    };
  }

  const recorded = params.recordedHeartRateBpm;
  if (typeof recorded === 'number' && Number.isFinite(recorded) && recorded > 0) {
    return {
      ratePerMinute: recorded,
      hertz: clampHz(recorded),
      source: 'recorded_observation',
      sourceLabel: `Latest recorded resting heart rate (${recorded} bpm)${params.recordedTimestampIso ? ` · recorded ${params.recordedTimestampIso}` : ''}`,
      isDemonstration: false,
    };
  }

  return {
    ratePerMinute: DEMONSTRATION_HEART_RATE_BPM,
    hertz: clampHz(DEMONSTRATION_HEART_RATE_BPM),
    source: 'demonstration',
    sourceLabel: `Demonstration pace (${DEMONSTRATION_HEART_RATE_BPM} bpm) — no heart-rate observation recorded`,
    isDemonstration: true,
  };
}

/**
 * Breathing timing: only an actual respiratory-rate observation is used.
 * SpO₂ is intentionally not a parameter of this function.
 */
export function resolveLungTiming(params: {
  recordedRespiratoryRatePerMin?: number | null;
}): OrganMotionTiming {
  const recorded = params.recordedRespiratoryRatePerMin;
  if (typeof recorded === 'number' && Number.isFinite(recorded) && recorded > 0) {
    return {
      ratePerMinute: recorded,
      hertz: clampHz(recorded),
      source: 'recorded_observation',
      sourceLabel: `Latest recorded respiratory rate (${recorded} breaths/min)`,
      isDemonstration: false,
    };
  }

  return {
    ratePerMinute: DEMONSTRATION_RESPIRATORY_RATE_PER_MIN,
    hertz: clampHz(DEMONSTRATION_RESPIRATORY_RATE_PER_MIN),
    source: 'demonstration',
    sourceLabel: `Simulated demonstration breathing rate (${DEMONSTRATION_RESPIRATORY_RATE_PER_MIN} breaths/min) — no respiratory-rate observation recorded`,
    isDemonstration: true,
  };
}

/** Highest severity among the rows that map to each animatable system. */
export function buildOrganSystemStatuses(
  rows: VitalReferenceRow[]
): Record<'cardiovascular' | 'respiratory', HealthStatusLevel> {
  const result: Record<'cardiovascular' | 'respiratory', HealthStatusLevel> = {
    cardiovascular: 'green',
    respiratory: 'green',
  };

  for (const row of rows) {
    if (row.status === 'missing') continue;
    const system = mapMeasurementToSystem(row.id);
    if (system.id !== 'cardiovascular' && system.id !== 'respiratory') continue;
    if (SEVERITY_ORDER[row.status] > SEVERITY_ORDER[result[system.id]]) {
      result[system.id] = row.status;
    }
  }

  return result;
}

export type OrganRenderMode = 'animated' | 'static' | 'fallback';

/**
 * - `fallback`: no usable WebGL, so a visible illustration + text is shown instead.
 * - `static`: a still frame (paused by the user, reduced motion, or off-screen).
 * - `animated`: the cyclic illustration is running.
 */
export function resolveOrganRenderMode(params: {
  webglAvailable: boolean;
  reducedMotion: boolean;
  paused: boolean;
  visible: boolean;
}): OrganRenderMode {
  if (!params.webglAvailable) return 'fallback';
  if (params.reducedMotion || params.paused || !params.visible) return 'static';
  return 'animated';
}

/** Screen-reader summary: a complete text equivalent of the illustration state. */
export function describeOrganMotionText(params: {
  organ: 'heart' | 'lungs';
  heart: OrganMotionTiming;
  lungs: OrganMotionTiming;
  selectedFinding: OrganFinding | null;
  renderMode: OrganRenderMode;
}): string {
  const heartLine = `Heart illustration: gentle contraction and relaxation at ${params.heart.ratePerMinute} per minute. ${params.heart.sourceLabel}.`;
  const lungLine = `Lung illustration: gentle expansion and contraction at ${params.lungs.ratePerMinute} breaths per minute. ${params.lungs.sourceLabel}.`;
  const organLine = `Currently showing the ${params.organ} illustration. ${heartLine} ${lungLine}`;

  const stateLine =
    params.renderMode === 'animated'
      ? 'Animation is running.'
      : params.renderMode === 'static'
      ? 'Animation is paused on a still frame.'
      : 'The 3D view is unavailable, so a static illustration is shown.';

  const findingLine = params.selectedFinding
    ? ` Selected finding: ${params.selectedFinding.measurementName} ${params.selectedFinding.valueLabel}, flag ${params.selectedFinding.statusLabel}. Related body system: ${params.selectedFinding.system.label}. This is not a disease location.`
    : ' No flagged measurement is selected.';

  return `${organLine} ${stateLine}${findingLine} ${ORGAN_MOTION_DISCLAIMER}`;
}

/** Latest respiratory-rate observation carried on a vital reading, if any. */
export function recordedRespiratoryRateFrom(vital: VitalReading | null | undefined): number | null {
  const value = vital?.respiratoryRateBpm;
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}
