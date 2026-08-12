import type {
  DestinationPreviewVm,
  PanoramaNode,
  SceneLinkVm,
  SceneNodeVm,
} from '../../../shared/contracts';
import { hotspotsFixture } from '../../../shared/fixtures';
import type { Map3DLocation } from '../../map3d';
import { getDemoDestinationMedia } from './demo-media';
import type { ImmersiveManifestVm } from '../api/immersive-manifest.mapper';

interface DemoSceneDefinition {
  id: string;
  name: string;
  lat: number;
  lng: number;
  heading: number;
}

interface DemoDestinationDefinition {
  location: Map3DLocation;
  preview: DestinationPreviewVm;
  scenes: readonly DemoSceneDefinition[];
}

function createDefinition({
  id,
  slug,
  name,
  summary,
  categoryLabel,
  position,
  cameraPreset,
  scenes,
}: {
  id: string;
  slug: string;
  name: string;
  summary: string;
  categoryLabel: string;
  position: Map3DLocation['position'];
  cameraPreset: Map3DLocation['cameraPreset'];
  scenes: readonly DemoSceneDefinition[];
}): DemoDestinationDefinition {
  const defaultSceneId = scenes[0]?.id ?? null;
  const location: Map3DLocation = { id, label: name, position, cameraPreset };
  const media = getDemoDestinationMedia(slug);

  return {
    location,
    preview: {
      id,
      slug,
      name,
      summary,
      coverImageUrl: media?.hero?.src ?? null,
      ...(media ? { media } : {}),
      categoryLabel,
      defaultSceneId,
      geoPoint: { latitude: position.lat, longitude: position.lng },
      cameraPreset,
    },
    scenes,
  };
}

export const DEMO_DESTINATIONS = [
  createDefinition({
    id: 'son-trang-co-dam',
    slug: 'son-trang-co-dam',
    name: 'Sơn Trang Cổ Đạm',
    summary: 'Một hành trình immersive qua văn hóa, thiên nhiên và những lớp ký ức địa phương.',
    categoryLabel: 'Di sản & văn hóa',
    position: { lat: 18.3421, lng: 105.9032 },
    cameraPreset: {
      center: { lat: 18.3421, lng: 105.9032, altitude: 420 },
      heading: 32,
      tilt: 48,
      range: 1_800,
    },
    scenes: [
      {
        id: 'son-trang-gate',
        name: 'Cổng Sơn Trang Cổ Đạm',
        lat: 18.3421,
        lng: 105.9032,
        heading: 32,
      },
    ],
  }),
  createDefinition({
    id: 'thien-cam-beach',
    slug: 'bien-thien-cam',
    name: 'Biển Thiên Cầm',
    summary: 'Dải bờ biển Hà Tĩnh với hành trình 360° từ lối dạo ra sát mép nước.',
    categoryLabel: 'Biển & thiên nhiên',
    position: { lat: 18.2771383, lng: 106.098072 },
    cameraPreset: {
      center: { lat: 18.2771383, lng: 106.098072, altitude: 180 },
      heading: 32,
      tilt: 58,
      range: 1_250,
    },
    scenes: [
      {
        id: 'thien-cam-boardwalk',
        name: 'Lối dạo Thiên Cầm',
        lat: 18.2771383,
        lng: 106.098072,
        heading: 82,
      },
      {
        id: 'thien-cam-shore',
        name: 'Bờ biển Thiên Cầm',
        lat: 18.2771983,
        lng: 106.098122,
        heading: 118,
      },
      {
        id: 'thien-cam-lookout',
        name: 'Điểm ngắm Thiên Cầm',
        lat: 18.2772583,
        lng: 106.098172,
        heading: 214,
      },
    ],
  }),
  createDefinition({
    id: 'nguyen-du-memorial',
    slug: 'khu-luu-niem-nguyen-du',
    name: 'Khu lưu niệm Nguyễn Du',
    summary: 'Không gian tưởng niệm Đại thi hào Nguyễn Du tại Nghi Xuân, Hà Tĩnh.',
    categoryLabel: 'Di sản & văn hóa',
    position: { lat: 18.6647657, lng: 105.7667208 },
    cameraPreset: {
      center: { lat: 18.6647657, lng: 105.7667208, altitude: 145 },
      heading: 118,
      tilt: 57,
      range: 900,
    },
    scenes: [
      {
        id: 'nguyen-du-courtyard',
        name: 'Sân khu lưu niệm Nguyễn Du',
        lat: 18.6647657,
        lng: 105.7667208,
        heading: 118,
      },
    ],
  }),
  createDefinition({
    id: 'dong-loc-junction',
    slug: 'nga-ba-dong-loc',
    name: 'Ngã ba Đồng Lộc',
    summary: 'Điểm đến lịch sử gắn với ký ức thanh niên xung phong tại Hà Tĩnh.',
    categoryLabel: 'Lịch sử',
    position: { lat: 18.4022035, lng: 105.7395203 },
    cameraPreset: {
      center: { lat: 18.4022035, lng: 105.7395203, altitude: 160 },
      heading: 205,
      tilt: 58,
      range: 1_050,
    },
    scenes: [
      {
        id: 'dong-loc-memorial',
        name: 'Khu tưởng niệm Đồng Lộc',
        lat: 18.4022035,
        lng: 105.7395203,
        heading: 205,
      },
    ],
  }),
] as const satisfies readonly DemoDestinationDefinition[];

const manifests = new Map(
  DEMO_DESTINATIONS.map((definition) => [definition.preview.slug, createManifest(definition)]),
);

export function getDemoManifest(slug: string): ImmersiveManifestVm {
  const manifest = manifests.get(slug);
  if (!manifest) {
    throw new Error(`DEMO_DESTINATION_NOT_FOUND:${slug}`);
  }
  return manifest;
}

function createManifest(definition: DemoDestinationDefinition): ImmersiveManifestVm {
  const nodes: SceneNodeVm[] = definition.scenes.map((scene, index) => ({
    id: scene.id,
    name: scene.name,
    lat: scene.lat,
    lng: scene.lng,
    heading: scene.heading,
    isVisited: index === 0,
    isCurrent: index === 0,
  }));
  const links: SceneLinkVm[] = nodes.slice(0, -1).flatMap((source, index) => {
    const target = nodes[index + 1];
    if (!target) {
      return [];
    }
    return [
      {
        id: `${source.id}:${target.id}`,
        sourceSceneId: source.id,
        targetSceneId: target.id,
        label: 'Đi tiếp',
        yaw: source.heading,
        pitch: 0,
      },
      {
        id: `${target.id}:${source.id}`,
        sourceSceneId: target.id,
        targetSceneId: source.id,
        label: 'Quay lại',
        yaw: (target.heading + 180) % 360,
        pitch: 0,
      },
    ];
  });
  const panoramaNodes: PanoramaNode[] = nodes.map((node) => ({
    id: node.id,
    name: node.name,
    panoramaUrl: `/demo/360/${node.id}/manifest.json`,
    previewUrl: `/demo/360/${node.id}/preview.webp`,
    lat: node.lat,
    lng: node.lng,
    initialView: { heading: node.heading, pitch: 0, fov: 88 },
    links: links
      .filter((link) => link.sourceSceneId === node.id)
      .map((link) => ({ targetNodeId: link.targetSceneId, yaw: link.yaw, pitch: link.pitch })),
  }));

  return {
    destination: definition.preview,
    defaultSceneId: definition.preview.defaultSceneId,
    overviewTarget: {
      ...definition.location.cameraPreset.center,
      heading: definition.location.cameraPreset.heading,
      tilt: definition.location.cameraPreset.tilt,
      range: definition.location.cameraPreset.range,
    },
    nodes,
    panoramaNodes,
    links,
    hotspots:
      definition.preview.slug === 'son-trang-co-dam' || definition.preview.slug === 'bien-thien-cam'
        ? hotspotsFixture
        : [],
  };
}
