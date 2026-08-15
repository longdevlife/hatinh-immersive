import type {
  ExploreMapCameraTarget,
  ExploreMapStyle,
  ExploreMapViewportState,
} from '../model/explore-map.types';
import type { ExploreMapDiagnosticsResult } from '../model/explore-map-diagnostics';

export interface ExploreMapEnginePort {
  mount(container: HTMLElement): Promise<void>;
  setState(state: ExploreMapViewportState): void;
  changeStyle(style: ExploreMapStyle): Promise<void>;
  flyTo(target: ExploreMapCameraTarget): Promise<void>;
  fitOverview(): Promise<void>;
  getDiagnostics?(): Promise<ExploreMapDiagnosticsResult>;
  subscribeDestinationSelected(listener: (destinationId: string) => void): () => void;
  resize(): void;
  destroy(): void;
}
