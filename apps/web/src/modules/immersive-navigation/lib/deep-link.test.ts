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
      locationId: 'destination-01',
      sceneId: 'scene-02',
      view: {
        heading: 483.4,
        pitch: -120,
        fov: 140,
      },
    };

    const encoded = encodeImmersiveDeepLink(state);

    expect(encoded).toBe(
      '/explore/son-trang-co-dam/immersive?mode=panorama&location=destination-01&scene=scene-02&h=123.4&p=-90&fov=120',
    );
    expect(decodeImmersiveDeepLink(encoded)).toEqual({
      destinationSlug: 'son-trang-co-dam',
      mode: 'panorama',
      locationId: 'destination-01',
      sceneId: 'scene-02',
      view: {
        heading: 123.4,
        pitch: -90,
        fov: 120,
      },
    });
  });

  it('rejects an unknown mode instead of silently entering selected 3D', () => {
    expect(
      decodeImmersiveDeepLink(
        '/explore/son-trang-co-dam?mode=not-a-mode&scene=&h=invalid&p=NaN&fov=',
      ),
    ).toBeNull();
  });

  it('supports an overview link without panorama-only query parameters', () => {
    const state: ImmersiveDeepLinkState = {
      destinationSlug: 'son-trang-co-dam',
      mode: 'overview3d',
      locationId: null,
      sceneId: 'scene-01',
      view: {
        heading: 25,
        pitch: 3,
        fov: 80,
      },
    };

    expect(encodeImmersiveDeepLink(state)).toBe(
      '/explore/son-trang-co-dam/immersive?mode=overview3d',
    );
    expect(decodeImmersiveDeepLink('/explore/son-trang-co-dam')).toBeNull();
  });

  it('round-trips an overview location selection', () => {
    const state: ImmersiveDeepLinkState = {
      destinationSlug: 'cau-ba-son',
      mode: 'overview3d',
      locationId: 'destination-ba-son',
      sceneId: null,
      view: { heading: 0, pitch: 0, fov: 90 },
    };

    const encoded = encodeImmersiveDeepLink(state);

    expect(encoded).toBe(
      '/explore/cau-ba-son/immersive?mode=overview3d&location=destination-ba-son',
    );
    expect(decodeImmersiveDeepLink(encoded)).toEqual(state);
  });

  it('decodes both the explicit immersive route and the legacy explore route', () => {
    const expected = {
      destinationSlug: 'son-trang-co-dam',
      mode: 'overview3d' as const,
      locationId: 'destination-01',
      sceneId: null,
      view: { heading: 0, pitch: 0, fov: 90 },
    };

    expect(
      decodeImmersiveDeepLink(
        '/explore/son-trang-co-dam/immersive?mode=overview3d&location=destination-01',
      ),
    ).toEqual(expected);
    expect(
      decodeImmersiveDeepLink('/explore/son-trang-co-dam?mode=overview3d&location=destination-01'),
    ).toEqual(expected);
  });

  it('returns null for a URL outside the public explore route', () => {
    expect(decodeImmersiveDeepLink('/admin/destinations')).toBeNull();
  });
});
