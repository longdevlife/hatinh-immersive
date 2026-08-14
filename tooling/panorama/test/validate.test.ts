import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { validatePanoramaManifest } from '../src/validate.js';

test('rejects a fullscreen panorama manifest below the approved minimum width', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'hatinh-panorama-validate-'));
  const manifestPath = path.join(root, 'manifest.json');
  try {
    await writeManifest(root, 256);
    await assert.rejects(
      validatePanoramaManifest({ manifestPath }),
      /PANORAMA_MAX_WIDTH_BELOW_MINIMUM: 256 < 4096/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('validates every physical tile in a high-resolution manifest', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'hatinh-panorama-validate-'));
  const manifestPath = path.join(root, 'manifest.json');
  try {
    await writeManifest(root, 4096);
    const result = await validatePanoramaManifest({ manifestPath });
    assert.equal(result.maximumWidth, 4096);
    assert.equal(result.tileCount, 171);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('rejects manifest assets that escape the manifest directory', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'hatinh-panorama-validate-'));
  const manifestPath = path.join(root, 'manifest.json');
  try {
    await writeManifest(root, 4096);
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as { preview: string };
    manifest.preview = '../preview.webp';
    await writeFile(manifestPath, JSON.stringify(manifest));

    await assert.rejects(
      validatePanoramaManifest({ manifestPath }),
      /PANORAMA_ASSET_PATH_OUTSIDE_MANIFEST/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('rejects tile templates that escape the manifest directory', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'hatinh-panorama-validate-'));
  const manifestPath = path.join(root, 'manifest.json');
  try {
    await writeManifest(root, 4096);
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
      tileUrlTemplate: string;
    };
    manifest.tileUrlTemplate = '../tiles/{level}/{col}-{row}.webp';
    await writeFile(manifestPath, JSON.stringify(manifest));

    await assert.rejects(
      validatePanoramaManifest({ manifestPath }),
      /PANORAMA_ASSET_PATH_OUTSIDE_MANIFEST/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('rejects a physical tile that is missing', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'hatinh-panorama-validate-'));
  const manifestPath = path.join(root, 'manifest.json');
  try {
    await writeManifest(root, 4096);
    await rm(path.join(root, 'tiles', '0', '0-0.webp'));

    await assert.rejects(validatePanoramaManifest({ manifestPath }), /PANORAMA_TILE_MISSING/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('rejects a tile directory symlink that escapes the manifest directory', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'hatinh-panorama-validate-'));
  const outside = await mkdtemp(path.join(tmpdir(), 'hatinh-panorama-outside-'));
  const manifestPath = path.join(root, 'manifest.json');
  const outsideTiles = path.join(outside, 'level-0');
  try {
    await writeManifest(root, 4096);
    await mkdir(outsideTiles, { recursive: true });
    await writeFile(path.join(outsideTiles, '0-0.webp'), 'outside tile');
    await rm(path.join(root, 'tiles', '0'), { recursive: true, force: true });
    await symlink(outsideTiles, path.join(root, 'tiles', '0'), 'junction');

    await assert.rejects(
      validatePanoramaManifest({ manifestPath }),
      /PANORAMA_ASSET_PATH_OUTSIDE_MANIFEST/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

async function writeManifest(root: string, width: number): Promise<void> {
  const levels =
    width === 256
      ? [{ width: 256, cols: 1, rows: 1 }]
      : [
          { width: 256, cols: 1, rows: 1 },
          { width: 512, cols: 2, rows: 1 },
          { width: 1024, cols: 4, rows: 2 },
          { width: 2048, cols: 8, rows: 4 },
          { width: 4096, cols: 16, rows: 8 },
        ];
  await writeFile(
    path.join(root, 'manifest.json'),
    JSON.stringify({
      version: 1,
      type: 'equirectangular-tiles',
      preview: 'preview.webp',
      tileUrlTemplate: 'tiles/{level}/{col}-{row}.webp',
      levels,
    }),
  );
  await writeFile(path.join(root, 'preview.webp'), 'preview');
  for (const [levelIndex, level] of levels.entries()) {
    const levelDirectory = path.join(root, 'tiles', String(levelIndex));
    await mkdir(levelDirectory, { recursive: true });
    for (let row = 0; row < level.rows; row += 1) {
      for (let column = 0; column < level.cols; column += 1) {
        await writeFile(path.join(levelDirectory, `${column}-${row}.webp`), 'tile');
      }
    }
  }
}
