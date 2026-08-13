import { describe, expect, it } from 'vitest';

import { getDemoManifest } from './demo-catalog';
import {
  createDemoPanoramaTourManifest,
  SON_TRANG_PANORAMA_TOUR_SCENE_IDS,
} from './panorama-tour-demo';
import { validatePanoramaTourGraph } from '../../panorama-tour/model/panorama-tour';

describe('explicit Sơn Trang panorama tour demo composition', () => {
  it('contains the complete walking graph without claiming production media', () => {
    const manifest = createDemoPanoramaTourManifest(getDemoManifest('son-trang-co-dam'));

    expect(manifest.panoramaNodes.map(({ id }) => id)).toEqual(SON_TRANG_PANORAMA_TOUR_SCENE_IDS);
    expect(validatePanoramaTourGraph(manifest.panoramaNodes, manifest.links)).toEqual({
      valid: true,
      issues: [],
    });
    expect(manifest.panoramaNodes.every((node) => node.mediaAvailability === 'demo-only')).toBe(
      true,
    );
    expect(manifest.destination.defaultSceneId).toBe('son-trang-gate');
    expect(manifest.defaultSceneId).toBe('son-trang-gate');
  });
});
