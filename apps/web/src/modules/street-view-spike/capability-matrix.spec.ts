import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  STREET_VIEW_COMPARISON_DIMENSIONS,
  buildStreetViewCapabilityMatrix,
  type StreetViewSpikeNode,
} from './capability-matrix';

const representativeNodes: StreetViewSpikeNode[] = [
  {
    id: 'entrance',
    customPanoramaId: 'google-pano-entrance',
    hasProjectOwnedMedia: true,
    hotspotCount: 2,
    linkCount: 1,
  },
  {
    id: 'branch',
    customPanoramaId: 'google-pano-branch',
    hasProjectOwnedMedia: true,
    hotspotCount: 0,
    linkCount: 2,
  },
  {
    id: 'coverage-gap',
    customPanoramaId: null,
    hasProjectOwnedMedia: true,
    hotspotCount: 1,
    linkCount: 1,
  },
];

describe('Google Custom Street View spike capability matrix', () => {
  it('compares three representative nodes across every required dimension', () => {
    const matrix = buildStreetViewCapabilityMatrix(representativeNodes);

    expect(matrix).toHaveLength(3);
    expect(matrix.map((entry) => entry.nodeId)).toEqual(['entrance', 'branch', 'coverage-gap']);
    for (const entry of matrix) {
      expect(Object.keys(entry.capabilities).sort()).toEqual(
        [...STREET_VIEW_COMPARISON_DIMENSIONS].sort(),
      );
      expect(entry.productionRenderer).toBe('photo-sphere-viewer');
    }
    expect(matrix[0]?.capabilities).toEqual({
      customPanoramaAddressability: 'supported',
      projectOwnedMedia: 'unsupported',
      sceneGraphNavigation: 'limited',
      hotspotContent: 'limited',
      tileFailureControl: 'unknown',
      offlinePreservation: 'unsupported',
    });
    expect(matrix[2]?.capabilities.customPanoramaAddressability).toBe('unsupported');

    console.info('STREET_VIEW_SPIKE_RESULT', JSON.stringify(matrix));
  });

  it('keeps Photo Sphere Viewer as the production panorama renderer', () => {
    const productionSource = readFileSync(
      resolve(process.cwd(), 'src/modules/immersive-navigation/ui/ImmersiveExperience.tsx'),
      'utf8',
    );

    expect(productionSource).toContain('createLazyPhotoSphereViewerEngine');
    expect(productionSource).not.toContain('street-view-spike');
  });
});
