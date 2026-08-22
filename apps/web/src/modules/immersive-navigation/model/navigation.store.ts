import { create } from 'zustand';

import type { Map3DLocation } from '../../../shared/contracts/immersive';

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
    selectedLocationId: null,
    selectedLocationPreset: null,
    mode: 'overview3d',
    activeRenderer: 'none',
    transition: 'idle',
    committedSceneId: null,
    committedView: { ...DEFAULT_NAVIGATION_VIEW },
    requestedSceneId: null,
    requestedView: null,
    transitionId: 0,
    sceneId: null,
    selectedHotspotId: null,
    visitedSceneIds: [],
    view: { ...DEFAULT_NAVIGATION_VIEW },
    minimapOpen: false,
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

function withSelectedLocation(location: Map3DLocation, destinationId = location.id) {
  return {
    destinationId,
    selectedLocationId: location.id,
    selectedLocationPreset: {
      ...location.cameraPreset,
      center: { ...location.cameraPreset.center },
    },
  };
}

export const useImmersiveNavigation = create<ImmersiveNavigationStore>((set) => ({
  ...createInitialNavigationState(),

  enterOverview: (destinationId, location) =>
    set((state) => ({
      ...createInitialNavigationState(),
      ...(location ? withSelectedLocation(location) : { destinationId }),
      minimapOpen: state.minimapOpen,
      networkQuality: state.networkQuality,
      activeRenderer: 'map3d',
      map3dStatus: 'loading',
    })),

  selectLocation: (location, destinationId) =>
    set((state) =>
      state.mode === 'overview3d' && state.activeRenderer === 'map3d'
        ? {
            ...withSelectedLocation(location, destinationId),
            transition: 'idle' as const,
            selectedHotspotId: null,
            error: null,
          }
        : {
            ...createInitialNavigationState(),
            ...withSelectedLocation(location, destinationId),
            minimapOpen: state.minimapOpen,
            networkQuality: state.networkQuality,
            activeRenderer: 'map3d' as const,
            map3dStatus: 'loading' as const,
          },
    ),

  enterPanorama: (sceneId) =>
    set((state) => ({
      destinationId: state.destinationId,
      selectedLocationId: state.selectedLocationId,
      selectedLocationPreset: state.selectedLocationPreset,
      mode: 'panorama',
      activeRenderer: 'panorama',
      transition: 'entering-panorama',
      ...withCommittedScene(sceneId, resetView()),
      requestedSceneId: null,
      requestedView: null,
      selectedHotspotId: null,
      visitedSceneIds: withVisitedScene(state.visitedSceneIds, sceneId),
      map3dStatus: 'idle',
      panoramaStatus: 'loading',
      error: null,
    })),

  requestPanoramaEntry: (sceneId, view) => {
    let transitionId: number | null = null;

    set((state) => {
      if (
        state.mode === 'panorama' &&
        (state.requestedSceneId === sceneId || state.committedSceneId === sceneId)
      ) {
        return state;
      }

      transitionId = state.transitionId + 1;
      return {
        destinationId: state.destinationId,
        selectedLocationId: state.selectedLocationId,
        selectedLocationPreset: state.selectedLocationPreset,
        mode: 'panorama' as const,
        activeRenderer: 'panorama' as const,
        transition: 'entering-panorama' as const,
        requestedSceneId: sceneId,
        transitionId,
        requestedView: normalizeNavigationView(
          DEFAULT_NAVIGATION_VIEW,
          view ?? DEFAULT_NAVIGATION_VIEW,
        ),
        selectedHotspotId: null,
        map3dStatus: 'idle' as const,
        panoramaStatus: 'loading' as const,
        error: null,
      };
    });

    return transitionId;
  },

  updateView: (view) =>
    set((state) =>
      state.requestedSceneId
        ? state.requestedView
          ? {
              requestedView: normalizeNavigationView(
                state.requestedView ?? state.committedView,
                view,
              ),
            }
          : state
        : {
            ...withCommittedScene(
              state.committedSceneId,
              normalizeNavigationView(state.committedView, view),
            ),
          },
    ),

  navigateToScene: (sceneId) => {
    let transitionId: number | null = null;

    set((state) => {
      if (state.mode !== 'panorama') {
        return {
          error: 'PANORAMA_REQUIRED',
        };
      }

      if (sceneId === state.committedSceneId || sceneId === state.requestedSceneId) {
        return state;
      }

      transitionId = state.transitionId + 1;
      return {
        activeRenderer: 'panorama' as const,
        transition: 'navigating-scene' as const,
        requestedSceneId: sceneId,
        requestedView: null,
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
      if (
        state.mode !== 'panorama' ||
        state.transitionId !== transitionId ||
        !state.requestedSceneId
      ) {
        return state;
      }

      const sceneId = state.requestedSceneId;
      const committedView =
        state.requestedView ?? normalizeNavigationView(state.committedView, view);

      return {
        ...withCommittedScene(sceneId, committedView),
        requestedSceneId: null,
        requestedView: null,
        transition: 'idle' as const,
        panoramaStatus: 'ready' as const,
        error: null,
        visitedSceneIds: withVisitedScene(state.visitedSceneIds, sceneId),
      };
    }),

  rollbackSceneTransition: (transitionId) =>
    set((state) =>
      state.mode === 'panorama' && state.transitionId === transitionId && state.requestedSceneId
        ? {
            requestedSceneId: null,
            requestedView: null,
            transition: 'idle' as const,
            panoramaStatus: state.committedSceneId ? ('ready' as const) : ('error' as const),
            error: state.committedSceneId ? null : 'PANORAMA_SCENE_LOAD_FAILED',
          }
        : state,
    ),

  commitRendererScene: (sceneId, view) =>
    set((state) => {
      if (state.mode !== 'panorama') {
        return state;
      }

      if (state.requestedSceneId && state.requestedSceneId !== sceneId) {
        return state;
      }

      const committedView = normalizeNavigationView(state.committedView, view);

      return {
        ...withCommittedScene(sceneId, committedView),
        requestedSceneId: null,
        requestedView: null,
        transition: 'idle' as const,
        panoramaStatus: 'ready' as const,
        error: null,
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

  markPanoramaUnavailable: () =>
    set((state) => ({
      ...state,
      mode: 'panorama' as const,
      activeRenderer: 'none' as const,
      transition: 'idle' as const,
      committedSceneId: null,
      committedView: { ...DEFAULT_NAVIGATION_VIEW },
      requestedSceneId: null,
      requestedView: null,
      sceneId: null,
      view: { ...DEFAULT_NAVIGATION_VIEW },
      panoramaStatus: 'unavailable' as const,
      error: 'PANORAMA_UNAVAILABLE',
    })),

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
