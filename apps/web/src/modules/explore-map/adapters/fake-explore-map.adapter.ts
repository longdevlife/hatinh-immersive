import type { ExploreMapEnginePort } from '../domain/explore-map-engine.port';
import type { ExploreMapCameraTarget, ExploreMapViewportState } from '../model/explore-map.types';

const E2E_SELECT_EVENT = 'hatinh:e2e:explore-map-select';

export type FakeExploreMapCall =
  | { type: 'mount'; container: HTMLElement }
  | { type: 'setState'; state: ExploreMapViewportState }
  | { type: 'flyTo'; target: ExploreMapCameraTarget }
  | { type: 'fitOverview' }
  | { type: 'resize' }
  | { type: 'destroy' };

export class FakeExploreMapEngine implements ExploreMapEnginePort {
  readonly calls: FakeExploreMapCall[] = [];
  readonly listeners = new Set<(destinationId: string) => void>();
  state: ExploreMapViewportState = { destinations: [], selectedDestinationId: null };
  lastFlyToTarget: ExploreMapCameraTarget | null = null;
  container: HTMLElement | null = null;
  private e2eSelectionHandler: EventListener | null = null;

  async mount(container: HTMLElement): Promise<void> {
    this.container = container;
    this.calls.push({ container, type: 'mount' });

    if (
      import.meta.env.VITE_EXPLORE_MAP_E2E_HOOKS === 'true' &&
      typeof window !== 'undefined' &&
      this.e2eSelectionHandler === null
    ) {
      this.e2eSelectionHandler = (event) => {
        const destinationId = (event as CustomEvent<{ destinationId?: unknown }>).detail
          ?.destinationId;
        if (typeof destinationId === 'string') {
          this.emitDestinationSelected(destinationId);
        }
      };
      window.addEventListener(E2E_SELECT_EVENT, this.e2eSelectionHandler);
    }
  }

  setState(state: ExploreMapViewportState): void {
    this.state = {
      destinations: [...state.destinations],
      selectedDestinationId: state.selectedDestinationId,
    };
    this.calls.push({ state: this.state, type: 'setState' });
  }

  async flyTo(target: ExploreMapCameraTarget): Promise<void> {
    this.lastFlyToTarget = { ...target };
    this.calls.push({ target: this.lastFlyToTarget, type: 'flyTo' });
  }

  async fitOverview(): Promise<void> {
    this.calls.push({ type: 'fitOverview' });
  }

  subscribeDestinationSelected(listener: (destinationId: string) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emitDestinationSelected(destinationId: string): void {
    for (const listener of this.listeners) {
      listener(destinationId);
    }
  }

  resize(): void {
    this.calls.push({ type: 'resize' });
  }

  destroy(): void {
    if (typeof window !== 'undefined' && this.e2eSelectionHandler !== null) {
      window.removeEventListener(E2E_SELECT_EVENT, this.e2eSelectionHandler);
      this.e2eSelectionHandler = null;
    }
    this.container = null;
    this.listeners.clear();
    this.calls.push({ type: 'destroy' });
  }
}
