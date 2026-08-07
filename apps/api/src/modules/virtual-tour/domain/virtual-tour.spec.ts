import { randomUUID } from 'node:crypto';

import { Hotspot } from './hotspot';
import { SceneLink } from './scene-link';
import { SceneNode, VirtualTourRuleError } from './scene-node';

const destinationId = randomUUID();
const readySceneInput = {
  id: randomUUID(),
  destinationId,
  name: 'Lối đi di sản',
  geoPoint: { latitude: 18.3421, longitude: 105.9032 },
  altitude: null,
  panoramaAssetId: randomUUID(),
  panoramaAssetStatus: 'ready' as const,
  initialHeading: -15,
  initialPitch: 12,
  initialFov: 88,
  sortOrder: 0,
};

describe('Virtual tour graph invariants', () => {
  it('normalizes scene heading and hotspot yaw into the renderer range', () => {
    const scene = SceneNode.create({ ...readySceneInput, initialHeading: -15 });
    const hotspot = Hotspot.create({
      id: randomUUID(),
      sceneId: scene.id,
      type: 'information',
      yaw: 725,
      pitch: -30,
      payload: { title: 'Câu chuyện địa danh' },
    });

    expect(scene.toPrimitives().initialHeading).toBe(345);
    expect(hotspot.toPrimitives()).toEqual(expect.objectContaining({ yaw: 5, pitch: -30 }));
  });

  it('rejects self-links and cross-destination links', () => {
    expect(() =>
      SceneLink.create({
        id: randomUUID(),
        fromSceneId: 'scene-1',
        toSceneId: 'scene-1',
        fromDestinationId: destinationId,
        toDestinationId: destinationId,
        yaw: 0,
        pitch: 0,
        bidirectional: false,
        sortOrder: 0,
      }),
    ).toThrowError(VirtualTourRuleError);

    expect(() =>
      SceneLink.create({
        id: randomUUID(),
        fromSceneId: 'scene-1',
        toSceneId: 'scene-2',
        fromDestinationId: destinationId,
        toDestinationId: randomUUID(),
        yaw: 0,
        pitch: 0,
        bidirectional: false,
        sortOrder: 0,
      }),
    ).toThrowError(/same destination/i);
  });

  it('rejects invalid pitch/fov and publishing a scene without a ready panorama', () => {
    expect(() => SceneNode.create({ ...readySceneInput, initialPitch: 91 })).toThrowError(/pitch/i);
    expect(() => SceneNode.create({ ...readySceneInput, initialFov: 10 })).toThrowError(/fov/i);

    const scene = SceneNode.create({
      ...readySceneInput,
      panoramaAssetId: null,
      panoramaAssetStatus: null,
    });

    expect(() => scene.publish()).toThrowError(/ready panorama/i);
  });

  it('does not allow a published scene to lose its ready panorama', () => {
    const scene = SceneNode.create(readySceneInput);
    scene.publish();

    expect(() => scene.update({ panoramaAssetId: null, panoramaAssetStatus: null })).toThrowError(
      /published scene requires a ready panorama/i,
    );
  });
});
