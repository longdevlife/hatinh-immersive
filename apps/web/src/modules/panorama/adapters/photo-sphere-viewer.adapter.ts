import '@photo-sphere-viewer/core/index.css';
import '@photo-sphere-viewer/markers-plugin/index.css';
import '@photo-sphere-viewer/virtual-tour-plugin/index.css';

import {
  expandPanoramaTileUrl,
  parsePanoramaManifest,
  type PanoramaManifest,
} from '@hatinh/immersive-contracts';

import type { HotspotVm } from '../../../shared/contracts';
import type {
  PanoramaEnginePort,
  PanoramaLink,
  PanoramaNode,
  PanoramaView,
} from '../domain/panorama-engine.port';

const MIN_FOV = 30;
const MAX_FOV = 120;
const MAX_ZOOM = 100;
const HOTSPOT_MARKER_SIZE = 44;

type PhotoSphereViewerEventListener = (event?: unknown) => void;

export interface PhotoSphereViewerOptions {
  adapter: unknown;
  container: HTMLElement;
  navbar?: false;
  panorama?: unknown;
  plugins: unknown[];
}

export interface PhotoSphereViewerInstance {
  addEventListener(type: string, listener: PhotoSphereViewerEventListener): void;
  destroy(): void;
  getPlugin<T>(id: string): T;
  getPosition(): { pitch: number; yaw: number };
  getZoomLevel(): number;
  removeEventListener(type: string, listener: PhotoSphereViewerEventListener): void;
  rotate(position: { pitch: number; yaw: number }): void;
  setPanorama(panorama: unknown, options?: unknown): Promise<boolean>;
  zoom(level: number): void;
}

export interface PhotoSphereVirtualTourPlugin {
  addEventListener?(type: string, listener: PhotoSphereViewerEventListener): void;
  removeEventListener?(type: string, listener: PhotoSphereViewerEventListener): void;
  setCurrentNode(nodeId: string, options?: unknown): Promise<boolean>;
}

export interface PhotoSphereMarkerConfig {
  element: HTMLElement;
  id: string;
  position: { pitch: number; yaw: number };
  size: { height: number; width: number };
}

export interface PhotoSphereMarkersPlugin {
  addEventListener?(type: string, listener: PhotoSphereViewerEventListener): void;
  removeEventListener?(type: string, listener: PhotoSphereViewerEventListener): void;
  setMarkers(markers: PhotoSphereMarkerConfig[]): void;
}

export interface PhotoSphereVirtualTourLink {
  nodeId: string;
  position: { pitch: number; yaw: number };
}

export interface PhotoSphereVirtualTourNode {
  gps: [number, number];
  id: string;
  links: PhotoSphereVirtualTourLink[];
  name: string;
  panorama: unknown;
  thumbnail?: string;
}

export interface PhotoSphereViewerRuntime {
  EquirectangularTilesAdapter: unknown;
  MarkersPlugin: unknown;
  Viewer: new (options: PhotoSphereViewerOptions) => PhotoSphereViewerInstance;
  VirtualTourPlugin: {
    withConfig(config: unknown): unknown;
  };
}

export interface PhotoSphereViewerAdapterOptions {
  loadPanorama?: (node: PanoramaNode) => Promise<unknown>;
  loadRuntime?: () => Promise<PhotoSphereViewerRuntime>;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeHeading(heading: number): number {
  const normalized = heading % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

function fovToZoom(fov: number): number {
  const normalizedFov = clamp(fov, MIN_FOV, MAX_FOV);
  return ((MAX_FOV - normalizedFov) / (MAX_FOV - MIN_FOV)) * MAX_ZOOM;
}

function zoomToFov(zoom: number): number {
  const normalizedZoom = clamp(zoom, 0, MAX_ZOOM);
  return MAX_FOV - (normalizedZoom / MAX_ZOOM) * (MAX_FOV - MIN_FOV);
}

function toVirtualTourNode(node: PanoramaNode, panorama: unknown): PhotoSphereVirtualTourNode {
  return {
    gps: [node.lng, node.lat],
    id: node.id,
    links: (node.links ?? []).map(toVirtualTourLink),
    name: node.name ?? node.id,
    panorama,
    ...(node.previewUrl ? { thumbnail: node.previewUrl } : {}),
  };
}

function toVirtualTourLink(link: PanoramaLink): PhotoSphereVirtualTourLink {
  return {
    nodeId: link.targetNodeId,
    position: {
      yaw: degreesToRadians(normalizeHeading(link.yaw)),
      pitch: degreesToRadians(clamp(link.pitch, -90, 90)),
    },
  };
}

function createHotspotMarkerElement(hotspot: HotspotVm): HTMLButtonElement {
  const button = document.createElement('button');
  const label = hotspot.label ?? 'Mở điểm khám phá';

  button.type = 'button';
  button.className = `panorama-hotspot-marker panorama-hotspot-marker--${hotspot.type}`;
  button.setAttribute('aria-label', label);
  button.setAttribute('aria-haspopup', 'dialog');
  button.dataset.hotspotId = hotspot.id;

  const core = document.createElement('span');
  core.className = 'panorama-hotspot-marker__core';
  core.setAttribute('aria-hidden', 'true');

  const text = document.createElement('span');
  text.className = 'panorama-hotspot-marker__label';
  text.textContent = label;

  button.append(core, text);
  return button;
}

function toHotspotMarker(hotspot: HotspotVm): PhotoSphereMarkerConfig {
  return {
    id: hotspot.id,
    element: createHotspotMarkerElement(hotspot),
    position: {
      yaw: degreesToRadians(normalizeHeading(hotspot.yaw)),
      pitch: degreesToRadians(clamp(hotspot.pitch, -90, 90)),
    },
    size: { width: HOTSPOT_MARKER_SIZE, height: HOTSPOT_MARKER_SIZE },
  };
}

async function loadPanoramaManifest(node: PanoramaNode): Promise<unknown> {
  if (typeof fetch !== 'function') {
    throw new Error('PANORAMA_FETCH_UNAVAILABLE');
  }

  const panoramaUrl = requirePanoramaUrl(node);
  const response = await fetch(panoramaUrl);
  if (!response.ok) {
    throw new Error(`PANORAMA_MANIFEST_FETCH_FAILED_${response.status}`);
  }

  return hydratePanoramaManifest(await response.json(), response.url || panoramaUrl);
}

function requirePanoramaUrl(node: PanoramaNode): string {
  if (!node.panoramaUrl) {
    throw new Error(`PANORAMA_MEDIA_UNAVAILABLE:${node.id}`);
  }

  return node.panoramaUrl;
}

function hydratePanoramaManifest(value: unknown, manifestUrl: string): unknown {
  let manifest: PanoramaManifest;
  try {
    manifest = parsePanoramaManifest(value);
  } catch {
    return value;
  }

  return toPhotoSphereViewerPanorama(manifest, manifestUrl);
}

function toPhotoSphereViewerPanorama(
  manifest: PanoramaManifest,
  manifestUrl: string,
): {
  baseUrl: string;
  levels: PanoramaManifest['levels'];
  tileUrl: (column: number, row: number, level: number) => string;
} {
  const resolveAssetUrl = (assetPath: string) => {
    try {
      return new URL(assetPath, manifestUrl).toString();
    } catch {
      return assetPath;
    }
  };

  return {
    baseUrl: resolveAssetUrl(manifest.preview),
    levels: manifest.levels,
    tileUrl: (column, row, level) =>
      resolveAssetUrl(expandPanoramaTileUrl(manifest, column, row, level)),
  };
}

async function loadPhotoSphereViewerRuntime(): Promise<PhotoSphereViewerRuntime> {
  const [core, tiles, markers, virtualTour] = await Promise.all([
    import('@photo-sphere-viewer/core'),
    import('@photo-sphere-viewer/equirectangular-tiles-adapter'),
    import('@photo-sphere-viewer/markers-plugin'),
    import('@photo-sphere-viewer/virtual-tour-plugin'),
  ]);

  return {
    EquirectangularTilesAdapter: tiles.EquirectangularTilesAdapter,
    MarkersPlugin: markers.MarkersPlugin,
    Viewer: core.Viewer as unknown as PhotoSphereViewerRuntime['Viewer'],
    VirtualTourPlugin: virtualTour.VirtualTourPlugin,
  };
}

export class PhotoSphereViewerEngine implements PanoramaEnginePort {
  private container: HTMLElement | null = null;
  private runtime: PhotoSphereViewerRuntime | null = null;
  private runtimePromise: Promise<PhotoSphereViewerRuntime> | null = null;
  private viewer: PhotoSphereViewerInstance | null = null;
  private virtualTour: PhotoSphereVirtualTourPlugin | null = null;
  private markers: PhotoSphereMarkersPlugin | null = null;
  private hotspots: HotspotVm[] = [];
  private readonly hotspotElements = new Map<string, HTMLElement>();
  private readonly hotspotListeners = new Set<(hotspotId: string) => void>();
  private readonly tourNodes = new Map<string, PanoramaNode>();
  private readonly virtualNodes = new Map<string, PhotoSphereVirtualTourNode>();
  private readonly panoramaCache = new Map<string, unknown>();
  private readonly viewListeners = new Set<(view: PanoramaView) => void>();
  private readonly options: PhotoSphereViewerAdapterOptions;
  private readonly nodeListeners = new Set<(nodeId: string, view?: PanoramaView) => void>();
  private readonly handlePositionUpdated = () => this.emitView();
  private readonly handleZoomUpdated = () => this.emitView();
  private readonly handleNodeChanged = (event?: unknown) => this.emitNodeChanged(event);
  private readonly handleHotspotSelected = (event?: unknown) => this.emitHotspotSelected(event);
  private readonly suppressedNodeChangeLoads = new Set<number>();
  private mountGeneration = 0;
  private loadGeneration = 0;
  private committedNodeId: string | null = null;

  constructor(options: PhotoSphereViewerAdapterOptions = {}) {
    this.options = options;
  }

  async mount(container: HTMLElement): Promise<void> {
    ++this.mountGeneration;
    this.destroyViewer();
    this.suppressedNodeChangeLoads.clear();
    this.committedNodeId = null;
    this.virtualNodes.clear();
    this.panoramaCache.clear();
    this.container = container;
  }

  setTour(nodes: PanoramaNode[]): void {
    this.tourNodes.clear();
    for (const node of nodes) {
      this.tourNodes.set(node.id, node);
    }
  }

  setHotspots(hotspots: HotspotVm[]): void {
    this.hotspots = hotspots.map((hotspot) => ({ ...hotspot }));
    this.applyHotspots();
  }

  async loadNode(node: PanoramaNode): Promise<void> {
    const container = this.container;
    if (!container) {
      throw new Error('PHOTO_SPHERE_VIEWER_NOT_MOUNTED');
    }

    this.tourNodes.set(node.id, node);
    const generation = this.mountGeneration;
    const loadGeneration = ++this.loadGeneration;
    let runtime: PhotoSphereViewerRuntime;
    try {
      [runtime] = await Promise.all([this.getRuntime(), this.loadPanoramaForNode(node)]);
    } catch (error) {
      await this.restoreCommittedNode(generation, loadGeneration);
      throw error;
    }

    if (
      generation !== this.mountGeneration ||
      loadGeneration !== this.loadGeneration ||
      !this.container
    ) {
      return;
    }

    if (!this.viewer) {
      this.createViewer(container, runtime);
    }

    const virtualTour = this.virtualTour;
    if (!virtualTour) {
      throw new Error('PHOTO_SPHERE_VIEWER_NOT_MOUNTED');
    }

    this.suppressedNodeChangeLoads.add(loadGeneration);
    let completed: boolean;
    try {
      completed = await virtualTour.setCurrentNode(node.id, {
        effect: 'none',
        rotation: false,
        showLoader: false,
      });
      if (!completed) {
        throw new Error(`PHOTO_SPHERE_VIEWER_NODE_LOAD_ABORTED:${node.id}`);
      }
    } catch (error) {
      await this.restoreCommittedNode(generation, loadGeneration);
      throw error;
    } finally {
      this.suppressedNodeChangeLoads.delete(loadGeneration);
    }
    if (loadGeneration !== this.loadGeneration || generation !== this.mountGeneration) {
      return;
    }

    this.committedNodeId = node.id;
    this.setView(node.initialView);
  }

  setView(view: PanoramaView): void {
    if (!this.viewer) {
      return;
    }

    this.viewer.rotate({
      pitch: degreesToRadians(clamp(view.pitch, -90, 90)),
      yaw: degreesToRadians(normalizeHeading(view.heading)),
    });
    this.viewer.zoom(fovToZoom(view.fov));
  }

  subscribeViewChanged(listener: (view: PanoramaView) => void): () => void {
    this.viewListeners.add(listener);
    return () => this.viewListeners.delete(listener);
  }

  subscribeNodeChanged(listener: (nodeId: string, view?: PanoramaView) => void): () => void {
    this.nodeListeners.add(listener);
    return () => this.nodeListeners.delete(listener);
  }

  subscribeHotspotSelected(listener: (hotspotId: string) => void): () => void {
    this.hotspotListeners.add(listener);
    return () => this.hotspotListeners.delete(listener);
  }

  destroy(): void {
    ++this.mountGeneration;
    this.destroyViewer();
    this.suppressedNodeChangeLoads.clear();
    this.committedNodeId = null;
    this.container = null;
    this.hotspots = [];
    this.hotspotElements.clear();
    this.tourNodes.clear();
    this.virtualNodes.clear();
    this.panoramaCache.clear();
    this.viewListeners.clear();
    this.nodeListeners.clear();
    this.hotspotListeners.clear();
  }

  private createViewer(container: HTMLElement, runtime: PhotoSphereViewerRuntime): void {
    const virtualTourConfig = runtime.VirtualTourPlugin.withConfig({
      dataMode: 'server',
      getNode: (nodeId: string) => this.loadVirtualTourNode(nodeId),
      positionMode: 'manual',
      preload: true,
      renderMode: '3d',
      arrowStyle: { size: { width: 40, height: 40 } },
      transitionOptions: {
        effect: 'fade',
        rotation: true,
        showLoader: true,
      },
    });
    const viewer = new runtime.Viewer({
      adapter: runtime.EquirectangularTilesAdapter,
      container,
      navbar: false,
      plugins: [virtualTourConfig, runtime.MarkersPlugin],
    });

    this.viewer = viewer;
    this.virtualTour = viewer.getPlugin<PhotoSphereVirtualTourPlugin>('virtual-tour');
    const markerPlugin = viewer.getPlugin<Partial<PhotoSphereMarkersPlugin>>('markers');
    this.markers =
      markerPlugin && typeof markerPlugin.setMarkers === 'function'
        ? (markerPlugin as PhotoSphereMarkersPlugin)
        : null;
    this.virtualTour.addEventListener?.('node-changed', this.handleNodeChanged);
    this.markers?.addEventListener?.('select-marker', this.handleHotspotSelected);
    viewer.addEventListener('position-updated', this.handlePositionUpdated);
    viewer.addEventListener('zoom-updated', this.handleZoomUpdated);
    this.applyHotspots();
  }

  private applyHotspots(): void {
    const markers = this.markers;
    if (!markers) {
      return;
    }

    const configs = this.hotspots.map(toHotspotMarker);
    this.hotspotElements.clear();
    for (const config of configs) {
      this.hotspotElements.set(config.id, config.element);
    }
    markers.setMarkers(configs);
  }

  private async loadVirtualTourNode(nodeId: string): Promise<PhotoSphereVirtualTourNode> {
    const cachedNode = this.virtualNodes.get(nodeId);
    if (cachedNode) {
      return cachedNode;
    }

    const node = this.tourNodes.get(nodeId);
    if (!node) {
      throw new Error(`PHOTO_SPHERE_VIEWER_NODE_NOT_REGISTERED:${nodeId}`);
    }

    const panorama = await this.loadPanoramaForNode(node);
    const virtualNode = toVirtualTourNode(node, panorama);
    this.virtualNodes.set(node.id, virtualNode);
    return virtualNode;
  }

  private async restoreCommittedNode(generation: number, loadGeneration: number): Promise<void> {
    if (
      generation !== this.mountGeneration ||
      loadGeneration !== this.loadGeneration ||
      !this.committedNodeId ||
      !this.virtualTour
    ) {
      return;
    }

    const committedNodeId = this.committedNodeId;
    this.suppressedNodeChangeLoads.add(loadGeneration);
    try {
      await this.virtualTour.setCurrentNode(committedNodeId, {
        effect: 'none',
        rotation: false,
        showLoader: false,
      });
    } catch {
      // Preserve the original scene-load failure even if recovery also fails.
    } finally {
      this.suppressedNodeChangeLoads.delete(loadGeneration);
    }
  }

  private async loadPanoramaForNode(node: PanoramaNode): Promise<unknown> {
    const cachedPanorama = this.panoramaCache.get(node.id);
    if (cachedPanorama !== undefined) {
      return cachedPanorama;
    }

    const loadedPanorama = await (this.options.loadPanorama ?? loadPanoramaManifest)(node);
    const panorama = hydratePanoramaManifest(loadedPanorama, requirePanoramaUrl(node));
    this.panoramaCache.set(node.id, panorama);
    return panorama;
  }

  private emitView(): void {
    const view = this.readView();
    if (!view) {
      return;
    }

    for (const listener of this.viewListeners) {
      listener(view);
    }
  }

  private readView(): PanoramaView | null {
    if (!this.viewer) {
      return null;
    }

    const position = this.viewer.getPosition();
    return {
      fov: zoomToFov(this.viewer.getZoomLevel()),
      heading: normalizeHeading(radiansToDegrees(position.yaw)),
      pitch: clamp(radiansToDegrees(position.pitch), -90, 90),
    };
  }

  private emitNodeChanged(event: unknown): void {
    if (this.suppressedNodeChangeLoads.size > 0 || typeof event !== 'object' || event === null) {
      return;
    }

    const node = 'node' in event ? event.node : null;
    const nodeId =
      typeof node === 'object' && node !== null && 'id' in node && typeof node.id === 'string'
        ? node.id
        : null;
    if (!nodeId) {
      return;
    }

    const view = this.readView();
    if (!view) {
      return;
    }

    for (const listener of this.nodeListeners) {
      listener(nodeId, view);
    }
  }

  private emitHotspotSelected(event: unknown): void {
    if (typeof event !== 'object' || event === null) {
      return;
    }

    const marker = 'marker' in event ? event.marker : null;
    const hotspotId =
      typeof marker === 'object' &&
      marker !== null &&
      'id' in marker &&
      typeof marker.id === 'string'
        ? marker.id
        : null;
    if (!hotspotId || !this.hotspots.some((hotspot) => hotspot.id === hotspotId)) {
      return;
    }

    this.hotspotElements.get(hotspotId)?.focus({ preventScroll: true });
    for (const listener of this.hotspotListeners) {
      listener(hotspotId);
    }
  }

  private destroyViewer(): void {
    if (this.viewer) {
      this.virtualTour?.removeEventListener?.('node-changed', this.handleNodeChanged);
      this.markers?.removeEventListener?.('select-marker', this.handleHotspotSelected);
      this.viewer.removeEventListener('position-updated', this.handlePositionUpdated);
      this.viewer.removeEventListener('zoom-updated', this.handleZoomUpdated);
      this.viewer.destroy();
    }

    this.viewer = null;
    this.virtualTour = null;
    this.markers = null;
    this.hotspotElements.clear();
  }

  private async getRuntime(): Promise<PhotoSphereViewerRuntime> {
    if (this.runtime) {
      return this.runtime;
    }

    if (!this.runtimePromise) {
      this.runtimePromise = this.options.loadRuntime
        ? this.options.loadRuntime()
        : loadPhotoSphereViewerRuntime();
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

export function createPhotoSphereViewerEngine(
  options: PhotoSphereViewerAdapterOptions = {},
): PanoramaEnginePort {
  return new PhotoSphereViewerEngine(options);
}
