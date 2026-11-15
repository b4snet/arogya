export interface NasaEarthImage {
  imageUrl: string;
  date: string;
  caption: string;
  credit: string;
}

const EPIC_API = 'https://api.nasa.gov/EPIC/api/natural';
const EPIC_ARCHIVE = 'https://epic.gsfc.nasa.gov/archive/natural';

export function getNasaApiKey(): string {
  const configured = import.meta.env.VITE_NASA_API_KEY as string | undefined;
  return configured?.trim() || 'DEMO_KEY';
}

export function buildEpicImageUrl(date: string, image: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!match || !/^[A-Za-z0-9_]+$/.test(image)) return null;
  const [, year, month, day] = match;
  return `${EPIC_ARCHIVE}/${year}/${month}/${day}/jpg/${image}.jpg`;
}

interface EpicEntry {
  date?: string;
  image?: string;
  caption?: string;
}

export function parseEpicEarthResponse(payload: unknown): NasaEarthImage | null {
  if (!Array.isArray(payload) || payload.length === 0) return null;
  const latest = payload[0] as EpicEntry | undefined;
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

export async function fetchLatestNasaEarthImage(
  signal?: AbortSignal
): Promise<NasaEarthImage | null> {
  const response = await fetch(`${EPIC_API}?api_key=${encodeURIComponent(getNasaApiKey())}`, {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) return null;
  return parseEpicEarthResponse(await response.json());
}
