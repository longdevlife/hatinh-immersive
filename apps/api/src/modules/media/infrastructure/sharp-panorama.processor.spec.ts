import { Readable } from 'node:stream';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { SharpPanoramaProcessor } from './sharp-panorama.processor';

describe('SharpPanoramaProcessor', () => {
  const processor = new SharpPanoramaProcessor();

  it.each([
    [4096, 2048, [1024, 2048, 4096]],
    [8192, 4096, [1024, 2048, 4096, 8192]],
    [5000, 2500, [1024, 2048, 4096]],
  ])(
    'accepts %ix%i without upscaling and emits a valid manifest-v1 pyramid',
    async (width, height, expectedWidths) => {
      const output = await processor.process({
        assetId: `asset-${width}`,
        source: Readable.from(await createImage(width, height)),
        sourceContentType: 'image/png',
      });

      expect(output.widthPx).toBe(width);
      expect(output.heightPx).toBe(height);
      const manifest = await parseManifest(output.manifest);
      expect(manifest.levels.map((level) => level.width)).toEqual(expectedWidths);
      expect(Math.max(...manifest.levels.map((level) => level.width))).toBeLessThanOrEqual(width);
      expect(output.preview.byteLength).toBeGreaterThan(0);
      expect(output.tiles).toHaveLength(
        manifest.levels.reduce((total, level) => total + level.cols * level.rows, 0),
      );
      expect(output.tiles.every((tile) => tile.contentType === 'image/webp')).toBe(true);
    },
    120_000,
  );

  it.each([
    ['PANORAMA_DIMENSIONS_TOO_SMALL', 2048, 1024],
    ['PANORAMA_ASPECT_RATIO_INVALID', 4096, 2200],
  ])('rejects invalid source with %s', async (code, width, height) => {
    await expect(
      processor.process({
        assetId: `invalid-${width}-${height}`,
        source: Readable.from(await createImage(width, height)),
        sourceContentType: 'image/png',
      }),
    ).rejects.toThrow(code);
  });

  it('rejects malformed image input with a stable code', async () => {
    await expect(
      processor.process({
        assetId: 'malformed',
        source: Readable.from(Buffer.from('not an image')),
        sourceContentType: 'image/png',
      }),
    ).rejects.toThrow('PANORAMA_METADATA_UNREADABLE');
  });

  it('rejects unsupported content types before decoding', async () => {
    await expect(
      processor.process({
        assetId: 'unsupported',
        source: Readable.from(Buffer.from('anything')),
        sourceContentType: 'application/pdf',
      }),
    ).rejects.toThrow('PANORAMA_CONTENT_TYPE_UNSUPPORTED');
  });

  it('rejects an oversized source stream with a stable code instead of buffering it indefinitely', async () => {
    const oneMiB = Buffer.alloc(1024 * 1024);
    const oversizedSource = Readable.from(
      (async function* () {
        for (let index = 0; index < 65; index += 1) yield oneMiB;
      })(),
    );

    await expect(
      processor.process({
        assetId: 'oversized-source',
        source: oversizedSource,
        sourceContentType: 'image/png',
      }),
    ).rejects.toThrow('PANORAMA_SOURCE_TOO_LARGE');
  });
});

async function createImage(width: number, height: number) {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 48, g: 96, b: 72 },
    },
  })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function parseManifest(bytes: Uint8Array) {
  const { parsePanoramaManifest } = await import('@hatinh/immersive-contracts');
  return parsePanoramaManifest(JSON.parse(new TextDecoder().decode(bytes)));
}
