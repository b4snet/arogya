export type AtlasModelKey = 'astronaut' | 'brain' | 'heart' | 'lungs';

const localModelLoaders = import.meta.glob<string>('../assets/models/*.glb', {
  eager: false,
  query: '?url',
  import: 'default',
});

const localVideoAssets = import.meta.glob<string>('../assets/videos/*.{mp4,webm}', {
  eager: true,
  query: '?url',
  import: 'default',
});

function matchModelLoader(key: AtlasModelKey): (() => Promise<string>) | null {
  const targetSuffix = `/models/${key}.glb`;
  for (const [path, loader] of Object.entries(localModelLoaders)) {
    if (path.endsWith(targetSuffix)) {
      return loader;
    }
  }
  return null;
}

export function hasBundledLocalModel(key: AtlasModelKey): boolean {
  return matchModelLoader(key) !== null;
}

export async function resolveBundledLocalModelUrl(key: AtlasModelKey): Promise<string | null> {
  const loader = matchModelLoader(key);
  if (!loader) return null;
  try {
    return await loader();
  } catch {
    return null;
  }
}

export function getBundledDashboardVideos(): {
  mp4Url: string | null;
  webmUrl: string | null;
} {
  let mp4Url: string | null = null;
  let webmUrl: string | null = null;

  for (const [path, url] of Object.entries(localVideoAssets)) {
    if (path.endsWith('/dashboard-bg.mp4')) {
      mp4Url = url;
    } else if (path.endsWith('/dashboard-bg.webm')) {
      webmUrl = url;
    }
  }

  return { mp4Url, webmUrl };
}
