import type { ExploreMapEnginePort } from '../domain/explore-map-engine.port';
import type { ExploreMapCameraTarget, ExploreMapViewportState } from '../model/explore-map.types';

import type { ExploreMapOptions } from './maplibre-explore-map.adapter';

function cloneState(state: ExploreMapViewportState): ExploreMapViewportState {
  return {
    destinations: [...state.destinations],
    selectedDestinationId: state.selectedDestinationId,
  };
}

export class LazyMapLibreExploreMapEngine implements ExploreMapEnginePort {
  private readonly options: ExploreMapOptions;
  private engine: ExploreMapEnginePort | null = null;
  private engineSubscription: (() => void) | null = null;
  private readonly destinationListeners = new Set<(destinationId: string) => void>();
  private state: ExploreMapViewportState = {
    destinations: [],
    selectedDestinationId: null,
  };
  private pendingCameraTarget: ExploreMapCameraTarget | null = null;
  private lifecycleGeneration = 0;

  constructor(options: ExploreMapOptions) {
    this.options = options;
  }

  async mount(container: HTMLElement): Promise<void> {
    const generation = ++this.lifecycleGeneration;
    const { MapLibreExploreMapEngine } = await import('./maplibre-explore-map.adapter');

    if (generation !== this.lifecycleGeneration) {
      return;
    }

    const engine = new MapLibreExploreMapEngine(this.options);
    this.engine = engine;
    engine.setState(this.state);
    this.engineSubscription = engine.subscribeDestinationSelected((destinationId) => {
      for (const listener of this.destinationListeners) {
        listener(destinationId);
      }
    });

    await engine.mount(container);

    if (this.pendingCameraTarget) {
      await engine.flyTo(this.pendingCameraTarget);
      this.pendingCameraTarget = null;
    }
  }

  setState(state: ExploreMapViewportState): void {
    this.state = cloneState(state);
    this.engine?.setState(this.state);
  }

  flyTo(target: ExploreMapCameraTarget): Promise<void> {
    this.pendingCameraTarget = { ...target };
    if (this.engine) {
      return this.engine.flyTo(this.pendingCameraTarget);
    }

    return Promise.resolve();
  }

  subscribeDestinationSelected(listener: (destinationId: string) => void): () => void {
    this.destinationListeners.add(listener);
    return () => this.destinationListeners.delete(listener);
  }

  resize(): void {
    this.engine?.resize();
  }

  destroy(): void {
    ++this.lifecycleGeneration;
    this.engineSubscription?.();
    this.engineSubscription = null;
    this.engine?.destroy();
    this.engine = null;
    this.destinationListeners.clear();
    this.pendingCameraTarget = null;
  }
}
