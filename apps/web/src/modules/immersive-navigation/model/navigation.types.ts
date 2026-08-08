import type {
  ImmersiveMode,
  NetworkQuality,
  RendererStatus,
} from '../../../shared/contracts/immersive';

export type ActiveRenderer = 'none' | 'map3d' | 'panorama';

export type NavigationTransition = 'idle' | 'entering-panorama' | 'navigating-scene';

export type RendererName = 'map3d' | 'panorama';

export interface NavigationView {
  heading: number;
  pitch: number;
  fov: number;
}

export interface SceneTransitionState {
  committedSceneId: string | null;
  committedView: NavigationView;
  requestedSceneId: string | null;
  transitionId: number;
}

export interface ImmersiveNavigationState extends SceneTransitionState {
  destinationId: string | null;
  mode: ImmersiveMode;
  activeRenderer: ActiveRenderer;
  transition: NavigationTransition;
  /** @deprecated Read the committed scene through `committedSceneId`. */
  sceneId: string | null;
  selectedHotspotId: string | null;
  visitedSceneIds: string[];
  /** @deprecated Read the committed view through `committedView`. */
  view: NavigationView;
  minimapOpen: boolean;
  map3dStatus: RendererStatus;
  panoramaStatus: RendererStatus;
  networkQuality: NetworkQuality;
  error: string | null;
}

export interface ImmersiveNavigationActions {
  enterOverview(destinationId: string): void;
  enterPanorama(sceneId: string): void;
  updateView(view: Partial<NavigationView>): void;
  navigateToScene(sceneId: string): number;
  commitSceneTransition(transitionId: number, view: NavigationView): void;
  rollbackSceneTransition(transitionId: number): void;
  commitRendererScene(sceneId: string, view: NavigationView): void;
  selectHotspot(hotspotId: string): void;
  closeHotspot(): void;
  toggleMinimap(): void;
  setRendererStatus(renderer: RendererName, status: RendererStatus): void;
  setNetworkQuality(quality: NetworkQuality): void;
  clearError(): void;
  reset(): void;
}

export type ImmersiveNavigationStore = ImmersiveNavigationState & ImmersiveNavigationActions;
