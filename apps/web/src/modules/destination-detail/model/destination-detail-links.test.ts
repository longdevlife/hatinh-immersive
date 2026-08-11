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
    expect(createExploreMapHref(destination.slug)).toBe('/explore?destination=son-trang-co-dam');
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
});
