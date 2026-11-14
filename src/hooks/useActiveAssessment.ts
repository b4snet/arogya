import { useMemo } from 'react';
import { useArogyaStore } from '../store/useArogyaStore';
import { evaluateHealthAssessment } from '../engine/healthEngine';

export function useActiveAssessment() {
  const astronauts = useArogyaStore((s) => s.astronauts);
  const activeAstronautId = useArogyaStore((s) => s.activeAstronautId);
  const mission = useArogyaStore((s) => s.mission);
  const vitalsByAstronaut = useArogyaStore((s) => s.vitalsByAstronaut);
  const checkInsByAstronaut = useArogyaStore((s) => s.checkInsByAstronaut);

  const astronaut = useMemo(
    () => astronauts.find((a) => a.id === activeAstronautId) ?? astronauts[0],
    [astronauts, activeAstronautId]
  );

  const vitals14d = useMemo(
    () => vitalsByAstronaut[astronaut.id] ?? [],
    [vitalsByAstronaut, astronaut.id]
  );

  const checkIns14d = useMemo(
    () => checkInsByAstronaut[astronaut.id] ?? [],
    [checkInsByAstronaut, astronaut.id]
  );

  const assessment = useMemo(
    () => evaluateHealthAssessment(astronaut, checkIns14d, vitals14d, mission),
    [astronaut, checkIns14d, vitals14d, mission]
  );

  return {
    astronaut,
    mission,
    vitals14d,
    checkIns14d,
    assessment,
  };
}
