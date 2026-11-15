import type {
  Astronaut,
  CheckIn,
  CountermeasureCoachPlan,
  CountermeasureDataPoint,
  CountermeasureId,
  CountermeasureItem,
  CountermeasureResearchContext,
  CountermeasureStatus,
  RecoveryFactor,
  RecoveryFactorId,
  RecoveryReadiness,
  RecoveryWindowDays,
} from '../types';
import { NASA_FIVE_HAZARDS, SPACEFLIGHT_REFERENCES } from '../data/references';
import {
  computeObservationWindow,
  filterByObservationWindow,
} from '../utils/observationWindow';
import { buildRecoveryReadiness } from './recoveryReadiness';

export const COUNTERMEASURE_COACH_WINDOW_DAYS = 7;

export const COUNTERMEASURE_STATUS_LABELS: Record<CountermeasureStatus, string> = {
  on_track: 'On track',
  review: 'Review',
  missing: 'Missing data',
};

export const COUNTERMEASURE_COACH_DISCLAIMER =
  'This is educational planning support, not medical advice. It does not diagnose, prescribe medication, or replace the crew medical lead.';

interface CountermeasureCoachInput {
  astronaut: Astronaut;
  checkIns: CheckIn[];
  missionDay: number;
  windowDays?: RecoveryWindowDays;
}

interface ResearchSpec {
  referenceIds: string[];
  hazardIds: string[];
  gapNote: string | null;
}

const RESEARCH_SPECS: Record<CountermeasureId, ResearchSpec> = {
  exercise: {
    referenceIds: ['nasa-hrp-cardio'],
    hazardIds: ['hazard-gravity'],
    gapNote: null,
  },
  sleep: {
    referenceIds: ['nasa-hrp-bhpc'],
    hazardIds: ['hazard-isolation'],
    gapNote: null,
  },
  hydration: {
    referenceIds: [],
    hazardIds: ['hazard-gravity'],
    gapNote:
      'No hydration-intake study is bundled. The hazard excerpt describes fluid shifts; it is not a fluid prescription.',
  },
  nutrition: {
    referenceIds: [],
    hazardIds: [],
    gapNote:
      'No nutrition-specific NASA research excerpt is bundled, so this card does not infer intake adequacy.',
  },
  workload: {
    referenceIds: ['nasa-hrp-bhpc'],
    hazardIds: ['hazard-isolation'],
    gapNote: null,
  },
  check_in: {
    referenceIds: ['nasa-hrp-bhpc'],
    hazardIds: [],
    gapNote: null,
  },
};

const NASA_FIVE_HAZARDS_URL =
  SPACEFLIGHT_REFERENCES.find((reference) => reference.id === 'nasa-hrp-5-hazards')?.url ??
  'https://www.nasa.gov/hrp/5-hazards-of-human-spaceflight/';

const WHY_IT_MATTERS: Record<CountermeasureId, string> = {
  exercise:
    'Long-duration spaceflight reduces mechanical loading on bone and muscle and challenges the cardiovascular system. Scheduled aerobic and resistance activity is a standard mission countermeasure area; this view tracks whether the planned activity was recorded.',
  sleep:
    'Confinement, operational shifts, and workload can disrupt sleep and circadian alignment. NASA’s behavioral-health research context treats sleep, mood, fatigue, and stress as related areas to monitor; this view is a planning aid, not a sleep assessment.',
  hydration:
    'Fluid shifts in altered gravity and closed-loop water systems make intake logging operationally useful. Arogya compares logged volume with the crew’s planning reference only; it does not assess hydration status.',
  nutrition:
    'Long missions depend on planned nutrition and energy availability. Arogya tracks whether a nutrition entry was logged; calorie and protein fields are app-derived estimates, not measured intake or an adequacy assessment.',
  workload:
    'High workload, isolation, and fragmented sleep can interact during long transit. The check-in records self-reported fatigue, stress, focus, and mood as planning signals; it does not measure performance or diagnose a condition.',
  check_in:
    'A complete daily record keeps recovery factors from being based on gaps and gives the crew a local history to review. NASA’s behavioral-health reference supports brief self-reported sleep, mood, fatigue, and stress check-ins.',
};

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function uniqueDays(items: CheckIn[]): CheckIn[] {
  const byDay = new Map<number, CheckIn>();
  [...items]
    .sort(
      (a, b) =>
        a.missionDay - b.missionDay || a.timestampIso.localeCompare(b.timestampIso)
    )
    .forEach((item) => byDay.set(item.missionDay, item));
  return [...byDay.values()].sort((a, b) => a.missionDay - b.missionDay);
}

function hasNutritionEntry(day: CheckIn): boolean {
  return (
    (Number.isFinite(day.caloriesKcal) && day.caloriesKcal > 0) ||
    (Number.isFinite(day.proteinGrams) && day.proteinGrams > 0)
  );
}

function factorFor(readiness: RecoveryReadiness, id: RecoveryFactorId): RecoveryFactor {
  const factor = readiness.factors.find((item) => item.id === id);
  if (!factor) throw new Error(`Recovery readiness is missing factor ${id}.`);
  return factor;
}

function recordedInputs(factor: RecoveryFactor): CountermeasureDataPoint[] {
  return factor.inputs.map((input) => ({
    label: input.label,
    value: input.value,
    note: input.note,
    source: input.source,
  }));
}

function factorStatus(factor: RecoveryFactor): CountermeasureStatus {
  if (factor.status === 'missing') return 'missing';
  if (factor.status === 'partial') return 'review';
  return factor.score != null && factor.score >= 80 ? 'on_track' : 'review';
}

function factorCurrentStatus(factor: RecoveryFactor): string {
  if (factor.status === 'missing') {
    return `${factor.missingReason ?? factor.summary} No value was assumed.`;
  }
  return factor.summary;
}

function factorEvidenceNote(
  factor: RecoveryFactor,
  todayRecorded: boolean,
  includeTodayNote: boolean
): string | null {
  const notes: string[] = [];
  if (factor.status === 'missing' && factor.missingReason) {
    notes.push(factor.missingReason);
  } else if (factor.status === 'partial' && factor.missingReason) {
    notes.push(`Partial evidence: ${factor.missingReason}`);
  }
  if (includeTodayNote && !todayRecorded) {
    notes.push(
      'Today’s check-in is not recorded; recent window values are shown and no today value was assumed.'
    );
  }
  return notes.length > 0 ? notes.join(' ') : null;
}

function getResearchContext(id: CountermeasureId): {
  items: CountermeasureResearchContext[];
  gapNote: string | null;
} {
  const spec = RESEARCH_SPECS[id];
  const references = spec.referenceIds
    .map((referenceId) =>
      SPACEFLIGHT_REFERENCES.find((reference) => reference.id === referenceId)
    )
    .filter((reference): reference is NonNullable<typeof reference> => Boolean(reference))
    .map<CountermeasureResearchContext>((reference) => ({
      id: reference.id,
      kind: 'reference',
      source: 'research',
      title: reference.title,
      organization: reference.organization,
      topic: reference.topic,
      summary: reference.summary,
      url: reference.url,
    }));
  const hazards = spec.hazardIds
    .map((hazardId) => NASA_FIVE_HAZARDS.find((hazard) => hazard.id === hazardId))
    .filter((hazard): hazard is NonNullable<typeof hazard> => Boolean(hazard))
    .map<CountermeasureResearchContext>((hazard) => ({
      id: hazard.id,
      kind: 'hazard',
      source: 'research',
      title: hazard.name,
      organization: 'NASA Human Research Program',
      topic: hazard.nasaCategory,
      summary: `${hazard.physiologicalImpact} ${hazard.arogyaMonitoring}`,
      url: NASA_FIVE_HAZARDS_URL,
    }));

  return {
    items: [...references, ...hazards],
    gapNote: spec.gapNote,
  };
}

function buildItem(
  id: CountermeasureId,
  input: {
    astronaut: Astronaut;
    missionDay: number;
    days: CheckIn[];
    today: CheckIn | null;
    readiness: RecoveryReadiness;
  }
): CountermeasureItem {
  const { astronaut, missionDay, days, today, readiness } = input;
  const todayRecorded = today != null;
  const research = getResearchContext(id);
  const base = {
    id,
    todayRecorded,
    whyItMatters: WHY_IT_MATTERS[id],
    researchContext: research.items,
    researchGapNote: research.gapNote,
  };

  if (id === 'exercise') {
    const factor = factorFor(readiness, 'exercise_adherence');
    const status = factorStatus(factor);
    const dataSources = recordedInputs(factor);
    if (today) {
      dataSources.push({
        label: 'Today’s exercise entry',
        value: `${today.exerciseMinutes} min${
          today.exerciseCompleted ? ' · block marked complete' : ' · block not marked complete'
        }`,
        note: 'Self-reported in today’s check-in.',
        source: 'recorded',
      });
    }
    return {
      ...base,
      label: 'Exercise adherence & planned activity',
      status,
      statusLabel: COUNTERMEASURE_STATUS_LABELS[status],
      currentStatus: factorCurrentStatus(factor),
      plannedTarget: `${astronaut.baseline.exerciseTargetMinutes} aerobic min/day · ${astronaut.baseline.resistanceTargetSessionsPerWeek} resistance sessions/week planning reference`,
      suggestedAction:
        status === 'on_track'
          ? 'Continue the planned aerobic and resistance cadence and record completion after each session.'
          : status === 'review'
            ? 'Review the planned activity block and record completion after the session. If a block was missed, note what prevented it and plan the next available slot.'
            : 'Complete today’s check-in and record the planned exercise block; no completion was assumed.',
      dataSources,
      factorId: factor.id,
      missingDataNote: factorEvidenceNote(factor, todayRecorded, true),
    };
  }

  if (id === 'sleep') {
    const factor = factorFor(readiness, 'sleep_regularity');
    const status = factorStatus(factor);
    const dataSources = recordedInputs(factor);
    if (today) {
      dataSources.push({
        label: 'Latest recorded sleep',
        value: `${today.sleepHours.toFixed(1)} h · quality ${today.sleepQuality}/5`,
        note: 'Self-reported in the most recent check-in; bedtime and wake time are not recorded.',
        source: 'recorded',
      });
    }
    return {
      ...base,
      label: 'Sleep schedule & recovery',
      status,
      statusLabel: COUNTERMEASURE_STATUS_LABELS[status],
      currentStatus: factorCurrentStatus(factor),
      plannedTarget: `${astronaut.baseline.sleepTargetHours.toFixed(1)} h sleep opportunity planning reference`,
      suggestedAction:
        status === 'on_track'
          ? 'Continue protecting the current sleep schedule and record sleep duration and quality daily.'
          : status === 'review'
            ? 'Consider reviewing your sleep schedule and protecting a consistent sleep opportunity. Record sleep duration and quality in today’s check-in.'
            : 'Complete today’s check-in and record last night’s sleep duration and quality; no sleep value was assumed.',
      dataSources,
      factorId: factor.id,
      missingDataNote: factorEvidenceNote(factor, todayRecorded, true),
    };
  }

  if (id === 'hydration') {
    const factor = factorFor(readiness, 'hydration_nutrition_entries');
    const target = astronaut.baseline.hydrationTargetLiters;
    const hydrationInput = factor.inputs.find((item) => item.label === 'Hydration');

    if (days.length === 0) {
      return {
        ...base,
        label: 'Hydration gaps',
        status: 'missing',
        statusLabel: COUNTERMEASURE_STATUS_LABELS.missing,
        currentStatus:
          'No recorded hydration entries in this window. No value was assumed.',
        plannedTarget: `${target.toFixed(1)} L/day planning reference`,
        suggestedAction:
          'Complete today’s check-in and log fluid intake; no value is assumed.',
        dataSources: [],
        factorId: factor.id,
        missingDataNote: factorEvidenceNote(factor, todayRecorded, true),
      };
    }

    const averageHydration = average(days.map((day) => day.hydrationLiters));
    const ratio = target > 0 ? averageHydration / target : 0;
    const status: CountermeasureStatus = ratio >= 0.8 ? 'on_track' : 'review';
    const dataSources: CountermeasureDataPoint[] = [];
    if (hydrationInput) {
      dataSources.push({
        label: hydrationInput.label,
        value: hydrationInput.value,
        note: hydrationInput.note,
        source: hydrationInput.source,
      });
    }
    if (today) {
      dataSources.push({
        label: 'Today’s logged hydration',
        value: `${today.hydrationLiters.toFixed(1)} L`,
        note: 'Self-reported in today’s check-in.',
        source: 'recorded',
      });
    }

    return {
      ...base,
      label: 'Hydration gaps',
      status,
      statusLabel: COUNTERMEASURE_STATUS_LABELS[status],
      currentStatus: `${averageHydration.toFixed(1)} L/day average vs ${target.toFixed(
        1
      )} L planning reference (${Math.round(
        ratio * 100
      )}%). The review line is 80% of that reference, a demonstration planning threshold.`,
      plannedTarget: `${target.toFixed(1)} L/day planning reference`,
      suggestedAction:
        status === 'on_track'
          ? 'Continue routine hydration logging with the daily check-in.'
          : 'Review hydration logging and confirm today’s fluid intake is recorded. Treat the planning reference as an organizational target, not a fixed intake instruction.',
      dataSources,
      factorId: factor.id,
      missingDataNote: factorEvidenceNote(factor, todayRecorded, true),
    };
  }

  if (id === 'nutrition') {
    const factor = factorFor(readiness, 'hydration_nutrition_entries');
    const nutritionInput = factor.inputs.find(
      (item) => item.label === 'Nutrition entries'
    );

    if (days.length === 0) {
      return {
        ...base,
        label: 'Nutrition logging gaps',
        status: 'missing',
        statusLabel: COUNTERMEASURE_STATUS_LABELS.missing,
        currentStatus:
          'No recorded nutrition entries in this window. No intake value was assumed.',
        plannedTarget:
          'Daily nutrition entry logging; calorie target is planning context, not an adequacy judgment.',
        suggestedAction:
          'Complete today’s check-in and record a nutrition entry; no intake value is assumed.',
        dataSources: [],
        factorId: factor.id,
        missingDataNote: factorEvidenceNote(factor, todayRecorded, true),
      };
    }

    const entryDays = days.filter(hasNutritionEntry).length;
    const todayHasEntry = today ? hasNutritionEntry(today) : false;
    const status: CountermeasureStatus =
      entryDays < days.length || (today != null && !todayHasEntry) ? 'review' : 'on_track';
    const dataSources: CountermeasureDataPoint[] = [];
    if (nutritionInput) {
      dataSources.push({
        label: nutritionInput.label,
        value: nutritionInput.value,
        note: nutritionInput.note,
        source: nutritionInput.source,
      });
    }
    if (today) {
      dataSources.push({
        label: 'Today’s nutrition entry',
        value: todayHasEntry ? 'Recorded' : 'Not recorded',
        note: todayHasEntry
          ? 'Entry presence only; calorie and protein values are not used to judge adequacy.'
          : 'No recorded nutrition entry for today; no intake value was assumed.',
        source: 'recorded',
      });
    }

    const notes: string[] = [];
    if (entryDays < days.length) {
      notes.push(
        `${days.length - entryDays} of ${days.length} recorded days have no nutrition entry.`
      );
    }
    if (today && !todayHasEntry) {
      notes.push('Today’s nutrition entry is missing; no intake value was assumed.');
    }
    if (!todayRecorded) {
      notes.push(
        'Today’s check-in is not recorded; recent window values are shown and no today value was assumed.'
      );
    }

    return {
      ...base,
      label: 'Nutrition logging gaps',
      status,
      statusLabel: COUNTERMEASURE_STATUS_LABELS[status],
      currentStatus: `${entryDays} of ${days.length} recorded days include a nutrition entry.${
        today
          ? ` Today’s entry is ${todayHasEntry ? 'recorded' : 'not recorded'}.`
          : ''
      } Calorie and protein fields are not used to judge intake adequacy.`,
      plannedTarget:
        'Daily nutrition entry logging; calorie target is planning context, not an adequacy judgment.',
      suggestedAction:
        status === 'on_track'
          ? 'Continue logging nutrition with the daily check-in; entry presence is the only nutrition evidence used here.'
          : 'Review nutrition logging and complete today’s entry if it is missing. Calorie and protein fields are estimates and are not used to judge intake adequacy.',
      dataSources,
      factorId: factor.id,
      missingDataNote: notes.length > 0 ? notes.join(' ') : null,
    };
  }

  if (id === 'workload') {
    const factor = factorFor(readiness, 'workload_fatigue');
    const status = factorStatus(factor);
    const dataSources = recordedInputs(factor);
    if (today) {
      dataSources.push({
        label: 'Today’s self-report',
        value: `Fatigue ${today.fatigueLevel}/5 · stress ${today.stressLevel}/5 · focus ${today.cognitiveFocus}/5 · mood ${today.moodScore}/5`,
        note: 'Self-reported in today’s check-in.',
        source: 'recorded',
      });
    }
    return {
      ...base,
      label: 'Workload & recovery balance',
      status,
      statusLabel: COUNTERMEASURE_STATUS_LABELS[status],
      currentStatus: factorCurrentStatus(factor),
      plannedTarget: null,
      suggestedAction:
        status === 'on_track'
          ? 'Keep the current workload cadence and continue recording fatigue, stress, focus, and mood.'
          : status === 'review'
            ? 'Consider planning a recovery block and reducing avoidable workload where the mission allows. If fatigue persists, review it with the crew medical lead.'
            : 'Complete today’s check-in with fatigue, stress, focus, and mood so recovery balance can be reviewed; no value was assumed.',
      dataSources,
      factorId: factor.id,
      missingDataNote: factorEvidenceNote(factor, todayRecorded, true),
    };
  }

  const checkInFactor = factorFor(readiness, 'check_in_adherence');
  const status: CountermeasureStatus =
    today != null ? 'on_track' : days.length === 0 ? 'missing' : 'review';
  const dataSources = recordedInputs(checkInFactor);
  if (today) {
    dataSources.push({
      label: 'Today’s check-in',
      value: `Recorded for Sol ${missionDay}`,
      note: 'Presence only; the recorded content is reviewed in the other countermeasure cards.',
      source: 'recorded',
    });
  }
  const missingDays = readiness.missingDays.length;
  const missingNote =
    days.length === 0
      ? checkInFactor.missingReason ?? null
      : !todayRecorded
        ? `No check-in is recorded for Sol ${missionDay}. ${missingDays} of ${readiness.window.coveredDays} mission days in this window have no check-in.`
        : missingDays > 0
          ? `${missingDays} of ${readiness.window.coveredDays} recent days have no check-in; no missing day was imputed.`
          : null;

  return {
    ...base,
    label: 'Check-in completion',
    status,
    statusLabel: COUNTERMEASURE_STATUS_LABELS[status],
    currentStatus:
      days.length === 0
        ? `${checkInFactor.missingReason ?? checkInFactor.summary} No value was assumed.`
        : today
          ? `Today’s check-in is recorded. ${checkInFactor.summary}`
          : `No check-in is recorded for Sol ${missionDay}. ${checkInFactor.summary}`,
    plannedTarget: 'At least one recorded check-in per mission day',
    suggestedAction:
      status === 'on_track'
        ? 'Today’s check-in is complete. Continue the daily cadence.'
        : status === 'review'
          ? 'Complete today’s check-in.'
          : 'Complete today’s check-in to establish a recorded baseline.',
    dataSources,
    factorId: checkInFactor.id,
    missingDataNote: missingNote,
  };
}

export function buildCountermeasureCoach({
  astronaut,
  checkIns,
  missionDay,
  windowDays = COUNTERMEASURE_COACH_WINDOW_DAYS,
}: CountermeasureCoachInput): CountermeasureCoachPlan {
  const readiness = buildRecoveryReadiness({
    astronaut,
    checkIns,
    missionDay,
    windowDays,
    vitals: [],
  });
  const window = computeObservationWindow(missionDay, windowDays);
  const days = uniqueDays(
    filterByObservationWindow(
      checkIns.filter((item) => item.astronautId === astronaut.id),
      window
    )
  );
  const today = days.find((day) => day.missionDay === missionDay) ?? null;
  const todayCheckInComplete = today != null;

  const items = (
    ['exercise', 'sleep', 'hydration', 'nutrition', 'workload', 'check_in'] as const
  ).map((id) =>
    buildItem(id, {
      astronaut,
      missionDay,
      days,
      today,
      readiness,
    })
  );

  let focusItemId: CountermeasureId | null = null;
  if (!todayCheckInComplete) {
    focusItemId = 'check_in';
  } else {
    const missing = items.find((item) => item.status === 'missing');
    if (missing) {
      focusItemId = missing.id;
    } else {
      const reviewItems = items.filter((item) => item.status === 'review');
      if (reviewItems.length > 0) {
        const scoreFor = (item: CountermeasureItem): number => {
          const factor = readiness.factors.find((entry) => entry.id === item.factorId);
          return factor?.score ?? Number.POSITIVE_INFINITY;
        };
        focusItemId = [...reviewItems].sort((a, b) => scoreFor(a) - scoreFor(b))[0].id;
      }
    }
  }

  const focusItem = items.find((item) => item.id === focusItemId) ?? null;
  const summary = !todayCheckInComplete
    ? 'Complete today’s check-in first so the daily view can use today’s recorded data. Recent window status remains visible.'
    : focusItem
      ? `Today’s suggested focus: ${focusItem.label}.`
      : 'All six countermeasure areas are on track for the recent window.';

  return {
    astronautId: astronaut.id,
    missionDay,
    window: readiness.window,
    items,
    focusItemId,
    todayCheckInComplete,
    summary,
    disclaimer: COUNTERMEASURE_COACH_DISCLAIMER,
  };
}
