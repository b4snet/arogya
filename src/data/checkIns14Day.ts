import type { CheckIn } from '../types';

function isoEveningForDay(day: number): string {
  const base = new Date('2026-10-31T20:30:00Z');
  base.setUTCDate(base.getUTCDate() + (day - 1));
  return base.toISOString();
}

// AST-01: Commander Aarav Sharma — Nominal 14-day trajectory
const sharmaCheckIns: CheckIn[] = Array.from({ length: 14 }, (_, idx) => {
  const day = idx + 1;
  return {
    id: `CHK-01-D${day}`,
    astronautId: 'AST-01',
    missionDay: day,
    timestampIso: isoEveningForDay(day),
    sleepHours: Number((7.3 + (day % 4) * 0.1).toFixed(1)),
    sleepQuality: 4,
    moodScore: 4,
    stressLevel: 2,
    cognitiveFocus: 5,
    fatigueLevel: 2,
    hydrationLiters: Number((2.4 + (day % 3) * 0.1).toFixed(1)),
    caloriesKcal: 2600 + (day % 3) * 50,
    proteinGrams: 98,
    exerciseMinutes: 65,
    exerciseCompleted: true,
    resistanceTrainingCompleted: day % 7 !== 0 && day % 7 !== 3,
    painScore: 1,
    symptoms: ['none'],
    crewNotes:
      day === 14
        ? 'Mission Day 14 nominal. Crew cadence steady; ARED resistive block completed.'
        : 'Routine deep-space cruise; sleep, nutrition, and hydration on target.',
    syncedToGround: day < 14,
  };
});

// AST-02: Flight Engineer Maya Patel — Sleep debt, exercise deficit, and mood/stress drift (Days 10-14)
const patelCheckIns: CheckIn[] = Array.from({ length: 14 }, (_, idx) => {
  const day = idx + 1;
  const driftPhase = day >= 10;
  return {
    id: `CHK-02-D${day}`,
    astronautId: 'AST-02',
    missionDay: day,
    timestampIso: isoEveningForDay(day),
    sleepHours: driftPhase ? Number(Math.max(5.0, 6.5 - (day - 9) * 0.32).toFixed(1)) : 7.4,
    sleepQuality: driftPhase ? 2 : 4,
    moodScore: day >= 12 ? 2 : driftPhase ? 3 : 4,
    stressLevel: day >= 11 ? 4 : 2,
    cognitiveFocus: day >= 12 ? 3 : 4,
    fatigueLevel: day >= 11 ? 4 : 2,
    hydrationLiters: day >= 12 ? 1.8 : 2.4,
    caloriesKcal: day >= 12 ? 1950 : 2420,
    proteinGrams: day >= 12 ? 68 : 92,
    exerciseMinutes: day >= 12 ? 20 : 60,
    exerciseCompleted: day < 12,
    resistanceTrainingCompleted: day < 10 && day % 2 === 1,
    painScore: day >= 12 ? 3 : 1,
    symptoms: day >= 12 ? ['sleep_fragmentation', 'headache'] : ['none'],
    crewNotes:
      day >= 12
        ? 'Extended airlock seal diagnostics delayed sleep shift and skipped ARED block.'
        : 'Nominal flight systems shift.',
    syncedToGround: day < 14,
  };
});

// AST-03: Mission Specialist Daniel Kim — Post-EVA hydration deficit & mild headache/CO2 watch
const kimCheckIns: CheckIn[] = Array.from({ length: 14 }, (_, idx) => {
  const day = idx + 1;
  const postEva = day >= 11;
  return {
    id: `CHK-03-D${day}`,
    astronautId: 'AST-03',
    missionDay: day,
    timestampIso: isoEveningForDay(day),
    sleepHours: postEva ? 6.4 : 7.2,
    sleepQuality: postEva ? 3 : 4,
    moodScore: 4,
    stressLevel: postEva ? 3 : 2,
    cognitiveFocus: 4,
    fatigueLevel: postEva ? 3 : 2,
    hydrationLiters: day >= 12 ? 1.5 : 2.3,
    caloriesKcal: day >= 12 ? 2250 : 2540,
    proteinGrams: 88,
    exerciseMinutes: day === 10 ? 35 : 58,
    exerciseCompleted: true,
    resistanceTrainingCompleted: day % 2 === 0 && day !== 10,
    painScore: day >= 13 ? 3 : 1,
    symptoms: day >= 13 ? ['headache', 'nasal_congestion'] : ['none'],
    crewNotes:
      day >= 13
        ? 'Mild morning headache near Hab Bay 2 rack; verifying fan circulation and fluid intake.'
        : day === 10
        ? 'Completed hull-sensor EVA; increased dosimeter watch.'
        : 'Biology payload and environmental checks nominal.',
    syncedToGround: day < 14,
  };
});

export const SEED_CHECKINS_BY_ASTRONAUT: Record<string, CheckIn[]> = {
  'AST-01': sharmaCheckIns,
  'AST-02': patelCheckIns,
  'AST-03': kimCheckIns,
};
