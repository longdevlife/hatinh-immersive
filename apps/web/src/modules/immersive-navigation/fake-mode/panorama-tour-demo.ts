import type {
  PanoramaMediaQuality,
  PanoramaNode,
  SceneLinkVm,
  SceneNodeVm,
} from '../../../shared/contracts';

import type { ImmersiveManifestVm } from '../api/immersive-manifest.mapper';

const TOUR_SCENES = [
  { id: 'son-trang-gate', name: 'Cổng Sơn Trang', lat: 18.3421, lng: 105.9032, heading: 32 },
  {
    id: 'son-trang-entrance-path',
    name: 'Lối vào Sơn Trang',
    lat: 18.34218,
    lng: 105.90328,
    heading: 58,
  },
  {
    id: 'son-trang-courtyard',
    name: 'Sân trung tâm',
    lat: 18.34225,
    lng: 105.9034,
    heading: 92,
  },
  {
    id: 'son-trang-culture',
    name: 'Không gian Văn hóa',
    lat: 18.34232,
    lng: 105.90348,
    heading: 118,
  },
  {
    id: 'son-trang-ecology-path',
    name: 'Lối sinh thái',
    lat: 18.34212,
    lng: 105.90362,
    heading: 166,
  },
  {
    id: 'son-trang-ecology',
    name: 'Không gian Sinh thái',
    lat: 18.34192,
    lng: 105.90372,
    heading: 214,
  },
  {
    id: 'son-trang-spiritual-path',
    name: 'Lối tâm linh',
    lat: 18.34218,
    lng: 105.9032,
    heading: 258,
  },
  {
    id: 'son-trang-spiritual',
    name: 'Không gian Tâm linh',
    lat: 18.34246,
    lng: 105.90296,
    heading: 302,
  },
] as const;

export const SON_TRANG_PANORAMA_TOUR_SCENE_IDS = TOUR_SCENES.map(({ id }) => id);

export type DemoPanoramaMediaMode = 'public' | 'synthetic';

export function createDemoPanoramaTourManifest(
  manifest: ImmersiveManifestVm,
  mediaMode: DemoPanoramaMediaMode = 'public',
): ImmersiveManifestVm {
  const mediaQuality: PanoramaMediaQuality = mediaMode === 'synthetic' ? 'ready' : 'low-resolution';
  const nodes: SceneNodeVm[] = TOUR_SCENES.map((scene, index) => ({
    id: scene.id,
    name: scene.name,
    lat: scene.lat,
    lng: scene.lng,
    heading: scene.heading,
    isVisited: index === 0,
    isCurrent: index === 0,
  }));
  const links: SceneLinkVm[] = [];

  for (let index = 0; index < nodes.length - 1; index += 1) {
    const source = nodes[index]!;
    const target = nodes[index + 1]!;
    links.push(
      {
        id: `${source.id}:${target.id}`,
        sourceSceneId: source.id,
        targetSceneId: target.id,
        label: `Đi tới ${target.name}`,
        yaw: target.heading,
        pitch: 0,
      },
      {
        id: `${target.id}:${source.id}`,
        sourceSceneId: target.id,
        targetSceneId: source.id,
        label: `Quay lại ${source.name}`,
        yaw: (source.heading + 180) % 360,
        pitch: 0,
      },
    );
  }

  const panoramaNodes: PanoramaNode[] = nodes.map((node) => ({
    id: node.id,
    name: node.name,
    panoramaUrl: `/demo/360/son-trang-tour/${node.id}/manifest.json`,
    previewUrl: `/demo/360/son-trang-tour/${node.id}/preview.webp`,
    mediaQuality,
    mediaRights: 'demo-only',
    lat: node.lat,
    lng: node.lng,
    initialView: { heading: node.heading, pitch: 0, fov: 88 },
    links: links
      .filter((link) => link.sourceSceneId === node.id)
      .map((link) => ({
        targetNodeId: link.targetSceneId,
        yaw: link.yaw,
        pitch: link.pitch,
      })),
  }));

  return {
    ...manifest,
    destination: {
      ...manifest.destination,
      defaultSceneId: 'son-trang-gate',
    },
    defaultSceneId: 'son-trang-gate',
    nodes,
    panoramaNodes,
    links,
    hotspots: [],
  };
}
