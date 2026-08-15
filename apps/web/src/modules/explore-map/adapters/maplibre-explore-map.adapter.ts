import 'maplibre-gl/dist/maplibre-gl.css';

import type { ExploreMapEnginePort } from '../domain/explore-map-engine.port';
import type {
  ExploreMapDiagnostics,
  ExploreMapLayerDiagnostics,
  ExploreMapDiagnosticsResult,
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

function getTransitionDuration(options: ExploreMapOptions): number {
  if (typeof window !== 'undefined' && window.matchMedia?.(REDUCED_MOTION_MEDIA_QUERY).matches) {
    return 0;
  }

  return options.transitionDurationMs ?? DEFAULT_TRANSITION_DURATION;
}

export type ExploreMapCoordinate = [longitude: number, latitude: number];

export interface ExploreMapOptions {
  loadRuntime?: () => Promise<ExploreMapRuntime>;
  style?: ExploreMapStyle;
  center?: ExploreMapCoordinate;
  transitionDurationMs?: number;
  zoom?: number;
}

export interface ExploreMapSource {
  setData(data: unknown): void;
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
  if (map.isStyleLoaded?.() === true && map.isMoving?.() !== true) {
    return Promise.resolve(false);
  }

  const triggerRepaint = map.triggerRepaint;
  if (!triggerRepaint) {
    return Promise.resolve(false);
  }

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const onIdle = () => {
      if (settled) {
        return;
      }

      settled = true;
      map.off('idle', onIdle);
      resolve(true);
    };

    map.on('idle', onIdle);
    triggerRepaint.call(map);
  });
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
    this.map
      ?.getSource(DESTINATIONS_SOURCE_ID)
      ?.setData(toGeoJson(this.state.destinations, this.state.selectedDestinationId));
    this.map
      ?.getSource(USER_LOCATION_SOURCE_ID)
      ?.setData(userLocationGeoJson(this.state.userLocation));
  }

  private installDataLayers(map: ExploreMapInstance): void {
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
