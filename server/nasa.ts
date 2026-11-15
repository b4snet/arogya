import type { IncomingMessage, ServerResponse } from 'node:http';
import process from 'node:process';
import {
  parseCkanSearch,
  parseEpicEarthResponse,
  resolveNasaTopic,
  type NasaDatasetsResponse,
  type NasaEarthResponse,
} from '../shared/nasa.ts';

const EPIC_API = 'https://api.nasa.gov/EPIC/api/natural';
const CKAN_API = 'https://data.nasa.gov/api/3/action/package_search';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const UPSTREAM_TIMEOUT_MS = 10_000;

interface CacheEntry {
  expiresAt: number;
  payload: unknown;
}

const cache = new Map<string, CacheEntry>();

function nasaApiKey(): string {
  return process.env.NASA_API_KEY?.trim() || 'DEMO_KEY';
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Arogya/1.0 (NASA Space Apps Challenge prototype)',
    },
  });
  if (!response.ok) throw new Error(`Upstream responded ${response.status}`);
  return response.json();
}

async function cached(key: string, load: () => Promise<unknown>): Promise<unknown> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) return hit.payload;
  const payload = await load();
  cache.set(key, { expiresAt: now + CACHE_TTL_MS, payload });
  return payload;
}

export async function getEarthPayload(now = Date.now()): Promise<NasaEarthResponse> {
  const payload = await cached('earth', async () => {
    const raw = await fetchJson(`${EPIC_API}?api_key=${encodeURIComponent(nasaApiKey())}`);
    const image = parseEpicEarthResponse(raw);
    if (!image) throw new Error('EPIC payload did not contain a usable image');
    return { ...image, retrievedAt: new Date(now).toISOString() };
  });
  return payload as NasaEarthResponse;
}

export async function getDatasetsPayload(
  topicId: string,
  now = Date.now()
): Promise<NasaDatasetsResponse> {
  const topic = resolveNasaTopic(topicId);
  if (!topic) throw new Error('Unknown topic');

  const payload = await cached(`datasets:${topic.id}`, async () => {
    const url = `${CKAN_API}?q=${encodeURIComponent(topic.query)}&rows=9&sort=${encodeURIComponent(
      'score desc, metadata_modified desc'
    )}`;
    const raw = await fetchJson(url);
    const parsed = parseCkanSearch(raw);
    if (!parsed) throw new Error('Catalog payload was not valid');
    return {
      topic: topic.id,
      label: topic.label,
      query: topic.query,
      retrievedAt: new Date(now).toISOString(),
      totalAvailable: parsed.totalAvailable,
      datasets: parsed.datasets,
    } satisfies NasaDatasetsResponse;
  });
  return payload as NasaDatasetsResponse;
}

function sendJson(res: ServerResponse, status: number, payload: unknown, maxAgeSeconds = 0): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader(
    'Cache-Control',
    maxAgeSeconds > 0
      ? `public, s-maxage=${maxAgeSeconds}, stale-while-revalidate=86400`
      : 'no-store'
  );
  res.end(JSON.stringify(payload));
}

export async function handleEarth(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    sendJson(res, 200, await getEarthPayload(), 3 * 60 * 60);
  } catch {
    sendJson(res, 502, { error: 'NASA EPIC imagery is temporarily unavailable.' });
  }
}

export async function handleDatasets(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const topic = url.searchParams.get('topic');
  if (!resolveNasaTopic(topic)) {
    sendJson(res, 400, { error: 'Unknown topic. Use radiation, cognitive, microgravity, or cardiovascular.' });
    return;
  }
  try {
    sendJson(res, 200, await getDatasetsPayload(topic as string), 6 * 60 * 60);
  } catch {
    sendJson(res, 502, { error: 'The NASA open-data catalog is temporarily unavailable.' });
  }
}
