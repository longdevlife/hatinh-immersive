import { describe, expect, it } from 'vitest';

import { SON_TRANG_SELECTED_3D_ANCHORS } from '../fake-mode/selected-3d-demo-anchors';
import {
  resolvePublicSelected3DAnchors,
  resolveSelected3DAnchorSource,
} from './selected-3d-anchor-source';

describe('selected 3D anchor source boundary', () => {
  it('resolves the explicit demo source only for Sơn Trang', () => {
    expect(
      resolveSelected3DAnchorSource({ VITE_IMMERSIVE_SELECTED_3D_ANCHOR_SOURCE: 'demo' }),
    ).toBe('demo');
    expect(
      resolvePublicSelected3DAnchors({ id: 'destination-01', slug: 'son-trang-co-dam' }, 'demo'),
    ).toEqual(
      SON_TRANG_SELECTED_3D_ANCHORS.map((anchor) => ({
        ...anchor,
        destinationId: 'destination-01',
      })),
    );
    expect(
      resolvePublicSelected3DAnchors({ id: 'son-trang-co-dam', slug: 'son-trang-co-dam' }, 'demo'),
    ).toEqual(SON_TRANG_SELECTED_3D_ANCHORS);
    expect(
      resolvePublicSelected3DAnchors({ id: 'bien-thien-cam', slug: 'bien-thien-cam' }, 'demo'),
    ).toEqual([]);
  });

  it('fails closed for none and unsupported api source', () => {
    expect(resolveSelected3DAnchorSource({})).toBe('none');
    expect(resolveSelected3DAnchorSource({ VITE_IMMERSIVE_SELECTED_3D_ANCHOR_SOURCE: 'api' })).toBe(
      'none',
    );
    const destination = { id: 'destination-01', slug: 'son-trang-co-dam' };
    expect(resolvePublicSelected3DAnchors(destination, 'none')).toEqual([]);
  });
});
