import assert from 'node:assert/strict';
import test from 'node:test';

import { parsePanoramaManifest, type PanoramaManifest } from '@hatinh/immersive-contracts';

test('parses the multiresolution manifest contract', () => {
  const manifest: PanoramaManifest = {
    version: 1,
    type: 'equirectangular-tiles',
    preview: 'preview.webp',
    tileUrlTemplate: 'tiles/{level}/{col}-{row}.webp',
    levels: [
      { width: 512, cols: 1, rows: 1 },
      { width: 1024, cols: 2, rows: 1 },
    ],
  };

  assert.deepEqual(parsePanoramaManifest(manifest), manifest);
});

test('rejects a manifest with invalid tile geometry', () => {
  assert.throws(
    () =>
      parsePanoramaManifest({
        version: 1,
        type: 'equirectangular-tiles',
        preview: 'preview.webp',
        tileUrlTemplate: 'tiles/{level}/{col}-{row}.webp',
        levels: [{ width: 768, cols: 3, rows: 1 }],
      }),
    /powers? of two/i,
  );
});
