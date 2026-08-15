import { describe, expect, it } from 'vitest';

import {
  validateDestinationTour,
  type DestinationTour,
  type DestinationTourScene,
} from './destination-tour';

function scene(id: string, overrides: Partial<DestinationTourScene> = {}): DestinationTourScene {
  return {
    id,
    destinationSlug: 'bien-thien-cam',
    name: id,
    role: 'major-stop',
    lat: 18.27,
    lng: 106.09,
    initialView: { heading: 0, pitch: 0, fov: 88 },
    panoramaUrl: `/demo/360/${id}/manifest.json`,
    previewUrl: `/demo/360/${id}/preview.webp`,
    mediaQuality: 'ready',
    mediaRights: 'demo-only',
    ...overrides,
  };
}

function tour(overrides: Partial<DestinationTour> = {}): DestinationTour {
  const scenes = [scene('thien-cam-one'), scene('thien-cam-two')];
  return {
    destinationSlug: 'bien-thien-cam',
    title: 'Biển Thiên Cầm',
    defaultSceneId: 'thien-cam-one',
    mediaMode: 'demo-only',
    scenes,
    links: [
      {
        id: 'one-two',
        sourceSceneId: 'thien-cam-one',
        targetSceneId: 'thien-cam-two',
        yaw: 0,
        pitch: 0,
      },
      {
        id: 'two-one',
        sourceSceneId: 'thien-cam-two',
        targetSceneId: 'thien-cam-one',
        yaw: 180,
        pitch: 0,
      },
    ],
    hotspots: [
      {
        id: 'story',
        sceneId: 'thien-cam-one',
        type: 'information',
        label: 'Bờ biển',
        yaw: 10,
        pitch: 0,
      },
    ],
    audioTracks: [],
    ...overrides,
  };
}

describe('DestinationTour graph contract', () => {
  it('accepts a complete destination-local graph with low-resolution demo media', () => {
    const result = validateDestinationTour(
      tour({
        scenes: [
          scene('thien-cam-one', { mediaQuality: 'low-resolution' }),
          scene('thien-cam-two', { mediaQuality: 'low-resolution' }),
        ],
        mediaMode: 'demo-only',
      }),
    );

    expect(result).toEqual({ valid: true, issues: [] });
  });

  it('rejects a missing default scene and links to unknown scenes', () => {
    const result = validateDestinationTour(
      tour({
        defaultSceneId: 'missing',
        links: [
          {
            id: 'broken',
            sourceSceneId: 'thien-cam-one',
            targetSceneId: 'missing',
            yaw: 0,
            pitch: 0,
          },
        ],
      }),
    );

    expect(result.issues).toEqual(
      expect.arrayContaining(['DEFAULT_SCENE_NOT_FOUND:missing', 'LINK_TARGET_NOT_FOUND:broken']),
    );
  });

  it('rejects cross-destination scenes and hotspot targets', () => {
    const result = validateDestinationTour(
      tour({
        scenes: [
          scene('thien-cam-one'),
          scene('foreign-scene', { destinationSlug: 'son-trang-co-dam' }),
        ],
        links: [
          {
            id: 'cross-destination',
            sourceSceneId: 'thien-cam-one',
            targetSceneId: 'foreign-scene',
            yaw: 0,
            pitch: 0,
          },
        ],
        hotspots: [
          {
            id: 'broken-hotspot',
            sceneId: 'thien-cam-one',
            type: 'scene-navigation',
            targetSceneId: 'foreign-scene',
            label: 'Không hợp lệ',
            yaw: 0,
            pitch: 0,
          },
        ],
      }),
    );

    expect(result.issues).toEqual(
      expect.arrayContaining([
        'SCENE_DESTINATION_MISMATCH:foreign-scene',
        'LINK_CROSS_DESTINATION:cross-destination',
        'HOTSPOT_CROSS_DESTINATION:broken-hotspot',
      ]),
    );
  });
});
