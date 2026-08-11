import type { ExploreMapCameraTarget, ExploreMapViewportState } from '../model/explore-map.types';

export interface ExploreMapEnginePort {
  mount(container: HTMLElement): Promise<void>;
  setState(state: ExploreMapViewportState): void;
  flyTo(target: ExploreMapCameraTarget): Promise<void>;
  fitOverview(): Promise<void>;
  subscribeDestinationSelected(listener: (destinationId: string) => void): () => void;
  resize(): void;
  destroy(): void;
}
