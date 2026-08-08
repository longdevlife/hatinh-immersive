export { FakeMinimapEngine } from './adapters/fake-minimap.adapter';
export type { FakeMinimapCall } from './adapters/fake-minimap.adapter';
export { createLazyMapLibreMinimapEngine } from './adapters/lazy-maplibre.adapter';
export { DEFAULT_HA_TINH_MINIMAP_STYLE, resolveMinimapStyle } from './config/minimap-style';
export type {
  MapLibreGeoJsonSource,
  MapLibreMapEventListener,
  MapLibreMapInstance,
  MapLibreMapOptions,
  MapLibreMarkerInstance,
  MapLibreMinimapEngineOptions,
  MapLibreRuntime,
} from './adapters/maplibre.adapter';
export type { MinimapEnginePort, MinimapState } from './domain/minimap-engine.port';
export { buildMinimapGeoJson, normalizeHeading, toMapLibreCoordinate } from './domain/projection';
export type {
  MapLibreCoordinate,
  MinimapGeoJson,
  MinimapLineFeature,
  MinimapNodeProperties,
  MinimapPointFeature,
  MinimapRouteProperties,
} from './domain/projection';
export { MinimapViewport } from './ui/MinimapViewport';
export type { MinimapViewportProps } from './ui/MinimapViewport';
