import { describe, expect, it } from 'vitest';

import { getDemoManifest } from '../fake-mode/demo-catalog';
import {
  composePanoramaTourDestination,
  composePanoramaTourManifest,
  resolvePanoramaTourMediaMode,
  resolvePanoramaTourSource,
} from './panorama-tour-source';

describe('panorama tour source boundary', () => {
  it('fails closed unless demo is explicitly enabled', () => {
    expect(resolvePanoramaTourSource({})).toBe('none');
    expect(resolvePanoramaTourSource({ VITE_IMMERSIVE_PANORAMA_TOUR_SOURCE: 'api' })).toBe('none');
    expect(resolvePanoramaTourSource({ VITE_IMMERSIVE_PANORAMA_TOUR_SOURCE: 'demo' })).toBe('demo');
    expect(resolvePanoramaTourMediaMode({})).toBe('public');
    expect(resolvePanoramaTourMediaMode({ VITE_IMMERSIVE_PANORAMA_TOUR_MEDIA: 'synthetic' })).toBe(
      'public',
    );
    expect(
      resolvePanoramaTourMediaMode({
        VITE_IMMERSIVE_PANORAMA_TOUR_MEDIA: 'synthetic',
        VITE_IMMERSIVE_PANORAMA_TOUR_TEST_MODE: 'true',
      }),
    ).toBe('synthetic');
  });

  it('does not inject demo scenes into API/none composition or other destinations', () => {
    const sonTrang = getDemoManifest('son-trang-co-dam');
    const thienCam = getDemoManifest('bien-thien-cam');

    expect(composePanoramaTourManifest(sonTrang, 'none').panoramaNodes).toHaveLength(1);
    expect(composePanoramaTourManifest(thienCam, 'demo').panoramaNodes).toHaveLength(3);
    expect(composePanoramaTourManifest(sonTrang, 'demo').panoramaNodes).toHaveLength(8);
    expect(
      composePanoramaTourManifest(sonTrang, 'demo').panoramaNodes.every(
        (node) => node.mediaQuality === 'low-resolution' && node.mediaRights === 'demo-only',
      ),
    ).toBe(true);
  });

  it('keeps synthetic test media explicit without making public demo media ready', () => {
    const sonTrang = getDemoManifest('son-trang-co-dam');
    const synthetic = composePanoramaTourManifest(sonTrang, 'demo', 'synthetic');

    expect(synthetic.panoramaNodes.every((node) => node.mediaQuality === 'ready')).toBe(true);
    expect(synthetic.panoramaNodes.every((node) => node.mediaRights === 'demo-only')).toBe(true);
  });

  it('keeps API destination identity while canonicalizing the explicit demo entry scene', () => {
    const apiManifest = getDemoManifest('son-trang-co-dam');
    const manifestWithApiIdentity = {
      ...apiManifest,
      destination: {
        ...apiManifest.destination,
        id: 'api-destination-uuid',
        defaultSceneId: 'api-scene-uuid',
      },
      defaultSceneId: 'api-scene-uuid',
    };

    const composed = composePanoramaTourManifest(manifestWithApiIdentity, 'demo');

    expect(composed.destination.id).toBe('api-destination-uuid');
    expect(composed.destination.defaultSceneId).toBe('son-trang-gate');
    expect(composed.defaultSceneId).toBe('son-trang-gate');
  });

  it('normalizes the API catalog destination default only for the explicit demo source', () => {
    const apiDestination = getDemoManifest('son-trang-co-dam').destination;
    const destinationWithApiScene = {
      ...apiDestination,
      id: 'api-destination-uuid',
      defaultSceneId: 'api-scene-uuid',
    };

    expect(composePanoramaTourDestination(destinationWithApiScene, 'demo')).toMatchObject({
      id: 'api-destination-uuid',
      defaultSceneId: 'son-trang-gate',
    });
    expect(composePanoramaTourDestination(destinationWithApiScene, 'none')).toMatchObject({
      id: 'api-destination-uuid',
      defaultSceneId: 'api-scene-uuid',
    });
  });
});
