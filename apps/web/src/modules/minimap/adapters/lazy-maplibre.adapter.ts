import type { MinimapEnginePort } from '../domain/minimap-engine.port';

import { requireMinimapStyle } from '../config/minimap-style';
import type { MapLibreMinimapEngineOptions } from './maplibre.adapter';

export async function createLazyMapLibreMinimapEngine(
  options: MapLibreMinimapEngineOptions,
): Promise<MinimapEnginePort> {
  requireMinimapStyle(options?.style);
  const { MapLibreMinimapEngine } = await import('./maplibre.adapter');
  return new MapLibreMinimapEngine(options);
}
