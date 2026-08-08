import { beforeEach, describe, expect, it } from 'vitest';

import { selectMap3d, selectMinimap, selectPanorama } from './navigation.selectors';
import { useImmersiveNavigation } from './navigation.store';

describe('immersive navigation state machine', () => {
  beforeEach(() => {
    useImmersiveNavigation.getState().reset();
  });

  it('starts without a committed or requested panorama scene', () => {
    expect(useImmersiveNavigation.getState()).toMatchObject({
      committedSceneId: null,
      committedView: { heading: 0, pitch: 0, fov: 90 },
      requestedSceneId: null,
      transitionId: 0,
      visitedSceneIds: [],
    });
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

  it('transitions to panorama and tracks unique visited scenes', () => {
    const navigation = useImmersiveNavigation.getState();

    navigation.enterOverview('destination-1');
    navigation.enterPanorama('scene-a');
    navigation.setRendererStatus('panorama', 'ready');
    const transitionId = navigation.navigateToScene('scene-b');
    navigation.commitSceneTransition(transitionId, { heading: 15, pitch: -4, fov: 82 });

    const state = useImmersiveNavigation.getState();

    expect(state).toMatchObject({
      mode: 'panorama',
      activeRenderer: 'panorama',
      transition: 'idle',
      committedSceneId: 'scene-b',
      requestedSceneId: null,
      map3dStatus: 'idle',
      panoramaStatus: 'loading',
    });
    expect(state.visitedSceneIds).toEqual(['scene-a', 'scene-b']);
    expect(selectPanorama(state)).toEqual({
      active: true,
      sceneId: 'scene-b',
      status: 'loading',
      transition: 'idle',
      view: { heading: 15, pitch: -4, fov: 82 },
    });
  });

  it('keeps the committed scene and view unchanged while a new scene is requested', () => {
    const navigation = useImmersiveNavigation.getState();

    navigation.enterPanorama('scene-a');
    navigation.updateView({ heading: 42, pitch: -4, fov: 82 });
    const transitionId = navigation.navigateToScene('scene-b');

    expect(useImmersiveNavigation.getState()).toMatchObject({
      committedSceneId: 'scene-a',
      committedView: { heading: 42, pitch: -4, fov: 82 },
      requestedSceneId: 'scene-b',
      transitionId,
      transition: 'navigating-scene',
      visitedSceneIds: ['scene-a'],
    });
  });

  it('rejects scene navigation while outside panorama mode', () => {
    const navigation = useImmersiveNavigation.getState();

    navigation.enterOverview('destination-1');
    navigation.navigateToScene('scene-a');

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
    navigation.rollbackSceneTransition(transitionId);

    expect(useImmersiveNavigation.getState()).toMatchObject({
      committedSceneId: 'scene-a',
      requestedSceneId: null,
      transition: 'idle',
      committedView: { heading: 42, pitch: -4, fov: 82 },
      visitedSceneIds: ['scene-a'],
    });
  });

  it('does not let a stale scene resolution replace the committed scene', () => {
    const navigation = useImmersiveNavigation.getState();

    navigation.enterPanorama('scene-a');
    navigation.updateView({ heading: 42, pitch: -4, fov: 82 });
    const transitionToB = navigation.navigateToScene('scene-b');
    const transitionToC = navigation.navigateToScene('scene-c');
    navigation.commitSceneTransition(transitionToB, { heading: 120, pitch: 2, fov: 75 });
    navigation.rollbackSceneTransition(transitionToC);

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
      open: true,
      currentSceneId: 'scene-a',
      heading: 45,
      visitedSceneIds: ['scene-a'],
    });

    navigation.closeHotspot();
    navigation.toggleMinimap();
    state = useImmersiveNavigation.getState();

    expect(state.selectedHotspotId).toBeNull();
    expect(selectMinimap(state).open).toBe(false);
  });
});
