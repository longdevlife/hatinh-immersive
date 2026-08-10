import { describe, expect, it } from 'vitest';

import { resolveRendererModes } from './renderer-mode';

describe('resolveRendererModes', () => {
  it('keeps the existing aggregate fake mode for deterministic tests', () => {
    expect(
      resolveRendererModes({
        VITE_IMMERSIVE_RENDERER_MODE: 'fake',
      }),
    ).toEqual({
      map3d: 'fake',
      panorama: 'fake',
      minimap: 'fake',
    });
  });

  it('allows local preview to fake only Google 3D while using real 360 and minimap engines', () => {
    expect(
      resolveRendererModes({
        VITE_IMMERSIVE_MAP3D_MODE: 'fake',
      }),
    ).toEqual({
      map3d: 'fake',
      panorama: 'photo-sphere-viewer',
      minimap: 'maplibre',
    });
  });

  it('allows local preview to keep minimap deterministic as well', () => {
    expect(
      resolveRendererModes({
        VITE_IMMERSIVE_MAP3D_MODE: 'fake',
        VITE_IMMERSIVE_MINIMAP_MODE: 'fake',
      }),
    ).toMatchObject({
      map3d: 'fake',
      panorama: 'photo-sphere-viewer',
      minimap: 'fake',
    });
  });
});
