export type AtlasModelKey = 'astronaut' | 'brain' | 'heart' | 'lungs';

const MODEL_URLS: Record<AtlasModelKey, string> = {
  astronaut: `${import.meta.env.BASE_URL}models/astronaut.glb`,
  brain: `${import.meta.env.BASE_URL}models/brain.glb`,
  heart: `${import.meta.env.BASE_URL}models/heart.glb`,
  lungs: `${import.meta.env.BASE_URL}models/lungs.glb`,
};

export function hasBundledLocalModel(key: AtlasModelKey): boolean {
  return Boolean(MODEL_URLS[key]);
}

export async function resolveBundledLocalModelUrl(key: AtlasModelKey): Promise<string | null> {
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
