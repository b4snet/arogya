import assert from 'node:assert/strict';
import { test } from 'vitest';
import { useArogyaStore } from './useArogyaStore';
import { SEED_ASTRONAUTS } from '../data/astronauts';
import { evaluateHealthAssessment } from '../engine/healthEngine';
import { getAstronautInitials } from '../components/ui/AstronautAvatar';

test('crew dataset includes the three required astronauts with accurate initials', () => {
  const names = SEED_ASTRONAUTS.map((a) => a.fullName);
  assert.deepEqual(names, [
    'Commander Aarav Sharma',
    'Flight Engineer Maya Patel',
    'Mission Specialist Daniel Kim',
  ]);
  assert.deepEqual(
    SEED_ASTRONAUTS.map((a) => getAstronautInitials(a.fullName)),
    ['AS', 'MP', 'DK']
  );
});

test('setActiveAstronaut switches crew without resetting unrelated preferences or atlas layers', () => {
  const store = useArogyaStore.getState();
  store.resetDemoData();
  store.setPreferences({ highContrast: true });
  store.setAtlasState({ showSkeleton: true, selectedOrgan: 'brain' });

  store.setActiveAstronaut('AST-02');
  let next = useArogyaStore.getState();
  assert.equal(next.activeAstronautId, 'AST-02');
  assert.equal(next.preferences.highContrast, true);
  assert.equal(next.atlasState.showSkeleton, true);
  assert.equal(next.atlasState.selectedOrgan, 'brain');

  // Invalid ID is safely ignored
  store.setActiveAstronaut('AST-UNKNOWN');
  next = useArogyaStore.getState();
  assert.equal(next.activeAstronautId, 'AST-02');
});

test('switching astronauts updates readiness score, alerts, and resetDemoData restores mock dataset', () => {
  const store = useArogyaStore.getState();
  store.resetDemoData();

  const state0 = useArogyaStore.getState();
  const aaravScore = evaluateHealthAssessment(
    state0.astronauts[0],
    state0.checkInsByAstronaut['AST-01'],
    state0.vitalsByAstronaut['AST-01'],
    state0.mission
  ).overallReadinessScore;

  const mayaScore = evaluateHealthAssessment(
    state0.astronauts[1],
    state0.checkInsByAstronaut['AST-02'],
    state0.vitalsByAstronaut['AST-02'],
    state0.mission
  ).overallReadinessScore;

  assert.notEqual(aaravScore, mayaScore);

  // Mutate check-ins and active astronaut, then restore with Demo Mission reset
  store.setActiveAstronaut('AST-03');
  store.addCheckIn({
    astronautId: 'AST-03',
    missionDay: 14,
    moodScore: 2,
    stressLevel: 5,
    fatigueLevel: 5,
    cognitiveFocus: 2,
    painLevel: 'moderate',
    painScore: 5,
    sleepHours: 4.5,
    sleepQuality: 2,
    appetite: 'poor',
    hydrationLiters: 1.4,
    caloriesKcal: 1850,
    proteinGrams: 75,
    exerciseCompleted: false,
    exerciseMinutes: 10,
    resistanceTrainingCompleted: false,
    resistanceMinutes: 0,
    symptoms: ['headache'],
    crewNotes: 'Simulated mutation test',
    shareWithMedicalLead: false,
  });

  assert.equal(useArogyaStore.getState().activeAstronautId, 'AST-03');
  assert.equal(
    useArogyaStore.getState().checkInsByAstronaut['AST-03'].find((c) => c.missionDay === 14)
      ?.crewNotes,
    'Simulated mutation test'
  );

  store.resetDemoData();
  const restored = useArogyaStore.getState();
  assert.equal(restored.activeAstronautId, 'AST-01');
  assert.notEqual(
    restored.checkInsByAstronaut['AST-03'].find((c) => c.missionDay === 14)?.crewNotes,
    'Simulated mutation test'
  );
  assert.equal(restored.reports.length, 0);
});
