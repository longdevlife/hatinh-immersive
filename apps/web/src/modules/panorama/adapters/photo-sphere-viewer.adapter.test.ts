import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PanoramaNode, PanoramaView } from '../domain/panorama-engine.port';
import {
  PhotoSphereViewerEngine,
  type PhotoSphereViewerRuntime,
} from './photo-sphere-viewer.adapter';

class FakeVirtualTourPlugin {
  readonly listeners = new Map<string, Set<(event?: unknown) => void>>();
  readonly setCurrentNodeCalls: string[] = [];
  readonly setCurrentNodeResults = new Map<string, Promise<boolean>>();
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
    return this.setCurrentNodeResults.get(nodeId) ?? true;
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

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, resolve, reject };
}

describe('PhotoSphereViewerEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    virtualTourPlugin.listeners.clear();
    virtualTourPlugin.nodes = [];
    virtualTourPlugin.setCurrentNodeCalls.length = 0;
    virtualTourPlugin.setCurrentNodeResults.clear();
    fakeViewer.destroyed = false;
    fakeViewer.listeners.clear();
    fakeViewer.rotateCalls.length = 0;
    fakeViewer.setPanoramaCalls.length = 0;
    fakeViewer.zoomCalls.length = 0;
    fakeViewer.position = { pitch: 0, yaw: Math.PI / 2 };
    fakeViewer.zoomLevel = 50;
  });

  it('leaves the viewer on the newest scene when an older panorama resolves late', async () => {
    const sceneB = { ...targetNode, id: 'scene-b' };
    const sceneC = { ...targetNode, id: 'scene-c' };
    const panoramaB = createDeferred<unknown>();
    const panoramaC = createDeferred<unknown>();
    const loadPanorama = vi.fn((candidate: PanoramaNode) => {
      if (candidate.id === sceneB.id) {
        return panoramaB.promise;
      }
      if (candidate.id === sceneC.id) {
        return panoramaC.promise;
      }
      return Promise.resolve({ id: candidate.id });
    });
    const engine = new PhotoSphereViewerEngine({
      loadPanorama,
      loadRuntime: async () => runtime,
    });

    await engine.mount(document.createElement('div'));
    await engine.loadNode(node);

    const loadB = engine.loadNode(sceneB);
    const loadC = engine.loadNode(sceneC);
    panoramaB.resolve({ id: sceneB.id });
    await loadB;

    expect(virtualTourPlugin.setCurrentNodeCalls).toEqual([node.id]);
    expect(runtime.Viewer).toHaveBeenCalledTimes(1);
    expect(fakeViewer.setPanoramaCalls).toHaveLength(0);

    panoramaC.resolve({ id: sceneC.id });
    await loadC;

    expect(virtualTourPlugin.setCurrentNodeCalls).toEqual([node.id, sceneC.id]);
  });

  it('keeps native node-change events suppressed while a newer load is pending', async () => {
    const sceneB = { ...targetNode, id: 'scene-b' };
    const sceneC = { ...targetNode, id: 'scene-c' };
    const nodeChangeB = createDeferred<boolean>();
    const nodeChangeC = createDeferred<boolean>();
    const receivedNodeIds: string[] = [];
    const engine = new PhotoSphereViewerEngine({
      loadPanorama: async (candidate) => ({ id: candidate.id }),
      loadRuntime: async () => runtime,
    });

    await engine.mount(document.createElement('div'));
    await engine.loadNode(node);
    engine.subscribeNodeChanged?.((nodeId) => receivedNodeIds.push(nodeId));
    virtualTourPlugin.setCurrentNodeResults.set(sceneB.id, nodeChangeB.promise);
    virtualTourPlugin.setCurrentNodeResults.set(sceneC.id, nodeChangeC.promise);

    const loadB = engine.loadNode(sceneB);
    await vi.waitFor(() => {
      expect(virtualTourPlugin.setCurrentNodeCalls).toEqual([node.id, sceneB.id]);
    });
    const loadC = engine.loadNode(sceneC);
    await vi.waitFor(() => {
      expect(virtualTourPlugin.setCurrentNodeCalls).toEqual([node.id, sceneB.id, sceneC.id]);
    });

    nodeChangeB.resolve(true);
    await loadB;
    virtualTourPlugin.emit('node-changed', { node: { id: sceneC.id } });

    expect(receivedNodeIds).toEqual([]);

    nodeChangeC.resolve(true);
    await loadC;
  });

  it('restores the last committed scene when the newest scene load fails', async () => {
    const sceneB = { ...targetNode, id: 'scene-b' };
    const sceneC = { ...targetNode, id: 'scene-c' };
    const transitionB = createDeferred<boolean>();
    const transitionC = createDeferred<boolean>();
    virtualTourPlugin.setCurrentNodeResults.set(sceneB.id, transitionB.promise);
    virtualTourPlugin.setCurrentNodeResults.set(sceneC.id, transitionC.promise);
    const engine = new PhotoSphereViewerEngine({
      loadPanorama: async (candidate) => ({ id: candidate.id }),
      loadRuntime: async () => runtime,
    });

    await engine.mount(document.createElement('div'));
    await engine.loadNode(node);

    const loadB = engine.loadNode(sceneB);
    await vi.waitFor(() => {
      expect(virtualTourPlugin.setCurrentNodeCalls).toEqual([node.id, sceneB.id]);
    });
    const loadC = engine.loadNode(sceneC);
    await vi.waitFor(() => {
      expect(virtualTourPlugin.setCurrentNodeCalls).toEqual([node.id, sceneB.id, sceneC.id]);
    });

    transitionB.resolve(true);
    transitionC.reject(new Error('tile failed'));

    await expect(loadB).resolves.toBeUndefined();
    await expect(loadC).rejects.toThrow('tile failed');
    expect(virtualTourPlugin.setCurrentNodeCalls).toEqual([node.id, sceneB.id, sceneC.id, node.id]);
    expect(runtime.Viewer).toHaveBeenCalledTimes(1);
  });

  it('delivers native node changes after remounting with an unresolved old transition', async () => {
    const oldScene = { ...targetNode, id: 'old-scene' };
    const pendingOldTransition = createDeferred<boolean>();
    const receivedNodeIds: string[] = [];
    const engine = new PhotoSphereViewerEngine({
      loadPanorama: async (candidate) => ({ id: candidate.id }),
      loadRuntime: async () => runtime,
    });

    await engine.mount(document.createElement('div'));
    await engine.loadNode(node);
    virtualTourPlugin.setCurrentNodeResults.set(oldScene.id, pendingOldTransition.promise);

    const oldLoad = engine.loadNode(oldScene);
    await vi.waitFor(() => {
      expect(virtualTourPlugin.setCurrentNodeCalls).toEqual([node.id, oldScene.id]);
    });

    engine.destroy();
    await engine.mount(document.createElement('div'));
    await engine.loadNode(node);
    engine.subscribeNodeChanged?.((nodeId) => receivedNodeIds.push(nodeId));

    virtualTourPlugin.emit('node-changed', { node: { id: targetNode.id } });

    expect(receivedNodeIds).toEqual([targetNode.id]);

    pendingOldTransition.resolve(true);
    await oldLoad;
  });

  it('normalizes server-provided virtual-tour links without adding an absent thumbnail', async () => {
    const linkedNode: PanoramaNode = {
      ...node,
      links: [{ targetNodeId: targetNode.id, yaw: -725, pitch: 120 }],
      name: 'Normalized scene',
      previewUrl: null,
    };
    const engine = new PhotoSphereViewerEngine({
      loadPanorama: async () => ({ panorama: 'linked-node' }),
      loadRuntime: async () => runtime,
    });

    await engine.mount(document.createElement('div'));
    await engine.loadNode(linkedNode);

    const virtualTourConfig = vi
      .mocked(runtime.VirtualTourPlugin.withConfig)
      .mock.calls.at(-1)?.[0] as {
      getNode: (nodeId: string) => Promise<{
        gps: [number, number];
        links: Array<{ nodeId: string; position: { pitch: number; yaw: number } }>;
        thumbnail?: string;
      }>;
    };
    const virtualNode = await virtualTourConfig.getNode(linkedNode.id);

    expect(virtualNode.gps).toEqual([105.9, 18.342]);
    expect(virtualNode.links).toEqual([
      {
        nodeId: targetNode.id,
        position: {
          yaw: (355 * Math.PI) / 180,
          pitch: Math.PI / 2,
        },
      },
    ]);
    expect(virtualNode).not.toHaveProperty('thumbnail');
  });

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
    const receivedNodes: Array<{ nodeId: string; view: PanoramaView }> = [];

    await engine.mount(container);
    engine.setTour?.([node, targetNode]);
    engine.subscribeNodeChanged?.((nodeId, view) => {
      if (view) {
        receivedNodes.push({ nodeId, view });
      }
    });
    expect(loadRuntime).not.toHaveBeenCalled();

    const unsubscribe = engine.subscribeViewChanged((view) => received.push(view));
    await engine.loadNode(node);

    expect(loadRuntime).toHaveBeenCalledTimes(1);
    expect(loadPanorama).toHaveBeenCalledWith(node);
    expect(runtime.Viewer).toHaveBeenCalledTimes(1);
    expect(fakeViewer.setPanoramaCalls).toHaveLength(0);
    const viewerOptions = vi.mocked(runtime.Viewer).mock.calls.at(-1)?.[0] as {
      navbar?: unknown;
      panorama?: unknown;
    };
    expect(viewerOptions.navbar).toBe(false);
    expect(viewerOptions.panorama).toBeUndefined();
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
    fakeViewer.position = { pitch: -Math.PI / 18, yaw: Math.PI };
    fakeViewer.zoomLevel = 60;
    virtualTourPlugin.emit('node-changed', { node: { id: 'scene-02' } });
    expect(receivedNodes).toEqual([
      {
        nodeId: 'scene-02',
        view: { heading: 180, pitch: -10, fov: 66 },
      },
    ]);

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
