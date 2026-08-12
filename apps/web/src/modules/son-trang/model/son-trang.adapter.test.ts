import { describe, expect, it } from 'vitest';

import type { DestinationPreviewVm } from '../../../shared/contracts';
import { destinationFixture } from '../../../shared/fixtures';

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
      pillars: [
        'Văn hóa & di sản',
        'Nông nghiệp & sinh thái',
        'Giáo dục trải nghiệm',
        'Tâm linh & đời sống tinh thần',
      ],
      zones: [
        {
          id: 'son-trang-zone-Tâm linh',
          name: 'Tâm linh',
          summary: '',
          coverImageUrl: null,
          immersiveSceneId: null,
        },
        {
          id: 'son-trang-zone-Văn hóa',
          name: 'Văn hóa',
          summary: '',
          coverImageUrl: null,
          immersiveSceneId: null,
        },
        {
          id: 'son-trang-zone-Sinh thái',
          name: 'Sinh thái',
          summary: '',
          coverImageUrl: null,
          immersiveSceneId: null,
        },
        {
          id: 'son-trang-zone-Giải trí',
          name: 'Giải trí',
          summary: '',
          coverImageUrl: null,
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
        expect.objectContaining({ name: 'Tâm linh', coverImageUrl: null, immersiveSceneId: null }),
        expect.objectContaining({ name: 'Văn hóa', coverImageUrl: null, immersiveSceneId: null }),
        expect.objectContaining({ name: 'Sinh thái', coverImageUrl: null, immersiveSceneId: null }),
        expect.objectContaining({ name: 'Giải trí', coverImageUrl: null, immersiveSceneId: null }),
      ]),
    );
  });

  it('does not create a Sơn Trang experience for another destination slug', () => {
    expect(toSonTrangExperienceVm(createDestination())).toBeNull();
  });
});
