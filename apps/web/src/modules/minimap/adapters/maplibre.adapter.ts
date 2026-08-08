import 'maplibre-gl/dist/maplibre-gl.css';

import { requireMinimapStyle, type MinimapStyle } from '../config/minimap-style';
import type { MinimapEnginePort, MinimapState } from '../domain/minimap-engine.port';
import {
  buildMinimapGeoJson,
  normalizeHeading,
  type MapLibreCoordinate,
  type MinimapGeoJson,
} from '../domain/projection';

const NODES_SOURCE_ID = 'minimap-nodes';
const ROUTE_SOURCE_ID = 'minimap-route';
const NODES_LAYER_ID = 'minimap-nodes';
const DEFAULT_ZOOM = 16;
const DEFAULT_TRANSITION_DURATION = 240;
const HA_TINH_CENTER: MapLibreCoordinate = [105.9, 18.342];

export interface MapLibreMapOptions {
  attributionControl: boolean;
  center: MapLibreCoordinate;
  container: HTMLElement;
  interactive: boolean;
  style: MinimapStyle;
  zoom: number;
}

export interface MapLibreGeoJsonSource {
  setData(data: unknown): void;
}

export type MapLibreMapEventListener = (event?: unknown) => void;

export interface MapLibreMapInstance {
  addLayer(layer: unknown): void;
  addSource(id: string, source: { data: unknown; type: 'geojson' }): void;
  easeTo(options: { center: MapLibreCoordinate; duration: number }): void;
  getSource(id: string): MapLibreGeoJsonSource | undefined;
  off(
    event: string,
    layerOrListener: string | MapLibreMapEventListener,
    listener?: MapLibreMapEventListener,
  ): this;
  on(
    event: string,
    layerOrListener: string | MapLibreMapEventListener,
    listener?: MapLibreMapEventListener,
  ): this;
  remove(): void;
}

export interface MapLibreMarkerInstance {
  addTo(map: MapLibreMapInstance): this;
  remove(): void;
  setLngLat(coordinates: MapLibreCoordinate): this;
  setRotation?(rotation: number): this;
}

export interface MapLibreRuntime {
  Map: new (options: MapLibreMapOptions) => MapLibreMapInstance;
  Marker: new (options: { element: HTMLElement }) => MapLibreMarkerInstance;
}

export interface MapLibreMinimapEngineOptions {
  loadRuntime?: () => Promise<MapLibreRuntime>;
  style: MinimapStyle;
  transitionDurationMs?: number;
  zoom?: number;
}

async function loadMapLibreRuntime(): Promise<MapLibreRuntime> {
  const maplibre = await import('maplibre-gl');
  return {
    Map: maplibre.Map as unknown as MapLibreRuntime['Map'],
    Marker: maplibre.Marker as unknown as MapLibreRuntime['Marker'],
  };
}

function emptyGeoJson(): MinimapGeoJson {
  return {
    nodes: { features: [], type: 'FeatureCollection' },
    route: { features: [], type: 'FeatureCollection' },
  };
}

function waitForMapLoad(map: MapLibreMapInstance): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      map.off('load', onLoad);
      map.off('error', onError);
    };
    const onLoad = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('MAPLIBRE_MINIMAP_ERROR'));
    };

    map.on('load', onLoad);
    map.on('error', onError);
  });
}

export class MapLibreMinimapEngine implements MinimapEnginePort {
  private readonly options: MapLibreMinimapEngineOptions;
  private container: HTMLElement | null = null;
  private map: MapLibreMapInstance | null = null;
  private marker: MapLibreMarkerInstance | null = null;
  private runtime: MapLibreRuntime | null = null;
  private runtimePromise: Promise<MapLibreRuntime> | null = null;
  private readonly nodeListeners = new Set<(sceneId: string) => void>();
  private readonly handleNodeClick = (event?: unknown) => {
    const feature = (
      event as { features?: Array<{ properties?: Record<string, unknown> | null }> } | undefined
    )?.features?.[0];
    const sceneId = feature?.properties?.id;
    if (typeof sceneId !== 'string') {
      return;
    }

    for (const listener of this.nodeListeners) {
      listener(sceneId);
    }
  };
  private state: MinimapState = {
    currentSceneId: null,
    heading: 0,
    links: [],
    nodes: [],
  };
  private lastPositionedSceneId: string | null = null;
  private mountGeneration = 0;

  constructor(options: MapLibreMinimapEngineOptions) {
    requireMinimapStyle(options?.style);
    this.options = options;
  }

  async mount(container: HTMLElement): Promise<void> {
    const generation = ++this.mountGeneration;
    this.destroyMountedMap();
    this.container = container;

    const runtime = await this.getRuntime();
    if (generation !== this.mountGeneration || !this.container) {
      return;
    }

    const map = new runtime.Map({
      attributionControl: true,
      center: HA_TINH_CENTER,
      container,
      interactive: true,
      style: this.options.style,
      zoom: this.options.zoom ?? DEFAULT_ZOOM,
    });
    this.map = map;

    try {
      await waitForMapLoad(map);
    } catch (error) {
      if (this.map === map) {
        this.destroyMountedMap();
      }
      throw error;
    }

    if (generation !== this.mountGeneration || this.map !== map) {
      return;
    }

    map.addSource(NODES_SOURCE_ID, { data: emptyGeoJson().nodes, type: 'geojson' });
    map.addSource(ROUTE_SOURCE_ID, { data: emptyGeoJson().route, type: 'geojson' });
    map.addLayer({
      id: 'minimap-route-line',
      layout: {},
      paint: {
        'line-color': '#f5b866',
        'line-width': 3,
      },
      source: ROUTE_SOURCE_ID,
      type: 'line',
    });
    map.addLayer({
      id: NODES_LAYER_ID,
      paint: {
        'circle-color': [
          'case',
          ['get', 'isCurrent'],
          '#f5b866',
          ['get', 'isVisited'],
          '#8ec7a1',
          '#f4f0e8',
        ],
        'circle-radius': ['case', ['get', 'isCurrent'], 8, 5],
        'circle-stroke-color': '#173c31',
        'circle-stroke-width': 2,
      },
      source: NODES_SOURCE_ID,
      type: 'circle',
    });
    map.on('click', NODES_LAYER_ID, this.handleNodeClick);

    const element = document.createElement('span');
    element.setAttribute('aria-hidden', 'true');
    element.className = 'minimap-heading-marker';
    element.style.background = 'rgb(245 184 102 / 0.72)';
    element.style.clipPath = 'polygon(50% 0%, 100% 100%, 50% 76%, 0% 100%)';
    element.style.height = '2rem';
    element.style.transformOrigin = '50% 50%';
    element.style.width = '2rem';
    this.marker = new runtime.Marker({ element }).addTo(map);
    this.lastPositionedSceneId = null;
    this.applyState();
  }

  setState(state: MinimapState): void {
    this.state = {
      currentSceneId: state.currentSceneId,
      heading: state.heading,
      links: [...state.links],
      nodes: [...state.nodes],
    };
    this.applyState();
  }

  subscribeNodeSelected(listener: (sceneId: string) => void): () => void {
    this.nodeListeners.add(listener);
    return () => this.nodeListeners.delete(listener);
  }

  destroy(): void {
    ++this.mountGeneration;
    this.destroyMountedMap();
    this.nodeListeners.clear();
  }

  private applyState(): void {
    if (!this.map) {
      return;
    }

    const geoJson = buildMinimapGeoJson(
      this.state.nodes,
      this.state.links,
      this.state.currentSceneId,
    );
    this.map.getSource(NODES_SOURCE_ID)?.setData(geoJson.nodes);
    this.map.getSource(ROUTE_SOURCE_ID)?.setData(geoJson.route);

    const currentNode = this.getCurrentNode();
    if (!currentNode) {
      return;
    }

    const coordinate: MapLibreCoordinate = [currentNode.lng, currentNode.lat];
    const marker = this.marker?.setLngLat(coordinate);
    marker?.setRotation?.(normalizeHeading(this.state.heading));
    if (this.lastPositionedSceneId !== currentNode.id) {
      this.map.easeTo({
        center: coordinate,
        duration: this.options.transitionDurationMs ?? DEFAULT_TRANSITION_DURATION,
      });
      this.lastPositionedSceneId = currentNode.id;
    }
  }

  private getCurrentNode() {
    return this.state.nodes.find((node) => node.id === this.state.currentSceneId) ?? null;
  }

  private destroyMountedMap(): void {
    if (this.map) {
      this.map.off('click', NODES_LAYER_ID, this.handleNodeClick);
      this.marker?.remove();
      this.map.remove();
    } else if (this.container) {
      this.container.replaceChildren();
    }

    this.map = null;
    this.marker = null;
    this.container = null;
    this.lastPositionedSceneId = null;
  }

  private async getRuntime(): Promise<MapLibreRuntime> {
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
