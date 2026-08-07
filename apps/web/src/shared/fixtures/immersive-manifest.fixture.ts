import type {
  DestinationPreviewVm,
  HotspotVm,
  ImmersiveViewVm,
  PanoramaNode,
  SceneLinkVm,
  SceneNodeVm,
} from '../contracts';

import { destinationFixture } from './destination.fixture';
import { hotspotsFixture } from './hotspots.fixture';

export interface ImmersiveFixtureScenario {
  name: string;
  view: ImmersiveViewVm;
  viewport: 'desktop' | 'mobile';
}

export const sceneNodesFixture: SceneNodeVm[] = Array.from({ length: 12 }, (_, index) => {
  const sceneNumber = String(index + 1).padStart(2, '0');

  return {
    id: `scene-${sceneNumber}`,
    name: `Lối đi di sản ${index + 1}`,
    lat: 18.342 + index * 0.00032,
    lng: 105.9 + index * 0.00028,
    heading: (index * 31) % 360,
    isVisited: index === 0,
    isCurrent: index === 0,
  };
});

export const sceneLinksFixture: SceneLinkVm[] = sceneNodesFixture
  .slice(0, -1)
  .map((scene, index) => {
    const nextScene = sceneNodesFixture[index + 1];
    if (!nextScene) {
      throw new Error('Fixture route must remain connected.');
    }

    return {
      id: `link-${scene.id}-${nextScene.id}`,
      targetSceneId: nextScene.id,
      label: index % 2 === 0 ? 'Đi tiếp' : null,
      yaw: (scene.heading + 22) % 360,
      pitch: -1,
    };
  });

export const panoramaNodesFixture: PanoramaNode[] = sceneNodesFixture.map((scene) => ({
  id: scene.id,
  panoramaUrl: `https://cdn.example.vn/hatinh/son-trang/${scene.id}/manifest.json`,
  previewUrl: `https://cdn.example.vn/hatinh/son-trang/${scene.id}/preview.webp`,
  lat: scene.lat,
  lng: scene.lng,
  initialView: { heading: scene.heading, pitch: -2, fov: 88 },
}));

const baseView: ImmersiveViewVm = {
  mode: 'panorama',
  destination: destinationFixture,
  currentScene: sceneNodesFixture[0] ?? null,
  nodes: sceneNodesFixture,
  links: sceneLinksFixture,
  hotspots: hotspotsFixture,
  heading: 42,
  pitch: -2,
  fov: 88,
  rendererStatus: 'ready',
  networkQuality: 'good',
};

function createView(overrides: Partial<ImmersiveViewVm> = {}) {
  return { ...baseView, ...overrides } satisfies ImmersiveViewVm;
}

export const readyImmersiveViewFixture = createView();
export const threeDLoadingFixture = createView({
  mode: 'overview3d',
  currentScene: null,
  rendererStatus: 'loading',
});
export const threeDUnavailableFixture = createView({
  mode: 'overview3d',
  currentScene: null,
  rendererStatus: 'unavailable',
});
export const panoramaLoadingFixture = createView({ rendererStatus: 'loading' });
export const panoramaTileErrorFixture = createView({ rendererStatus: 'error' });
export const constrainedNetworkFixture = createView({ networkQuality: 'constrained' });
export const offlineCurrentSceneFixture = createView({ networkQuality: 'offline' });

const longNameDestination: DestinationPreviewVm = {
  ...destinationFixture,
  name: 'Khu di tích văn hóa tâm linh và sinh thái cộng đồng Sơn Trang Cổ Đạm Hà Tĩnh',
};

export const longVietnameseNameFixture = createView({ destination: longNameDestination });
export const mobileNarrowViewportFixture = createView();
export const noHotspotSelectedFixture = createView();

export const fixtureScenarios: ImmersiveFixtureScenario[] = [
  { name: 'ready-scene', view: readyImmersiveViewFixture, viewport: 'desktop' },
  { name: '3d-loading', view: threeDLoadingFixture, viewport: 'desktop' },
  { name: '3d-unavailable', view: threeDUnavailableFixture, viewport: 'desktop' },
  { name: 'panorama-loading', view: panoramaLoadingFixture, viewport: 'desktop' },
  { name: 'panorama-tile-error', view: panoramaTileErrorFixture, viewport: 'desktop' },
  { name: 'constrained-network', view: constrainedNetworkFixture, viewport: 'desktop' },
  { name: 'offline-current-scene', view: offlineCurrentSceneFixture, viewport: 'desktop' },
  { name: 'long-vietnamese-name', view: longVietnameseNameFixture, viewport: 'desktop' },
  { name: 'mobile-narrow-viewport', view: mobileNarrowViewportFixture, viewport: 'mobile' },
  { name: 'no-hotspot-selected', view: noHotspotSelectedFixture, viewport: 'desktop' },
];

export type { HotspotVm };
