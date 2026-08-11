import 'maplibre-gl/dist/maplibre-gl.css';

import type { ExploreMapEnginePort } from '../domain/explore-map-engine.port';
import type {
  ExploreMapCameraTarget,
  ExploreMapDestination,
  ExploreMapViewportState,
} from '../model/explore-map.types';

const DESTINATIONS_SOURCE_ID = 'explore-destinations';
const DESTINATIONS_LAYER_ID = 'explore-destinations';
const DESTINATIONS_HIT_TARGET_LAYER_ID = 'explore-destinations-hit-targets';
const DESTINATIONS_LABEL_LAYER_ID = 'explore-destination-labels';
const DEFAULT_CENTER: ExploreMapCoordinate = [105.9, 18.342];
const DEFAULT_ZOOM = 9;
const DEFAULT_TRANSITION_DURATION = 650;
const DEFAULT_OVERVIEW_PADDING = 64;
const DEFAULT_OVERVIEW_MAX_ZOOM = 11;
const REDUCED_MOTION_MEDIA_QUERY = '(prefers-reduced-motion: reduce)';

function getTransitionDuration(options: ExploreMapOptions): number {
  if (typeof window !== 'undefined' && window.matchMedia?.(REDUCED_MOTION_MEDIA_QUERY).matches) {
    return 0;
  }

  return options.transitionDurationMs ?? DEFAULT_TRANSITION_DURATION;
}

export type ExploreMapStyle = string | Record<string, unknown>;
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
}

export type ExploreMapEventListener = (event?: unknown) => void;

export interface ExploreMapInstance {
  addLayer(layer: unknown): void;
  addSource(id: string, source: { data: unknown; type: 'geojson' }): void;
  fitBounds(
    bounds: [ExploreMapCoordinate, ExploreMapCoordinate],
    options: { duration: number; maxZoom: number; padding: number },
  ): void;
  flyTo(options: { center: ExploreMapCoordinate; duration: number; zoom?: number }): void;
  getSource(id: string): ExploreMapSource | undefined;
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
  properties: {
    categoryLabel: string | null;
    featured: boolean;
    id: string;
    isSelected: boolean;
    label: string;
  };
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
      style: this.options.style,
      zoom: this.options.zoom ?? DEFAULT_ZOOM,
    });
    this.map = map;

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

    map.addSource(DESTINATIONS_SOURCE_ID, {
      data: emptyGeoJson(),
      type: 'geojson',
    });
    map.addLayer({
      id: DESTINATIONS_LAYER_ID,
      paint: {
        'circle-color': [
          'case',
          ['get', 'isSelected'],
          '#f5b866',
          ['get', 'featured'],
          '#2f8064',
          '#f4f0e8',
        ],
        'circle-radius': ['case', ['get', 'isSelected'], 10, ['get', 'featured'], 8, 6],
        'circle-stroke-color': '#173c31',
        'circle-stroke-width': 2,
      },
      source: DESTINATIONS_SOURCE_ID,
      type: 'circle',
    });
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
    map.addLayer({
      id: DESTINATIONS_LABEL_LAYER_ID,
      layout: {
        'text-anchor': 'top',
        'text-field': ['get', 'label'],
        'text-offset': [0, 1.15],
        'text-size': 12,
      },
      paint: {
        'text-color': '#173c31',
        'text-halo-color': '#f4f0e8',
        'text-halo-width': 1.5,
      },
      source: DESTINATIONS_SOURCE_ID,
      type: 'symbol',
    });
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
    };
    this.applyState();
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
