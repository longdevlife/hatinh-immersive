export interface ExploreMapLayerDiagnostics {
  exists: boolean;
  type?: unknown;
  source?: unknown;
  filter?: unknown;
  visibility?: unknown;
  iconImage?: unknown;
  iconSize?: unknown;
  textField?: unknown;
}

export interface ExploreMapDiagnostics {
  sourceExists: boolean;
  sourceDataFeatureCount: number | null;
  sourceFeatureIds: Array<string | number | null>;
  sourceFeatureCoordinates: Array<[number, number] | null>;
  sourceFeatureSelectedFlags: Array<boolean | null>;
  querySourceFeatureCount: number | null;
  layers: Record<string, ExploreMapLayerDiagnostics>;
  normalPinImageExists: boolean;
  selectedPinImageExists: boolean;
  renderedPinFeatureCount: number | null;
  renderedHaloFeatureCount: number | null;
  renderedLabelFeatureCount: number | null;
  mapCenter: { longitude: number; latitude: number } | null;
  mapZoom: number | null;
  mapBounds: { west: number; south: number; east: number; north: number } | null;
  mapStyleLoaded: boolean | null;
  mapSourceLoaded: boolean | null;
  mapTilesLoaded: boolean | null;
  mapMoving: boolean | null;
}

export type ExploreMapDiagnosticsUnavailableReason =
  | 'diagnostics-capture-failed'
  | 'lazy-engine-not-mounted'
  | 'map-engine-diagnostics-not-supported'
  | 'map-not-mounted'
  | 'map-replaced-before-capture';

export interface ExploreMapDiagnosticsUnavailable {
  diagnosticsUnavailableReason: ExploreMapDiagnosticsUnavailableReason;
}

export type ExploreMapDiagnosticsResult = ExploreMapDiagnostics | ExploreMapDiagnosticsUnavailable;
