export type AtlasModelKey = 'astronaut' | 'brain' | 'heart' | 'lungs';

const MODEL_URLS: Record<AtlasModelKey, string> = {
  astronaut: `${import.meta.env.BASE_URL}models/astronaut.glb`,
  brain: `${import.meta.env.BASE_URL}models/brain.glb`,
  heart: `${import.meta.env.BASE_URL}models/heart.glb`,
  lungs: `${import.meta.env.BASE_URL}models/lungs.glb`,
};

/**
 * Only the astronaut GLB and the dashboard background video are cleared for the public
 * release. The organ GLBs remain local-development assets and resolve to null there.
 */
const RELEASE_MODELS: ReadonlySet<AtlasModelKey> = new Set<AtlasModelKey>(['astronaut']);

export function bundledMediaPolicy(mode: string) {
  return {
    bundledModels: true,
    bundledDashboardVideo: true,
    releaseModelKeys: mode === 'release' ? (['astronaut'] as const) : (Object.keys(MODEL_URLS) as AtlasModelKey[]),
  } as const;
}

export function hasBundledLocalModel(key: AtlasModelKey): boolean {
  if (import.meta.env.MODE === 'release') return RELEASE_MODELS.has(key);
  return Boolean(MODEL_URLS[key]);
}

export async function resolveBundledLocalModelUrl(key: AtlasModelKey): Promise<string | null> {
  if (import.meta.env.MODE === 'release' && !RELEASE_MODELS.has(key)) return null;
  return MODEL_URLS[key];
}

export function getBundledDashboardVideos(): {
  mp4Url: string | null;
  webmUrl: string | null;
} {
  return {
    mp4Url: `${import.meta.env.BASE_URL}videos/dashboard-background.mp4`,
    webmUrl: null,
  };
}
