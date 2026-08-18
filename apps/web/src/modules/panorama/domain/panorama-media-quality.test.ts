import { describe, expect, it } from 'vitest';

import type { PanoramaManifest } from '@hatinh/immersive-contracts';

import type { PanoramaNode } from '../../../shared/contracts';
import { assertPanoramaRuntimeMediaAllowed } from './panorama-media-quality';

const lowResolutionManifest: PanoramaManifest = {
  version: 1,
  type: 'equirectangular-tiles',
  preview: 'preview.webp',
  tileUrlTemplate: 'tiles/{level}/{col}_{row}.webp',
  levels: [
    { width: 128, cols: 1, rows: 1 },
    { width: 256, cols: 2, rows: 1 },
  ],
};

const productionManifest: PanoramaManifest = {
  ...lowResolutionManifest,
  levels: [
    { width: 1024, cols: 2, rows: 1 },
    { width: 2048, cols: 4, rows: 2 },
    { width: 4096, cols: 8, rows: 4 },
  ],
};

const node: PanoramaNode = {
  id: 'son-trang-gate',
  name: 'Cổng Sơn Trang',
  panoramaUrl: '/demo/360/son-trang-gate/manifest.json',
  previewUrl: '/demo/360/son-trang-gate/preview.webp',
  mediaQuality: 'ready',
  mediaRights: 'licensed',
  lat: 18.3421,
  lng: 105.9032,
  initialView: { heading: 0, pitch: 0, fov: 90 },
};

describe('assertPanoramaRuntimeMediaAllowed', () => {
  it('rejects a low-resolution manifest for public runtime', () => {
    expect(() => assertPanoramaRuntimeMediaAllowed(node, lowResolutionManifest, 'public')).toThrow(
      /PANORAMA_PUBLIC_RESOLUTION_TOO_LOW/,
    );
  });

  it('allows a sufficiently resolved licensed manifest for public runtime', () => {
    expect(() =>
      assertPanoramaRuntimeMediaAllowed(node, productionManifest, 'public'),
    ).not.toThrow();
  });

  it('allows low-resolution media only for explicit demo runtime', () => {
    expect(() =>
      assertPanoramaRuntimeMediaAllowed(node, lowResolutionManifest, 'demo'),
    ).not.toThrow();
  });

  it('rejects demo-only rights from public runtime', () => {
    expect(() =>
      assertPanoramaRuntimeMediaAllowed(
        { ...node, mediaRights: 'demo-only' },
        productionManifest,
        'public',
      ),
    ).toThrow(/PANORAMA_PUBLIC_DEMO_MEDIA_FORBIDDEN/);
  });

  it('rejects media that is not marked ready from public runtime', () => {
    expect(() =>
      assertPanoramaRuntimeMediaAllowed(
        { ...node, mediaQuality: 'invalid' },
        productionManifest,
        'public',
      ),
    ).toThrow(/PANORAMA_PUBLIC_MEDIA_NOT_READY/);
  });
});
