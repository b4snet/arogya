export interface NasaEarthImage {
  imageUrl: string;
  date: string;
  caption: string;
  credit: string;
}

export interface NasaEarthResponse extends NasaEarthImage {
  retrievedAt: string;
}

export interface NasaOpenDataset {
  id: string;
  title: string;
  description: string;
  formats: string[];
  modified: string | null;
  url: string;
  organization: string | null;
  license: string | null;
}

export interface NasaDatasetsResponse {
  topic: string;
  label: string;
  query: string;
  retrievedAt: string;
  totalAvailable: number;
  datasets: NasaOpenDataset[];
}

export const NASA_DATASET_TOPICS = [
  { id: 'radiation', label: 'Space radiation', query: 'space radiation' },
  { id: 'cognitive', label: 'Cognitive performance', query: 'cognitive' },
  { id: 'microgravity', label: 'Microgravity', query: 'microgravity' },
  { id: 'cardiovascular', label: 'Cardiovascular', query: 'cardiovascular' },
] as const;

export type NasaDatasetTopic = (typeof NASA_DATASET_TOPICS)[number];
export type NasaDatasetTopicId = NasaDatasetTopic['id'];

export function resolveNasaTopic(value: string | null | undefined): NasaDatasetTopic | null {
  return NASA_DATASET_TOPICS.find((topic) => topic.id === value) ?? null;
}

const EPIC_ARCHIVE = 'https://epic.gsfc.nasa.gov/archive/natural';
const DATA_NASA_DATASET = 'https://data.nasa.gov/dataset';

export function buildEpicImageUrl(date: string, image: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!match || !/^[A-Za-z0-9_]+$/.test(image)) return null;
  const [, year, month, day] = match;
  return `${EPIC_ARCHIVE}/${year}/${month}/${day}/jpg/${image}.jpg`;
}

export function parseEpicEarthResponse(payload: unknown): NasaEarthImage | null {
  if (!Array.isArray(payload) || payload.length === 0) return null;
  const latest = payload[0] as { date?: unknown; image?: unknown; caption?: unknown } | undefined;
  if (typeof latest?.date !== 'string' || typeof latest?.image !== 'string') return null;
  const imageUrl = buildEpicImageUrl(latest.date, latest.image);
  if (!imageUrl) return null;
  return {
    imageUrl,
    date: latest.date.slice(0, 10),
    caption:
      typeof latest.caption === 'string' && latest.caption.trim().length > 0
        ? latest.caption.trim()
        : 'Earth from the NASA EPIC camera aboard NOAA DSCOVR.',
    credit: 'NASA EPIC · NOAA DSCOVR',
  };
}

interface CkanResource {
  format?: unknown;
}

interface CkanPackage {
  id?: unknown;
  name?: unknown;
  title?: unknown;
  notes?: unknown;
  metadata_modified?: unknown;
  license_title?: unknown;
  organization?: { title?: unknown } | null;
  resources?: unknown;
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(value: string, limit: number): string {
  if (value.length <= limit) return value;
  return `${value.slice(0, limit - 1).trimEnd()}…`;
}

export function parseCkanSearch(
  payload: unknown
): { totalAvailable: number; datasets: NasaOpenDataset[] } | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const result = (payload as { result?: unknown }).result;
  if (typeof result !== 'object' || result === null) return null;
  const { results, count } = result as { results?: unknown; count?: unknown };
  if (!Array.isArray(results)) return null;

  const datasets: NasaOpenDataset[] = [];
  for (const entry of results) {
    if (typeof entry !== 'object' || entry === null) continue;
    const item = entry as CkanPackage;
    const title = typeof item.title === 'string' ? item.title.trim() : '';
    const slug = typeof item.name === 'string' ? item.name.trim() : '';
    const id = typeof item.id === 'string' ? item.id.trim() : slug;
    if (!title || !id) continue;

    const formats = Array.isArray(item.resources)
      ? Array.from(
          new Set(
            (item.resources as CkanResource[])
              .map((resource) =>
                typeof resource?.format === 'string' ? resource.format.trim().toUpperCase() : ''
              )
              .filter((format) => format.length > 0)
          )
        ).slice(0, 5)
      : [];

    datasets.push({
      id,
      title,
      description: truncate(
        stripHtml(typeof item.notes === 'string' ? item.notes : ''),
        280
      ),
      formats,
      modified: typeof item.metadata_modified === 'string' ? item.metadata_modified : null,
      url: `${DATA_NASA_DATASET}/${encodeURIComponent(slug || id)}`,
      organization:
        typeof item.organization?.title === 'string' ? item.organization.title.trim() : null,
      license:
        typeof item.license_title === 'string' &&
        item.license_title.trim().toLowerCase() !== 'other-license-specified'
          ? item.license_title.trim()
          : null,
    });
    if (datasets.length >= 9) break;
  }

  return {
    totalAvailable: typeof count === 'number' ? count : datasets.length,
    datasets,
  };
}
