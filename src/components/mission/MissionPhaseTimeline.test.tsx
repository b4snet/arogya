import assert from 'node:assert/strict';
import { test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MissionPhaseTimeline } from './MissionPhaseTimeline';

function countMatches(html: string, pattern: RegExp): number {
  return html.match(pattern)?.length ?? 0;
}

test('timeline renders all phases with current, completed, upcoming, and source labels', () => {
  const html = renderToStaticMarkup(
    <MissionPhaseTimeline transitDay={14} transitDurationDays={260} />
  );

  assert.equal(countMatches(html, /data-mission-phase="/g), 7);
  assert.equal(countMatches(html, /data-phase-status="completed"/g), 3);
  assert.equal(countMatches(html, /data-phase-status="active"/g), 1);
  assert.equal(countMatches(html, /data-phase-status="upcoming"/g), 3);
  assert.equal(countMatches(html, /aria-current="step"/g), 1);
  assert.match(html, /aria-current="step"[^>]*data-mission-phase="transit"/);
  assert.match(html, /Mission lifecycle phases. Use arrow keys to move between phases./);
  assert.match(html, /Current: Transit/);
  assert.match(html, /Simulated demonstration/);
  assert.match(html, /Research observation/);
  assert.match(html, /No bundled OSD-575 sample/);
});

test('timeline exposes a keyboard focus target and responsive layout classes', () => {
  const html = renderToStaticMarkup(
    <MissionPhaseTimeline transitDay={14} transitDurationDays={260} />
  );

  assert.equal(countMatches(html, /<button/g), 7);
  assert.equal(countMatches(html, /tabindex="0"/g), 1);
  assert.equal(countMatches(html, /tabindex="-1"/g), 6);
  assert.equal(countMatches(html, /aria-controls="mission-phase-detail"/g), 7);
  assert.match(html, /grid-cols-1/);
  assert.match(html, /sm:grid-cols-2/);
  assert.match(html, /xl:grid-cols-4/);
  assert.match(html, /aria-live="polite"/);
});

test('default detail explains simulated elapsed time, health context, and missing research data honestly', () => {
  const html = renderToStaticMarkup(
    <MissionPhaseTimeline transitDay={14} transitDurationDays={260} />
  );

  assert.match(html, /data-phase-detail="transit"/);
  assert.match(html, /Transit day 14 of 260 simulated/);
  assert.match(html, /Profile days 46–305/);
  assert.match(html, /Health considerations/);
  assert.match(html, /OSD-575 contains no Mars-transit serum samples/);
  assert.match(html, /Research observation only\. Not this crew’s measurements and not a medical finding\./);
  assert.doesNotMatch(html, /\b(?:diagnose|diagnosis|prescribe|dosage)\b/i);
});

test('arrival-day timeline keeps the current phase inside the simulated transit scope', () => {
  const html = renderToStaticMarkup(
    <MissionPhaseTimeline transitDay={260} transitDurationDays={260} />
  );

  assert.match(html, /Transit day 260 of 260 · arrival day/);
  assert.match(html, /Current: Transit/);
  assert.doesNotMatch(html, /Current: Station operations/);
});
