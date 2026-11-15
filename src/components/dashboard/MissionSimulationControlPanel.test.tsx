import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MissionSimulationControlPanel } from './MissionSimulationControlPanel';
import { SEED_ASTRONAUTS } from '../../data/astronauts';

test('renders simulation controls, boundaries, timeline, and audit sections', () => {
  const html = renderToStaticMarkup(
    createElement(MissionSimulationControlPanel, { astronaut: SEED_ASTRONAUTS[0] })
  );

  assert.match(html, /Mission Simulation Control Panel/);
  assert.match(html, /Simulated demonstration · scenario engine/);
  assert.match(html, /Training\/demo only/);
  assert.match(html, /not live astronaut monitoring/i);
  assert.match(html, /real sensor telemetry/i);
  assert.match(html, /model training/i);
  assert.match(html, /clinical validation/i);
  assert.match(html, /NASA OSD-575 research\s+context/);
  assert.match(html, /Simulated — demo only/);
  assert.match(html, /Ready/);

  assert.match(html, />Start</);
  assert.match(html, />Pause</);
  assert.match(html, />Resume</);
  assert.match(html, />Reset</);

  for (const label of [
    'Nominal',
    'Exercise',
    'Sleep',
    'High workload',
    'Synthetic anomaly',
  ]) {
    assert.match(html, new RegExp(label));
  }
  for (const speed of ['1×', '2×', '4×']) {
    assert.match(html, new RegExp(speed));
  }
  for (const duration of ['5 min', '15 min', '30 min', '60 min']) {
    assert.match(html, new RegExp(duration));
  }
  assert.match(html, /aria-pressed="true"/);

  assert.match(html, /Event timeline/);
  assert.match(html, /No simulation events yet/);
  assert.match(html, /Simulation audit trail · 0 sessions/);
  assert.match(html, /No sessions recorded yet/);
  assert.match(html, /In-memory only/);
  assert.match(
    html,
    /Never included in recorded observations, assessments, reports, or NASA research data/
  );
  assert.doesNotMatch(html, /Commander Aarav Sharma/);
});
