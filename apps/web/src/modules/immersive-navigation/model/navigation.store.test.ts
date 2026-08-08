import { beforeEach, describe, expect, it } from 'vitest';

import { selectMap3d, selectMinimap, selectPanorama } from './navigation.selectors';
import { useImmersiveNavigation } from './navigation.store';

describe('immersive navigation state machine', () => {
  beforeEach(() => {
    useImmersiveNavigation.getState().reset();
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
    navigation.navigateToScene('scene-b');
    navigation.navigateToScene('scene-a');

    const state = useImmersiveNavigation.getState();

    expect(state).toMatchObject({
      mode: 'panorama',
      activeRenderer: 'panorama',
      transition: 'navigating-scene',
      sceneId: 'scene-a',
      map3dStatus: 'idle',
      panoramaStatus: 'loading',
    });
    expect(state.visitedSceneIds).toEqual(['scene-a', 'scene-b']);
    expect(selectPanorama(state)).toEqual({
      active: true,
      sceneId: 'scene-a',
      status: 'loading',
      transition: 'navigating-scene',
      view: { heading: 0, pitch: 0, fov: 90 },
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

  it('restores the previous panorama when a next scene fails to load', () => {
    const navigation = useImmersiveNavigation.getState();

    navigation.enterOverview('destination-1');
    navigation.enterPanorama('scene-a');
    navigation.updateView({ heading: 42, pitch: -4, fov: 82 });
    navigation.navigateToScene('scene-b');
    navigation.restoreScene('scene-a', { heading: 42, pitch: -4, fov: 82 });

    expect(useImmersiveNavigation.getState()).toMatchObject({
      sceneId: 'scene-a',
      transition: 'idle',
      view: { heading: 42, pitch: -4, fov: 82 },
    });
  });

  it('normalizes heading and clamps pitch and field of view', () => {
    const navigation = useImmersiveNavigation.getState();

    navigation.updateView({ heading: -15, pitch: 120, fov: 10 });

    expect(useImmersiveNavigation.getState().view).toEqual({
      heading: 345,
      pitch: 90,
      fov: 30,
    });

    navigation.updateView({ heading: 725, pitch: -120, fov: 150 });

    expect(useImmersiveNavigation.getState().view).toEqual({
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
