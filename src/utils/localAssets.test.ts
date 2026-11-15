import { describe, expect, it } from 'vitest';
import {
  bundledMediaPolicy,
  getBundledDashboardVideos,
  hasBundledLocalModel,
  resolveBundledLocalModelUrl,
} from './localAssets';

describe('release-safe bundled media selection', () => {
  it('selects only project-authored fallback visuals in the public release policy', () => {
    expect(bundledMediaPolicy('release')).toEqual({ bundledModels: false, bundledDashboardVideo: false });
    expect(bundledMediaPolicy('development')).toEqual({ bundledModels: true, bundledDashboardVideo: true });
  });

  it('keeps local development asset paths available to non-release builds', async () => {
    expect(hasBundledLocalModel('astronaut')).toBe(true);
    expect(await resolveBundledLocalModelUrl('astronaut')).toBe('/models/astronaut.glb');
    expect(getBundledDashboardVideos().mp4Url).toBe('/videos/dashboard-background.mp4');
  });
});
