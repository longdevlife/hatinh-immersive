import type { ImmersiveManifestVm } from '../api/immersive-manifest.mapper';
import {
  destinationFixture,
  hotspotsFixture,
  panoramaNodesFixture,
  sceneLinksFixture,
  sceneNodesFixture,
} from '../../../shared/fixtures';

export function createFakeImmersiveManifest(): ImmersiveManifestVm {
  const firstNode = sceneNodesFixture[0];

  return {
    destination: destinationFixture,
    defaultSceneId: firstNode?.id ?? null,
    overviewTarget: {
      lat: firstNode?.lat ?? 18.3421,
      lng: firstNode?.lng ?? 105.9032,
      altitude: 120,
      heading: 0,
      tilt: 55,
      range: 900,
    },
    nodes: sceneNodesFixture,
    panoramaNodes: panoramaNodesFixture,
    links: sceneLinksFixture.map((link, index) => {
      const sourceNode = sceneNodesFixture[index];
      return sourceNode ? { ...link, sourceSceneId: sourceNode.id } : link;
    }),
    hotspots: hotspotsFixture,
  };
}
