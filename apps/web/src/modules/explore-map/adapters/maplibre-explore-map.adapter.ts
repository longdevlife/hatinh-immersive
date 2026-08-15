import 'maplibre-gl/dist/maplibre-gl.css';

import type { ExploreMapEnginePort } from '../domain/explore-map-engine.port';
import type {
  ExploreMapLayerDiagnostics,
  ExploreMapDiagnosticsResult,
  ExploreMapSetDataTrace,
  ExploreMapSourceEventTrace,
} from '../model/explore-map-diagnostics';
import type {
  ExploreMapCameraTarget,
  ExploreMapDestination,
  ExploreMapStyle,
  ExploreMapUserLocation,
  ExploreMapViewportState,
} from '../model/explore-map.types';

export type { ExploreMapStyle } from '../model/explore-map.types';

const DESTINATIONS_SOURCE_ID = 'explore-destinations';
const DESTINATIONS_LAYER_ID = 'explore-destinations';
const DESTINATIONS_HALO_LAYER_ID = 'explore-destinations-selection-halo';
const DESTINATIONS_HIT_TARGET_LAYER_ID = 'explore-destinations-hit-targets';
const DESTINATIONS_LABEL_LAYER_ID = 'explore-destination-labels';
const USER_LOCATION_SOURCE_ID = 'explore-user-location';
const USER_LOCATION_LAYER_ID = 'explore-user-location';
const DEFAULT_CENTER: ExploreMapCoordinate = [105.9, 18.342];
const DEFAULT_ZOOM = 9;
const DEFAULT_TRANSITION_DURATION = 650;
const DEFAULT_OVERVIEW_PADDING = 64;
const DEFAULT_OVERVIEW_MAX_ZOOM = 11;
const REDUCED_MOTION_MEDIA_QUERY = '(prefers-reduced-motion: reduce)';
const DESTINATION_PIN_IMAGE_ID = 'explore-destination-pin';
const DESTINATION_SELECTED_PIN_IMAGE_ID = 'explore-destination-pin-selected';
const DEBUG_CANARY_SOURCE_ID = 'debug-canary-source';
const DEBUG_CANARY_LAYER_ID = 'debug-canary-circle';
const DEBUG_SET_DATA_TIMEOUT_MS = 7500;
const DEBUG_CANARY_COORDINATES: ExploreMapCoordinate = [105.9032, 18.3421];

function getTransitionDuration(options: ExploreMapOptions): number {
  if (typeof window !== 'undefined' && window.matchMedia?.(REDUCED_MOTION_MEDIA_QUERY).matches) {
    return 0;
  }

  return options.transitionDurationMs ?? DEFAULT_TRANSITION_DURATION;
}

export type ExploreMapCoordinate = [longitude: number, latitude: number];

export interface ExploreMapOptions {
  diagnosticsEnabled?: boolean;
  loadRuntime?: () => Promise<ExploreMapRuntime>;
  style?: ExploreMapStyle;
  center?: ExploreMapCoordinate;
  transitionDurationMs?: number;
  zoom?: number;
}

export interface ExploreMapSource {
  setData(data: unknown): Promise<void> | void;
  getData?(): Promise<unknown> | unknown;
}

export interface ExploreMapImage {
  width: number;
  height: number;
  data: Uint8Array;
}

export type ExploreMapEventListener = (event?: unknown) => void;

export interface ExploreMapInstance {
  addLayer(layer: unknown): void;
  addImage(id: string, image: ExploreMapImage): void;
  addSource(id: string, source: { data: unknown; type: 'geojson' }): void;
  fitBounds(
    bounds: [ExploreMapCoordinate, ExploreMapCoordinate],
    options: { duration: number; maxZoom: number; padding: number },
  ): void;
  flyTo(options: { center: ExploreMapCoordinate; duration: number; zoom?: number }): void;
  getSource(id: string): ExploreMapSource | undefined;
  getLayer(id: string): unknown | undefined;
  hasImage(id: string): boolean;
  getBounds?(): {
    getEast(): number;
    getNorth(): number;
    getSouth(): number;
    getWest(): number;
  };
  areTilesLoaded?(): boolean;
  getCenter?(): { lat: number; lng: number };
  getZoom?(): number;
  isMoving?(): boolean;
  isSourceLoaded?(sourceId: string): boolean;
  isStyleLoaded?(): boolean;
  on(
    event: string,
    layerOrListener: string | ExploreMapEventListener,
    listener?: ExploreMapEventListener,
  ): this;
  off(
    event: string,
    layerOrListener: string | ExploreMapEventListener,
    listener?: ExploreMapEventListener,
  ): this;
  remove(): void;
  resize(): void;
  queryRenderedFeatures?(options?: { layers?: string[] }): unknown[];
  querySourceFeatures?(sourceId: string): unknown[];
  setStyle(style: ExploreMapStyle): void;
  triggerRepaint?(): void;
}

export interface ExploreMapRuntime {
  Map: new (options: {
    attributionControl: boolean;
    center: ExploreMapCoordinate;
    container: HTMLElement;
    interactive: boolean;
    style: ExploreMapStyle;
    zoom: number;
  }) => ExploreMapInstance;
}

interface ExploreMapFeature {
  geometry: { coordinates: ExploreMapCoordinate; type: 'Point' };
  properties: Record<string, unknown>;
  type: 'Feature';
}

interface ExploreMapGeoJson {
  features: ExploreMapFeature[];
  type: 'FeatureCollection';
}

async function loadMapLibreRuntime(): Promise<ExploreMapRuntime> {
  const maplibre = await import('maplibre-gl');
  return { Map: maplibre.Map as unknown as ExploreMapRuntime['Map'] };
}

function emptyGeoJson(): ExploreMapGeoJson {
  return { features: [], type: 'FeatureCollection' };
}

function userLocationGeoJson(
  location: ExploreMapUserLocation | null | undefined,
): ExploreMapGeoJson {
  if (!location) {
    return emptyGeoJson();
  }

  return {
    features: [
      {
        geometry: {
          coordinates: [location.longitude, location.latitude],
          type: 'Point',
        },
        properties: {},
        type: 'Feature',
      },
    ],
    type: 'FeatureCollection',
  };
}

function toGeoJson(
  destinations: readonly ExploreMapDestination[],
  selectedDestinationId: string | null,
): ExploreMapGeoJson {
  return {
    features: destinations.map((destination) => ({
      geometry: {
        coordinates: [destination.longitude, destination.latitude],
        type: 'Point',
      },
      properties: {
        categoryLabel: destination.categoryLabel,
        featured: destination.featured,
        id: destination.id,
        isSelected: destination.id === selectedDestinationId,
        label: destination.label,
      },
      type: 'Feature',
    })),
    type: 'FeatureCollection',
  };
}

function createDestinationPinImage(color: readonly [number, number, number]): ExploreMapImage {
  const width = 32;
  const height = 40;
  const data = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const dx = x - 15.5;
      const circleDy = y - 11.5;
      const inCircle = dx * dx + circleDy * circleDy <= 11.5 * 11.5;
      const tailProgress = (y - 11.5) / 26;
      const tailHalfWidth = Math.max(0, 11.5 * (1 - tailProgress));
      const inTail = y >= 11.5 && y <= 39 && Math.abs(dx) <= tailHalfWidth;
      if (!inCircle && !inTail) {
        continue;
      }

      const offset = (y * width + x) * 4;
      data[offset] = color[0];
      data[offset + 1] = color[1];
      data[offset + 2] = color[2];
      data[offset + 3] = 255;
    }
  }

  return { data, height, width };
}

function ensureDestinationPinImages(map: ExploreMapInstance): void {
  if (!map.hasImage(DESTINATION_PIN_IMAGE_ID)) {
    map.addImage(DESTINATION_PIN_IMAGE_ID, createDestinationPinImage([22, 119, 82]));
  }
  if (!map.hasImage(DESTINATION_SELECTED_PIN_IMAGE_ID)) {
    map.addImage(DESTINATION_SELECTED_PIN_IMAGE_ID, createDestinationPinImage([190, 128, 45]));
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readGeoJsonFeatures(data: unknown): Array<Record<string, unknown>> {
  if (!isRecord(data) || !Array.isArray(data.features)) {
    return [];
  }

  return data.features.filter(isRecord);
}

function readPointCoordinates(feature: Record<string, unknown>): [number, number] | null {
  const geometry = feature.geometry;
  if (!isRecord(geometry) || geometry.type !== 'Point' || !Array.isArray(geometry.coordinates)) {
    return null;
  }

  const [longitude, latitude] = geometry.coordinates;
  return typeof longitude === 'number' && typeof latitude === 'number'
    ? [longitude, latitude]
    : null;
}

function readFeatureId(feature: Record<string, unknown>): string | number | null {
  const properties = isRecord(feature.properties) ? feature.properties : null;
  const id = properties?.id ?? feature.id;
  return typeof id === 'string' || typeof id === 'number' ? id : null;
}

function readSelectedFlag(feature: Record<string, unknown>): boolean | null {
  const properties = isRecord(feature.properties) ? feature.properties : null;
  return typeof properties?.isSelected === 'boolean' ? properties.isSelected : null;
}

function readLayerConfig(layer: unknown): Record<string, unknown> | null {
  if (!isRecord(layer)) {
    return null;
  }

  const serialize = layer.serialize;
  if (typeof serialize === 'function') {
    const serialized = serialize.call(layer);
    if (isRecord(serialized)) {
      return serialized;
    }
  }

  return layer;
}

function readLayerDiagnostics(layer: unknown): ExploreMapLayerDiagnostics {
  const config = readLayerConfig(layer);
  if (!config) {
    return { exists: false };
  }

  const layout = isRecord(config.layout) ? config.layout : null;
  return {
    exists: true,
    ...(config.filter === undefined ? {} : { filter: config.filter }),
    ...(layout?.['icon-image'] === undefined ? {} : { iconImage: layout['icon-image'] }),
    ...(layout?.['icon-size'] === undefined ? {} : { iconSize: layout['icon-size'] }),
    ...(config.source === undefined ? {} : { source: config.source }),
    ...(layout?.['text-field'] === undefined ? {} : { textField: layout['text-field'] }),
    ...(config.type === undefined ? {} : { type: config.type }),
    ...(layout?.visibility === undefined ? {} : { visibility: layout.visibility }),
  };
}

function readRenderedFeatureCount(map: ExploreMapInstance, layerId: string): number | null {
  if (!map.queryRenderedFeatures) {
    return null;
  }

  try {
    return map.queryRenderedFeatures({ layers: [layerId] }).length;
  } catch {
    return null;
  }
}

function waitForMapIdle(map: ExploreMapInstance): Promise<boolean> {
  if (map.isMoving?.() === false) {
    return Promise.resolve(false);
  }

  // The Preview runtime can keep the external raster source from emitting
  // MapLibre's idle event. The diagnostic entry must still expose the source
  // and layer state instead of hanging forever; mapIdleObserved remains false
  // so the capture is never mistaken for an idle-event proof.
  return Promise.resolve(false);
}

function diagnosticNow(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function diagnosticErrorMessage(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (isRecord(error) && typeof error.message === 'string') {
    return error.message;
  }

  return undefined;
}

function diagnosticSourceId(event: unknown): string | null {
  if (!isRecord(event)) {
    return null;
  }

  return typeof event.sourceId === 'string'
    ? event.sourceId
    : isRecord(event.source) && typeof event.source.id === 'string'
      ? event.source.id
      : null;
}

function diagnosticSourceDataType(event: unknown): string | null {
  if (!isRecord(event) || typeof event.sourceDataType !== 'string') {
    return null;
  }

  return event.sourceDataType;
}

function diagnosticSourceLoaded(event: unknown): boolean | null {
  if (!isRecord(event) || typeof event.isSourceLoaded !== 'boolean') {
    return null;
  }

  return event.isSourceLoaded;
}

function diagnosticCanaryGeoJson(): ExploreMapGeoJson {
  return {
    features: [
      {
        geometry: { coordinates: DEBUG_CANARY_COORDINATES, type: 'Point' },
        properties: {},
        type: 'Feature',
      },
    ],
    type: 'FeatureCollection',
  };
}

interface MapLoadWaiter extends Promise<void> {
  cancel(): void;
}

function waitForMapLoad(map: ExploreMapInstance): MapLoadWaiter {
  let cancel = () => undefined;
  const promise = new Promise<void>((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      map.off('load', onLoad);
      map.off('error', onError);
    };
    const onLoad = () => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      resolve();
    };
    const onError = () => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      reject(new Error('MAPLIBRE_EXPLORE_MAP_ERROR'));
    };
    cancel = () => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      reject(new Error('MAPLIBRE_EXPLORE_MAP_MOUNT_CANCELLED'));
    };

    map.on('load', onLoad);
    map.on('error', onError);
  });

  return Object.assign(promise, { cancel });
}

function waitForStyleLoad(map: ExploreMapInstance): MapLoadWaiter {
  let cancel = () => undefined;
  const promise = new Promise<void>((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      map.off('style.load', onStyleLoad);
      map.off('error', onError);
    };
    const onStyleLoad = () => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      resolve();
    };
    const onError = () => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      reject(new Error('MAPLIBRE_EXPLORE_STYLE_ERROR'));
    };

    cancel = () => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      reject(new Error('MAPLIBRE_EXPLORE_STYLE_CANCELLED'));
    };

    map.on('style.load', onStyleLoad);
    map.on('error', onError);
  });

  return Object.assign(promise, { cancel });
}

function readDestinationId(event?: unknown): string | null {
  const feature = (
    event as { features?: Array<{ properties?: Record<string, unknown> | null }> } | undefined
  )?.features?.[0];
  const destinationId = feature?.properties?.id;
  return typeof destinationId === 'string' ? destinationId : null;
}

function readOriginalEvent(event?: unknown): object | null {
  const originalEvent = (event as { originalEvent?: unknown } | undefined)?.originalEvent;
  return typeof originalEvent === 'object' && originalEvent !== null ? originalEvent : null;
}

export class MapLibreExploreMapEngine implements ExploreMapEnginePort {
  private readonly options: ExploreMapOptions;
  private container: HTMLElement | null = null;
  private map: ExploreMapInstance | null = null;
  private runtime: ExploreMapRuntime | null = null;
  private runtimePromise: Promise<ExploreMapRuntime> | null = null;
  private readonly destinationListeners = new Set<(destinationId: string) => void>();
  private state: ExploreMapViewportState = {
    destinations: [],
    selectedDestinationId: null,
  };
  private pendingCameraCommand: PendingCameraCommand | null = null;
  private mountGeneration = 0;
  private pendingMapLoadCancellation: (() => void) | null = null;
  private readonly handledOriginalClickEvents = new WeakSet<object>();
  private currentStyle: ExploreMapStyle | null = null;
  private diagnosticSetDataSequence = 0;
  private diagnosticSetStateCallCount = 0;
  private diagnosticApplyStateCallCount = 0;
  private readonly diagnosticSetDataTraces = new Map<string, ExploreMapSetDataTrace[]>();
  private readonly diagnosticSourceEvents: ExploreMapSourceEventTrace[] = [];
  private readonly diagnosticTimers = new Set<ReturnType<typeof setTimeout>>();
  private diagnosticEventMap: ExploreMapInstance | null = null;
  private readonly diagnosticEventListeners: Array<{
    event: string;
    listener: ExploreMapEventListener;
  }> = [];
  private diagnosticCanarySource: ExploreMapSource | null = null;
  private readonly handleDestinationClick = (event?: unknown) => {
    const destinationId = readDestinationId(event);
    if (!destinationId) {
      return;
    }

    const originalEvent = readOriginalEvent(event);
    if (originalEvent) {
      if (this.handledOriginalClickEvents.has(originalEvent)) {
        return;
      }

      this.handledOriginalClickEvents.add(originalEvent);
    }

    for (const listener of this.destinationListeners) {
      listener(destinationId);
    }
  };

  constructor(options: ExploreMapOptions) {
    this.options = options;
  }

  async mount(container: HTMLElement): Promise<void> {
    if (!this.options.style) {
      throw new Error('EXPLORE_MAP_STYLE_REQUIRED');
    }

    const generation = ++this.mountGeneration;
    this.destroyMountedMap();
    this.container = container;

    const runtime = await this.getRuntime();
    if (generation !== this.mountGeneration || !this.container) {
      return;
    }

    const map = new runtime.Map({
      attributionControl: true,
      center: this.options.center ?? DEFAULT_CENTER,
      container,
      interactive: true,
      style: this.currentStyle ?? this.options.style,
      zoom: this.options.zoom ?? DEFAULT_ZOOM,
    });
    this.map = map;
    this.currentStyle = this.currentStyle ?? this.options.style;

    const mapLoad = waitForMapLoad(map);
    this.pendingMapLoadCancellation = mapLoad.cancel;
    try {
      await mapLoad;
    } catch (error) {
      if (generation !== this.mountGeneration || this.map !== map) {
        return;
      }

      this.destroyMountedMap();
      throw error;
    } finally {
      if (this.pendingMapLoadCancellation === mapLoad.cancel) {
        this.pendingMapLoadCancellation = null;
      }
    }

    if (generation !== this.mountGeneration || this.map !== map) {
      return;
    }

    this.installDataLayers(map);
    map.on('click', DESTINATIONS_HIT_TARGET_LAYER_ID, this.handleDestinationClick);
    map.on('click', DESTINATIONS_LABEL_LAYER_ID, this.handleDestinationClick);

    this.applyState();
    if (this.pendingCameraCommand) {
      this.applyCameraCommand(this.pendingCameraCommand);
      this.pendingCameraCommand = null;
    }
  }

  setState(state: ExploreMapViewportState): void {
    if (this.options.diagnosticsEnabled) {
      this.diagnosticSetStateCallCount += 1;
    }

    this.state = {
      destinations: [...state.destinations],
      selectedDestinationId: state.selectedDestinationId,
      userLocation: state.userLocation ? { ...state.userLocation } : null,
    };
    this.applyState();
  }

  async changeStyle(style: ExploreMapStyle): Promise<void> {
    const map = this.map;
    if (!map) {
      return;
    }

    const previousStyle = this.currentStyle;
    try {
      await this.applyStyle(map, style);
      this.currentStyle = style;
    } catch (error) {
      if (previousStyle !== null && this.map === map) {
        try {
          await this.applyStyle(map, previousStyle);
          this.currentStyle = previousStyle;
        } catch {
          // Preserve the original style-switch failure for the caller. The
          // map remains mounted, and the next explicit style action can retry.
        }
      }

      throw error;
    }
  }

  async flyTo(target: ExploreMapCameraTarget): Promise<void> {
    this.pendingCameraCommand = { target: { ...target }, type: 'flyTo' };
    if (this.map) {
      this.applyCameraCommand(this.pendingCameraCommand);
      this.pendingCameraCommand = null;
    }
  }

  async fitOverview(): Promise<void> {
    this.pendingCameraCommand = { type: 'fitOverview' };
    if (this.map) {
      this.applyCameraCommand(this.pendingCameraCommand);
      this.pendingCameraCommand = null;
    }
  }

  async getDiagnostics(): Promise<ExploreMapDiagnosticsResult> {
    const map = this.map;
    if (!map) {
      return { diagnosticsUnavailableReason: 'map-not-mounted' };
    }

    const mapIdleObserved = await waitForMapIdle(map);
    if (this.map !== map) {
      return { diagnosticsUnavailableReason: 'map-replaced-before-capture' };
    }

    const source = map.getSource(DESTINATIONS_SOURCE_ID);
    const sourceData = source?.getData ? await source.getData() : null;
    const sourceFeatures = readGeoJsonFeatures(sourceData);
    const querySourceFeatureCount = map.querySourceFeatures
      ? (() => {
          try {
            return map.querySourceFeatures!(DESTINATIONS_SOURCE_ID).length;
          } catch {
            return null;
          }
        })()
      : null;
    const center = map.getCenter?.();
    const bounds = map.getBounds?.();
    const canarySource = map.getSource(DEBUG_CANARY_SOURCE_ID);
    const canaryTrace = this.latestDiagnosticSetDataTrace(DEBUG_CANARY_SOURCE_ID);

    return {
      sourceExists: source !== undefined,
      sourceDataFeatureCount: source?.getData ? sourceFeatures.length : null,
      sourceFeatureCoordinates: sourceFeatures.map(readPointCoordinates),
      sourceFeatureIds: sourceFeatures.map(readFeatureId),
      sourceFeatureSelectedFlags: sourceFeatures.map(readSelectedFlag),
      querySourceFeatureCount,
      layers: {
        [DESTINATIONS_HALO_LAYER_ID]: readLayerDiagnostics(
          map.getLayer(DESTINATIONS_HALO_LAYER_ID),
        ),
        [DESTINATIONS_LAYER_ID]: readLayerDiagnostics(map.getLayer(DESTINATIONS_LAYER_ID)),
        [DESTINATIONS_HIT_TARGET_LAYER_ID]: readLayerDiagnostics(
          map.getLayer(DESTINATIONS_HIT_TARGET_LAYER_ID),
        ),
        [DESTINATIONS_LABEL_LAYER_ID]: readLayerDiagnostics(
          map.getLayer(DESTINATIONS_LABEL_LAYER_ID),
        ),
        [USER_LOCATION_LAYER_ID]: readLayerDiagnostics(map.getLayer(USER_LOCATION_LAYER_ID)),
      },
      normalPinImageExists: map.hasImage(DESTINATION_PIN_IMAGE_ID),
      selectedPinImageExists: map.hasImage(DESTINATION_SELECTED_PIN_IMAGE_ID),
      renderedPinFeatureCount: readRenderedFeatureCount(map, DESTINATIONS_LAYER_ID),
      renderedHaloFeatureCount: readRenderedFeatureCount(map, DESTINATIONS_HALO_LAYER_ID),
      renderedLabelFeatureCount: readRenderedFeatureCount(map, DESTINATIONS_LABEL_LAYER_ID),
      mapCenter: center ? { latitude: center.lat, longitude: center.lng } : null,
      mapZoom: map.getZoom?.() ?? null,
      mapBounds: bounds
        ? {
            east: bounds.getEast(),
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            west: bounds.getWest(),
          }
        : null,
      mapStyleLoaded: map.isStyleLoaded?.() ?? null,
      mapSourceLoaded: map.isSourceLoaded?.(DESTINATIONS_SOURCE_ID) ?? null,
      mapTilesLoaded: map.areTilesLoaded?.() ?? null,
      mapMoving: map.isMoving?.() ?? null,
      mapIdleObserved,
      setStateCallCount: this.diagnosticSetStateCallCount,
      applyStateCallCount: this.diagnosticApplyStateCallCount,
      destinationSetDataCallCount:
        this.diagnosticSetDataTraces.get(DESTINATIONS_SOURCE_ID)?.length ?? 0,
      userLocationSetDataCallCount:
        this.diagnosticSetDataTraces.get(USER_LOCATION_SOURCE_ID)?.length ?? 0,
      destinationSetDataTraces: [
        ...(this.diagnosticSetDataTraces.get(DESTINATIONS_SOURCE_ID) ?? []),
      ],
      userLocationSetDataTraces: [
        ...(this.diagnosticSetDataTraces.get(USER_LOCATION_SOURCE_ID) ?? []),
      ],
      sourceEvents: [...this.diagnosticSourceEvents],
      canary: {
        sourceExists: canarySource !== undefined,
        setDataPromiseRejected: canaryTrace?.promiseRejected ?? null,
        setDataPromiseResolved: canaryTrace?.promiseResolved ?? null,
        setDataSettleTimeMs: canaryTrace?.settleTimeMs ?? null,
        setDataTimedOut: canaryTrace?.timedOut ?? false,
        sourceLoaded: map.isSourceLoaded?.(DEBUG_CANARY_SOURCE_ID) ?? null,
        querySourceCount: this.readQuerySourceCount(map, DEBUG_CANARY_SOURCE_ID),
        renderedCount: readRenderedFeatureCount(map, DEBUG_CANARY_LAYER_ID),
      },
    };
  }

  subscribeDestinationSelected(listener: (destinationId: string) => void): () => void {
    this.destinationListeners.add(listener);
    return () => this.destinationListeners.delete(listener);
  }

  resize(): void {
    this.map?.resize();
  }

  destroy(): void {
    ++this.mountGeneration;
    this.destroyMountedMap();
    this.destinationListeners.clear();
    this.pendingCameraCommand = null;
  }

  private applyState(): void {
    if (this.options.diagnosticsEnabled) {
      this.diagnosticApplyStateCallCount += 1;
    }

    const destinationSource = this.map?.getSource(DESTINATIONS_SOURCE_ID);
    const userLocationSource = this.map?.getSource(USER_LOCATION_SOURCE_ID);
    if (destinationSource) {
      this.setDiagnosticData(
        DESTINATIONS_SOURCE_ID,
        destinationSource,
        toGeoJson(this.state.destinations, this.state.selectedDestinationId),
      );
    }
    if (userLocationSource) {
      this.setDiagnosticData(
        USER_LOCATION_SOURCE_ID,
        userLocationSource,
        userLocationGeoJson(this.state.userLocation),
      );
    }
  }

  private installDataLayers(map: ExploreMapInstance): void {
    this.installDiagnosticSourceEventTrace(map);
    ensureDestinationPinImages(map);

    if (!map.getSource(DESTINATIONS_SOURCE_ID)) {
      map.addSource(DESTINATIONS_SOURCE_ID, {
        data: emptyGeoJson(),
        type: 'geojson',
      });
    }
    if (!map.getSource(USER_LOCATION_SOURCE_ID)) {
      map.addSource(USER_LOCATION_SOURCE_ID, {
        data: emptyGeoJson(),
        type: 'geojson',
      });
    }

    if (!map.getLayer(DESTINATIONS_HALO_LAYER_ID)) {
      map.addLayer({
        filter: ['==', ['get', 'isSelected'], true],
        id: DESTINATIONS_HALO_LAYER_ID,
        paint: {
          'circle-blur': 0.35,
          'circle-color': '#f5b866',
          'circle-opacity': 0.35,
          'circle-radius': 17,
        },
        source: DESTINATIONS_SOURCE_ID,
        type: 'circle',
      });
    }
    if (!map.getLayer(DESTINATIONS_LAYER_ID)) {
      map.addLayer({
        id: DESTINATIONS_LAYER_ID,
        layout: {
          'icon-allow-overlap': true,
          'icon-anchor': 'bottom',
          'icon-image': [
            'case',
            ['get', 'isSelected'],
            DESTINATION_SELECTED_PIN_IMAGE_ID,
            DESTINATION_PIN_IMAGE_ID,
          ],
          'icon-ignore-placement': true,
          'icon-size': ['case', ['get', 'isSelected'], 0.9, ['get', 'featured'], 0.8, 0.7],
        },
        source: DESTINATIONS_SOURCE_ID,
        type: 'symbol',
      });
    }
    if (!map.getLayer(DESTINATIONS_HIT_TARGET_LAYER_ID)) {
      map.addLayer({
        id: DESTINATIONS_HIT_TARGET_LAYER_ID,
        paint: {
          'circle-color': '#000000',
          'circle-opacity': 0,
          'circle-radius': 22,
        },
        source: DESTINATIONS_SOURCE_ID,
        type: 'circle',
      });
    }
    if (!map.getLayer(DESTINATIONS_LABEL_LAYER_ID)) {
      map.addLayer({
        id: DESTINATIONS_LABEL_LAYER_ID,
        layout: {
          'text-anchor': 'top',
          'text-field': ['get', 'label'],
          'text-offset': [0, 1.15],
          'text-size': ['case', ['get', 'isSelected'], 14, 12],
        },
        paint: {
          'text-color': ['case', ['get', 'isSelected'], '#173c31', '#52665b'],
          'text-halo-color': '#f4f0e8',
          'text-halo-width': ['case', ['get', 'isSelected'], 2, 1.5],
        },
        source: DESTINATIONS_SOURCE_ID,
        type: 'symbol',
      });
    }
    if (!map.getLayer(USER_LOCATION_LAYER_ID)) {
      map.addLayer({
        id: USER_LOCATION_LAYER_ID,
        paint: {
          'circle-color': '#2d7ff9',
          'circle-radius': 7,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 3,
        },
        source: USER_LOCATION_SOURCE_ID,
        type: 'circle',
      });
    }

    this.installDiagnosticCanary(map);
  }

  private installDiagnosticSourceEventTrace(map: ExploreMapInstance): void {
    if (!this.options.diagnosticsEnabled || this.diagnosticEventMap === map) {
      return;
    }

    this.diagnosticEventMap = map;
    for (const event of ['sourcedataloading', 'sourcedata', 'sourcedataabort', 'error']) {
      const listener: ExploreMapEventListener = (payload) => {
        const sourceId = diagnosticSourceId(payload);
        if (
          sourceId !== DESTINATIONS_SOURCE_ID &&
          sourceId !== USER_LOCATION_SOURCE_ID &&
          sourceId !== DEBUG_CANARY_SOURCE_ID
        ) {
          return;
        }

        const error = isRecord(payload) ? diagnosticErrorMessage(payload.error) : undefined;
        this.diagnosticSourceEvents.push({
          ...(error ? { error } : {}),
          event: event as ExploreMapSourceEventTrace['event'],
          isSourceLoaded: diagnosticSourceLoaded(payload),
          sourceDataType: diagnosticSourceDataType(payload),
          sourceId,
          timestampMs: diagnosticNow(),
        });
      };

      map.on(event, listener);
      this.diagnosticEventListeners.push({ event, listener });
    }
  }

  private installDiagnosticCanary(map: ExploreMapInstance): void {
    if (!this.options.diagnosticsEnabled) {
      return;
    }

    if (!map.getSource(DEBUG_CANARY_SOURCE_ID)) {
      map.addSource(DEBUG_CANARY_SOURCE_ID, {
        data: emptyGeoJson(),
        type: 'geojson',
      });
    }

    if (!map.getLayer(DEBUG_CANARY_LAYER_ID)) {
      map.addLayer({
        id: DEBUG_CANARY_LAYER_ID,
        paint: {
          'circle-color': '#ff00aa',
          'circle-radius': 6,
        },
        source: DEBUG_CANARY_SOURCE_ID,
        type: 'circle',
      });
    }

    const source = map.getSource(DEBUG_CANARY_SOURCE_ID);
    if (!source || this.diagnosticCanarySource === source) {
      return;
    }

    this.diagnosticCanarySource = source;
    this.setDiagnosticData(DEBUG_CANARY_SOURCE_ID, source, diagnosticCanaryGeoJson());
  }

  private setDiagnosticData(sourceId: string, source: ExploreMapSource, data: unknown): void {
    if (!this.options.diagnosticsEnabled) {
      source.setData(data);
      return;
    }

    const trace: ExploreMapSetDataTrace = {
      callSequence: ++this.diagnosticSetDataSequence,
      promiseRejected: false,
      promiseResolved: false,
      settleTimeMs: null,
      sourceId,
      startTimeMs: diagnosticNow(),
      timedOut: false,
    };
    const traces = this.diagnosticSetDataTraces.get(sourceId) ?? [];
    traces.push(trace);
    this.diagnosticSetDataTraces.set(sourceId, traces);

    let result: Promise<void> | void;
    try {
      result = source.setData(data);
    } catch (error) {
      trace.promiseRejected = true;
      trace.settleTimeMs = diagnosticNow() - trace.startTimeMs;
      const message = diagnosticErrorMessage(error);
      if (message) {
        trace.error = message;
      }
      return;
    }

    if (!result || typeof (result as Promise<void>).then !== 'function') {
      trace.promiseResolved = true;
      trace.settleTimeMs = diagnosticNow() - trace.startTimeMs;
      return;
    }

    const timeout = setTimeout(() => {
      trace.timedOut = true;
      this.diagnosticTimers.delete(timeout);
    }, DEBUG_SET_DATA_TIMEOUT_MS);
    this.diagnosticTimers.add(timeout);

    void Promise.resolve(result).then(
      () => {
        clearTimeout(timeout);
        this.diagnosticTimers.delete(timeout);
        trace.promiseResolved = true;
        trace.settleTimeMs = diagnosticNow() - trace.startTimeMs;
      },
      (error: unknown) => {
        clearTimeout(timeout);
        this.diagnosticTimers.delete(timeout);
        trace.promiseRejected = true;
        trace.settleTimeMs = diagnosticNow() - trace.startTimeMs;
        const message = diagnosticErrorMessage(error);
        if (message) {
          trace.error = message;
        }
      },
    );
  }

  private latestDiagnosticSetDataTrace(sourceId: string): ExploreMapSetDataTrace | null {
    const traces = this.diagnosticSetDataTraces.get(sourceId);
    return traces?.[traces.length - 1] ?? null;
  }

  private readQuerySourceCount(map: ExploreMapInstance, sourceId: string): number | null {
    if (!map.querySourceFeatures) {
      return null;
    }

    try {
      return map.querySourceFeatures(sourceId).length;
    } catch {
      return null;
    }
  }

  private async applyStyle(map: ExploreMapInstance, style: ExploreMapStyle): Promise<void> {
    const styleLoad = waitForStyleLoad(map);
    // A synchronous setStyle failure must not leave a rejected waiter
    // unobserved while the caller handles the original adapter error.
    void styleLoad.catch(() => undefined);

    try {
      map.setStyle(style);
      await styleLoad;
      this.installDataLayers(map);
      this.applyState();
    } catch (error) {
      styleLoad.cancel();
      throw error;
    }
  }

  private applyCameraTarget(target: ExploreMapCameraTarget): void {
    if (!this.map) {
      return;
    }

    this.map.flyTo({
      center: [target.longitude, target.latitude],
      duration: getTransitionDuration(this.options),
      ...(target.zoom === undefined ? {} : { zoom: target.zoom }),
    });
  }

  private applyCameraCommand(command: PendingCameraCommand): void {
    if (command.type === 'flyTo') {
      this.applyCameraTarget(command.target);
      return;
    }

    this.applyOverviewCamera();
  }

  private applyOverviewCamera(): void {
    if (!this.map) {
      return;
    }

    const coordinates = this.state.destinations.map(
      (destination) => [destination.longitude, destination.latitude] as ExploreMapCoordinate,
    );
    if (coordinates.length === 0) {
      this.map.flyTo({
        center: this.options.center ?? DEFAULT_CENTER,
        duration: getTransitionDuration(this.options),
        zoom: this.options.zoom ?? DEFAULT_ZOOM,
      });
      return;
    }

    const longitudes = coordinates.map(([longitude]) => longitude);
    const latitudes = coordinates.map(([, latitude]) => latitude);
    this.map.fitBounds(
      [
        [Math.min(...longitudes), Math.min(...latitudes)],
        [Math.max(...longitudes), Math.max(...latitudes)],
      ],
      {
        duration: getTransitionDuration(this.options),
        maxZoom: DEFAULT_OVERVIEW_MAX_ZOOM,
        padding: DEFAULT_OVERVIEW_PADDING,
      },
    );
  }

  private destroyMountedMap(): void {
    const cancelMapLoad = this.pendingMapLoadCancellation;
    this.pendingMapLoadCancellation = null;
    cancelMapLoad?.();

    this.resetDiagnosticRuntimeState();

    if (this.map) {
      this.map.off('click', DESTINATIONS_HIT_TARGET_LAYER_ID, this.handleDestinationClick);
      this.map.off('click', DESTINATIONS_LABEL_LAYER_ID, this.handleDestinationClick);
      this.map.remove();
    } else if (this.container) {
      this.container.replaceChildren();
    }

    this.map = null;
    this.container = null;
  }

  private resetDiagnosticRuntimeState(): void {
    for (const timer of this.diagnosticTimers) {
      clearTimeout(timer);
    }
    this.diagnosticTimers.clear();

    if (this.diagnosticEventMap) {
      for (const { event, listener } of this.diagnosticEventListeners) {
        this.diagnosticEventMap.off(event, listener);
      }
    }
    this.diagnosticEventListeners.length = 0;
    this.diagnosticEventMap = null;
    this.diagnosticCanarySource = null;
    this.diagnosticSetDataSequence = 0;
    this.diagnosticSetStateCallCount = 0;
    this.diagnosticApplyStateCallCount = 0;
    this.diagnosticSetDataTraces.clear();
    this.diagnosticSourceEvents.length = 0;
  }

  private async getRuntime(): Promise<ExploreMapRuntime> {
    if (this.runtime) {
      return this.runtime;
    }
    if (!this.runtimePromise) {
      this.runtimePromise = this.options.loadRuntime
        ? this.options.loadRuntime()
        : loadMapLibreRuntime();
    }

    try {
      const runtime = await this.runtimePromise;
      this.runtime = runtime;
      return runtime;
    } catch (error) {
      this.runtimePromise = null;
      throw error;
    }
  }
}

type PendingCameraCommand =
  { target: ExploreMapCameraTarget; type: 'flyTo' } | { type: 'fitOverview' };
