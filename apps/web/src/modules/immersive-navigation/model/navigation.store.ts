import { create } from 'zustand';

import { DEFAULT_NAVIGATION_VIEW, normalizeNavigationView } from './navigation.view';
import type {
  ImmersiveNavigationState,
  ImmersiveNavigationStore,
  NavigationView,
  RendererName,
} from './navigation.types';

export function createInitialNavigationState(): ImmersiveNavigationState {
  return {
    destinationId: null,
    mode: 'overview3d',
    activeRenderer: 'none',
    transition: 'idle',
    sceneId: null,
    selectedHotspotId: null,
    visitedSceneIds: [],
    view: { ...DEFAULT_NAVIGATION_VIEW },
    minimapOpen: true,
    map3dStatus: 'idle',
    panoramaStatus: 'idle',
    networkQuality: 'good',
    error: null,
  };
}

function withVisitedScene(visitedSceneIds: string[], sceneId: string): string[] {
  return visitedSceneIds.includes(sceneId) ? visitedSceneIds : [...visitedSceneIds, sceneId];
}

function resetView(): NavigationView {
  return { ...DEFAULT_NAVIGATION_VIEW };
}

export const useImmersiveNavigation = create<ImmersiveNavigationStore>((set) => ({
  ...createInitialNavigationState(),

  enterOverview: (destinationId) =>
    set((state) => ({
      ...createInitialNavigationState(),
      destinationId,
      minimapOpen: state.minimapOpen,
      networkQuality: state.networkQuality,
      activeRenderer: 'map3d',
      map3dStatus: 'loading',
    })),

  enterPanorama: (sceneId) =>
    set((state) => ({
      destinationId: state.destinationId,
      mode: 'panorama',
      activeRenderer: 'panorama',
      transition: 'entering-panorama',
      sceneId,
      selectedHotspotId: null,
      visitedSceneIds: withVisitedScene(state.visitedSceneIds, sceneId),
      view: resetView(),
      map3dStatus: 'idle',
      panoramaStatus: 'loading',
      error: null,
    })),

  updateView: (view) =>
    set((state) => ({
      view: normalizeNavigationView(state.view, view),
    })),

  navigateToScene: (sceneId) =>
    set((state) => {
      if (state.mode !== 'panorama') {
        return {
          error: 'PANORAMA_REQUIRED',
        };
      }

      return {
        activeRenderer: 'panorama' as const,
        transition: 'navigating-scene' as const,
        sceneId,
        selectedHotspotId: null,
        visitedSceneIds: withVisitedScene(state.visitedSceneIds, sceneId),
        view: resetView(),
        panoramaStatus: 'loading' as const,
        error: null,
      };
    }),

  selectHotspot: (hotspotId) =>
    set({
      selectedHotspotId: hotspotId,
    }),

  closeHotspot: () =>
    set({
      selectedHotspotId: null,
    }),

  toggleMinimap: () =>
    set((state) => ({
      minimapOpen: !state.minimapOpen,
    })),

  setRendererStatus: (renderer: RendererName, status) =>
    set((state) => {
      const isActiveRenderer =
        (renderer === 'map3d' && state.activeRenderer === 'map3d') ||
        (renderer === 'panorama' && state.activeRenderer === 'panorama');
      const rendererError = `${renderer.toUpperCase()}_RENDERER_ERROR`;
      const nextError =
        isActiveRenderer && status === 'error'
          ? rendererError
          : status === 'ready'
            ? null
            : state.error;

      return renderer === 'map3d'
        ? {
            map3dStatus: status,
            transition:
              isActiveRenderer && status === 'ready' ? ('idle' as const) : state.transition,
            error: nextError,
          }
        : {
            panoramaStatus: status,
            transition:
              isActiveRenderer && status === 'ready' ? ('idle' as const) : state.transition,
            error: nextError,
          };
    }),

  setNetworkQuality: (networkQuality) =>
    set({
      networkQuality,
    }),

  clearError: () =>
    set({
      error: null,
    }),

  reset: () =>
    set({
      ...createInitialNavigationState(),
    }),
}));
