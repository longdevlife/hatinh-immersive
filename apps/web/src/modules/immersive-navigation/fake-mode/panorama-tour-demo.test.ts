import { describe, expect, it } from 'vitest';

import { getDemoManifest } from './demo-catalog';
import {
  createDemoPanoramaTourManifest,
  SON_TRANG_PANORAMA_TOUR_SCENE_IDS,
} from './panorama-tour-demo';
import { validatePanoramaTourGraph } from '../../panorama-tour/model/panorama-tour';

describe('explicit Sơn Trang panorama tour demo composition', () => {
  it('contains the complete walking graph without claiming production media', () => {
    const manifest = createDemoPanoramaTourManifest(
      getDemoManifest('son-trang-co-dam', 'public'),
      'synthetic',
    );

    expect(manifest.panoramaNodes.map(({ id }) => id)).toEqual(SON_TRANG_PANORAMA_TOUR_SCENE_IDS);
    expect(validatePanoramaTourGraph(manifest.panoramaNodes, manifest.links)).toEqual({
      valid: true,
      issues: [],
    });
    expect(manifest.panoramaNodes.every((node) => node.mediaQuality === 'ready')).toBe(true);
    expect(manifest.panoramaNodes.every((node) => node.mediaRights === 'demo-only')).toBe(true);
    expect(manifest.destination.defaultSceneId).toBe('son-trang-gate');
    expect(manifest.defaultSceneId).toBe('son-trang-gate');
  });

  it('keeps public Sơn Trang as one unavailable showcase state', () => {
    const manifest = createDemoPanoramaTourManifest(
      getDemoManifest('son-trang-co-dam', 'public'),
      'public',
    );

    expect(manifest.panoramaNodes).toEqual([]);
    expect(manifest.nodes).toEqual([]);
    expect(manifest.links).toEqual([]);
    expect(manifest.hotspots).toEqual([]);
    expect(manifest.defaultSceneId).toBe('');
    expect(manifest.destination.defaultSceneId).toBeUndefined();
  });
});
