import type { ExploreMapEnginePort } from '../domain/explore-map-engine.port';
import type { ExploreMapCameraTarget, ExploreMapViewportState } from '../model/explore-map.types';

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

  async mount(container: HTMLElement): Promise<void> {
    this.container = container;
    this.calls.push({ container, type: 'mount' });
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
    this.container = null;
    this.listeners.clear();
    this.calls.push({ type: 'destroy' });
  }
}
