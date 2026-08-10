import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { parsePanoramaManifest } from '@hatinh/immersive-contracts';
import { DEMO_SCENES, generateDemoPanoramas } from '../src/demo.js';

test('generates parseable progressive media for every local demo scene', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'hatinh-demo-panorama-'));

  try {
    await generateDemoPanoramas(temporaryRoot);

    assert.equal(DEMO_SCENES.length, 5);
    for (const scene of DEMO_SCENES) {
      const output = path.join(temporaryRoot, scene.id);
      const manifest = parsePanoramaManifest(
        JSON.parse(await readFile(path.join(output, 'manifest.json'), 'utf8')),
      );

      assert.ok((await stat(path.join(output, manifest.preview))).size > 0);
      assert.ok((await stat(path.join(output, 'tiles', '0', '0-0.webp'))).size > 0);
      assert.equal(manifest.tileUrlTemplate, 'tiles/{level}/{col}-{row}.webp');
    }
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
