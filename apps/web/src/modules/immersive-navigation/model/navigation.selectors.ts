import type { ImmersiveNavigationStore } from './navigation.types';

export interface Map3dSelection {
  active: boolean;
  destinationId: string | null;
  status: ImmersiveNavigationStore['map3dStatus'];
}

export interface PanoramaSelection {
  active: boolean;
  sceneId: string | null;
  status: ImmersiveNavigationStore['panoramaStatus'];
  transition: ImmersiveNavigationStore['transition'];
  view: ImmersiveNavigationStore['committedView'];
}

export interface MinimapSelection {
  open: boolean;
  currentSceneId: string | null;
  heading: number;
  visitedSceneIds: string[];
}

export const selectMap3d = (state: ImmersiveNavigationStore): Map3dSelection => ({
  active: state.activeRenderer === 'map3d',
  destinationId: state.destinationId,
  status: state.map3dStatus,
});

export const selectPanorama = (state: ImmersiveNavigationStore): PanoramaSelection => ({
  active: state.activeRenderer === 'panorama',
  sceneId: state.committedSceneId,
  status: state.panoramaStatus,
  transition: state.transition,
  view: state.committedView,
});

export const selectMinimap = (state: ImmersiveNavigationStore): MinimapSelection => ({
  open: state.minimapOpen,
  currentSceneId: state.committedSceneId,
  heading: state.committedView.heading,
  visitedSceneIds: state.visitedSceneIds,
});
