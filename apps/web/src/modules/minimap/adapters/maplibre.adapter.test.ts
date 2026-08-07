import { describe, expect, it, vi } from 'vitest';

import type { SceneLinkVm, SceneNodeVm } from '../../../shared/contracts';

import { MapLibreMinimapEngine, type MapLibreRuntime } from './maplibre.adapter';

type Listener = (event?: unknown) => void;

class FakeGeoJsonSource {
  data: unknown;

  constructor(data: unknown) {
    this.data = data;
  }

  setData(data: unknown) {
    this.data = data;
  }
}

class FakeMap {
  readonly options: unknown;
  readonly sources = new Map<string, FakeGeoJsonSource>();
  readonly layers: unknown[] = [];
  readonly easeToCalls: unknown[] = [];
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

  emit(event: string, payload?: unknown) {
    for (const listener of this.listeners.get(event) ?? []) {
      listener(payload);
    }
  }

  emitNodeClick(id: string) {
    for (const listener of this.layerListeners.get('minimap-nodes') ?? []) {
      listener({ features: [{ properties: { id } }] });
    }
  }

  addSource(id: string, source: { data: unknown }) {
    this.sources.set(id, new FakeGeoJsonSource(source.data));
  }

  getSource(id: string) {
    return this.sources.get(id);
  }

  addLayer(layer: unknown) {
    this.layers.push(layer);
  }

  easeTo(options: unknown) {
    this.easeToCalls.push(options);
  }

  remove() {
    this.removed = true;
  }
}

class FakeMarker {
  readonly element: HTMLElement;
  readonly lngLatCalls: unknown[] = [];
  readonly rotations: number[] = [];
  removed = false;

  static latest: FakeMarker | null = null;

  constructor(options: { element: HTMLElement }) {
    this.element = options.element;
    FakeMarker.latest = this;
  }

  setLngLat(coordinates: [number, number]) {
    this.lngLatCalls.push(coordinates);
    return this;
  }

  setRotation(rotation: number) {
    this.rotations.push(rotation);
    return this;
  }

  addTo() {
    return this;
  }

  remove() {
    this.removed = true;
  }
}

const runtime = {
  Map: FakeMap,
  Marker: FakeMarker,
} as unknown as MapLibreRuntime;

const nodes: SceneNodeVm[] = [
  {
    heading: 12,
    id: 'scene-01',
    isCurrent: true,
    isVisited: true,
    lat: 18.342,
    lng: 105.9,
    name: 'Cổng di sản',
  },
  {
    heading: 45,
    id: 'scene-02',
    isCurrent: false,
    isVisited: false,
    lat: 18.343,
    lng: 105.902,
    name: 'Lối đi ven hồ',
  },
];

const links: SceneLinkVm[] = [
  { id: 'link-01-02', label: 'Đi tiếp', pitch: 0, targetSceneId: 'scene-02', yaw: 90 },
];

describe('MapLibreMinimapEngine', () => {
  it('mounts the map lazily, syncs geojson/heading, emits node clicks, and cleans up', async () => {
    const loadRuntime = vi.fn(async () => runtime);
    const engine = new MapLibreMinimapEngine({ loadRuntime });
    const container = document.createElement('div');
    const selected: string[] = [];
    const unsubscribe = engine.subscribeNodeSelected((sceneId) => selected.push(sceneId));

    engine.setState({ currentSceneId: 'scene-01', heading: 12, links, nodes });
    expect(loadRuntime).not.toHaveBeenCalled();

    await engine.mount(container);

    expect(loadRuntime).toHaveBeenCalledTimes(1);
    const map = FakeMap.latest!;
    expect(map.sources.get('minimap-nodes')?.data).toMatchObject({
      features: expect.arrayContaining([
        expect.objectContaining({
          properties: expect.objectContaining({ id: 'scene-01', isCurrent: true }),
        }),
      ]),
    });

    map.emitNodeClick('scene-02');
    expect(selected).toEqual(['scene-02']);
    expect(map.easeToCalls.at(-1)).toMatchObject({ center: [105.9, 18.342] });
    expect(FakeMarker.latest?.rotations.at(-1)).toBe(12);

    engine.setState({ currentSceneId: 'scene-02', heading: 270, links: [], nodes });
    expect(map.easeToCalls.at(-1)).toMatchObject({ center: [105.902, 18.343] });
    expect(FakeMarker.latest?.rotations.at(-1)).toBe(270);

    unsubscribe();
    engine.destroy();
    expect(map.removed).toBe(true);
  });
});
