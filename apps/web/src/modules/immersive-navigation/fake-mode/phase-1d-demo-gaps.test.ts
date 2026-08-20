import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

interface DemoGapManifest {
  lane: string;
  productionGateUnchanged: boolean;
  destinations: Record<string, { scenes: Array<{ sceneId: string }> }>;
}

describe('Phase 1D demo content gap manifest', () => {
  it('keeps missing Thiên Cầm audio and unapproved content explicit by scene ID', async () => {
    const manifestPath = path.resolve(
      process.cwd(),
      '../../content-readiness/phase-1d-demo-gaps.json',
    );
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as DemoGapManifest;
    const thienCam = manifest.destinations['bien-thien-cam'];

    expect(manifest.lane).toBe('demo-only');
    expect(manifest.productionGateUnchanged).toBe(true);
    expect(thienCam?.scenes.map(({ sceneId }) => sceneId)).toEqual([
      'thien-cam-boardwalk',
      'thien-cam-shore',
      'thien-cam-lookout',
    ]);
  });
});
