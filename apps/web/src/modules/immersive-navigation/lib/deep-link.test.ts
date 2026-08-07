import { describe, expect, it } from 'vitest';

import {
  decodeImmersiveDeepLink,
  encodeImmersiveDeepLink,
  type ImmersiveDeepLinkState,
} from './deep-link';

describe('immersive deep link codec', () => {
  it('round-trips the panorama scene and normalized camera view', () => {
    const state: ImmersiveDeepLinkState = {
      destinationSlug: 'son-trang-co-dam',
      mode: 'panorama',
      sceneId: 'scene-02',
      view: {
        heading: 483.4,
        pitch: -120,
        fov: 140,
      },
    };

    const encoded = encodeImmersiveDeepLink(state);

    expect(encoded).toBe(
      '/explore/son-trang-co-dam?mode=panorama&scene=scene-02&h=123.4&p=-90&fov=120',
    );
    expect(decodeImmersiveDeepLink(encoded)).toEqual({
      destinationSlug: 'son-trang-co-dam',
      mode: 'panorama',
      sceneId: 'scene-02',
      view: {
        heading: 123.4,
        pitch: -90,
        fov: 120,
      },
    });
  });

  it('uses safe defaults for an unknown mode and malformed camera values', () => {
    expect(
      decodeImmersiveDeepLink(
        '/explore/son-trang-co-dam?mode=not-a-mode&scene=&h=invalid&p=NaN&fov=',
      ),
    ).toEqual({
      destinationSlug: 'son-trang-co-dam',
      mode: 'overview3d',
      sceneId: null,
      view: {
        heading: 0,
        pitch: 0,
        fov: 90,
      },
    });
  });

  it('supports an overview link without panorama-only query parameters', () => {
    const state: ImmersiveDeepLinkState = {
      destinationSlug: 'son-trang-co-dam',
      mode: 'overview3d',
      sceneId: 'scene-01',
      view: {
        heading: 25,
        pitch: 3,
        fov: 80,
      },
    };

    expect(encodeImmersiveDeepLink(state)).toBe('/explore/son-trang-co-dam?mode=overview3d');
    expect(decodeImmersiveDeepLink('/explore/son-trang-co-dam')).toEqual({
      destinationSlug: 'son-trang-co-dam',
      mode: 'overview3d',
      sceneId: null,
      view: {
        heading: 0,
        pitch: 0,
        fov: 90,
      },
    });
  });

  it('returns null for a URL outside the public explore route', () => {
    expect(decodeImmersiveDeepLink('/admin/destinations')).toBeNull();
  });
});
