import type {
  NasaDatasetTopicId,
  NasaDatasetsResponse,
  NasaEarthResponse,
} from '../../shared/nasa';

const API_BASE = '/api/nasa';

export class NasaApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NasaApiError';
  }
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new NasaApiError(`NASA route responded ${response.status}`);
  return (await response.json()) as T;
}

export async function fetchEarthImage(signal?: AbortSignal): Promise<NasaEarthResponse> {
  const payload = await getJson<NasaEarthResponse>('/earth', signal);
  if (
    typeof payload?.imageUrl !== 'string' ||
    !payload.imageUrl.startsWith('https://epic.gsfc.nasa.gov/')
  ) {
    throw new NasaApiError('NASA route returned an unexpected Earth payload');
  }
  return payload;
}

export async function fetchNasaDatasets(
  topic: NasaDatasetTopicId,
  signal?: AbortSignal
): Promise<NasaDatasetsResponse> {
  const payload = await getJson<NasaDatasetsResponse>(
    `/datasets?topic=${encodeURIComponent(topic)}`,
    signal
  );
  if (!Array.isArray(payload?.datasets)) {
    throw new NasaApiError('NASA route returned an unexpected catalog payload');
  }
  return payload;
}
