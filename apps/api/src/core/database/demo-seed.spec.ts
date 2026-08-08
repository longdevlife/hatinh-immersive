import { describe, expect, it } from 'vitest';

import { buildDemoImmersiveRouteRecords } from './demo-seed';

describe('demo immersive route records', () => {
  it('defines a publishable 12-node route with a graph branch', () => {
    const route = buildDemoImmersiveRouteRecords(new Date('2026-08-08T00:00:00.000Z'));

    expect(route.destination.slug).toBe('son-trang-co-dam');
    expect(route.translations.map((translation) => translation.locale)).toEqual(['vi', 'en']);
    expect(route.mediaAssets).toHaveLength(12);
    expect(route.scenes).toHaveLength(12);
    expect(route.links).toHaveLength(13);
    expect(route.hotspots).toHaveLength(3);
    expect(route.scenes.every((scene) => scene.status === 'published')).toBe(true);
    expect(route.mediaAssets.every((asset) => asset.status === 'ready')).toBe(true);
    expect(
      route.links.some(
        (link) =>
          link.fromSceneId === route.scenes[2]?.id && link.toSceneId === route.scenes[8]?.id,
      ),
    ).toBe(true);
  });
});
