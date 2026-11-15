import type { Astronaut, Report } from '../types';
import { SEED_ASTRONAUTS } from '../data/astronauts';
import { SEED_MISSION } from '../data/missionData';
import { SEED_VITALS_BY_ASTRONAUT } from '../data/vitals14Day';
import { SEED_CHECKINS_BY_ASTRONAUT } from '../data/checkIns14Day';
import { evaluateHealthAssessment } from '../engine/healthEngine';
import { buildStructuredReport, filterDataForReportPeriod } from '../engine/reportGenerator';

/** Deterministic report used by the Drive export tests. */
export function buildTestReport(overrides: Partial<Report> = {}): Report {
  const astronaut: Astronaut = SEED_ASTRONAUTS[0];
  const vitals = SEED_VITALS_BY_ASTRONAUT[astronaut.id];
  const checkIns = SEED_CHECKINS_BY_ASTRONAUT[astronaut.id];
  const { checkInsWindow, vitalsWindow } = filterDataForReportPeriod(
    checkIns,
    vitals,
    SEED_MISSION.currentDay,
    '7d'
  );
  const assessment = evaluateHealthAssessment(astronaut, checkInsWindow, vitalsWindow, SEED_MISSION);
  const report = buildStructuredReport({
    astronaut,
    assessment,
    mission: SEED_MISSION,
    vitalsWindow,
    checkInsWindow,
    format: 'flight_surgeon_sbar',
    preparedForRole: 'Flight Surgeon',
    period: '7d',
    includePrivateNotes: false,
  });

  return { ...report, id: 'RPT-AST-01-D14-TEST', createdAtIso: '2026-11-15T09:30:00.000Z', ...overrides };
}
