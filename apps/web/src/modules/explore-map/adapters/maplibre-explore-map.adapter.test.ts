import { describe, expect, it, vi } from 'vitest';

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
  readonly resizeCalls: number[] = [];
  readonly listeners = new Map<string, Set<Listener>>();
  readonly layerListeners = new Map<string, Set<Listener>>();
  removed = false;

  static latest: FakeMap | null = null;

  constructor(options: unknown) {
    this.options = options;
    FakeMap.latest = this;
    queueMicrotask(() => this.emit('load'));
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

  emitDestinationClick(id: string): void {
    for (const listener of this.layerListeners.get('explore-destinations') ?? []) {
      listener({ features: [{ properties: { id } }] });
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
    map.emitDestinationClick('nguyen-du');
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
});
