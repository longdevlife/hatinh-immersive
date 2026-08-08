import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_HA_TINH_MINIMAP_STYLE, resolveMinimapStyle } from './minimap-style';

describe('resolveMinimapStyle', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns the local raster fallback without accessing a tile provider', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const style = resolveMinimapStyle({ isProduction: false });

    expect(style).toBe(DEFAULT_HA_TINH_MINIMAP_STYLE);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('uses a configured style URL after trimming surrounding whitespace', () => {
    expect(
      resolveMinimapStyle({
        isProduction: true,
        styleUrl: '  https://tiles.example.test/styles/ha-tinh.json  ',
      }),
    ).toBe('https://tiles.example.test/styles/ha-tinh.json');
  });

  it('uses the local raster fallback for an empty configured URL', () => {
    expect(resolveMinimapStyle({ isProduction: false, styleUrl: '   ' })).toBe(
      DEFAULT_HA_TINH_MINIMAP_STYLE,
    );
  });

  it('requires a configured style URL in production', () => {
    expect(() => resolveMinimapStyle({ isProduction: true })).toThrow(
      'MINIMAP_PRODUCTION_STYLE_REQUIRED',
    );
  });

  it('defines OpenStreetMap attribution for the local raster fallback', () => {
    expect(DEFAULT_HA_TINH_MINIMAP_STYLE).toMatchObject({
      sources: {
        openstreetmap: {
          attribution: expect.stringContaining('OpenStreetMap'),
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          type: 'raster',
        },
      },
    });
  });
});
