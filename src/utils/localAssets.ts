export type AtlasModelKey = 'astronaut' | 'brain' | 'heart' | 'lungs';

const MODEL_URLS: Record<AtlasModelKey, string> = {
  astronaut: `${import.meta.env.BASE_URL}models/astronaut.glb`,
  brain: `${import.meta.env.BASE_URL}models/brain.glb`,
  heart: `${import.meta.env.BASE_URL}models/heart.glb`,
  lungs: `${import.meta.env.BASE_URL}models/lungs.glb`,
};

export function bundledMediaPolicy(mode: string) {
  return {
    bundledModels: mode !== 'release',
    bundledDashboardVideo: mode !== 'release',
  } as const;
}

export function hasBundledLocalModel(key: AtlasModelKey): boolean {
  if (import.meta.env.MODE === 'release') return false;
  return Boolean(MODEL_URLS[key]);
}

export async function resolveBundledLocalModelUrl(key: AtlasModelKey): Promise<string | null> {
  // The public release intentionally uses the existing procedural geometry until the
  // provenance and redistribution permissions for the supplied GLBs are verified.
  if (import.meta.env.MODE === 'release') return null;
  return MODEL_URLS[key];
}

export function getBundledDashboardVideos(): {
  mp4Url: string | null;
  webmUrl: string | null;
} {
  if (import.meta.env.MODE === 'release') return { mp4Url: null, webmUrl: null };
  return {
    mp4Url: `${import.meta.env.BASE_URL}videos/dashboard-background.mp4`,
    webmUrl: null,
  };
}
