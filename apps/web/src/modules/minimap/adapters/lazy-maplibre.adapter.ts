import type { MinimapEnginePort } from '../domain/minimap-engine.port';

import type { MapLibreMinimapEngineOptions } from './maplibre.adapter';

export async function createLazyMapLibreMinimapEngine(
  options: MapLibreMinimapEngineOptions = {},
): Promise<MinimapEnginePort> {
  const { MapLibreMinimapEngine } = await import('./maplibre.adapter');
  return new MapLibreMinimapEngine(options);
}
