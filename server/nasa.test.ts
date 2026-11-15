import assert from 'node:assert/strict';
import { afterEach, beforeEach, test, vi } from 'vitest';
import { getDatasetsPayload, getEarthPayload } from './nasa';

const originalKey = process.env.NASA_API_KEY;

beforeEach(() => {
  process.env.NASA_API_KEY = 'server-test-key';
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalKey === undefined) delete process.env.NASA_API_KEY;
  else process.env.NASA_API_KEY = originalKey;
});

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('uses the server-side NASA key, not DEMO_KEY, and caches the response', async () => {
  const fetchMock = vi.fn(async () =>
    jsonResponse([
      { date: '2026-11-12 00:01:58', image: 'epic_1b_20261112000158', caption: 'Earth.' },
    ])
  );
  vi.stubGlobal('fetch', fetchMock);

  const first = await getEarthPayload();
  const second = await getEarthPayload();

  assert.equal(fetchMock.mock.calls.length, 1);
  const requestedUrl = String((fetchMock.mock.calls[0] as unknown[])[0]);
  assert.match(requestedUrl, /api_key=server-test-key/);
  assert.doesNotMatch(requestedUrl, /DEMO_KEY/);
  assert.equal(first.imageUrl, second.imageUrl);
  assert.equal(first.retrievedAt, second.retrievedAt);
  assert.equal(first.credit, 'NASA EPIC · NOAA DSCOVR');
});

test('queries data.nasa.gov through the curated topic and shapes the payload', async () => {
  const fetchMock = vi.fn(async () =>
    jsonResponse({
      result: {
        count: 120,
        results: [
          {
            id: 'ds-1',
            name: 'microgravity-example',
            title: 'Microgravity Example',
            notes: 'Crew physiology under microgravity.',
            metadata_modified: '2026-09-01T00:00:00.000Z',
            resources: [{ format: 'CSV' }],
            organization: { title: 'NASA' },
          },
        ],
      },
    })
  );
  vi.stubGlobal('fetch', fetchMock);

  const payload = await getDatasetsPayload('microgravity');

  assert.equal(fetchMock.mock.calls.length, 1);
  const requestedUrl = String((fetchMock.mock.calls[0] as unknown[])[0]);
  assert.match(requestedUrl, /q=microgravity/);
  assert.match(requestedUrl, /data\.nasa\.gov/);
  assert.equal(payload.topic, 'microgravity');
  assert.equal(payload.label, 'Microgravity');
  assert.equal(payload.totalAvailable, 120);
  assert.equal(payload.datasets[0]?.title, 'Microgravity Example');
});

test('rejects topics outside the allowlist without calling upstream', async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);

  await assert.rejects(() => getDatasetsPayload('../../secret'));
  assert.equal(fetchMock.mock.calls.length, 0);
});
