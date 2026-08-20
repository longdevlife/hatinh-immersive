import { describe, expect, it } from 'vitest';

import { getDemoSceneContent } from './demo-content';
import { getDemoManifest } from './demo-catalog';

const CANONICAL_SCENES = {
  'bien-thien-cam': ['thien-cam-boardwalk', 'thien-cam-shore', 'thien-cam-lookout'],
  'khu-luu-niem-nguyen-du': [
    'nguyen-du-courtyard',
    'nguyen-du-memorial-house',
    'nguyen-du-statue',
    'nguyen-du-garden-path',
  ],
  'nga-ba-dong-loc': [
    'dong-loc-memorial',
    'dong-loc-monument',
    'dong-loc-remembrance',
    'dong-loc-approach',
  ],
  'son-trang-co-dam': [
    'son-trang-gate',
    'son-trang-entrance-path',
    'son-trang-courtyard',
    'son-trang-culture',
    'son-trang-ecology-path',
    'son-trang-ecology',
    'son-trang-spiritual-path',
    'son-trang-spiritual',
  ],
} as const;

describe('Phase 1D canonical demo content', () => {
  it('resolves PRODUCT-approved content for all canonical scenes', () => {
    for (const [destinationSlug, sceneIds] of Object.entries(CANONICAL_SCENES)) {
      for (const sceneId of sceneIds) {
        const content = getDemoSceneContent(destinationSlug, sceneId);

        expect(content, `${destinationSlug}/${sceneId}`).not.toBeNull();
        expect(content?.storyTitle).toBeTruthy();
        expect(content?.storyContent).toBeTruthy();
        expect(content?.transcript.locale).toBe('vi');
        expect(content?.transcript.timingMode).toBe('plain');
        expect(content?.transcript.segments.length).toBeGreaterThan(0);
        expect(
          content?.transcript.segments.every(
            (segment) => segment.startMs === null && segment.endMs === null,
          ),
        ).toBe(true);
      }
    }
  });

  it('keeps missing panorama scenes unavailable', () => {
    for (const destinationSlug of ['khu-luu-niem-nguyen-du', 'nga-ba-dong-loc']) {
      const manifest = getDemoManifest(destinationSlug, 'public');

      expect(manifest.panoramaNodes.filter((node) => node.panoramaUrl === null)).toHaveLength(3);
    }
  });

  it('keeps every Sơn Trang scene outside the usable public media class', () => {
    const manifest = getDemoManifest('son-trang-co-dam', 'public');

    expect(manifest.panoramaNodes).toEqual([]);
    expect(manifest.nodes).toEqual([]);
    expect(manifest.links).toEqual([]);
    expect(manifest.hotspots).toEqual([]);
  });
});
