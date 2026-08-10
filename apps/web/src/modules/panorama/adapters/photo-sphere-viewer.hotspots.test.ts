import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { HotspotVm, PanoramaNode } from '../../../shared/contracts';
import {
  PhotoSphereViewerEngine,
  type PhotoSphereViewerRuntime,
} from './photo-sphere-viewer.adapter';

class FakeVirtualTourPlugin {
  async setCurrentNode() {
    return true;
  }
}

class FakeMarkersPlugin {
  readonly listeners = new Map<string, Set<(event?: unknown) => void>>();
  readonly setMarkersCalls: unknown[][] = [];

  addEventListener(type: string, listener: (event?: unknown) => void) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: (event?: unknown) => void) {
    this.listeners.get(type)?.delete(listener);
  }

  setMarkers(markers: unknown[]) {
    this.setMarkersCalls.push(markers);
  }

  emit(type: string, event?: unknown) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

class FakeViewer {
  readonly listeners = new Map<string, Set<(event?: unknown) => void>>();
  readonly virtualTour = new FakeVirtualTourPlugin();
  readonly markers = new FakeMarkersPlugin();
  position = { pitch: 0, yaw: 0 };
  zoomLevel = 50;
  destroyed = false;

  addEventListener(type: string, listener: (event?: unknown) => void) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: (event?: unknown) => void) {
    this.listeners.get(type)?.delete(listener);
  }

  getPlugin<T>(id: string): T {
    return (id === 'markers' ? this.markers : this.virtualTour) as T;
  }

  getPosition() {
    return this.position;
  }

  getZoomLevel() {
    return this.zoomLevel;
  }

  rotate(position: { pitch: number; yaw: number }) {
    this.position = position;
  }

  zoom(level: number) {
    this.zoomLevel = level;
  }

  async setPanorama() {
    return true;
  }

  destroy() {
    this.destroyed = true;
  }
}

const fakeViewer = new FakeViewer();

class FakeViewerConstructor {
  constructor() {
    return fakeViewer;
  }
}

const runtime = {
  EquirectangularTilesAdapter: 'tiles-adapter',
  MarkersPlugin: 'markers-plugin',
  Viewer: vi.fn(FakeViewerConstructor),
  VirtualTourPlugin: {
    withConfig: vi.fn((config) => config),
  },
} as unknown as PhotoSphereViewerRuntime;

const node: PanoramaNode = {
  id: 'scene-01',
  panoramaUrl: '/scene-01/manifest.json',
  previewUrl: '/scene-01/preview.webp',
  lat: 18.34,
  lng: 105.9,
  initialView: { heading: 0, pitch: 0, fov: 90 },
};

const hotspot: HotspotVm = {
  id: 'hotspot-story',
  sceneId: node.id,
  type: 'information',
  yaw: 450,
  pitch: -120,
  label: 'Câu chuyện địa danh',
};

type HotspotEngine = PhotoSphereViewerEngine & {
  setHotspots(hotspots: HotspotVm[]): void;
  subscribeHotspotSelected(listener: (hotspotId: string) => void): () => void;
};

describe('PhotoSphereViewerEngine panorama hotspots', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fakeViewer.markers.listeners.clear();
    fakeViewer.markers.setMarkersCalls.length = 0;
    fakeViewer.destroyed = false;
    fakeViewer.position = { pitch: 0, yaw: 0 };
    fakeViewer.zoomLevel = 50;
  });

  it('anchors application hotspots through MarkersPlugin and emits renderer selections', async () => {
    const engine = new PhotoSphereViewerEngine({
      loadPanorama: async () => ({ id: node.id }),
      loadRuntime: async () => runtime,
    }) as HotspotEngine;
    const selected = vi.fn();

    await engine.mount(document.createElement('div'));
    await engine.loadNode(node);
    const unsubscribe = engine.subscribeHotspotSelected(selected);
    engine.setHotspots([hotspot]);

    expect(runtime.Viewer).toHaveBeenCalledTimes(1);
    expect(fakeViewer.markers.setMarkersCalls).toHaveLength(1);
    const marker = fakeViewer.markers.setMarkersCalls[0]?.[0] as {
      id: string;
      element: HTMLElement;
      position: { yaw: number; pitch: number };
      size: { width: number; height: number };
    };

    expect(marker.id).toBe(hotspot.id);
    expect(marker.position.yaw).toBeCloseTo(Math.PI / 2);
    expect(marker.position.pitch).toBeCloseTo(-Math.PI / 2);
    expect(marker.size).toEqual({ width: 44, height: 44 });
    expect(marker.element).toHaveAttribute('aria-label', hotspot.label);
    expect(marker.element).toHaveAttribute('aria-haspopup', 'dialog');

    fakeViewer.markers.emit('select-marker', { marker: { id: hotspot.id } });
    expect(selected).toHaveBeenCalledWith(hotspot.id);
    expect(runtime.Viewer).toHaveBeenCalledTimes(1);

    unsubscribe();
    fakeViewer.markers.emit('select-marker', { marker: { id: hotspot.id } });
    expect(selected).toHaveBeenCalledTimes(1);
  });
});
