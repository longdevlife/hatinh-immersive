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
    committedSceneId: null,
    committedView: { ...DEFAULT_NAVIGATION_VIEW },
    requestedSceneId: null,
    transitionId: 0,
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

function withCommittedScene(sceneId: string | null, view: NavigationView) {
  return {
    committedSceneId: sceneId,
    committedView: view,
    sceneId,
    view,
  };
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
      ...withCommittedScene(sceneId, resetView()),
      requestedSceneId: null,
      selectedHotspotId: null,
      visitedSceneIds: withVisitedScene(state.visitedSceneIds, sceneId),
      map3dStatus: 'idle',
      panoramaStatus: 'loading',
      error: null,
    })),

  updateView: (view) =>
    set((state) =>
      state.requestedSceneId
        ? state
        : {
            ...withCommittedScene(
              state.committedSceneId,
              normalizeNavigationView(state.committedView, view),
            ),
          },
    ),

  navigateToScene: (sceneId) => {
    let transitionId = 0;

    set((state) => {
      transitionId = state.transitionId;

      if (state.mode !== 'panorama') {
        return {
          error: 'PANORAMA_REQUIRED',
        };
      }

      if (sceneId === state.committedSceneId || sceneId === state.requestedSceneId) {
        return state;
      }

      transitionId += 1;
      return {
        activeRenderer: 'panorama' as const,
        transition: 'navigating-scene' as const,
        requestedSceneId: sceneId,
        transitionId,
        selectedHotspotId: null,
        panoramaStatus: 'loading' as const,
        error: null,
      };
    });

    return transitionId;
  },

  commitSceneTransition: (transitionId, view) =>
    set((state) => {
      if (state.transitionId !== transitionId || !state.requestedSceneId) {
        return state;
      }

      const sceneId = state.requestedSceneId;
      const committedView = normalizeNavigationView(state.committedView, view);

      return {
        ...withCommittedScene(sceneId, committedView),
        requestedSceneId: null,
        transition: 'idle' as const,
        visitedSceneIds: withVisitedScene(state.visitedSceneIds, sceneId),
      };
    }),

  rollbackSceneTransition: (transitionId) =>
    set((state) =>
      state.transitionId === transitionId && state.requestedSceneId
        ? {
            requestedSceneId: null,
            transition: 'idle' as const,
          }
        : state,
    ),

  commitRendererScene: (sceneId, view) =>
    set((state) => {
      if (state.requestedSceneId && state.requestedSceneId !== sceneId) {
        return state;
      }

      const committedView = normalizeNavigationView(state.committedView, view);

      return {
        ...withCommittedScene(sceneId, committedView),
        requestedSceneId: null,
        transition: 'idle' as const,
        visitedSceneIds: withVisitedScene(state.visitedSceneIds, sceneId),
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
