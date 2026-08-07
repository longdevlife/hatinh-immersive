import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, stat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { parsePanoramaManifest } from '@hatinh/immersive-contracts';
import { generatePanoramaTiles } from '../src/pipeline.js';

const fixturePath = fileURLToPath(new URL('./fixtures/son-trang-fixture.svg', import.meta.url));

test('generates deterministic preview, levels, tiles, and a viewer manifest', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'hatinh-panorama-'));
  const firstOutput = path.join(temporaryRoot, 'first');
  const secondOutput = path.join(temporaryRoot, 'second');

  try {
    const first = await generatePanoramaTiles({
      inputPath: fixturePath,
      outputDir: firstOutput,
      tileSize: 64,
      previewWidth: 128,
      quality: 80,
    });
    const second = await generatePanoramaTiles({
      inputPath: fixturePath,
      outputDir: secondOutput,
      tileSize: 64,
      previewWidth: 128,
      quality: 80,
    });

    const manifest = parsePanoramaManifest(JSON.parse(await readFile(first.manifestPath, 'utf8')));
    assert.deepEqual(manifest, first.manifest);
    assert.deepEqual(first.manifest, second.manifest);
    assert.deepEqual(manifest.levels, [
      { width: 64, cols: 1, rows: 1 },
      { width: 128, cols: 2, rows: 1 },
      { width: 256, cols: 4, rows: 2 },
    ]);

    const previewStats = await stat(path.join(firstOutput, manifest.preview));
    assert.ok(previewStats.size > 0);

    const expectedTiles = [
      'tiles/0/0-0.webp',
      'tiles/1/0-0.webp',
      'tiles/1/1-0.webp',
      'tiles/2/0-0.webp',
      'tiles/2/1-0.webp',
      'tiles/2/2-0.webp',
      'tiles/2/3-0.webp',
      'tiles/2/0-1.webp',
      'tiles/2/1-1.webp',
      'tiles/2/2-1.webp',
      'tiles/2/3-1.webp',
    ];

    for (const relativePath of expectedTiles) {
      const tilePath = path.join(firstOutput, relativePath);
      const tileStats = await stat(tilePath);
      assert.ok(tileStats.size > 0, relativePath);
      assert.equal(
        await hashFile(tilePath),
        await hashFile(path.join(secondOutput, relativePath)),
        `deterministic tile: ${relativePath}`,
      );
    }

    assert.deepEqual(await readdir(path.join(firstOutput, 'tiles', '2')), [
      '0-0.webp',
      '0-1.webp',
      '1-0.webp',
      '1-1.webp',
      '2-0.webp',
      '2-1.webp',
      '3-0.webp',
      '3-1.webp',
    ]);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

async function hashFile(filePath: string): Promise<string> {
  return createHash('sha256')
    .update(await readFile(filePath))
    .digest('hex');
}
