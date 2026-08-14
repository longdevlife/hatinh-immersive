import { describe, expect, it } from 'vitest';

import type { DestinationPreviewVm } from '../../../shared/contracts';
import { createDestinationImmersiveHref, createExploreMapHref } from './destination-detail-links';

const destination: DestinationPreviewVm = {
  id: 'destination-01',
  slug: 'son-trang-co-dam',
  name: 'Sơn Trang Cổ Đạm',
  summary: 'A summary.',
  coverImageUrl: null,
  categoryLabel: 'Di sản',
  defaultSceneId: 'scene-01',
  geoPoint: { latitude: 18.3, longitude: 105.9 },
};

describe('destination detail links', () => {
  it('returns to Explore with the selected destination slug', () => {
    expect(createExploreMapHref(destination.slug)).toBe(
      '/explore?destination=son-trang-co-dam&view=map',
    );
  });

  it('preserves discovery context while opening the map', () => {
    expect(
      createExploreMapHref(destination.slug, {
        query: 'Nguyễn',
        category: 'Di sản & văn hóa',
        destinationSlug: destination.slug,
        view: 'cards',
      }),
    ).toBe(
      '/explore?q=Nguy%E1%BB%85n&category=Di+s%E1%BA%A3n+%26+v%C4%83n+h%C3%B3a&destination=son-trang-co-dam&view=map',
    );
  });

  it('enters the explicit panorama route with the default scene', () => {
    expect(createDestinationImmersiveHref(destination, 'panorama')).toBe(
      '/explore/son-trang-co-dam/immersive?mode=panorama&location=destination-01&scene=scene-01',
    );
  });

  it('enters overview only through the explicit selected-3D route', () => {
    expect(createDestinationImmersiveHref(destination, 'overview3d')).toBe(
      '/explore/son-trang-co-dam/immersive?mode=overview3d&location=destination-01',
    );
  });

  it('carries the trusted Explore return href into immersive entry', () => {
    expect(
      createDestinationImmersiveHref(destination, 'overview3d', {
        returnTo: '/explore?q=Nguy%E1%BB%85n&destination=son-trang-co-dam&view=map',
      }),
    ).toBe(
      '/explore/son-trang-co-dam/immersive?mode=overview3d&location=destination-01&returnTo=%2Fexplore%3Fq%3DNguy%25E1%25BB%2585n%26destination%3Dson-trang-co-dam%26view%3Dmap',
    );
  });
});
