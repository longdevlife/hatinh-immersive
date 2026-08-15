import type {
  ExploreMapCameraTarget,
  ExploreMapStyle,
  ExploreMapViewportState,
} from '../model/explore-map.types';
import type { ExploreMapDiagnostics } from '../model/explore-map-diagnostics';

export interface ExploreMapEnginePort {
  mount(container: HTMLElement): Promise<void>;
  setState(state: ExploreMapViewportState): void;
  changeStyle(style: ExploreMapStyle): Promise<void>;
  flyTo(target: ExploreMapCameraTarget): Promise<void>;
  fitOverview(): Promise<void>;
  getDiagnostics?(): Promise<ExploreMapDiagnostics | null>;
  subscribeDestinationSelected(listener: (destinationId: string) => void): () => void;
  resize(): void;
  destroy(): void;
}
