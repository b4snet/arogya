import assert from 'node:assert/strict';
import { test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import type { CheckIn, Mission, VitalReading } from '../../types';
import { SEED_ASTRONAUTS } from '../../data/astronauts';
import { SEED_MISSION } from '../../data/missionData';
import { SEED_CHECKINS_BY_ASTRONAUT } from '../../data/checkIns14Day';
import { SEED_VITALS_BY_ASTRONAUT } from '../../data/vitals14Day';
import { evaluateHealthAssessment } from '../../engine/healthEngine';
import { CrewReadinessOverview } from './CrewReadinessOverview';

const missionDay7: Mission = { ...SEED_MISSION, currentDay: 7 };

function makeCheckIn(astronautId: string, missionDay: number, overrides: Partial<CheckIn> = {}): CheckIn {
  return {
    id: `checkin-${astronautId}-${missionDay}`,
    astronautId,
    missionDay,
    timestampIso: `2026-11-${String(missionDay).padStart(2, '0')}T08:00:00.000Z`,
    sleepHours: 7.5,
    sleepQuality: 5,
    moodScore: 5,
    stressLevel: 1,
    cognitiveFocus: 5,
    fatigueLevel: 1,
    hydrationLiters: 2.5,
    caloriesKcal: 2650,
    proteinGrams: 95,
    exerciseMinutes: 60,
    exerciseCompleted: true,
    resistanceTrainingCompleted: true,
    painScore: 0,
    symptoms: ['none'],
    crewNotes: '',
    syncedToGround: false,
    ...overrides,
  };
}

function renderOverview({
  checkInsByAstronaut = SEED_CHECKINS_BY_ASTRONAUT,
  vitalsByAstronaut = SEED_VITALS_BY_ASTRONAUT,
  mission = SEED_MISSION,
  activeAstronautId = 'AST-01',
}: {
  checkInsByAstronaut?: Record<string, CheckIn[]>;
  vitalsByAstronaut?: Record<string, VitalReading[]>;
  mission?: Mission;
  activeAstronautId?: string;
} = {}) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <CrewReadinessOverview
        astronauts={SEED_ASTRONAUTS}
        checkInsByAstronaut={checkInsByAstronaut}
        vitalsByAstronaut={vitalsByAstronaut}
        mission={mission}
        activeAstronautId={activeAstronautId}
        onFocusAstronaut={() => undefined}
      />
    </MemoryRouter>
  );
}

test('renders crew metrics, bands, trends, and source separation', () => {
  const html = renderOverview();

  assert.match(html, /aria-labelledby="crew-readiness-heading"/);
  assert.match(html, /Crew readiness overview/);
  assert.match(html, /Monitoring support only/);
  assert.match(html, /data-mission-source="recorded"/);

  const simulatedBadges = html.match(/data-mission-source="simulated"/g) ?? [];
  const researchBadges = html.match(/data-mission-source="research"/g) ?? [];
  assert.equal(simulatedBadges.length, 1, 'simulated is shown only as an exclusion legend');
  assert.equal(researchBadges.length, 1, 'research is shown only as an unused legend');
  assert.match(html, /excluded from every crew metric/);
  assert.match(html, /context only, not used/);

  assert.match(html, /role="group" aria-label="Crew readiness observation window"/);
  assert.match(html, /aria-pressed="true"[^>]*>7d</);
  assert.match(html, /aria-pressed="false"[^>]*>14d</);
  assert.match(html, /Day 8–14/);

  assert.equal((html.match(/data-crew-metric=/g) ?? []).length, 4);
  assert.match(html, /data-crew-metric="check_in_completion"/);
  assert.match(html, /data-crew-metric="sleep_regularity"/);
  assert.match(html, /data-crew-metric="exercise_adherence"/);
  assert.match(html, /data-crew-metric="workload_fatigue"/);
  assert.match(html, /Check-in completion/);
  assert.match(html, /Sleep regularity/);
  assert.match(html, /Exercise adherence/);
  assert.match(html, /Workload &amp; fatigue/);
  assert.match(html, /21 of 21 crew-days/);
  assert.match(html, /Crew check-in completion was/);
  assert.match(html, /Stable/);
  assert.match(html, /Crew-level next step/);

  assert.match(html, /Open alerts/);
  assert.match(html, /active recorded flag/);
  assert.match(html, /Alert titles and rationales stay in each individual record/);
  assert.match(html, /href="\/reports"/);
  assert.match(html, /Data gaps/);

  assert.match(html, /Individual readiness bands/);
  assert.match(html, /Commander Aarav Sharma/);
  assert.match(html, /Flight Engineer Maya Patel/);
  assert.match(html, /Mission Specialist Daniel Kim/);
  assert.match(html, /ARES-2/);
  assert.match(html, /data-crew-band="ready"/);
  assert.doesNotMatch(html, /data-crew-band="unscored"/);
  assert.match(html, /Focus ARES-2/);
  assert.match(html, /Focused/);

  assert.match(html, /Private crew notes and free-text check-in details are excluded/);
  assert.match(html, /Simulated demonstration streams are excluded/);
  assert.match(html, /monitoring support, not medical diagnosis/i);
  assert.doesNotMatch(html, /Extended airlock seal diagnostics/);
  assert.doesNotMatch(html, /PRIVATE-MEDICAL-NOTE/);
  assert.doesNotMatch(html, /diagnosed with|clinical validation|live sensor/i);
});

test('withholds every band when no crew member has recorded check-ins', () => {
  const html = renderOverview({
    checkInsByAstronaut: {},
    vitalsByAstronaut: {},
    mission: missionDay7,
  });

  assert.equal((html.match(/data-crew-band="unscored"/g) ?? []).length, 3);
  assert.match(html, /0 of 3 crew members have a band/);
  assert.match(html, /No readiness band is assigned/);
  assert.match(html, /Not scored/);
  assert.match(html, /no recorded check-ins/i);
  assert.match(html, /Recorded vitals coverage is missing for the full crew/);
  assert.match(html, /No crew member has recorded sleep regularity evidence/);
  assert.match(html, /Record a check-in for every crew member/);
});

test('shows open-flag counts and escalation awareness without private notes or alert text', () => {
  const privateNote = 'PRIVATE-MEDICAL-NOTE do not aggregate';
  const checkIns = [1, 2, 3, 4, 5, 6, 7].map((day) =>
    makeCheckIn(
      'AST-01',
      day,
      day === 7
        ? {
            crewNotes: privateNote,
            shareWithMedicalLead: false,
            symptoms: ['chest_pain'],
            painScore: 6,
          }
        : {}
    )
  );

  const assessment = evaluateHealthAssessment(SEED_ASTRONAUTS[0], checkIns, [], missionDay7);
  const alertTitle = assessment.alerts[0]?.title;
  assert.ok(alertTitle);

  const html = renderToStaticMarkup(
    <MemoryRouter>
      <CrewReadinessOverview
        astronauts={[SEED_ASTRONAUTS[0]]}
        checkInsByAstronaut={{ 'AST-01': checkIns }}
        vitalsByAstronaut={{}}
        mission={missionDay7}
        activeAstronautId="AST-01"
        onFocusAstronaut={() => undefined}
      />
    </MemoryRouter>
  );

  assert.match(html, /active recorded flag/);
  assert.match(html, /escalation review/);
  assert.match(html, /1 requires escalation review/);
  assert.match(html, /escalation flagged/);
  assert.match(html, /data-crew-band="rest"/);
  assert.match(html, /Alert titles and rationales stay in each individual record/);

  assert.doesNotMatch(html, /PRIVATE-MEDICAL-NOTE/);
  assert.doesNotMatch(html, /chest_pain/);
  assert.equal(html.includes(alertTitle), false, 'assessment alert title must not reach the crew view');
});
