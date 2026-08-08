import { describe, expect, it, vi } from 'vitest';

import type { PanoramaNode, PanoramaView } from '../domain/panorama-engine.port';
import {
  PhotoSphereViewerEngine,
  type PhotoSphereViewerRuntime,
} from './photo-sphere-viewer.adapter';

class FakeVirtualTourPlugin {
  readonly listeners = new Map<string, Set<(event?: unknown) => void>>();
  readonly setCurrentNodeCalls: string[] = [];
  nodes: unknown[] = [];

  addEventListener(type: string, listener: (event?: unknown) => void) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: (event?: unknown) => void) {
    this.listeners.get(type)?.delete(listener);
  }

  setNodes(nodes: unknown[]) {
    this.nodes = nodes;
  }

  async setCurrentNode(nodeId: string) {
    this.setCurrentNodeCalls.push(nodeId);
    return true;
  }

  emit(type: string, event?: unknown) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

class FakeViewer {
  readonly listeners = new Map<string, Set<(event?: unknown) => void>>();
  readonly options: unknown;
  readonly rotateCalls: PanoramaView[] = [];
  readonly setPanoramaCalls: unknown[] = [];
  readonly zoomCalls: number[] = [];
  destroyed = false;
  position = { pitch: 0, yaw: Math.PI / 2 };
  zoomLevel = 50;

  constructor(options: unknown) {
    this.options = options;
  }

  addEventListener(type: string, listener: (event?: unknown) => void) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: (event?: unknown) => void) {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string, event?: unknown) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }

  getPlugin() {
    return virtualTourPlugin;
  }

  getPosition() {
    return this.position;
  }

  getZoomLevel() {
    return this.zoomLevel;
  }

  async setPanorama(panorama: unknown) {
    this.setPanoramaCalls.push(panorama);
    return true;
  }

  rotate(position: { pitch: number; yaw: number }) {
    this.position = position;
    this.rotateCalls.push({
      heading: (position.yaw * 180) / Math.PI,
      pitch: (position.pitch * 180) / Math.PI,
      fov: 90,
    });
  }

  zoom(level: number) {
    this.zoomLevel = level;
    this.zoomCalls.push(level);
  }

  destroy() {
    this.destroyed = true;
    this.listeners.clear();
  }
}

const virtualTourPlugin = new FakeVirtualTourPlugin();
const fakeViewer = new FakeViewer({});

class FakeViewerConstructor {
  constructor(options: unknown) {
    void options;
    return fakeViewer;
  }
}

const runtime = {
  EquirectangularTilesAdapter: 'tiles-adapter',
  MarkersPlugin: 'markers-plugin',
  Viewer: vi.fn(FakeViewerConstructor),
  VirtualTourPlugin: {
    withConfig: vi.fn((config) => ({ type: 'virtual-tour-plugin', config })),
  },
} as unknown as PhotoSphereViewerRuntime;

const node: PanoramaNode = {
  id: 'scene-01',
  links: [{ targetNodeId: 'scene-02', yaw: 725, pitch: -12 }],
  panoramaUrl: 'https://cdn.example.test/scene-01/manifest.json',
  previewUrl: 'https://cdn.example.test/scene-01/preview.webp',
  lat: 18.342,
  lng: 105.9,
  initialView: { heading: 10, pitch: -2, fov: 88 },
};

const targetNode: PanoramaNode = {
  id: 'scene-02',
  panoramaUrl: 'https://cdn.example.test/scene-02/manifest.json',
  previewUrl: 'https://cdn.example.test/scene-02/preview.webp',
  lat: 18.343,
  lng: 105.901,
  initialView: { heading: 180, pitch: 0, fov: 90 },
};

describe('PhotoSphereViewerEngine', () => {
  it('loads the tiled runtime lazily, subscribes view changes, navigates nodes, and cleans up', async () => {
    const loadRuntime = vi.fn(async () => runtime);
    const loadPanorama = vi.fn(async () => ({
      version: 1,
      type: 'equirectangular-tiles',
      preview: 'preview.webp',
      tileUrlTemplate: 'tiles/{level}/{col}-{row}.webp',
      levels: [
        { width: 512, cols: 1, rows: 1 },
        { width: 1024, cols: 2, rows: 1 },
      ],
    }));
    const engine = new PhotoSphereViewerEngine({ loadPanorama, loadRuntime });
    const container = document.createElement('div');
    const received: PanoramaView[] = [];
    const receivedNodeIds: string[] = [];

    await engine.mount(container);
    engine.setTour?.([node, targetNode]);
    engine.subscribeNodeChanged?.((nodeId) => receivedNodeIds.push(nodeId));
    expect(loadRuntime).not.toHaveBeenCalled();

    const unsubscribe = engine.subscribeViewChanged((view) => received.push(view));
    await engine.loadNode(node);

    expect(loadRuntime).toHaveBeenCalledTimes(1);
    expect(loadPanorama).toHaveBeenCalledWith(node);
    expect(runtime.Viewer).toHaveBeenCalledTimes(1);
    expect(fakeViewer.setPanoramaCalls).toHaveLength(0);
    const panorama = (
      vi.mocked(runtime.Viewer).mock.calls.at(-1)?.[0] as {
        panorama: {
          baseUrl: string;
          levels: unknown[];
          tileUrl: (column: number, row: number, level: number) => string;
        };
      }
    ).panorama;
    expect(panorama.baseUrl).toBe('https://cdn.example.test/scene-01/preview.webp');
    expect(panorama.levels).toHaveLength(2);
    expect(panorama.tileUrl(1, 0, 1)).toBe('https://cdn.example.test/scene-01/tiles/1/1-0.webp');
    expect(virtualTourPlugin.setCurrentNodeCalls).toEqual(['scene-01']);

    const virtualTourConfig = vi
      .mocked(runtime.VirtualTourPlugin.withConfig)
      .mock.calls.at(-1)?.[0] as {
      dataMode: string;
      getNode: (nodeId: string) => Promise<{ links: unknown[] }>;
      positionMode: string;
      preload: boolean;
    };
    expect(virtualTourConfig).toMatchObject({
      dataMode: 'server',
      positionMode: 'manual',
      preload: true,
    });
    await expect(virtualTourConfig.getNode('scene-01')).resolves.toMatchObject({
      links: [
        {
          nodeId: 'scene-02',
          position: {
            yaw: expect.closeTo((5 * Math.PI) / 180),
            pitch: expect.closeTo((-12 * Math.PI) / 180),
          },
        },
      ],
    });
    virtualTourPlugin.emit('node-changed', { node: { id: 'scene-02' } });
    expect(receivedNodeIds).toEqual(['scene-02']);

    fakeViewer.position = { pitch: -Math.PI / 18, yaw: Math.PI };
    fakeViewer.zoomLevel = 60;
    fakeViewer.emit('position-updated');

    expect(received.at(-1)).toMatchObject({
      heading: 180,
      pitch: -10,
    });
    expect(received.at(-1)?.fov).toBeGreaterThan(30);
    expect(received.at(-1)?.fov).toBeLessThan(120);

    engine.setView({ heading: 270, pitch: 5, fov: 60 });

    expect(fakeViewer.rotateCalls.at(-1)).toMatchObject({ heading: 270, pitch: 5 });
    expect(fakeViewer.zoomCalls.at(-1)).toBeGreaterThan(0);

    unsubscribe();
    const eventCountBeforeDestroy = received.length;
    fakeViewer.emit('zoom-updated');
    expect(received).toHaveLength(eventCountBeforeDestroy);

    engine.destroy();

    expect(fakeViewer.destroyed).toBe(true);
    expect(fakeViewer.listeners.size).toBe(0);
  });
});
