import {
  destinationFixture,
  fixtureScenarios,
  hotspotsFixture,
  panoramaNodesFixture,
  sceneLinksFixture,
  sceneNodesFixture,
} from './index';

describe('immersive fixtures', () => {
  it('contains a deterministic connected twelve-node route', () => {
    expect(destinationFixture.id).toBe('destination-son-trang-co-dam');
    expect(sceneNodesFixture).toHaveLength(12);
    expect(panoramaNodesFixture).toHaveLength(12);
    expect(sceneLinksFixture).toHaveLength(11);
    expect(new Set(sceneNodesFixture.map((scene) => scene.id)).size).toBe(12);
    expect(sceneLinksFixture[0]?.targetSceneId).toBe(sceneNodesFixture[1]?.id);
    expect(sceneLinksFixture.at(-1)?.targetSceneId).toBe(sceneNodesFixture.at(-1)?.id);
  });

  it('covers hotspot and renderer/network fallback scenarios', () => {
    expect(hotspotsFixture.length).toBeGreaterThanOrEqual(5);
    expect(fixtureScenarios).toHaveLength(10);
    expect(fixtureScenarios.map(({ name }) => name)).toEqual([
      'ready-scene',
      '3d-loading',
      '3d-unavailable',
      'panorama-loading',
      'panorama-tile-error',
      'constrained-network',
      'offline-current-scene',
      'long-vietnamese-name',
      'mobile-narrow-viewport',
      'no-hotspot-selected',
    ]);
  });
});
