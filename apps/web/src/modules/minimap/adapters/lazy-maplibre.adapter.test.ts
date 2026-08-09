import { afterEach, describe, expect, it, vi } from 'vitest';

import type { MapLibreMinimapEngineOptions } from './maplibre.adapter';

afterEach(() => {
  vi.doUnmock('./maplibre.adapter');
  vi.resetModules();
});

describe('createLazyMapLibreMinimapEngine', () => {
  it('rejects an omitted style without eagerly evaluating the MapLibre adapter', async () => {
    vi.doMock('./maplibre.adapter', () => {
      throw new Error('MAPLIBRE_ADAPTER_EAGERLY_LOADED');
    });

    const { createLazyMapLibreMinimapEngine } = await import('./lazy-maplibre.adapter');

    await expect(
      createLazyMapLibreMinimapEngine({} as unknown as MapLibreMinimapEngineOptions),
    ).rejects.toThrow('MINIMAP_STYLE_REQUIRED');
  });
});
