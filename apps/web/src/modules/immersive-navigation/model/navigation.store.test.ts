import { beforeEach, describe, expect, it } from 'vitest';

import type { Map3DLocation } from '../../../shared/contracts';

import { selectMap3d, selectMinimap, selectPanorama } from './navigation.selectors';
import { useImmersiveNavigation } from './navigation.store';

describe('immersive navigation state machine', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    useImmersiveNavigation.getState().reset();
  });

  it('starts without a committed or requested panorama scene', () => {
    expect(useImmersiveNavigation.getState()).toMatchObject({
      committedSceneId: null,
      committedView: { heading: 0, pitch: 0, fov: 90 },
      requestedSceneId: null,
      requestedView: null,
      transitionId: 0,
      selectedLocationId: null,
      selectedLocationPreset: null,
      visitedSceneIds: [],
    });
  });

  it('starts immersive panorama with the minimap collapsed', () => {
    expect(useImmersiveNavigation.getState().minimapOpen).toBe(false);
  });

  it('hydrates an expanded minimap preference from the browser session', () => {
    window.sessionStorage.setItem('hatinh:immersive:minimap:collapsed', 'expanded');
    useImmersiveNavigation.getState().reset();

    expect(useImmersiveNavigation.getState().minimapOpen).toBe(true);
  });

  it('enters the 3D overview with an exclusive map renderer', () => {
    useImmersiveNavigation.getState().enterOverview('destination-1');

    const state = useImmersiveNavigation.getState();

    expect(state).toMatchObject({
      destinationId: 'destination-1',
      mode: 'overview3d',
      activeRenderer: 'map3d',
      sceneId: null,
      selectedHotspotId: null,
      map3dStatus: 'loading',
      panoramaStatus: 'idle',
    });
    expect(selectMap3d(state)).toEqual({
      active: true,
      destinationId: 'destination-1',
      status: 'loading',
    });
    expect(selectPanorama(state).active).toBe(false);
  });

  it('selects another 3D location without resetting the ready map renderer', () => {
    const location: Map3DLocation = {
      id: 'destination-2',
      label: 'Điểm đến 2',
      position: { lat: 18.4, lng: 105.9, altitude: 0 },
      cameraPreset: {
        center: { lat: 18.4, lng: 105.9, altitude: 120 },
        heading: 31,
        tilt: 58,
        range: 900,
      },
    };
    const navigation = useImmersiveNavigation.getState();

    navigation.enterOverview('destination-1');
    navigation.setRendererStatus('map3d', 'ready');
    navigation.selectLocation(location);

    expect(useImmersiveNavigation.getState()).toMatchObject({
      destinationId: location.id,
      selectedLocationId: location.id,
      selectedLocationPreset: location.cameraPreset,
      mode: 'overview3d',
      activeRenderer: 'map3d',
      map3dStatus: 'ready',
      panoramaStatus: 'idle',
    });
  });

  it('transitions to panorama and tracks unique visited scenes', () => {
    const navigation = useImmersiveNavigation.getState();

    navigation.enterOverview('destination-1');
    navigation.enterPanorama('scene-a');
    navigation.setRendererStatus('panorama', 'ready');
    const transitionId = navigation.navigateToScene('scene-b');
    navigation.commitSceneTransition(transitionId!, { heading: 15, pitch: -4, fov: 82 });

    const state = useImmersiveNavigation.getState();

    expect(state).toMatchObject({
      mode: 'panorama',
      activeRenderer: 'panorama',
      transition: 'idle',
      committedSceneId: 'scene-b',
      requestedSceneId: null,
      map3dStatus: 'idle',
      panoramaStatus: 'ready',
    });
    expect(state.visitedSceneIds).toEqual(['scene-a', 'scene-b']);
    expect(selectPanorama(state)).toEqual({
      active: true,
      sceneId: 'scene-b',
      status: 'ready',
      transition: 'idle',
      view: { heading: 15, pitch: -4, fov: 82 },
    });
  });

  it('keeps an initial panorama entry requested until the renderer commits it', () => {
    const navigation = useImmersiveNavigation.getState();

    navigation.enterOverview('destination-1');
    const transitionId = navigation.requestPanoramaEntry('scene-a');

    expect(transitionId).toBe(1);
    expect(useImmersiveNavigation.getState()).toMatchObject({
      mode: 'panorama',
      activeRenderer: 'panorama',
      transition: 'entering-panorama',
      committedSceneId: null,
      requestedSceneId: 'scene-a',
      requestedView: { heading: 0, pitch: 0, fov: 90 },
      visitedSceneIds: [],
      panoramaStatus: 'loading',
    });
  });

  it('commits the requested initial view only with the renderer-confirmed scene', () => {
    const navigation = useImmersiveNavigation.getState();

    navigation.enterOverview('destination-1');
    const transitionId = navigation.requestPanoramaEntry('scene-a');
    navigation.updateView({ heading: 123, pitch: -7, fov: 82 });
    navigation.commitSceneTransition(transitionId!, { heading: 0, pitch: 0, fov: 90 });

    expect(useImmersiveNavigation.getState()).toMatchObject({
      committedSceneId: 'scene-a',
      committedView: { heading: 123, pitch: -7, fov: 82 },
      requestedSceneId: null,
      requestedView: null,
    });
  });

  it('rolls back a failed initial panorama entry without inventing a committed scene', () => {
    const navigation = useImmersiveNavigation.getState();

    navigation.enterOverview('destination-1');
    const transitionId = navigation.requestPanoramaEntry('scene-a');
    navigation.rollbackSceneTransition(transitionId!);

    expect(useImmersiveNavigation.getState()).toMatchObject({
      mode: 'panorama',
      committedSceneId: null,
      requestedSceneId: null,
      visitedSceneIds: [],
      panoramaStatus: 'error',
      error: 'PANORAMA_SCENE_LOAD_FAILED',
    });
  });

  it('keeps an all-unavailable panorama entry recoverable without a renderer', () => {
    const navigation = useImmersiveNavigation.getState();

    navigation.enterOverview('destination-1');
    navigation.markPanoramaUnavailable();

    expect(useImmersiveNavigation.getState()).toMatchObject({
      mode: 'panorama',
      activeRenderer: 'none',
      committedSceneId: null,
      requestedSceneId: null,
      panoramaStatus: 'unavailable',
      error: 'PANORAMA_UNAVAILABLE',
    });
  });

  it('keeps the committed scene and view unchanged while a new scene is requested', () => {
    const navigation = useImmersiveNavigation.getState();

    navigation.enterPanorama('scene-a');
    navigation.updateView({ heading: 42, pitch: -4, fov: 82 });
    const transitionId = navigation.navigateToScene('scene-b');
    navigation.updateView({ heading: 270 });

    expect(useImmersiveNavigation.getState()).toMatchObject({
      committedSceneId: 'scene-a',
      committedView: { heading: 42, pitch: -4, fov: 82 },
      requestedSceneId: 'scene-b',
      transitionId,
      transition: 'navigating-scene',
      visitedSceneIds: ['scene-a'],
    });
  });

  it('treats committed and duplicate pending scene selections as no-ops', () => {
    const navigation = useImmersiveNavigation.getState();

    navigation.enterPanorama('scene-a');
    navigation.setRendererStatus('panorama', 'ready');

    const committedState = useImmersiveNavigation.getState();
    const committedTransitionId = committedState.navigateToScene('scene-a');

    expect(committedTransitionId).toBeNull();
    expect(useImmersiveNavigation.getState()).toBe(committedState);

    const transitionToB = committedState.navigateToScene('scene-b');
    const pendingState = useImmersiveNavigation.getState();

    expect(transitionToB).toBe(1);
    expect(pendingState).toMatchObject({
      committedSceneId: 'scene-a',
      panoramaStatus: 'loading',
      requestedSceneId: 'scene-b',
      transitionId: transitionToB,
    });

    expect(pendingState.navigateToScene('scene-b')).toBeNull();
    expect(useImmersiveNavigation.getState()).toBe(pendingState);

    expect(pendingState.navigateToScene('scene-a')).toBeNull();
    expect(useImmersiveNavigation.getState()).toBe(pendingState);
  });

  it('rejects scene navigation while outside panorama mode', () => {
    const navigation = useImmersiveNavigation.getState();

    navigation.enterOverview('destination-1');
    expect(navigation.navigateToScene('scene-a')).toBeNull();

    expect(useImmersiveNavigation.getState()).toMatchObject({
      sceneId: null,
      error: 'PANORAMA_REQUIRED',
      transition: 'idle',
    });
  });

  it('rolls back only the matching scene request', () => {
    const navigation = useImmersiveNavigation.getState();

    navigation.enterOverview('destination-1');
    navigation.enterPanorama('scene-a');
    navigation.updateView({ heading: 42, pitch: -4, fov: 82 });
    const transitionId = navigation.navigateToScene('scene-b');
    navigation.setRendererStatus('panorama', 'error');
    navigation.rollbackSceneTransition(transitionId!);

    expect(useImmersiveNavigation.getState()).toMatchObject({
      committedSceneId: 'scene-a',
      requestedSceneId: null,
      transition: 'idle',
      committedView: { heading: 42, pitch: -4, fov: 82 },
      panoramaStatus: 'ready',
      error: null,
      visitedSceneIds: ['scene-a'],
    });
  });

  it('does not let a stale scene resolution replace the committed scene', () => {
    const navigation = useImmersiveNavigation.getState();

    navigation.enterPanorama('scene-a');
    navigation.updateView({ heading: 42, pitch: -4, fov: 82 });
    const transitionToB = navigation.navigateToScene('scene-b');
    const transitionToC = navigation.navigateToScene('scene-c');
    navigation.commitSceneTransition(transitionToB!, { heading: 120, pitch: 2, fov: 75 });
    navigation.rollbackSceneTransition(transitionToC!);

    expect(useImmersiveNavigation.getState()).toMatchObject({
      committedSceneId: 'scene-a',
      committedView: { heading: 42, pitch: -4, fov: 82 },
      requestedSceneId: null,
      visitedSceneIds: ['scene-a'],
    });
  });

  it('accepts renderer scene events only for the active request or without a request', () => {
    const navigation = useImmersiveNavigation.getState();

    navigation.enterPanorama('scene-a');
    navigation.navigateToScene('scene-b');
    navigation.commitRendererScene('scene-c', { heading: 12, pitch: 1, fov: 80 });

    expect(useImmersiveNavigation.getState()).toMatchObject({
      committedSceneId: 'scene-a',
      requestedSceneId: 'scene-b',
      visitedSceneIds: ['scene-a'],
    });

    navigation.commitRendererScene('scene-b', { heading: 12, pitch: 1, fov: 80 });

    expect(useImmersiveNavigation.getState()).toMatchObject({
      committedSceneId: 'scene-b',
      committedView: { heading: 12, pitch: 1, fov: 80 },
      requestedSceneId: null,
      visitedSceneIds: ['scene-a', 'scene-b'],
    });

    navigation.commitRendererScene('scene-c', { heading: 24, pitch: -2, fov: 78 });

    expect(useImmersiveNavigation.getState()).toMatchObject({
      committedSceneId: 'scene-c',
      committedView: { heading: 24, pitch: -2, fov: 78 },
      requestedSceneId: null,
      visitedSceneIds: ['scene-a', 'scene-b', 'scene-c'],
    });
  });

  it('ignores a stale renderer scene event while the initial scene is pending', () => {
    const navigation = useImmersiveNavigation.getState();

    navigation.enterOverview('destination-1');
    navigation.requestPanoramaEntry('scene-a');
    navigation.commitRendererScene('scene-b', { heading: 12, pitch: 1, fov: 80 });

    expect(useImmersiveNavigation.getState()).toMatchObject({
      committedSceneId: null,
      requestedSceneId: 'scene-a',
      panoramaStatus: 'loading',
      visitedSceneIds: [],
    });

    navigation.commitRendererScene('scene-a', { heading: 0, pitch: 0, fov: 90 });

    expect(useImmersiveNavigation.getState()).toMatchObject({
      committedSceneId: 'scene-a',
      requestedSceneId: null,
      panoramaStatus: 'ready',
      visitedSceneIds: ['scene-a'],
    });
  });

  it('ignores delayed panorama commits after returning to the 3D overview', () => {
    const navigation = useImmersiveNavigation.getState();
    const location: Map3DLocation = {
      id: 'destination-1',
      label: 'Điểm đến 1',
      position: { lat: 18.3421, lng: 105.9032, altitude: 0 },
      cameraPreset: {
        center: { lat: 18.3421, lng: 105.9032, altitude: 180 },
        heading: 32,
        tilt: 58,
        range: 1250,
      },
    };

    navigation.selectLocation(location);
    navigation.enterPanorama('scene-a');
    navigation.enterOverview(location.id, location);
    navigation.commitRendererScene('scene-b', { heading: 10, pitch: 1, fov: 80 });

    expect(useImmersiveNavigation.getState()).toMatchObject({
      mode: 'overview3d',
      selectedLocationId: 'destination-1',
      committedSceneId: null,
      visitedSceneIds: [],
    });
  });

  it('keeps the selected 3D location when entering and leaving panorama', () => {
    const navigation = useImmersiveNavigation.getState();
    const location: Map3DLocation = {
      id: 'destination-1',
      label: 'Điểm đến 1',
      position: { lat: 18.3421, lng: 105.9032, altitude: 0 },
      cameraPreset: {
        center: { lat: 18.3421, lng: 105.9032, altitude: 140 },
        heading: 32,
        tilt: 58,
        range: 900,
      },
    };

    navigation.selectLocation(location);
    navigation.enterPanorama('scene-a');

    expect(useImmersiveNavigation.getState()).toMatchObject({
      mode: 'panorama',
      selectedLocationId: location.id,
      selectedLocationPreset: location.cameraPreset,
    });

    navigation.enterOverview(location.id, location);

    expect(useImmersiveNavigation.getState()).toMatchObject({
      mode: 'overview3d',
      selectedLocationId: location.id,
      selectedLocationPreset: location.cameraPreset,
    });
  });

  it('normalizes heading and clamps pitch and field of view', () => {
    const navigation = useImmersiveNavigation.getState();

    navigation.updateView({ heading: -15, pitch: 120, fov: 10 });

    expect(useImmersiveNavigation.getState().committedView).toEqual({
      heading: 345,
      pitch: 90,
      fov: 30,
    });

    navigation.updateView({ heading: 725, pitch: -120, fov: 150 });

    expect(useImmersiveNavigation.getState().committedView).toEqual({
      heading: 5,
      pitch: -90,
      fov: 120,
    });
  });

  it('exposes minimap and hotspot session selectors', () => {
    const navigation = useImmersiveNavigation.getState();

    navigation.enterPanorama('scene-a');
    navigation.updateView({ heading: 45 });
    navigation.selectHotspot('hotspot-1');

    let state = useImmersiveNavigation.getState();

    expect(state.selectedHotspotId).toBe('hotspot-1');
    expect(selectMinimap(state)).toEqual({
      open: false,
      currentSceneId: 'scene-a',
      heading: 45,
      visitedSceneIds: ['scene-a'],
    });

    navigation.closeHotspot();
    navigation.toggleMinimap();
    state = useImmersiveNavigation.getState();

    expect(state.selectedHotspotId).toBeNull();
    expect(selectMinimap(state).open).toBe(true);
  });

  it('derives panorama and minimap selections from committed state', () => {
    const navigation = useImmersiveNavigation.getState();

    navigation.enterPanorama('scene-a');
    navigation.updateView({ heading: 45, pitch: -3, fov: 80 });
    useImmersiveNavigation.setState({
      sceneId: 'legacy-scene',
      view: { heading: 270, pitch: 12, fov: 110 },
    });

    const state = useImmersiveNavigation.getState();

    expect(selectPanorama(state)).toMatchObject({
      sceneId: 'scene-a',
      view: { heading: 45, pitch: -3, fov: 80 },
    });
    expect(selectMinimap(state)).toMatchObject({
      currentSceneId: 'scene-a',
      heading: 45,
    });
  });
});
