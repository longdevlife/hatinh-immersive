import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { DEMO_DESTINATION_MEDIA, DEMO_SON_TRANG_ZONE_MEDIA } from './media-catalog';

type AssetWithSource = {
  id: string;
  src: string;
  width: number;
  height: number;
  rightsStatus: string;
  alt: string;
  source?: {
    sourcePageUrl: string;
    author: string | null;
    license: string;
    attributionText: string | null;
    modifiedFromSource: boolean;
    nativeWidth: number;
    nativeHeight: number;
  };
  variants?: readonly { src: string; width: number }[];
};

const GOLDEN_DESTINATIONS = [
  'son-trang-co-dam',
  'bien-thien-cam',
  'khu-luu-niem-nguyen-du',
  'nga-ba-dong-loc',
] as const;

describe('governed demo media catalog', () => {
  it('provides the required editorial media density for every golden destination', () => {
    const galleryMinimums: Record<(typeof GOLDEN_DESTINATIONS)[number], number> = {
      'son-trang-co-dam': 8,
      'bien-thien-cam': 5,
      'khu-luu-niem-nguyen-du': 5,
      'nga-ba-dong-loc': 5,
    };

    for (const slug of GOLDEN_DESTINATIONS) {
      const media = DEMO_DESTINATION_MEDIA[slug];

      if (!media) {
        throw new Error(`Missing demo media for ${slug}`);
      }

      expect(media.hero, `${slug} hero`).not.toBeNull();
      expect(media.hero?.src, `${slug} hero source`).toMatch(/^\/demo\/media\/.*\.webp$/);
      expect(media.hero?.width, `${slug} hero width`).toBeGreaterThanOrEqual(1600);
      expect(media.gallery.length, `${slug} gallery density`).toBeGreaterThanOrEqual(
        galleryMinimums[slug],
      );

      for (const asset of [media.hero, ...media.gallery]) {
        expect(asset, `${slug} media asset`).not.toBeNull();
        expect(asset?.src).toMatch(/^\/demo\/media\/.*\.webp$/);
        expect(asset?.src).not.toMatch(/cdn\.example\.vn|example\.com/i);
        expect(asset?.width).toBeGreaterThan(0);
        expect(asset?.height).toBeGreaterThan(0);
        expect(asset?.alt).not.toMatch(/chưa có hình ảnh/i);
      }
    }
  });

  it('keeps Sơn Trang zone media separate from its dedicated editorial gallery', () => {
    const zoneIds = new Set(Object.values(DEMO_SON_TRANG_ZONE_MEDIA).map((asset) => asset.id));
    const gallery = DEMO_DESTINATION_MEDIA['son-trang-co-dam']?.gallery ?? [];

    expect(Object.values(DEMO_SON_TRANG_ZONE_MEDIA)).toHaveLength(4);
    expect(gallery.length).toBeGreaterThanOrEqual(8);
    expect(gallery.some((asset) => zoneIds.has(asset.id))).toBe(false);
  });

  it('records provenance for every non-demo web-derived asset', () => {
    const assets = Object.values(DEMO_DESTINATION_MEDIA).flatMap((media) => [
      ...(media.hero ? [media.hero] : []),
      ...media.gallery,
    ]) as AssetWithSource[];

    for (const asset of assets.filter((candidate) => candidate.rightsStatus !== 'demo-only')) {
      expect(asset.source, `${asset.id} source metadata`).toBeDefined();
      expect(asset.source?.sourcePageUrl, `${asset.id} source page`).toMatch(/^https:\/\//);
      expect(asset.source?.author, `${asset.id} author`).toBeTruthy();
      expect(asset.source?.license, `${asset.id} license`).not.toBe('candidate-needs-permission');
      expect(asset.source?.nativeWidth, `${asset.id} native width`).toBeGreaterThanOrEqual(
        asset.width,
      );
      expect(asset.source?.nativeHeight, `${asset.id} native height`).toBeGreaterThanOrEqual(
        asset.height,
      );

      if (asset.source?.license.startsWith('CC-')) {
        expect(asset.source.attributionText, `${asset.id} attribution`).toBeTruthy();
      }
    }
  });

  it('excludes permission-pending media and prevents upscaled derivatives', () => {
    const assets = Object.values(DEMO_DESTINATION_MEDIA).flatMap((media) => [
      ...(media.hero ? [media.hero] : []),
      ...media.gallery,
    ]) as AssetWithSource[];

    for (const asset of assets) {
      expect(asset.src).not.toMatch(/cdn\.example\.vn|example\.com/i);
      expect(asset.rightsStatus).not.toBe('candidate-needs-permission');
      if (asset.source) {
        expect(asset.width).toBeLessThanOrEqual(asset.source.nativeWidth);
        expect(asset.height).toBeLessThanOrEqual(asset.source.nativeHeight);
        for (const variant of asset.variants ?? []) {
          expect(variant.width).toBeLessThanOrEqual(asset.source.nativeWidth);
        }
      }
    }
  });

  it('resolves every public derivative path used by the golden catalog', () => {
    const webRoot = existsSync(resolve(process.cwd(), 'public'))
      ? process.cwd()
      : resolve(process.cwd(), 'apps/web');
    const assets = [
      ...Object.values(DEMO_SON_TRANG_ZONE_MEDIA),
      ...Object.values(DEMO_DESTINATION_MEDIA).flatMap((media) => [
        ...(media.hero ? [media.hero] : []),
        ...media.gallery,
      ]),
    ];

    for (const asset of assets) {
      expect(
        existsSync(resolve(webRoot, 'public', asset.src.replace(/^\//, ''))),
        `${asset.id} source file`,
      ).toBe(true);
      for (const variant of asset.variants ?? []) {
        expect(
          existsSync(resolve(webRoot, 'public', variant.src.replace(/^\//, ''))),
          `${asset.id} variant file`,
        ).toBe(true);
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
