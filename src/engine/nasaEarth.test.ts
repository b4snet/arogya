import assert from 'node:assert/strict';
import { afterEach, test, vi } from 'vitest';
import {
  buildEpicImageUrl,
  fetchLatestNasaEarthImage,
  getNasaApiKey,
  parseEpicEarthResponse,
} from './nasaEarth';

afterEach(() => {
  vi.unstubAllGlobals();
});

const SAMPLE = [
  {
    date: '2026-11-13 00:27:12',
    image: 'epic_1b_20261113002712',
    caption: "This image was taken by NASA's EPIC camera onboard the NOAA DSCOVR spacecraft",
    version: '04',
  },
];

test('builds the EPIC archive URL from the image timestamp', () => {
  assert.equal(
    buildEpicImageUrl('2026-11-13 00:27:12', 'epic_1b_20261113002712'),
    'https://epic.gsfc.nasa.gov/archive/natural/2026/11/13/jpg/epic_1b_20261113002712.jpg'
  );
});

test('rejects malformed dates and image identifiers', () => {
  assert.equal(buildEpicImageUrl('not-a-date', 'epic_1b_20261113002712'), null);
  assert.equal(buildEpicImageUrl('2026-11-13', '../escape'), null);
  assert.equal(buildEpicImageUrl('2026-11-13', ''), null);
});

test('parses the latest EPIC entry and keeps attribution', () => {
  const image = parseEpicEarthResponse(SAMPLE);
  assert.ok(image);
  assert.equal(image.date, '2026-11-13');
  assert.match(image.imageUrl, /\/2026\/11\/13\/jpg\/epic_1b_20261113002712\.jpg$/);
  assert.equal(image.credit, 'NASA EPIC · NOAA DSCOVR');
  assert.match(image.caption, /EPIC camera/);
});

test('rejects empty or malformed payloads', () => {
  assert.equal(parseEpicEarthResponse(null), null);
  assert.equal(parseEpicEarthResponse([]), null);
  assert.equal(parseEpicEarthResponse([{ date: 42, image: 'x' }]), null);
  assert.equal(parseEpicEarthResponse([{ date: '2026-11-13', image: 'bad id' }]), null);
});

test('fetches the latest image and sends the configured key', async () => {
  const fetchMock = vi.fn(async (_input: RequestInfo | URL) => ({
    ok: true,
    json: async () => SAMPLE,
  }));
  vi.stubGlobal('fetch', fetchMock);

  const image = await fetchLatestNasaEarthImage();

  assert.ok(image);
  assert.equal(image.date, '2026-11-13');
  const requestedUrl = String(fetchMock.mock.calls[0]?.[0]);
  assert.match(requestedUrl, /^https:\/\/api\.nasa\.gov\/EPIC\/api\/natural\?api_key=/);
  assert.ok(requestedUrl.includes(encodeURIComponent(getNasaApiKey())));
});

test('returns null when the API is unavailable', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({}) })));
  assert.equal(await fetchLatestNasaEarthImage(), null);

  vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('offline'))));
  await assert.rejects(() => fetchLatestNasaEarthImage());
});
