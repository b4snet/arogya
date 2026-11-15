import type {
  Astronaut,
  CheckIn,
  CountermeasureItem,
  MissionHealthBrief,
  MissionHealthBriefConfidence,
  MissionHealthBriefEntry,
  MissionHealthBriefEscalation,
  MissionHealthBriefResearchReference,
  MissionHealthBriefScope,
  MissionHealthBriefSection,
  MissionHealthBriefSectionId,
  MissionHealthBriefShareItem,
  RecoveryInputSource,
  VitalReading,
} from '../types';
import { SYMPTOM_LABELS } from '../data/symptomLabels';
import { computeObservationWindow } from '../utils/observationWindow';
import { buildCountermeasureCoach } from './countermeasureCoach';
import { buildRecoveryReadiness } from './recoveryReadiness';

export const MISSION_HEALTH_BRIEF_WINDOW_DAYS = 7 as const;

export const MISSION_HEALTH_BRIEF_DISCLAIMER =
  'This is educational planning support, not medical advice. It does not diagnose, prescribe treatment, or replace the crew medical lead. If symptoms are severe or worsening, follow mission medical escalation procedures.';

export const MISSION_HEALTH_BRIEF_PRIVACY_NOTE =
  'Private crew free-text notes are excluded from this brief by default and are never added to it, even when the full observation report opts in.';

const CHANGE_THRESHOLDS = {
  sleepHours: 1,
  exerciseMinutes: 15,
  hydrationLiters: 0.5,
  fatigueLevel: 1,
  stressLevel: 1,
} as const;

const SECTION_TITLES: Record<MissionHealthBriefSectionId, string> = {
  changed: 'What changed',
  stable: 'What is stable',
  attention: 'What needs attention',
  missing: 'What data is missing',
  action: 'What action to consider',
};

const SECTION_ORDER: MissionHealthBriefSectionId[] = [
  'changed',
  'stable',
  'attention',
  'missing',
  'action',
];

export interface MissionHealthBriefInput {
  astronaut: Astronaut;
  checkIns: CheckIn[];
  vitals?: VitalReading[];
  missionDay: number;
  escalation?: {
    required: boolean;
    reasons: string[];
  };
}

function dayLabel(missionDay: number): string {
  return `Sol ${missionDay}`;
}

function dayRangeLabel(startDay: number, endDay: number): string {
  return startDay === endDay ? dayLabel(startDay) : `Sol ${startDay}–${endDay}`;
}

function uniqueCheckIns(items: CheckIn[]): CheckIn[] {
  const byDay = new Map<number, CheckIn>();
  [...items]
    .sort(
      (a, b) =>
        a.missionDay - b.missionDay || a.timestampIso.localeCompare(b.timestampIso)
    )
    .forEach((item) => byDay.set(item.missionDay, item));
  return [...byDay.values()].sort((a, b) => a.missionDay - b.missionDay);
}

function uniqueVitals(items: VitalReading[]): VitalReading[] {
  const byDay = new Map<number, VitalReading>();
  [...items]
    .sort(
      (a, b) =>
        a.missionDay - b.missionDay || a.timestampIso.localeCompare(b.timestampIso)
    )
    .forEach((item) => byDay.set(item.missionDay, item));
  return [...byDay.values()].sort((a, b) => a.missionDay - b.missionDay);
}

function hasNutritionEntry(checkIn: CheckIn): boolean {
  return (
    (Number.isFinite(checkIn.caloriesKcal) && checkIn.caloriesKcal > 0) ||
    (Number.isFinite(checkIn.proteinGrams) && checkIn.proteinGrams > 0)
  );
}

function activeSymptoms(checkIn: CheckIn): string[] {
  return checkIn.symptoms
    .filter((symptom) => symptom !== 'none')
    .map((symptom) => SYMPTOM_LABELS[symptom] ?? symptom.replace(/_/g, ' '));
}

function entry(
  id: string,
  text: string,
  sourceLabel = 'Recorded check-in',
  source: RecoveryInputSource = 'recorded'
): MissionHealthBriefEntry {
  return { id, text, sources: [{ label: sourceLabel, source }] };
}

function buildSections(
  entries: Record<MissionHealthBriefSectionId, MissionHealthBriefEntry[]>,
  emptyTexts: Record<MissionHealthBriefSectionId, string>
): MissionHealthBriefSection[] {
  return SECTION_ORDER.map((id) => ({
    id,
    title: SECTION_TITLES[id],
    entries: entries[id],
    emptyText: emptyTexts[id],
  }));
}

function buildEscalation(
  required: boolean,
  reasons: string[],
  level: 'urgent' | 'review' | 'none',
  detail: string,
  title: string,
  prompt: string
): MissionHealthBriefEscalation {
  if (required) {
    return {
      level: 'urgent',
      title: 'Follow mission medical escalation procedures now',
      detail:
        'A recorded observation crosses the configured safety boundary. This is not a diagnosis; notify the Crew Medical Lead and follow mission medical escalation procedures.',
      reasons: [...new Set(reasons)],
      prompt:
        'Share this brief and the observation report promptly through mission medical channels.',
    };
  }
  return { level, title, detail, reasons: [...new Set(reasons)], prompt };
}

function changeEntries(
  previous: CheckIn,
  current: CheckIn
): MissionHealthBriefEntry[] {
  const entries: MissionHealthBriefEntry[] = [];
  const from = dayLabel(previous.missionDay);
  const to = dayLabel(current.missionDay);

  if (Math.abs(current.sleepHours - previous.sleepHours) >= CHANGE_THRESHOLDS.sleepHours) {
    entries.push(
      entry(
        'change-sleep',
        `Sleep changed from ${previous.sleepHours.toFixed(1)} h on ${from} to ${current.sleepHours.toFixed(1)} h on ${to}.`,
        `Recorded sleep · ${from} vs ${to}`
      )
    );
  }
  if (
    Math.abs(current.exerciseMinutes - previous.exerciseMinutes) >=
    CHANGE_THRESHOLDS.exerciseMinutes
  ) {
    entries.push(
      entry(
        'change-exercise',
        `Recorded exercise changed from ${previous.exerciseMinutes} min on ${from} to ${current.exerciseMinutes} min on ${to}.`,
        `Recorded exercise · ${from} vs ${to}`
      )
    );
  }
  if (
    Math.abs(current.hydrationLiters - previous.hydrationLiters) >=
    CHANGE_THRESHOLDS.hydrationLiters
  ) {
    entries.push(
      entry(
        'change-hydration',
        `Recorded hydration changed from ${previous.hydrationLiters.toFixed(1)} L on ${from} to ${current.hydrationLiters.toFixed(1)} L on ${to}.`,
        `Recorded hydration · ${from} vs ${to}`
      )
    );
  }
  if (
    Math.abs(current.fatigueLevel - previous.fatigueLevel) >=
    CHANGE_THRESHOLDS.fatigueLevel
  ) {
    entries.push(
      entry(
        'change-fatigue',
        `Self-reported fatigue changed from ${previous.fatigueLevel}/5 on ${from} to ${current.fatigueLevel}/5 on ${to}.`,
        `Recorded fatigue · ${from} vs ${to}`
      )
    );
  }
  if (
    Math.abs(current.stressLevel - previous.stressLevel) >=
    CHANGE_THRESHOLDS.stressLevel
  ) {
    entries.push(
      entry(
        'change-stress',
        `Self-reported stress changed from ${previous.stressLevel}/5 on ${from} to ${current.stressLevel}/5 on ${to}.`,
        `Recorded stress · ${from} vs ${to}`
      )
    );
  }

  return entries;
}

function symptomEntries(days: CheckIn[]): MissionHealthBriefEntry[] {
  const bySymptom = new Map<string, number[]>();
  days.forEach((day) => {
    activeSymptoms(day).forEach((label) => {
      const dayList = bySymptom.get(label) ?? [];
      if (!dayList.includes(day.missionDay)) dayList.push(day.missionDay);
      bySymptom.set(label, dayList);
    });
  });

  const entries = [...bySymptom.entries()].map(([label, missionDays]) =>
    entry(
      `symptom-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      missionDays.length === 1
        ? `${label} was recorded on ${dayLabel(missionDays[0])}.`
        : `${label} was recorded on ${missionDays.length} days (${missionDays
            .map((day) => `Sol ${day}`)
            .join(', ')}).`,
      'Recorded symptom check-in'
    )
  );

  if (entries.length <= 4) return entries;

  const extraLabels = [...bySymptom.keys()].slice(4);
  return [
    ...entries.slice(0, 4),
    entry(
      'symptom-additional',
      `Additional recorded symptoms: ${extraLabels.join(', ')}.`,
      'Recorded symptom check-in'
    ),
  ];
}

function painEntries(days: CheckIn[]): MissionHealthBriefEntry[] {
  const painfulDays = days.filter((day) => day.painScore > 0);
  if (painfulDays.length === 0) return [];

  if (painfulDays.length === 1) {
    const day = painfulDays[0];
    return [
      entry(
        'pain-single',
        `Pain was self-reported at ${day.painScore}/10 on ${dayLabel(day.missionDay)}.`,
        `Recorded pain · ${dayLabel(day.missionDay)}`
      ),
    ];
  }

  const maxDay = painfulDays.reduce((max, day) => (day.painScore > max.painScore ? day : max));
  return [
    entry(
      'pain-window',
      `Pain was self-reported on ${painfulDays.length} days, up to ${maxDay.painScore}/10 on ${dayLabel(maxDay.missionDay)}.`,
      'Recorded pain scores'
    ),
  ];
}

function appetiteEntries(days: CheckIn[]): MissionHealthBriefEntry[] {
  const poorDays = days.filter((day) => day.appetite === 'poor');
  if (poorDays.length === 0) return [];

  return [
    entry(
      'appetite',
      poorDays.length === 1
        ? `Poor appetite was recorded on ${dayLabel(poorDays[0].missionDay)}.`
        : `Poor appetite was recorded on ${poorDays.length} days in this window.`,
      'Recorded appetite entry'
    ),
  ];
}

function buildDaily(
  input: MissionHealthBriefInput,
  weeklyEscalation: MissionHealthBriefEscalation
): MissionHealthBriefScope {
  const { astronaut, missionDay } = input;
  const window = computeObservationWindow(missionDay, 1);
  const checkIns = input.checkIns.filter((item) => item.astronautId === astronaut.id);
  const vitals = (input.vitals ?? []).filter((item) => item.astronautId === astronaut.id);
  const today = uniqueCheckIns(checkIns).find((item) => item.missionDay === missionDay) ?? null;
  const earlier = uniqueCheckIns(checkIns.filter((item) => item.missionDay < missionDay));
  const previous = earlier.length > 0 ? earlier[earlier.length - 1] : null;
  const todayVitals =
    uniqueVitals(vitals).find((item) => item.missionDay === missionDay) ?? null;

  const changed: MissionHealthBriefEntry[] = [];
  const stable: MissionHealthBriefEntry[] = [];
  const attention: MissionHealthBriefEntry[] = [];
  const missing: MissionHealthBriefEntry[] = [];
  const action: MissionHealthBriefEntry[] = [];

  if (!today) {
    missing.push(
      entry(
        'daily-no-check-in',
        `Today’s check-in is not recorded (${dayLabel(missionDay)}). No today value was assumed.`,
        'No recorded check-in'
      )
    );
  } else {
    if (previous) {
      changed.push(...changeEntries(previous, today));
      if (previous.missionDay !== missionDay - 1) {
        missing.push(
          entry(
            'daily-previous-gap',
            `The previous recorded check-in is ${dayLabel(previous.missionDay)}; the day before today has no record.`,
            'Recorded check-in'
          )
        );
      }
    } else {
      missing.push(
        entry(
          'daily-no-previous',
          'No earlier recorded check-in is available, so no daily change can be shown.',
          'Recorded check-in'
        )
      );
    }

    const sleepReference = astronaut.baseline.sleepTargetHours;
    if (today.sleepHours >= sleepReference - 0.5) {
      stable.push(
        entry(
          'daily-sleep-stable',
          `Sleep was ${today.sleepHours.toFixed(1)} h, within 0.5 h of the ${sleepReference.toFixed(1)} h planning reference.`
        )
      );
    } else if (today.sleepHours < sleepReference - 1) {
      attention.push(
        entry(
          'daily-sleep-attention',
          `Sleep was ${today.sleepHours.toFixed(1)} h, more than 1 h below the ${sleepReference.toFixed(1)} h planning reference.`
        )
      );
    }

    const exerciseReference = astronaut.baseline.exerciseTargetMinutes;
    if (today.exerciseMinutes >= exerciseReference * 0.85) {
      stable.push(
        entry(
          'daily-exercise-stable',
          `Recorded exercise was ${today.exerciseMinutes} min, at or above 85% of the ${exerciseReference} min planning reference.`
        )
      );
    } else {
      attention.push(
        entry(
          'daily-exercise-attention',
          `Recorded exercise was ${today.exerciseMinutes} min, below 85% of the ${exerciseReference} min planning reference.`
        )
      );
    }

    const hydrationReference = astronaut.baseline.hydrationTargetLiters;
    if (today.hydrationLiters >= hydrationReference * 0.85) {
      stable.push(
        entry(
          'daily-hydration-stable',
          `Recorded hydration was ${today.hydrationLiters.toFixed(1)} L, at or above 85% of the ${hydrationReference.toFixed(1)} L planning reference.`
        )
      );
    } else {
      attention.push(
        entry(
          'daily-hydration-attention',
          `Recorded hydration was ${today.hydrationLiters.toFixed(1)} L, below 85% of the ${hydrationReference.toFixed(1)} L planning reference.`
        )
      );
    }

    if (today.fatigueLevel <= 3) {
      stable.push(
        entry(
          'daily-fatigue-stable',
          `Self-reported fatigue was ${today.fatigueLevel}/5, below the attention threshold of 4/5.`
        )
      );
    } else {
      attention.push(
        entry(
          'daily-fatigue-attention',
          `Self-reported fatigue was ${today.fatigueLevel}/5, at or above the attention threshold of 4/5.`
        )
      );
    }

    if (today.stressLevel <= 3) {
      stable.push(
        entry(
          'daily-stress-stable',
          `Self-reported stress was ${today.stressLevel}/5, below the attention threshold of 4/5.`
        )
      );
    } else {
      attention.push(
        entry(
          'daily-stress-attention',
          `Self-reported stress was ${today.stressLevel}/5, at or above the attention threshold of 4/5.`
        )
      );
    }

    if (today.moodScore <= 2) {
      attention.push(
        entry(
          'daily-mood-attention',
          `Self-reported mood was ${today.moodScore}/5, at or below the daily attention threshold of 2/5.`
        )
      );
    }
    if (today.cognitiveFocus <= 2) {
      attention.push(
        entry(
          'daily-focus-attention',
          `Self-reported cognitive focus was ${today.cognitiveFocus}/5, at or below the daily attention threshold of 2/5.`
        )
      );
    }

    attention.push(...symptomEntries([today]), ...painEntries([today]), ...appetiteEntries([today]));

    if (todayVitals) {
      stable.push(
        entry(
          'daily-vitals-recorded',
          `A recorded vital reading is available for ${dayLabel(missionDay)}.`,
          'Recorded vitals'
        )
      );
    } else {
      missing.push(
        entry(
          'daily-vitals-missing',
          `No recorded vital reading is available for ${dayLabel(missionDay)}; simulated samples cannot fill the gap.`,
          'Recorded vitals'
        )
      );
    }

    if (!hasNutritionEntry(today)) {
      missing.push(
        entry(
          'daily-nutrition-missing',
          `Today’s nutrition entry is missing; calorie and protein fields were not logged. Presence is all this brief checks — intake adequacy is not judged.`,
          'Recorded nutrition entry'
        )
      );
    }

    if (attention.some((item) => item.id === 'daily-sleep-attention')) {
      action.push(
        entry('daily-action-sleep', 'Consider reviewing your sleep schedule.', 'Recorded sleep pattern')
      );
    }
    if (attention.some((item) => item.id === 'daily-exercise-attention')) {
      action.push(
        entry(
          'daily-action-exercise',
          'Review the planned activity block and record completion after the session.',
          'Recorded exercise entries'
        )
      );
    }
    if (attention.some((item) => item.id === 'daily-hydration-attention')) {
      action.push(
        entry(
          'daily-action-hydration',
          'Review hydration logging and confirm today’s fluid intake is recorded.',
          'Recorded hydration entry'
        )
      );
    }
    if (
      attention.some(
        (item) => item.id === 'daily-fatigue-attention' || item.id === 'daily-stress-attention'
      )
    ) {
      action.push(
        entry(
          'daily-action-recovery',
          'Consider planning a recovery block and reducing avoidable workload where the mission allows.',
          'Recorded fatigue and stress self-report'
        )
      );
    }
    if (
      attention.some(
        (item) =>
          item.id.startsWith('symptom-') ||
          item.id.startsWith('pain-') ||
          item.id === 'appetite'
      )
    ) {
      action.push(
        entry(
          'daily-action-symptoms',
          'Keep recording symptom changes and review them with the crew medical lead if they persist or worsen.',
          'Recorded symptom check-in'
        )
      );
    }
  }

  if (input.escalation?.required) {
    attention.unshift(
      entry(
        'daily-escalation',
        'A recorded observation crosses the configured safety boundary. Follow mission medical escalation procedures now.',
        'Recorded escalation trigger'
      )
    );
    action.unshift(
      entry(
        'daily-action-escalate',
        'Follow mission medical escalation procedures now.',
        'Recorded escalation trigger'
      )
    );
  }

  if (action.length === 0) {
    action.push(
      entry(
        'daily-action-continue',
        today
          ? 'Continue the current countermeasure cadence and record today’s values.'
          : 'Complete today’s check-in so the daily brief can use recorded values.',
        today ? 'Recorded check-in' : 'No recorded check-in'
      )
    );
  }

  const confidenceGaps = missing.map((item) => item.text);
  let confidence: MissionHealthBriefConfidence;
  if (!today) {
    confidence = {
      level: 'low',
      label: 'Low',
      note: 'Confidence is low because today’s check-in is missing. No today value was assumed, and simulated or research material is never substituted.',
      gaps: confidenceGaps,
    };
  } else if (!previous) {
    confidence = {
      level: 'low',
      label: 'Low',
      note: 'Confidence is low because only today’s check-in is available. A daily brief reflects one day and no earlier comparison day exists.',
      gaps: confidenceGaps,
    };
  } else {
    confidence = {
      level: 'moderate',
      label: 'Moderate',
      note: 'Confidence is moderate: today’s check-in is recorded and one earlier recorded day is available for a limited comparison. A daily brief does not establish a trend.',
      gaps: confidenceGaps,
    };
  }

  const share: MissionHealthBriefShareItem[] = [
    {
      text: weeklyEscalation.prompt,
      disposition: 'include',
      source: 'recorded',
    },
  ];
  if (today) {
    share.push({
      text: `Include today’s recorded check-in (${dayLabel(missionDay)}) and its recorded values.`,
      disposition: 'include',
      source: 'recorded',
    });
  }
  if (todayVitals) {
    share.push({
      text: `Include the recorded vital reading for ${dayLabel(missionDay)}.`,
      disposition: 'include',
      source: 'recorded',
    });
  }
  share.push(
    {
      text: 'Private crew free-text notes are withheld unless the operator explicitly opts in to the full observation report. They are never part of this brief.',
      disposition: 'withhold',
      source: 'private',
    },
    {
      text: 'Simulated demonstration telemetry is withheld and must not be shared as crew data.',
      disposition: 'withhold',
      source: 'simulated',
    },
    {
      text: 'Bundled NASA research references may be shared as labelled background only; they are not this crew’s measurements.',
      disposition: 'include',
      source: 'research',
    }
  );

  const dailyEscalation = buildEscalation(
    input.escalation?.required ?? false,
    input.escalation?.reasons ?? [],
    'none',
    'If symptoms are severe or worsening, follow mission medical escalation procedures.',
    'No configured daily escalation criterion met',
    weeklyEscalation.level === 'urgent'
      ? weeklyEscalation.prompt
      : 'No urgent share is requested. Share the routine summary if medical support asks for it.'
  );

  return {
    id: 'daily',
    scopeLabel: `Daily brief · ${dayLabel(missionDay)}`,
    windowLabel: `Today (${dayLabel(missionDay)})`,
    window: {
      requestedDays: window.requestedDays,
      startDay: window.startDay,
      endDay: window.endDay,
      coveredDays: window.coveredDays,
      recordedDays: today ? 1 : 0,
      coverageNotice: today ? null : '1-day window selected; no observations available.',
    },
    confidence,
    sections: buildSections(
      { changed, stable, attention, missing, action },
      {
        changed: today
          ? previous
            ? 'No recorded today value changed beyond the demonstration change thresholds.'
            : 'A daily change needs an earlier recorded check-in; none is available.'
          : 'Today’s check-in is not recorded, so today’s change cannot be shown.',
        stable: today
          ? 'No recorded today value stayed inside its planning reference; see what needs attention.'
          : 'No today values are assumed stable.',
        attention: today
          ? 'No recorded today value crossed a daily attention threshold.'
          : 'No daily attention assessment is produced because today’s check-in is missing.',
        missing: 'No required daily data gap was identified.',
        action: 'No daily action is suggested.',
      }
    ),
    share,
    escalation: dailyEscalation,
    disclaimer: MISSION_HEALTH_BRIEF_DISCLAIMER,
  };
}

function buildWeekly(
  input: MissionHealthBriefInput
): MissionHealthBriefScope {
  const { astronaut, missionDay } = input;
  const readiness = buildRecoveryReadiness({
    astronaut,
    checkIns: input.checkIns,
    vitals: input.vitals ?? [],
    missionDay,
    windowDays: MISSION_HEALTH_BRIEF_WINDOW_DAYS,
    escalation: input.escalation,
  });
  const coach = buildCountermeasureCoach({
    astronaut,
    checkIns: input.checkIns,
    missionDay,
    windowDays: MISSION_HEALTH_BRIEF_WINDOW_DAYS,
  });
  const window = computeObservationWindow(missionDay, MISSION_HEALTH_BRIEF_WINDOW_DAYS);
  const days = uniqueCheckIns(
    input.checkIns.filter(
      (item) =>
        item.astronautId === astronaut.id &&
        item.missionDay >= window.startDay &&
        item.missionDay <= window.endDay
    )
  );
  const vitalDays = uniqueVitals(
    (input.vitals ?? []).filter(
      (item) =>
        item.astronautId === astronaut.id &&
        item.missionDay >= window.startDay &&
        item.missionDay <= window.endDay
    )
  );

  const changed: MissionHealthBriefEntry[] = [];
  const stable: MissionHealthBriefEntry[] = [];
  const attention: MissionHealthBriefEntry[] = [];
  const missing: MissionHealthBriefEntry[] = [];
  const action: MissionHealthBriefEntry[] = [];

  if (days.length >= 2) {
    const first = days[0];
    const last = days[days.length - 1];
    changed.push(...changeEntries(first, last));
  }

  readiness.factors
    .filter(
      (factor) =>
        factor.status === 'scored' && factor.score != null && factor.score >= 80
    )
    .forEach((factor) => {
      stable.push(
        entry(
          `weekly-stable-${factor.id}`,
          `${factor.label} stayed inside its planning range: ${factor.summary}`,
          `Recorded ${factor.label.toLowerCase()} inputs`
        )
      );
    });

  coach.items
    .filter((item) => item.status === 'review')
    .forEach((item: CountermeasureItem) => {
      attention.push(
        entry(
          `weekly-attention-${item.id}`,
          `${item.label}: ${item.currentStatus}`,
          `Recorded ${item.label.toLowerCase()} inputs`
        )
      );
    });

  if (readiness.escalation.level === 'review') {
    readiness.escalation.reasons.forEach((reason, index) => {
      attention.push(
        entry(
          `weekly-escalation-reason-${index}`,
          `Recovery review prompt: ${reason}`,
          'Recorded check-in pattern'
        )
      );
    });
  }

  attention.push(...symptomEntries(days), ...painEntries(days), ...appetiteEntries(days));

  if (input.escalation?.required) {
    attention.unshift(
      entry(
        'weekly-escalation',
        'A recorded observation crosses the configured safety boundary. Follow mission medical escalation procedures now.',
        'Recorded escalation trigger'
      )
    );
  }

  if (readiness.window.recordedDays === 0) {
    missing.push(
      entry(
        'weekly-no-check-ins',
        'No check-ins were recorded in this 7-day window; no factor was assumed normal.',
        'Recorded check-ins'
      )
    );
    missing.push(
      entry(
        'weekly-no-vitals',
        vitalDays.length === 0
          ? 'No recorded vitals were available either; simulated samples cannot fill the gap.'
          : 'Vitals were recorded, but a recovery band is not produced without check-ins.',
        'Recorded vitals'
      )
    );
  } else {
    if (readiness.missingDays.length > 0) {
      missing.push(
        entry(
          'weekly-missing-days',
          `${readiness.missingDays.length} of ${window.coveredDays} mission days have no check-in (${readiness.missingDays
            .map((day) => `Sol ${day}`)
            .join(', ')}). Missing days are not imputed and are not treated as normal.`,
          'Recorded check-in coverage'
        )
      );
    }

    readiness.factors
      .filter((factor) => factor.status !== 'scored' && factor.missingReason)
      .forEach((factor) => {
        missing.push(
          entry(
            `weekly-factor-${factor.id}`,
            `${factor.label}: ${factor.missingReason}`,
            `Recorded ${factor.label.toLowerCase()} inputs`
          )
        );
      });

    if (vitalDays.length === 0) {
      missing.push(
        entry(
          'weekly-no-vitals',
          'No recorded vitals are available in this window; simulated samples cannot fill the gap.',
          'Recorded vitals'
        )
      );
    }

    const nutritionEntryDays = days.filter(hasNutritionEntry).length;
    if (nutritionEntryDays === 0) {
      missing.push(
        entry(
          'weekly-no-nutrition',
          'No recorded day has a nutrition entry. Calorie and protein fields are estimates and are not used to judge intake adequacy.',
          'Recorded nutrition entries'
        )
      );
    }

    const coachMissingNotes = [
      ...new Set(
        coach.items
          .map((item) => item.missingDataNote)
          .filter((note): note is string => typeof note === 'string' && note.length > 0)
      ),
    ];
    coachMissingNotes.forEach((note, index) => {
      missing.push(
        entry(`weekly-coach-missing-${index}`, note, 'Countermeasure coverage check')
      );
    });
  }

  if (readiness.escalation.level === 'urgent') {
    action.push(
      entry(
        'weekly-action-escalate',
        'Follow mission medical escalation procedures now.',
        'Recorded escalation trigger'
      )
    );
  }
  action.push(
    entry('weekly-action-readiness', readiness.recommendation, 'Recorded recovery factors')
  );

  const focusItem = coach.items.find((item) => item.id === coach.focusItemId) ?? null;
  if (focusItem) {
    action.push(
      entry(
        `weekly-action-focus-${focusItem.id}`,
        focusItem.suggestedAction,
        `Recorded ${focusItem.label.toLowerCase()} inputs`
      )
    );
  }
  if (!coach.todayCheckInComplete) {
    action.push(
      entry('weekly-action-check-in', 'Complete today’s check-in.', 'No recorded today check-in')
    );
  }

  const confidenceGaps = missing.map((item) => item.text);
  let confidence: MissionHealthBriefConfidence;
  if (readiness.window.recordedDays === 0) {
    confidence = {
      level: 'low',
      label: 'Low',
      note: 'Confidence is low because no check-ins were recorded in this window. No value was assumed, and simulated or research material is never substituted.',
      gaps: confidenceGaps,
    };
  } else {
    const partialFactors = readiness.factors.filter(
      (factor) => factor.status !== 'scored'
    ).length;
    const high =
      readiness.dayCoveragePercent >= 80 &&
      readiness.evidenceCoveragePercent >= 80 &&
      partialFactors === 0;
    const moderate =
      readiness.dayCoveragePercent >= 50 && readiness.evidenceCoveragePercent >= 50;
    confidence = {
      level: high ? 'high' : moderate ? 'moderate' : 'low',
      label: high ? 'High' : moderate ? 'Moderate' : 'Low',
      note: `Confidence reflects recorded coverage only: ${readiness.dayCoveragePercent}% of mission days have a check-in and ${readiness.evidenceCoveragePercent}% of factor weight is backed by recorded data. Simulation and research material never count toward confidence.`,
      gaps: confidenceGaps,
    };
  }

  const share: MissionHealthBriefShareItem[] = [
    {
      text: readiness.escalation.level === 'urgent'
        ? 'Share this brief and the observation report promptly through mission medical channels.'
        : readiness.escalation.level === 'review'
        ? 'Consider sharing the recorded sleep and fatigue pattern at the next scheduled medical review.'
        : 'No configured escalation criterion is met. Share the routine summary if medical support asks for it.',
      disposition: 'include',
      source: 'recorded',
    },
  ];
  if (readiness.score != null) {
    share.push({
      text: `Include the recovery band (${readiness.bandLabel}, ${readiness.score}/100) and its recorded coverage (${readiness.dayCoveragePercent}% of days).`,
      disposition: 'include',
      source: 'recorded',
    });
  }
  share.push({
    text: `Include the recorded check-in coverage (${readiness.window.recordedDays} of ${window.coveredDays} mission days) and the missing-data notes so coverage is not overstated.`,
    disposition: 'include',
    source: 'recorded',
  });
  if (vitalDays.length > 0) {
    share.push({
      text: `Include the ${vitalDays.length} recorded vital day${vitalDays.length === 1 ? '' : 's'} in this window.`,
      disposition: 'include',
      source: 'recorded',
    });
  }
  share.push(
    {
      text: 'Private crew free-text notes are withheld unless the operator explicitly opts in to the full observation report. They are never part of this brief.',
      disposition: 'withhold',
      source: 'private',
    },
    {
      text: 'Simulated demonstration telemetry is withheld and must not be shared as crew data.',
      disposition: 'withhold',
      source: 'simulated',
    },
    {
      text: 'Bundled NASA research references may be shared as labelled background only; they are not this crew’s measurements.',
      disposition: 'include',
      source: 'research',
    }
  );

  return {
    id: 'weekly',
    scopeLabel: `Weekly brief · ${dayRangeLabel(window.startDay, window.endDay)}`,
    windowLabel: dayRangeLabel(window.startDay, window.endDay),
    window: readiness.window,
    confidence,
    sections: buildSections(
      { changed, stable, attention, missing, action },
      {
        changed:
          days.length >= 2
            ? 'No recorded value changed beyond the demonstration change thresholds between the first and latest recorded day.'
            : days.length === 1
            ? 'A weekly change needs at least two recorded days; only one is recorded.'
            : 'No check-ins are recorded in this window, so no change can be shown.',
        stable: 'No recovery factor reached the on-track score in this window; see what needs attention.',
        attention: 'No recorded countermeasure area is flagged for review in this window.',
        missing: 'All six recovery factors were scored from recorded data; no required gap was identified.',
        action: 'No weekly action is suggested.',
      }
    ),
    share,
    escalation: {
      level: readiness.escalation.level,
      title: readiness.escalation.title,
      detail: readiness.escalation.detail,
      reasons: readiness.escalation.reasons,
      prompt:
        readiness.escalation.level === 'urgent'
          ? 'Share this brief and the observation report promptly through mission medical channels.'
          : readiness.escalation.level === 'review'
          ? 'Consider sharing the recorded pattern at the next scheduled medical review.'
          : 'No configured escalation criterion is met. Share the routine summary if medical support asks for it.',
    },
    disclaimer: MISSION_HEALTH_BRIEF_DISCLAIMER,
  };
}

export function buildMissionHealthBrief(
  input: MissionHealthBriefInput
): MissionHealthBrief {
  const weekly = buildWeekly(input);
  const daily = buildDaily(input, weekly.escalation);
  const coach = buildCountermeasureCoach({
    astronaut: input.astronaut,
    checkIns: input.checkIns,
    missionDay: input.missionDay,
    windowDays: MISSION_HEALTH_BRIEF_WINDOW_DAYS,
  });

  const researchReferences: MissionHealthBriefResearchReference[] = [];
  const seen = new Set<string>();
  coach.items.forEach((item) => {
    item.researchContext.forEach((context) => {
      if (seen.has(context.id)) return;
      seen.add(context.id);
      researchReferences.push({
        id: context.id,
        title: context.title,
        organization: context.organization,
        url: context.url,
        source: 'research',
      });
    });
  });

  const weeklyVitalDays = uniqueVitals(
    (input.vitals ?? []).filter(
      (item) =>
        item.astronautId === input.astronaut.id &&
        item.missionDay >= weekly.window.startDay &&
        item.missionDay <= weekly.window.endDay
    )
  ).length;

  return {
    astronautId: input.astronaut.id,
    missionDay: input.missionDay,
    daily,
    weekly,
    sources: {
      recorded: `Recorded: ${weekly.window.recordedDays} check-in day${
        weekly.window.recordedDays === 1 ? '' : 's'
      } and ${weeklyVitalDays} vital day${weeklyVitalDays === 1 ? '' : 's'} in the 7-day window.`,
      simulated:
        'Simulated: demonstration telemetry is excluded from this brief, its confidence, and the medical share. It is not a measurement of this crew.',
      research:
        'Research: bundled NASA excerpts are labelled background only. They are not this crew’s measurements and never set the confidence.',
    },
    researchReferences,
    privacyNote: MISSION_HEALTH_BRIEF_PRIVACY_NOTE,
    disclaimer: MISSION_HEALTH_BRIEF_DISCLAIMER,
  };
}

function formatEntrySource(entryItem: MissionHealthBriefEntry): string {
  return entryItem.sources
    .map((source) => (source.source === 'recorded' ? 'Recorded' : source.source === 'research' ? 'Research' : 'Simulated'))
    .join(' / ');
}

export function missionHealthBriefToMarkdown(brief: MissionHealthBrief): string {
  const scopeBlock = (scope: MissionHealthBrief['daily']): string[] => {
    const lines: string[] = [
      `### ${scope.scopeLabel} (${scope.windowLabel})`,
      '',
      `- **Confidence:** ${scope.confidence.label} — ${scope.confidence.note}`,
      `- **Escalation:** ${scope.escalation.title}. ${scope.escalation.detail}`,
      '',
    ];
    if (scope.escalation.reasons.length > 0) {
      lines.push('**Recorded escalation reasons**');
      scope.escalation.reasons.forEach((reason) => lines.push(`- ${reason}`));
      lines.push('');
    }
    scope.sections.forEach((section) => {
      lines.push(`#### ${section.title}`);
      if (section.entries.length === 0) {
        lines.push(`- ${section.emptyText}`);
      } else {
        section.entries.forEach((item) => {
          lines.push(`- ${item.text} _(${formatEntrySource(item)})_`);
        });
      }
      lines.push('');
    });
    lines.push('#### What to share with medical support');
    scope.share.forEach((item) => {
      lines.push(
        `- [${item.disposition === 'include' ? 'Include' : 'Withhold'}] ${item.text}`
      );
    });
    lines.push('');
    if (scope.confidence.gaps.length > 0) {
      lines.push('**Data gaps behind this confidence level**');
      scope.confidence.gaps.forEach((gap) => lines.push(`- ${gap}`));
      lines.push('');
    }
    return lines;
  };

  const lines: string[] = [
    '## Mission Health Brief',
    '',
    'A concise daily and weekly synthesis of recorded observations. Simulated demonstration telemetry and research context are labelled; neither is used as crew evidence.',
    '',
    ...scopeBlock(brief.daily),
    ...scopeBlock(brief.weekly),
    '### Source separation',
    `- ${brief.sources.recorded}`,
    `- ${brief.sources.simulated}`,
    `- ${brief.sources.research}`,
    '',
  ];

  if (brief.researchReferences.length > 0) {
    lines.push('### Research context (not crew data)');
    brief.researchReferences.forEach((reference) => {
      lines.push(
        `- ${reference.title} — ${reference.organization} (${reference.url}) _Research_`
      );
    });
    lines.push('');
  }

  lines.push('### Privacy');
  lines.push(brief.privacyNote);
  lines.push('');
  lines.push(brief.disclaimer);
  lines.push('');

  return lines.join('\n');
}
