import { describe, expect, it } from 'vitest';
import {
  bundledMediaPolicy,
  getBundledDashboardVideos,
  hasBundledLocalModel,
  resolveBundledLocalModelUrl,
} from './localAssets';

describe('release-safe bundled media selection', () => {
  it('ships only the astronaut model and the dashboard video in the release policy', () => {
    expect(bundledMediaPolicy('release')).toEqual({
      bundledModels: true,
      bundledDashboardVideo: true,
      releaseModelKeys: ['astronaut'],
    });
    expect(bundledMediaPolicy('development')).toEqual({
      bundledModels: true,
      bundledDashboardVideo: true,
      releaseModelKeys: ['astronaut', 'brain', 'heart', 'lungs'],
    });
  });

  it('resolves the approved astronaut model and dashboard video in every mode', async () => {
    expect(hasBundledLocalModel('astronaut')).toBe(true);
    expect(await resolveBundledLocalModelUrl('astronaut')).toBe('/models/astronaut.glb');
    expect(getBundledDashboardVideos().mp4Url).toBe('/videos/dashboard-background.mp4');
  });
});
