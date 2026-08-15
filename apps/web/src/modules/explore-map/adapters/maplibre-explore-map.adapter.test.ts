import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ExploreMapDestination, ExploreMapViewportState } from '../model/explore-map.types';

import { MapLibreExploreMapEngine, type ExploreMapRuntime } from './maplibre-explore-map.adapter';

type Listener = (event?: unknown) => void;

class FakeGeoJsonSource {
  data: unknown;

  constructor(data: unknown) {
    this.data = data;
  }

  setData(data: unknown): void {
    this.data = data;
  }

  getData(): unknown {
    return this.data;
  }
}

class FakeMap {
  readonly options: unknown;
  readonly sources = new Map<string, FakeGeoJsonSource>();
  readonly layers: unknown[] = [];
  readonly images = new Map<string, unknown>();
  readonly styleChanges: unknown[] = [];
  readonly flyToCalls: unknown[] = [];
  readonly fitBoundsCalls: unknown[] = [];
  readonly resizeCalls: number[] = [];
  readonly listeners = new Map<string, Set<Listener>>();
  readonly layerListeners = new Map<string, Set<Listener>>();
  removed = false;

  static latest: FakeMap | null = null;
  static autoLoad = true;
  static failNextStyleChange = false;

  constructor(options: unknown) {
    this.options = options;
    FakeMap.latest = this;
    if (FakeMap.autoLoad) {
      queueMicrotask(() => this.emit('load'));
    }
  }

  on(event: string, listenerOrLayer: string | Listener, maybeListener?: Listener) {
    if (typeof listenerOrLayer === 'string') {
      const listeners = this.layerListeners.get(listenerOrLayer) ?? new Set();
      listeners.add(maybeListener!);
      this.layerListeners.set(listenerOrLayer, listeners);
      return this;
    }

    const listeners = this.listeners.get(event) ?? new Set();
    listeners.add(listenerOrLayer);
    this.listeners.set(event, listeners);
    return this;
  }

  off(event: string, listenerOrLayer: string | Listener, maybeListener?: Listener) {
    if (typeof listenerOrLayer === 'string') {
      this.layerListeners.get(listenerOrLayer)?.delete(maybeListener!);
      return this;
    }

    this.listeners.get(event)?.delete(listenerOrLayer);
    return this;
  }

  emit(event: string, payload?: unknown): void {
    for (const listener of this.listeners.get(event) ?? []) {
      listener(payload);
    }
  }

  emitDestinationClick(id: string, layerId = 'explore-destinations'): void {
    for (const listener of this.layerListeners.get(layerId) ?? []) {
      listener({ features: [{ properties: { id } }] });
    }
  }

  emitOverlappingDestinationClick(id: string): void {
    const event = {
      features: [{ properties: { id } }],
      originalEvent: {},
    };
    for (const layerId of [
      'explore-destinations',
      'explore-destinations-hit-targets',
      'explore-destination-labels',
    ]) {
      for (const listener of this.layerListeners.get(layerId) ?? []) {
        listener(event);
      }
    }
  }

  addSource(id: string, source: { data: unknown }): void {
    this.sources.set(id, new FakeGeoJsonSource(source.data));
  }

  addImage(id: string, image: unknown): void {
    this.images.set(id, image);
  }

  hasImage(id: string): boolean {
    return this.images.has(id);
  }

  getSource(id: string): FakeGeoJsonSource | undefined {
    return this.sources.get(id);
  }

  getLayer(id: string): unknown | undefined {
    return this.layers.find((layer) => (layer as { id?: string }).id === id);
  }

  setStyle(style: unknown): void {
    this.styleChanges.push(style);
    this.sources.clear();
    this.layers.length = 0;
    this.images.clear();
    if (FakeMap.failNextStyleChange) {
      FakeMap.failNextStyleChange = false;
      queueMicrotask(() => this.emit('error'));
      return;
    }

    queueMicrotask(() => this.emit('style.load'));
  }

  addLayer(layer: unknown): void {
    this.layers.push(layer);
  }

  flyTo(options: unknown): void {
    this.flyToCalls.push(options);
  }

  fitBounds(bounds: unknown, options: unknown): void {
    this.fitBoundsCalls.push({ bounds, options });
  }

  resize(): void {
    this.resizeCalls.push(Date.now());
  }

  remove(): void {
    this.removed = true;
  }

  getBounds() {
    return {
      getEast: () => 107,
      getNorth: () => 19,
      getSouth: () => 18,
      getWest: () => 105,
    };
  }

  getCenter() {
    const center = (this.options as { center: [number, number] }).center;
    return { lat: center[1], lng: center[0] };
  }

  getZoom(): number {
    return (this.options as { zoom: number }).zoom;
  }

  queryRenderedFeatures(options?: { layers?: string[] }): unknown[] {
    const layerId = options?.layers?.[0];
    const features =
      (this.sources.get('explore-destinations')?.data as { features?: unknown[] } | undefined)
        ?.features ?? [];
    if (layerId === 'explore-destinations-selection-halo') {
      return features.filter(
        (feature) =>
          ((feature as { properties?: { isSelected?: boolean } }).properties?.isSelected ??
            false) === true,
      );
    }
    if (
      layerId === 'explore-destinations' ||
      layerId === 'explore-destination-labels' ||
      layerId === 'explore-destinations-hit-targets'
    ) {
      return features;
    }
    if (layerId === 'debug-canary-circle') {
      return (
        (this.sources.get('debug-canary-source')?.data as { features?: unknown[] } | undefined)
          ?.features ?? []
      );
    }
    return [];
  }

  querySourceFeatures(sourceId: string): unknown[] {
    return (
      (this.sources.get(sourceId)?.data as { features?: unknown[] } | undefined)?.features ?? []
    );
  }

  isSourceLoaded(sourceId: string): boolean {
    return this.sources.has(sourceId);
  }

  triggerRepaint(): void {
    queueMicrotask(() => this.emit('idle'));
  }
}

const runtime = { Map: FakeMap } as unknown as ExploreMapRuntime;

const destinations: ExploreMapDestination[] = [
  {
    categoryLabel: 'Biển',
    featured: true,
    id: 'thien-cam',
    label: 'Biển Thiên Cầm',
    latitude: 18.2942,
    longitude: 106.4217,
  },
  {
    categoryLabel: 'Di sản',
    featured: false,
    id: 'nguyen-du',
    label: 'Khu lưu niệm Nguyễn Du',
    latitude: 18.4328,
    longitude: 105.5871,
  },
];

const state: ExploreMapViewportState = {
  destinations,
  selectedDestinationId: 'thien-cam',
};

describe('MapLibreExploreMapEngine', () => {
  afterEach(() => {
    FakeMap.autoLoad = true;
    FakeMap.failNextStyleChange = false;
    FakeMap.latest = null;
    vi.unstubAllGlobals();
  });

  it('reports a missing style without loading the MapLibre runtime', async () => {
    const loadRuntime = vi.fn(async () => runtime);
    const engine = new MapLibreExploreMapEngine({
      loadRuntime,
    });

    await expect(engine.mount(document.createElement('div'))).rejects.toThrow(
      'EXPLORE_MAP_STYLE_REQUIRED',
    );
    expect(loadRuntime).not.toHaveBeenCalled();
  });

  it('mounts one interactive map and maps destinations into selected GeoJSON features', async () => {
    const loadRuntime = vi.fn(async () => runtime);
    const engine = new MapLibreExploreMapEngine({
      loadRuntime,
      style: { version: 8 },
    });
    const container = document.createElement('div');

    engine.setState(state);
    await engine.mount(container);

    const map = FakeMap.latest!;
    expect(loadRuntime).toHaveBeenCalledTimes(1);
    expect(map.options).toMatchObject({
      attributionControl: true,
      center: [105.9, 18.342],
      container,
      interactive: true,
      style: { version: 8 },
    });
    expect(map.sources.get('explore-destinations')?.data).toMatchObject({
      features: expect.arrayContaining([
        expect.objectContaining({
          geometry: { coordinates: [106.4217, 18.2942], type: 'Point' },
          properties: expect.objectContaining({ id: 'thien-cam', isSelected: true }),
        }),
        expect.objectContaining({
          geometry: { coordinates: [105.5871, 18.4328], type: 'Point' },
          properties: expect.objectContaining({ id: 'nguyen-du', isSelected: false }),
        }),
      ]),
    });
    expect(map.layers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'explore-destinations',
          layout: expect.objectContaining({
            'icon-image': [
              'case',
              ['get', 'isSelected'],
              'explore-destination-pin-selected',
              'explore-destination-pin',
            ],
          }),
          source: 'explore-destinations',
          type: 'symbol',
        }),
        expect.objectContaining({
          id: 'explore-destination-labels',
          layout: expect.objectContaining({
            'text-size': ['case', ['get', 'isSelected'], 14, 12],
          }),
          paint: expect.objectContaining({
            'text-color': ['case', ['get', 'isSelected'], '#173c31', '#52665b'],
          }),
        }),
        expect.objectContaining({
          id: 'explore-destinations-hit-targets',
          paint: expect.objectContaining({
            'circle-opacity': 0,
            'circle-radius': 22,
          }),
          source: 'explore-destinations',
          type: 'circle',
        }),
      ]),
    );
    expect(map.images.has('explore-destination-pin')).toBe(true);
    expect(map.images.has('explore-destination-pin-selected')).toBe(true);

    engine.destroy();
  });

  it('captures stable source, layer, image, rendered-feature, and camera diagnostics', async () => {
    const engine = new MapLibreExploreMapEngine({
      loadRuntime: async () => runtime,
      style: { version: 8 },
    });

    engine.setState(state);
    await engine.mount(document.createElement('div'));

    await expect(engine.getDiagnostics()).resolves.toMatchObject({
      sourceExists: true,
      sourceDataFeatureCount: 2,
      sourceFeatureIds: ['thien-cam', 'nguyen-du'],
      sourceFeatureCoordinates: [
        [106.4217, 18.2942],
        [105.5871, 18.4328],
      ],
      sourceFeatureSelectedFlags: [true, false],
      layers: {
        'explore-destinations-selection-halo': { exists: true },
        'explore-destinations': { exists: true },
        'explore-destinations-hit-targets': { exists: true },
        'explore-destination-labels': { exists: true },
        'explore-user-location': { exists: true },
      },
      normalPinImageExists: true,
      selectedPinImageExists: true,
      renderedPinFeatureCount: 2,
      renderedHaloFeatureCount: 1,
      renderedLabelFeatureCount: 2,
      mapCenter: { longitude: 105.9, latitude: 18.342 },
      mapZoom: 9,
      mapBounds: { west: 105, south: 18, east: 107, north: 19 },
    });

    engine.destroy();
  });

  it('traces setData and the diagnostic GeoJSON canary when diagnostics are enabled', async () => {
    const engine = new MapLibreExploreMapEngine({
      diagnosticsEnabled: true,
      loadRuntime: async () => runtime,
      style: { version: 8 },
    });

    engine.setState(state);
    await engine.mount(document.createElement('div'));

    await expect(engine.getDiagnostics()).resolves.toMatchObject({
      destinationSetDataCallCount: 1,
      userLocationSetDataCallCount: 1,
      canary: {
        sourceExists: true,
        setDataPromiseResolved: true,
        setDataPromiseRejected: false,
        sourceLoaded: true,
        querySourceCount: 1,
        renderedCount: 1,
      },
    });

    engine.destroy();
  });

  it('emits destination clicks, updates state without remounting, and flies to targets', async () => {
    const engine = new MapLibreExploreMapEngine({
      loadRuntime: async () => runtime,
      style: { version: 8 },
    });
    const selected: string[] = [];
    const unsubscribe = engine.subscribeDestinationSelected((id) => selected.push(id));

    await engine.mount(document.createElement('div'));
    const map = FakeMap.latest!;
    map.emitDestinationClick('nguyen-du', 'explore-destinations-hit-targets');
    expect(selected).toEqual(['nguyen-du']);

    engine.setState({ ...state, selectedDestinationId: 'nguyen-du' });
    expect(map.sources.get('explore-destinations')?.data).toMatchObject({
      features: expect.arrayContaining([
        expect.objectContaining({
          properties: expect.objectContaining({ id: 'nguyen-du', isSelected: true }),
        }),
      ]),
    });

    await engine.flyTo({ latitude: 18.4328, longitude: 105.5871, zoom: 13 });
    expect(map.flyToCalls).toContainEqual({
      center: [105.5871, 18.4328],
      duration: 650,
      zoom: 13,
    });
    expect(FakeMap.latest).toBe(map);

    unsubscribe();
    engine.destroy();
    expect(map.removed).toBe(true);
    expect(map.layerListeners.get('explore-destinations')?.size ?? 0).toBe(0);
    expect(map.layerListeners.get('explore-destinations-hit-targets')?.size ?? 0).toBe(0);
  });

  it('restores destination layers and selection after a style reload without remounting', async () => {
    const engine = new MapLibreExploreMapEngine({
      loadRuntime: async () => runtime,
      style: { version: 8, name: 'default' },
    });

    engine.setState(state);
    await engine.mount(document.createElement('div'));
    const map = FakeMap.latest!;
    await engine.changeStyle({ version: 8, name: 'alternate' });

    expect(map.styleChanges).toEqual([{ version: 8, name: 'alternate' }]);
    expect(map.removed).toBe(false);
    expect(map.sources.get('explore-destinations')?.data).toMatchObject({
      features: expect.arrayContaining([
        expect.objectContaining({
          properties: expect.objectContaining({ id: 'thien-cam', isSelected: true }),
        }),
      ]),
    });
    expect(map.layers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'explore-destinations' }),
        expect.objectContaining({ id: 'explore-destinations-hit-targets' }),
        expect.objectContaining({ id: 'explore-destination-labels' }),
      ]),
    );
    expect(map.images.has('explore-destination-pin')).toBe(true);
    expect(map.images.has('explore-destination-pin-selected')).toBe(true);

    engine.destroy();
  });

  it('rolls back the style and destination layers when the next style fails', async () => {
    const engine = new MapLibreExploreMapEngine({
      loadRuntime: async () => runtime,
      style: { version: 8, name: 'default' },
    });

    engine.setState(state);
    await engine.mount(document.createElement('div'));
    const map = FakeMap.latest!;
    FakeMap.failNextStyleChange = true;

    await expect(engine.changeStyle({ version: 8, name: 'broken' })).rejects.toThrow(
      'MAPLIBRE_EXPLORE_STYLE_ERROR',
    );

    expect(map.styleChanges).toEqual([
      { version: 8, name: 'broken' },
      { version: 8, name: 'default' },
    ]);
    expect(map.removed).toBe(false);
    expect(map.sources.get('explore-destinations')?.data).toMatchObject({
      features: expect.arrayContaining([
        expect.objectContaining({
          properties: expect.objectContaining({ id: 'thien-cam', isSelected: true }),
        }),
      ]),
    });
    expect(map.layers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'explore-destinations' }),
        expect.objectContaining({ id: 'explore-destinations-hit-targets' }),
      ]),
    );

    engine.destroy();
  });

  it('renders the user location through the provider-native source', async () => {
    const engine = new MapLibreExploreMapEngine({
      loadRuntime: async () => runtime,
      style: { version: 8 },
    });

    engine.setState({
      ...state,
      userLocation: { latitude: 18.35, longitude: 105.91 },
    });
    await engine.mount(document.createElement('div'));
    const map = FakeMap.latest!;

    expect(map.sources.get('explore-user-location')?.data).toEqual({
      features: [
        {
          geometry: { coordinates: [105.91, 18.35], type: 'Point' },
          properties: {},
          type: 'Feature',
        },
      ],
      type: 'FeatureCollection',
    });

    engine.destroy();
  });

  it('emits one selection when one click reaches overlapping destination layers', async () => {
    const engine = new MapLibreExploreMapEngine({
      loadRuntime: async () => runtime,
      style: { version: 8 },
    });
    const selected: string[] = [];
    engine.subscribeDestinationSelected((id) => selected.push(id));

    await engine.mount(document.createElement('div'));
    const map = FakeMap.latest!;
    expect(map.layerListeners.get('explore-destinations')?.size ?? 0).toBe(0);
    expect(map.layerListeners.get('explore-destinations-hit-targets')?.size ?? 0).toBe(1);
    expect(map.layerListeners.get('explore-destination-labels')?.size ?? 0).toBe(1);

    map.emitOverlappingDestinationClick('nguyen-du');

    expect(selected).toEqual(['nguyen-du']);
    engine.destroy();
  });

  it('forwards resize to the mounted map', async () => {
    const engine = new MapLibreExploreMapEngine({
      loadRuntime: async () => runtime,
      style: { version: 8 },
    });

    await engine.mount(document.createElement('div'));
    const map = FakeMap.latest!;
    engine.resize();

    expect(map.resizeCalls).toHaveLength(1);
    engine.destroy();
  });

  it('fits the visible destinations and falls back to the Hà Tĩnh overview', async () => {
    const engine = new MapLibreExploreMapEngine({
      loadRuntime: async () => runtime,
      style: { version: 8 },
    });

    engine.setState(state);
    await engine.mount(document.createElement('div'));
    const map = FakeMap.latest!;

    await (engine as unknown as { fitOverview(): Promise<void> }).fitOverview();
    expect(map.fitBoundsCalls).toContainEqual({
      bounds: [
        [105.5871, 18.2942],
        [106.4217, 18.4328],
      ],
      options: { duration: 650, maxZoom: 11, padding: 64 },
    });

    engine.setState({ destinations: [], selectedDestinationId: null });
    await (engine as unknown as { fitOverview(): Promise<void> }).fitOverview();
    expect(map.flyToCalls).toContainEqual({
      center: [105.9, 18.342],
      duration: 650,
      zoom: 9,
    });

    engine.destroy();
  });

  it('uses zero camera duration when prefers-reduced-motion is enabled', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: true,
        media: '(prefers-reduced-motion: reduce)',
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
    const engine = new MapLibreExploreMapEngine({
      loadRuntime: async () => runtime,
      style: { version: 8 },
    });

    engine.setState(state);
    await engine.mount(document.createElement('div'));
    const map = FakeMap.latest!;

    await engine.flyTo({ latitude: 18.4328, longitude: 105.5871 });
    await (engine as unknown as { fitOverview(): Promise<void> }).fitOverview();

    expect(map.flyToCalls).toContainEqual({
      center: [105.5871, 18.4328],
      duration: 0,
    });
    expect(map.fitBoundsCalls).toContainEqual({
      bounds: [
        [105.5871, 18.2942],
        [106.4217, 18.4328],
      ],
      options: { duration: 0, maxZoom: 11, padding: 64 },
    });

    engine.destroy();
  });

  it('cancels a deferred map load when the engine is destroyed before load', async () => {
    FakeMap.autoLoad = false;
    const engine = new MapLibreExploreMapEngine({
      loadRuntime: async () => runtime,
      style: { version: 8 },
    });

    const mountPromise = engine.mount(document.createElement('div'));
    await vi.waitFor(() => expect(FakeMap.latest).not.toBeNull());
    const map = FakeMap.latest!;

    engine.destroy();

    await expect(mountPromise).resolves.toBeUndefined();
    expect(map.removed).toBe(true);
  });
});
