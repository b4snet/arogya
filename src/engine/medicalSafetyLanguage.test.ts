import { describe, expect, it } from 'vitest';
import { SEED_ASTRONAUTS } from '../data/astronauts';
import { SEED_CHECKINS_BY_ASTRONAUT } from '../data/checkIns14Day';
import { SEED_MISSION } from '../data/missionData';
import { SEED_VITALS_BY_ASTRONAUT } from '../data/vitals14Day';
import { evaluateHealthAssessment } from './healthEngine';

const unsafeAdvicePatterns = [
  /\bdiagnos\w*\b/i,
  /\bprescrib\w*\b/i,
  /\b(?:medication|drug)\b.{0,40}\b(?:dose|dosage)\b/i,
  /\b(?:take|administer|give)\b.{0,40}\b\d+\s*(?:mg|mcg|g|ml|mL)\b/i,
];

function adviceText(): string[] {
  return SEED_ASTRONAUTS.flatMap((astronaut) => {
    const assessment = evaluateHealthAssessment(
      astronaut,
      SEED_CHECKINS_BY_ASTRONAUT[astronaut.id],
      SEED_VITALS_BY_ASTRONAUT[astronaut.id],
      SEED_MISSION
    );

    return [
      assessment.nextBestAction,
      ...assessment.alerts.flatMap((alert) => [
        alert.title,
        alert.rationale,
        alert.recommendedAction,
      ]),
      ...Object.values(assessment.systems).flatMap((system) => [
        system.plainLanguageSummary,
        system.escalationGuidance,
        ...system.recommendedActions,
      ]),
    ];
  });
}

describe('medical-safety language in generated advice', () => {
  it('does not make diagnoses, prescribing claims, or medication dosage recommendations', () => {
    const generatedAdvice = adviceText();

    for (const text of generatedAdvice) {
      for (const pattern of unsafeAdvicePatterns) {
        expect(text, `Unexpected unsafe advice: "${text}"`).not.toMatch(pattern);
      }
    }
  });

  it('keeps the language rule sensitive to unsafe medical instructions', () => {
    expect('You have a diagnosed condition.').toMatch(unsafeAdvicePatterns[0]);
    expect('Take 20 mg of the medication.').toMatch(unsafeAdvicePatterns[3]);
  });
});
