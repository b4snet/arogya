/**
 * Mission-day observation windows.
 *
 * Every window is expressed as a whole-day range anchored to the current mission day
 * (mission day 1 = first day of the mission). Only integer day indices are used, so a
 * boundary cannot drift with the viewer's timezone, a DST transition, or locale
 * formatting — `timestampIso` is display data, never a filtering input.
 *
 * A request larger than the mission's elapsed days is clamped to the mission start and
 * reported through `describeWindowCoverage`; the pre-mission days are never fabricated.
 */

export const OBSERVATION_WINDOW_OPTIONS = [7, 14, 30] as const;
export type ObservationWindowDays = (typeof OBSERVATION_WINDOW_OPTIONS)[number];

export interface ObservationWindow {
  /** Days asked for by the selector (7 / 14 / 30). */
  requestedDays: number;
  /** First mission day inside the window (never below 1). */
  startDay: number;
  /** Last mission day inside the window (the current mission day). */
  endDay: number;
  /** Mission days the window covers — never more than the mission has elapsed. */
  coveredDays: number;
  /** Requested days that fall before mission day 1, i.e. days with no possible data. */
  preMissionDays: number;
}

export function computeObservationWindow(
  currentMissionDay: number,
  requestedDays: number
): ObservationWindow {
  const endDay = Math.max(1, Math.round(currentMissionDay));
  const requested = Math.max(1, Math.round(requestedDays));
  const startDay = Math.max(1, endDay - requested + 1);
  const coveredDays = endDay - startDay + 1;
  return {
    requestedDays: requested,
    startDay,
    endDay,
    coveredDays,
    preMissionDays: requested - coveredDays,
  };
}

export function isWithinWindow<T extends { missionDay: number }>(
  item: T,
  window: ObservationWindow
): boolean {
  return item.missionDay >= window.startDay && item.missionDay <= window.endDay;
}

/** Actual observations inside the window, oldest first. Never pads with fabricated days. */
export function filterByObservationWindow<T extends { missionDay: number }>(
  items: T[],
  window: ObservationWindow
): T[] {
  return items
    .filter((item) => isWithinWindow(item, window))
    .sort((a, b) => a.missionDay - b.missionDay);
}

/** Number of distinct mission days that actually carry an observation. */
export function countObservedDays(items: Array<{ missionDay: number }>): number {
  return new Set(items.map((item) => item.missionDay)).size;
}

/**
 * Coverage sentence shown when a window is larger than the recorded history, e.g.
 * "30-day window selected; 14 days of observations available."
 */
export function describeWindowCoverage(
  window: ObservationWindow,
  observedDays: number
): string | null {
  if (observedDays >= window.requestedDays) return null;
  return `${window.requestedDays}-day window selected; ${observedDays} days of observations available.`;
}

/**
 * One slot per mission day of the window, with `null` where nothing was recorded, so a
 * chart draws a visible gap instead of connecting across missing days.
 */
export function buildDailySeries<T extends { missionDay: number }>(
  items: T[],
  window: ObservationWindow
): Array<{ missionDay: number; item: T | null }> {
  const byDay = new Map<number, T>();
  items.forEach((item) => byDay.set(item.missionDay, item));

  const series: Array<{ missionDay: number; item: T | null }> = [];
  for (let day = window.startDay; day <= window.endDay; day += 1) {
    series.push({ missionDay: day, item: byDay.get(day) ?? null });
  }
  return series;
}
