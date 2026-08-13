import { describe, expect, it } from 'vitest';

import { SON_TRANG_SELECTED_3D_ANCHORS } from '../../immersive-navigation/fake-mode/selected-3d-demo-anchors';
import { toDestinationMap3DLocations, toMap3DLocations } from './selected-3d-anchor';

describe('Selected3DAnchor', () => {
  it('keeps the Sơn Trang demo journey destination-local', () => {
    expect(SON_TRANG_SELECTED_3D_ANCHORS).toHaveLength(4);
    expect(SON_TRANG_SELECTED_3D_ANCHORS.map((anchor) => anchor.id)).toEqual([
      'son-trang-gate',
      'son-trang-culture',
      'son-trang-ecology',
      'son-trang-spiritual',
    ]);
    expect(new Set(SON_TRANG_SELECTED_3D_ANCHORS.map((anchor) => anchor.destinationId))).toEqual(
      new Set(['son-trang-co-dam']),
    );
  });

  it('maps geographic anchors to provider-neutral Map3D locations', () => {
    expect(toMap3DLocations(SON_TRANG_SELECTED_3D_ANCHORS)).toEqual(
      SON_TRANG_SELECTED_3D_ANCHORS.map((anchor) => ({
        id: anchor.id,
        label: anchor.label,
        position: anchor.position,
        cameraPreset: anchor.cameraPreset,
      })),
    );
  });

  it('only exposes panorama handoff for an anchor with a real scene mapping', () => {
    expect(
      SON_TRANG_SELECTED_3D_ANCHORS.filter((anchor) => anchor.panoramaSceneId).map(
        (anchor) => anchor.id,
      ),
    ).toEqual(['son-trang-gate']);
  });

  it('excludes anchors owned by another destination', () => {
    const foreignAnchor = {
      ...SON_TRANG_SELECTED_3D_ANCHORS[0],
      id: 'foreign-anchor',
      destinationId: 'another-destination',
    };

    expect(
      toDestinationMap3DLocations(
        [...SON_TRANG_SELECTED_3D_ANCHORS, foreignAnchor],
        'son-trang-co-dam',
      ).map((location) => location.id),
    ).toEqual(SON_TRANG_SELECTED_3D_ANCHORS.map((anchor) => anchor.id));
  });
});
