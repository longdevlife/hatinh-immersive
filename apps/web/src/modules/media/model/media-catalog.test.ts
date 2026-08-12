import { describe, expect, it } from 'vitest';

import { DEMO_DESTINATION_MEDIA, DEMO_SON_TRANG_ZONE_MEDIA } from './media-catalog';

const GOLDEN_DESTINATIONS = [
  'son-trang-co-dam',
  'bien-thien-cam',
  'khu-luu-niem-nguyen-du',
  'nga-ba-dong-loc',
] as const;

describe('governed demo media catalog', () => {
  it('provides a real local/demo-approved hero and the required gallery for every golden destination', () => {
    for (const slug of GOLDEN_DESTINATIONS) {
      const media = DEMO_DESTINATION_MEDIA[slug];

      if (!media) {
        throw new Error(`Missing demo media for ${slug}`);
      }

      expect(media.hero, `${slug} hero`).not.toBeNull();
      expect(media.hero?.src, `${slug} hero source`).toMatch(/^\/demo\/media\/.*\.webp$/);
      expect(media.hero?.width, `${slug} hero width`).toBeGreaterThanOrEqual(1600);
      expect(media.gallery, `${slug} gallery`).toHaveLength(slug === 'son-trang-co-dam' ? 5 : 3);

      for (const asset of [media.hero, ...media.gallery]) {
        expect(asset, `${slug} media asset`).not.toBeNull();
        expect(asset?.src).toMatch(/^\/demo\/media\/.*\.webp$/);
        expect(asset?.src).not.toMatch(/cdn\.example\.vn|example\.com/i);
        expect(asset?.width).toBeGreaterThan(0);
        expect(asset?.height).toBeGreaterThan(0);
        expect(asset?.rightsStatus).toBe('demo-only');
      }
    }
  });

  it('provides governed imagery for every approved Sơn Trang zone', () => {
    expect(Object.keys(DEMO_SON_TRANG_ZONE_MEDIA).sort()).toEqual(
      ['Giải trí', 'Sinh thái', 'Tâm linh', 'Văn hóa'].sort(),
    );

    for (const asset of Object.values(DEMO_SON_TRANG_ZONE_MEDIA)) {
      expect(asset.src).toMatch(/^\/demo\/media\/son-trang\/.*\.webp$/);
      expect(asset.width).toBeGreaterThanOrEqual(1600);
      expect(asset.rightsStatus).toBe('demo-only');
    }
  });
});
