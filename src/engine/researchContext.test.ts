import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { ResearchAreaId } from '../types';
import { NASA_CMP_DATASET } from '../data/researchLibrary';
import { NASA_FIVE_HAZARDS, SPACEFLIGHT_REFERENCES } from '../data/references';
import {
  COUNTERMEASURE_RESEARCH_AREAS,
  RESEARCH_CONTEXT_CREW_NOTE,
  RESEARCH_CONTEXT_SECTION_NOTE,
  RESEARCH_SURFACE_AREAS,
  buildCountermeasureResearchContext,
  buildResearchContextCard,
  buildResearchContextCardsForSurface,
  researchContextCardsToMarkdown,
} from './researchContext';

const ALL_AREAS: ResearchAreaId[] = [
  'cardiovascular',
  'metabolic_nutrition',
  'renal_hydration',
  'sleep_behavioral',
  'musculoskeletal',
  'hazard-radiation',
  'hazard-isolation',
  'hazard-distance',
  'hazard-gravity',
  'hazard-environment',
];

test('every surface maps to labelled research areas with a spaceflight rationale', () => {
  for (const surface of ['vitals', 'mission', 'recovery', 'countermeasure', 'report'] as const) {
    const cards = buildResearchContextCardsForSurface(surface);
    assert.equal(cards.length, RESEARCH_SURFACE_AREAS[surface].length, surface);
    assert.ok(cards.length > 0, surface);
    for (const card of cards) {
      assert.ok(card.id.length > 0);
      assert.ok(card.label.length > 0);
      assert.ok(card.whyItMatters.length > 40, `${surface}/${card.id} rationale`);
      assert.equal(card.source, 'research');
      assert.equal(card.crewDataNote, RESEARCH_CONTEXT_CREW_NOTE);
      assert.match(card.crewDataNote, /not this crew member/i);
      assert.match(card.crewDataNote, /No OSD-575 value is linked to Arogya crew records/);
    }
  }
});

test('OSD-575 backed cards preserve DOI, license, version, file hash, and OSDR attribution', () => {
  const card = buildResearchContextCard('renal_hydration');
  assert.ok(card.dataset);
  assert.equal(card.dataset.studyId, 'OSD-575');
  assert.equal(card.dataset.version, NASA_CMP_DATASET.provenance.version);
  assert.equal(card.dataset.doi, NASA_CMP_DATASET.provenance.doi);
  assert.equal(card.dataset.license, NASA_CMP_DATASET.provenance.license);
  assert.equal(card.dataset.licenseUrl, NASA_CMP_DATASET.provenance.licenseUrl);
  assert.equal(card.dataset.officialUrl, NASA_CMP_DATASET.provenance.officialUrl);
  assert.equal(card.dataset.filename, NASA_CMP_DATASET.provenance.filename);
  assert.equal(card.dataset.sha256, NASA_CMP_DATASET.provenance.sha256);
  assert.equal(card.researchHref, '/research#nasa-osd575');

  assert.equal(card.observations.length, 5);
  const sourceSubjects = new Set(NASA_CMP_DATASET.samples.map((sample) => sample.subjectId));
  for (const observation of card.observations) {
    assert.equal(observation.sampleCount, NASA_CMP_DATASET.samples.length);
    assert.ok(observation.observedCount > 0);
    assert.ok(observation.subjectCount <= sourceSubjects.size);
    assert.equal(typeof observation.minimum, 'number');
    assert.equal(typeof observation.maximum, 'number');
    assert.ok((observation.minimum ?? 0) <= (observation.maximum ?? 0));
  }
  assert.match(card.datasetNote, /not this crew member/);
  assert.match(card.datasetNote, /Ranges describe source observations only/);
});

test('areas without a direct OSD-575 analyte state the gap and point to the reference library', () => {
  for (const areaId of [
    'cardiovascular',
    'sleep_behavioral',
    'musculoskeletal',
    'hazard-radiation',
    'hazard-isolation',
    'hazard-distance',
    'hazard-gravity',
    'hazard-environment',
  ] as const) {
    const card = buildResearchContextCard(areaId);
    assert.equal(card.observations.length, 0, areaId);
    assert.equal(card.dataset, null, areaId);
    assert.equal(card.researchHref, '/research#nasa-reference-library', areaId);
    assert.match(card.datasetNote, /No OSD-575 CMP analyte maps directly to this area/, areaId);
  }
});

test('research references keep NASA provenance and hazard framing links', () => {
  const missionCards = buildResearchContextCardsForSurface('mission');
  const radiation = missionCards.find((card) => card.id === 'hazard-radiation');
  assert.ok(radiation);
  assert.ok(radiation.references.length > 0);
  const referenceIds = radiation.references.map((reference) => reference.id);
  assert.ok(referenceIds.includes('nasa-hrp-rad'));
  assert.ok(referenceIds.includes('hazard-radiation'));
  for (const reference of radiation.references) {
    assert.ok(reference.url.startsWith('https://'));
    if (reference.kind === 'reference') {
      assert.ok(SPACEFLIGHT_REFERENCES.some((source) => source.id === reference.id));
    } else {
      assert.ok(NASA_FIVE_HAZARDS.some((hazard) => hazard.id === reference.id));
      assert.equal(reference.organization, 'NASA Human Research Program');
    }
  }
  assert.match(radiation.whyItMatters, /radiation/i);
});

test('countermeasure areas resolve to their matching research card', () => {
  const exercise = buildCountermeasureResearchContext('exercise');
  assert.equal(exercise.id, 'musculoskeletal');
  const hydration = buildCountermeasureResearchContext('hydration');
  assert.equal(hydration.id, 'renal_hydration');
  const nutrition = buildCountermeasureResearchContext('nutrition');
  assert.equal(nutrition.id, 'metabolic_nutrition');
  for (const id of ['sleep', 'workload', 'check_in'] as const) {
    assert.equal(buildCountermeasureResearchContext(id).id, COUNTERMEASURE_RESEARCH_AREAS[id]);
  }
});

test('the research context engine never emits crew-derived or endorsement claims', () => {
  const cards = ALL_AREAS.map((areaId) => buildResearchContextCard(areaId));
  const text = [RESEARCH_CONTEXT_SECTION_NOTE, ...cards.flatMap((card) => [
    card.whyItMatters,
    card.datasetNote,
    ...card.observations.map((observation) => observation.label),
    ...card.references.map((reference) => reference.summary),
  ])].join(' ');

  assert.match(text, /not personal crew data/);
  assert.match(text, /does not imply an agency endorsement/);
  assert.doesNotMatch(text, /trained on NASA|NASA[- ]endorsed|NASA[- ]approved|validated by NASA/i);
  assert.doesNotMatch(text, /treatment plan|dosage|clinical validation/i);
  assert.doesNotMatch(text, /[Cc]ommander|[Aa]stronaut [A-Z]/);
});

test('markdown export labels research sections, keeps provenance, and disclaims crew linkage', () => {
  const markdown = researchContextCardsToMarkdown(buildResearchContextCardsForSurface('report'));

  assert.match(markdown, /^## Research Context \(Research — not crew data\)/);
  assert.match(markdown, /not personal crew data/);
  assert.match(markdown, /### Metabolism & nutrition/);
  assert.match(markdown, /\| Analyte \| Archived source range \| Observed \/ samples \|/);
  assert.match(markdown, /Source: OSD-575 Version 3 · DOI 10\.26030\/mc5d-p710 · License CC0-1\.0 · NASA OSDR/);
  assert.match(markdown, /https:\/\/osdr\.nasa\.gov\/bio\/repo\/data\/studies\/OSD-575/);
  assert.match(markdown, /Archived source samples, not this crew member/);
  assert.doesNotMatch(markdown, /trained on NASA|NASA endorsement/i);
  assert.equal(researchContextCardsToMarkdown([]), '');
});
