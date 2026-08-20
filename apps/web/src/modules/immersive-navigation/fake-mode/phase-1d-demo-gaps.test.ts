import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

interface DemoGapManifest {
  lane: string;
  productionGateUnchanged: boolean;
  approvedDemoContent: {
    sceneCount: number;
    storyCount: number;
    viNarrationCopyCount: number;
    viTranscriptCount: number;
    locale: string;
    timingMode: string;
    status: string;
  };
  audioReadiness: {
    destinationAmbientTargets: number;
    verifiedDemoAmbientFiles: number;
    approvedProductionAmbientFiles: number;
    approvedProductionNarrationFiles: number;
  };
  panoramaReadiness: {
    productionReadyCount: number;
    missingP1SceneIds: string[];
    sonTrangPolicy: string;
  };
  licensedImageEvidence: {
    candidateCount: number;
    panoramaEligibleCount: number;
    entries: Array<{
      author: string;
      sourcePageUrl: string;
      license: string;
      attribution: string;
      panoramaEligible: boolean;
    }>;
  };
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

  it('separates approved demo copy from file-backed production readiness', async () => {
    const manifestPath = path.resolve(
      process.cwd(),
      '../../content-readiness/phase-1d-demo-gaps.json',
    );
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as DemoGapManifest;

    expect(manifest.approvedDemoContent).toMatchObject({
      sceneCount: 19,
      storyCount: 19,
      viNarrationCopyCount: 19,
      viTranscriptCount: 19,
      locale: 'vi',
      timingMode: 'plain',
      status: 'approved-demo-copy',
    });
    expect(manifest.audioReadiness).toMatchObject({
      destinationAmbientTargets: 4,
      verifiedDemoAmbientFiles: 4,
      approvedProductionAmbientFiles: 0,
      approvedProductionNarrationFiles: 0,
    });
  });

  it('keeps panorama blockers and licensed imagery outside the panorama lane', async () => {
    const manifestPath = path.resolve(
      process.cwd(),
      '../../content-readiness/phase-1d-demo-gaps.json',
    );
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as DemoGapManifest;

    expect(manifest.panoramaReadiness.productionReadyCount).toBe(0);
    expect(manifest.panoramaReadiness.missingP1SceneIds).toEqual([
      'nguyen-du-memorial-house',
      'nguyen-du-statue',
      'nguyen-du-garden-path',
      'dong-loc-monument',
      'dong-loc-remembrance',
      'dong-loc-approach',
    ]);
    expect(manifest.panoramaReadiness.sonTrangPolicy).toMatch(/256x128.*forbidden/i);

    expect(manifest.licensedImageEvidence.candidateCount).toBe(4);
    expect(manifest.licensedImageEvidence.panoramaEligibleCount).toBe(0);
    expect(manifest.licensedImageEvidence.entries).toHaveLength(4);
    for (const entry of manifest.licensedImageEvidence.entries) {
      expect(entry.sourcePageUrl).toMatch(/^https:\/\//);
      expect(entry.author).toBeTruthy();
      expect(entry.license).toBe('CC BY-SA 4.0');
      expect(entry.attribution).toBeTruthy();
      expect(entry.panoramaEligible).toBe(false);
    }
  });
});
