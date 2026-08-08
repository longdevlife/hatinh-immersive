import { describe, expect, it } from 'vitest';

import { resolvePanoramaMediaUrls } from './public-media-url';

describe('resolvePanoramaMediaUrls', () => {
  it('preserves absolute CDN URLs', () => {
    expect(
      resolvePanoramaMediaUrls(
        {
          manifestKey: 'https://cdn.example.vn/hatinh/scene-01/manifest.json',
          previewKey: 'https://cdn.example.vn/hatinh/scene-01/preview.webp',
        },
        { publicOrigin: 'https://ignored.example.vn' },
      ),
    ).toEqual({
      manifestUrl: 'https://cdn.example.vn/hatinh/scene-01/manifest.json',
      previewUrl: 'https://cdn.example.vn/hatinh/scene-01/preview.webp',
    });
  });

  it('joins relative object-storage keys to the configured public origin', () => {
    expect(
      resolvePanoramaMediaUrls(
        { manifestKey: 'processed/scene-01/manifest.json' },
        { publicOrigin: 'https://media.example.vn/hatinh' },
      ),
    ).toEqual({
      manifestUrl: 'https://media.example.vn/hatinh/processed/scene-01/manifest.json',
      previewUrl: 'https://media.example.vn/hatinh/processed/scene-01/preview.webp',
    });
  });

  it('keeps the optional preview absent when no preview object exists', () => {
    expect(
      resolvePanoramaMediaUrls(
        {
          manifestKey: 'processed/scene-01/manifest.json',
          previewKey: null,
        },
        { publicOrigin: 'https://media.example.vn/hatinh' },
      ),
    ).toEqual({
      manifestUrl: 'https://media.example.vn/hatinh/processed/scene-01/manifest.json',
      previewUrl: null,
    });
  });
});
