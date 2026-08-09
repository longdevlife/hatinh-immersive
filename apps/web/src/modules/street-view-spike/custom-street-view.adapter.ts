import type { PanoramaEnginePort, PanoramaNode, PanoramaView } from '../panorama';

export interface CustomStreetViewSpikeOptions {
  resolvePanorama?: (node: PanoramaNode) => Promise<unknown>;
}

export class CustomStreetViewSpikeEngine implements PanoramaEnginePort {
  private readonly options: CustomStreetViewSpikeOptions;
  private readonly viewListeners = new Set<(view: PanoramaView) => void>();
  private readonly nodeListeners = new Set<(nodeId: string) => void>();
  private container: HTMLElement | null = null;
  private currentNodeId: string | null = null;
  private currentView: PanoramaView | null = null;

  constructor(options: CustomStreetViewSpikeOptions = {}) {
    this.options = options;
  }

  async mount(container: HTMLElement): Promise<void> {
    this.container = container;
  }

  async loadNode(node: PanoramaNode): Promise<void> {
    if (!this.container) {
      throw new Error('CUSTOM_STREET_VIEW_SPIKE_NOT_MOUNTED');
    }

    await (this.options.resolvePanorama?.(node) ?? Promise.resolve({ panoramaId: node.id }));
    this.currentNodeId = node.id;
    this.currentView = node.initialView;
    for (const listener of this.nodeListeners) {
      listener(node.id);
    }
  }

  setView(view: PanoramaView): void {
    this.currentView = view;
    for (const listener of this.viewListeners) {
      listener(view);
    }
  }

  subscribeViewChanged(listener: (view: PanoramaView) => void): () => void {
    this.viewListeners.add(listener);
    return () => this.viewListeners.delete(listener);
  }

  subscribeNodeChanged(listener: (nodeId: string) => void): () => void {
    this.nodeListeners.add(listener);
    return () => this.nodeListeners.delete(listener);
  }

  destroy(): void {
    this.container = null;
    this.currentNodeId = null;
    this.currentView = null;
    this.viewListeners.clear();
    this.nodeListeners.clear();
  }
}
