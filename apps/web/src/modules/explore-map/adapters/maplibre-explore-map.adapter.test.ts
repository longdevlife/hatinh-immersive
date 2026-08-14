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
}

class FakeMap {
  readonly options: unknown;
  readonly sources = new Map<string, FakeGeoJsonSource>();
  readonly layers: unknown[] = [];
  readonly flyToCalls: unknown[] = [];
  readonly fitBoundsCalls: unknown[] = [];
  readonly resizeCalls: number[] = [];
  readonly listeners = new Map<string, Set<Listener>>();
  readonly layerListeners = new Map<string, Set<Listener>>();
  removed = false;

  static latest: FakeMap | null = null;
  static autoLoad = true;

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

  getSource(id: string): FakeGeoJsonSource | undefined {
    return this.sources.get(id);
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
        expect.objectContaining({ id: 'explore-destinations', source: 'explore-destinations' }),
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
