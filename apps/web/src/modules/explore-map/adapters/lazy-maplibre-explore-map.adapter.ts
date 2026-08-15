import type { ExploreMapEnginePort } from '../domain/explore-map-engine.port';
import type {
  ExploreMapCameraTarget,
  ExploreMapStyle,
  ExploreMapViewportState,
} from '../model/explore-map.types';
import type { ExploreMapDiagnostics } from '../model/explore-map-diagnostics';

type PendingCameraCommand =
  { type: 'flyTo'; target: ExploreMapCameraTarget } | { type: 'fitOverview' };

import type { ExploreMapOptions } from './maplibre-explore-map.adapter';

function cloneState(state: ExploreMapViewportState): ExploreMapViewportState {
  return {
    destinations: [...state.destinations],
    selectedDestinationId: state.selectedDestinationId,
    ...(state.userLocation ? { userLocation: { ...state.userLocation } } : {}),
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
  private pendingCameraCommand: PendingCameraCommand | null = null;
  private pendingStyle: ExploreMapStyle | null = null;
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

    const engine = new MapLibreExploreMapEngine({
      ...this.options,
      ...(this.pendingStyle ? { style: this.pendingStyle } : {}),
    });
    this.engine = engine;
    engine.setState(this.state);
    this.engineSubscription = engine.subscribeDestinationSelected((destinationId) => {
      for (const listener of this.destinationListeners) {
        listener(destinationId);
      }
    });

    try {
      await engine.mount(container);
    } catch (error) {
      if (generation !== this.lifecycleGeneration || this.engine !== engine) {
        engine.destroy();
        return;
      }

      throw error;
    }

    if (generation !== this.lifecycleGeneration || this.engine !== engine) {
      engine.destroy();
      return;
    }

    const pendingCameraCommand = this.pendingCameraCommand;
    if (!pendingCameraCommand) {
      return;
    }

    if (pendingCameraCommand.type === 'flyTo') {
      await engine.flyTo(pendingCameraCommand.target);
    } else {
      await engine.fitOverview();
    }

    if (generation !== this.lifecycleGeneration || this.engine !== engine) {
      engine.destroy();
      return;
    }

    if (this.pendingCameraCommand === pendingCameraCommand) {
      this.pendingCameraCommand = null;
    }
  }

  setState(state: ExploreMapViewportState): void {
    this.state = cloneState(state);
    this.engine?.setState(this.state);
  }

  changeStyle(style: ExploreMapStyle): Promise<void> {
    if (!this.engine) {
      this.pendingStyle = style;
      return Promise.resolve();
    }

    return this.engine.changeStyle(style).then(() => {
      this.pendingStyle = style;
    });
  }

  flyTo(target: ExploreMapCameraTarget): Promise<void> {
    const pendingCameraCommand: PendingCameraCommand = { target: { ...target }, type: 'flyTo' };
    this.pendingCameraCommand = pendingCameraCommand;
    if (this.engine) {
      return this.engine.flyTo(pendingCameraCommand.target);
    }

    return Promise.resolve();
  }

  fitOverview(): Promise<void> {
    const pendingCameraCommand: PendingCameraCommand = { type: 'fitOverview' };
    this.pendingCameraCommand = pendingCameraCommand;
    if (this.engine) {
      return this.engine.fitOverview();
    }

    return Promise.resolve();
  }

  getDiagnostics(): Promise<ExploreMapDiagnostics | null> {
    return this.engine?.getDiagnostics?.() ?? Promise.resolve(null);
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
    this.pendingCameraCommand = null;
  }
}
