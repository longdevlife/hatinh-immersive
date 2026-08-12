import { describe, expect, it } from 'vitest';

import type { DestinationPreviewVm } from '../../../shared/contracts';
import { destinationFixture } from '../../../shared/fixtures';
import { DEMO_SON_TRANG_ZONE_MEDIA } from '../../media';
import type { SonTrangExperienceMedia } from './son-trang.types';

import { toSonTrangExperienceVm } from './son-trang.adapter';

function createDestination(overrides: Partial<DestinationPreviewVm> = {}): DestinationPreviewVm {
  return {
    id: 'destination-01',
    slug: 'destination-01',
    name: 'Destination 01',
    summary: 'A destination summary.',
    coverImageUrl: 'https://cdn.example.vn/destination-01.webp',
    categoryLabel: 'Di sản',
    defaultSceneId: 'scene-01',
    geoPoint: { latitude: 18.3421, longitude: 105.9032 },
    ...overrides,
  };
}

describe('toSonTrangExperienceVm', () => {
  it('creates the Sơn Trang experience from the existing Sơn Trang destination', () => {
    expect(toSonTrangExperienceVm(destinationFixture)).toEqual({
      destination: destinationFixture,
      hero: null,
      pillars: [
        'Văn hóa & di sản',
        'Nông nghiệp & sinh thái',
        'Giáo dục trải nghiệm',
        'Tâm linh & đời sống tinh thần',
      ],
      gallery: [],
      zones: [
        {
          id: 'son-trang-zone-Tâm linh',
          name: 'Tâm linh',
          summary: '',
          media: null,
          immersiveSceneId: null,
        },
        {
          id: 'son-trang-zone-Văn hóa',
          name: 'Văn hóa',
          summary: '',
          media: null,
          immersiveSceneId: null,
        },
        {
          id: 'son-trang-zone-Sinh thái',
          name: 'Sinh thái',
          summary: '',
          media: null,
          immersiveSceneId: null,
        },
        {
          id: 'son-trang-zone-Giải trí',
          name: 'Giải trí',
          summary: '',
          media: null,
          immersiveSceneId: null,
        },
      ],
    });
  });

  it('preserves nullable cover media and immersive scene values for Sơn Trang', () => {
    const destination = createDestination({
      id: 'destination-son-trang-co-dam',
      slug: 'son-trang-co-dam',
      coverImageUrl: null,
      defaultSceneId: null,
    });

    expect(toSonTrangExperienceVm(destination)?.zones).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Tâm linh', media: null, immersiveSceneId: null }),
        expect.objectContaining({ name: 'Văn hóa', media: null, immersiveSceneId: null }),
        expect.objectContaining({ name: 'Sinh thái', media: null, immersiveSceneId: null }),
        expect.objectContaining({ name: 'Giải trí', media: null, immersiveSceneId: null }),
      ]),
    );
    expect(toSonTrangExperienceVm(destination)?.gallery).toEqual([]);
  });

  it('does not inject demo zone media when adapting generic destination data', () => {
    const destination = {
      ...destinationFixture,
      media: { hero: null, gallery: [] },
    };

    const experience = toSonTrangExperienceVm(destination);

    expect(experience?.zones.every((zone) => zone.media === null)).toBe(true);
    expect(
      experience?.zones.some((zone) =>
        Object.values(DEMO_SON_TRANG_ZONE_MEDIA).some((asset) => asset.src === zone.media?.src),
      ),
    ).toBe(false);
  });

  it('accepts explicit demo media from the fixture composition boundary', () => {
    const media: SonTrangExperienceMedia = {
      hero: DEMO_SON_TRANG_ZONE_MEDIA['Tâm linh'],
      zoneMedia: DEMO_SON_TRANG_ZONE_MEDIA,
    };
    const experience = toSonTrangExperienceVm(destinationFixture, media);

    expect(experience?.hero).toBe(DEMO_SON_TRANG_ZONE_MEDIA['Tâm linh']);
    expect(experience?.zones).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Tâm linh', media: DEMO_SON_TRANG_ZONE_MEDIA['Tâm linh'] }),
        expect.objectContaining({ name: 'Văn hóa', media: DEMO_SON_TRANG_ZONE_MEDIA['Văn hóa'] }),
      ]),
    );
  });

  it('does not create a Sơn Trang experience for another destination slug', () => {
    expect(toSonTrangExperienceVm(createDestination())).toBeNull();
  });
});
