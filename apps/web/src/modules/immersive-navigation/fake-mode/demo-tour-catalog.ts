import type {
  DestinationPreviewVm,
  ImmersiveAudioTrack,
  PanoramaMediaQuality,
  PanoramaMediaRights,
  SceneLinkVm,
  SceneNodeVm,
} from '../../../shared/contracts';
import type {
  DestinationTour,
  DestinationTourHotspot,
  DestinationTourScene,
} from '../../panorama-tour';
import type { ImmersiveManifestVm } from '../api/immersive-manifest.mapper';

export type DemoTourBuildMode = 'public' | 'synthetic';

export interface DemoSceneDefinition {
  id: string;
  name: string;
  lat: number;
  lng: number;
  heading: number;
  role: 'major-stop' | 'connector';
  mediaPath?: string;
}

const SON_TRANG_SCENES: readonly DemoSceneDefinition[] = [
  {
    id: 'son-trang-gate',
    name: 'Cổng Sơn Trang',
    lat: 18.3421,
    lng: 105.9032,
    heading: 32,
    role: 'major-stop',
    mediaPath: 'son-trang-tour',
  },
  {
    id: 'son-trang-entrance-path',
    name: 'Lối vào Sơn Trang',
    lat: 18.34218,
    lng: 105.90328,
    heading: 58,
    role: 'connector',
    mediaPath: 'son-trang-tour',
  },
  {
    id: 'son-trang-courtyard',
    name: 'Sân trung tâm',
    lat: 18.34225,
    lng: 105.9034,
    heading: 92,
    role: 'connector',
    mediaPath: 'son-trang-tour',
  },
  {
    id: 'son-trang-culture',
    name: 'Không gian Văn hóa',
    lat: 18.34232,
    lng: 105.90348,
    heading: 118,
    role: 'major-stop',
    mediaPath: 'son-trang-tour',
  },
  {
    id: 'son-trang-ecology-path',
    name: 'Lối sinh thái',
    lat: 18.34212,
    lng: 105.90362,
    heading: 166,
    role: 'connector',
    mediaPath: 'son-trang-tour',
  },
  {
    id: 'son-trang-ecology',
    name: 'Không gian Sinh thái',
    lat: 18.34192,
    lng: 105.90372,
    heading: 214,
    role: 'major-stop',
    mediaPath: 'son-trang-tour',
  },
  {
    id: 'son-trang-spiritual-path',
    name: 'Lối tâm linh',
    lat: 18.34218,
    lng: 105.9032,
    heading: 258,
    role: 'connector',
    mediaPath: 'son-trang-tour',
  },
  {
    id: 'son-trang-spiritual',
    name: 'Không gian Tâm linh',
    lat: 18.34246,
    lng: 105.90296,
    heading: 302,
    role: 'major-stop',
    mediaPath: 'son-trang-tour',
  },
];

const THIEN_CAM_SCENES: readonly DemoSceneDefinition[] = [
  {
    id: 'thien-cam-boardwalk',
    name: 'Lối dạo Thiên Cầm',
    lat: 18.2771383,
    lng: 106.098072,
    heading: 82,
    role: 'major-stop',
    mediaPath: 'thien-cam',
  },
  {
    id: 'thien-cam-shore',
    name: 'Bờ biển Thiên Cầm',
    lat: 18.2771983,
    lng: 106.098122,
    heading: 118,
    role: 'major-stop',
    mediaPath: 'thien-cam',
  },
  {
    id: 'thien-cam-lookout',
    name: 'Điểm ngắm Thiên Cầm',
    lat: 18.2772583,
    lng: 106.098172,
    heading: 214,
    role: 'major-stop',
    mediaPath: 'thien-cam',
  },
];

const NGUYEN_DU_SCENES: readonly DemoSceneDefinition[] = [
  {
    id: 'nguyen-du-courtyard',
    name: 'Sân khu lưu niệm Nguyễn Du',
    lat: 18.6647657,
    lng: 105.7667208,
    heading: 118,
    role: 'major-stop',
    mediaPath: 'nguyen-du',
  },
  {
    id: 'nguyen-du-memorial-house',
    name: 'Không gian nhà lưu niệm',
    lat: 18.6648157,
    lng: 105.7667708,
    heading: 156,
    role: 'major-stop',
  },
  {
    id: 'nguyen-du-statue',
    name: 'Tượng Nguyễn Du',
    lat: 18.6648657,
    lng: 105.7668208,
    heading: 204,
    role: 'major-stop',
  },
  {
    id: 'nguyen-du-garden-path',
    name: 'Lối vườn tưởng niệm',
    lat: 18.6649157,
    lng: 105.7668708,
    heading: 248,
    role: 'connector',
  },
];

const DONG_LOC_SCENES: readonly DemoSceneDefinition[] = [
  {
    id: 'dong-loc-memorial',
    name: 'Khu tưởng niệm Đồng Lộc',
    lat: 18.4022035,
    lng: 105.7395203,
    heading: 205,
    role: 'major-stop',
    mediaPath: 'dong-loc',
  },
  {
    id: 'dong-loc-monument',
    name: 'Không gian tượng đài',
    lat: 18.4022535,
    lng: 105.7395703,
    heading: 244,
    role: 'major-stop',
  },
  {
    id: 'dong-loc-remembrance',
    name: 'Không gian tri ân',
    lat: 18.4023035,
    lng: 105.7396203,
    heading: 292,
    role: 'major-stop',
  },
  {
    id: 'dong-loc-approach',
    name: 'Lối vào khu tưởng niệm',
    lat: 18.4023535,
    lng: 105.7396703,
    heading: 336,
    role: 'connector',
  },
];

const SCENES_BY_SLUG: Readonly<Record<string, readonly DemoSceneDefinition[]>> = {
  'son-trang-co-dam': SON_TRANG_SCENES,
  'bien-thien-cam': THIEN_CAM_SCENES,
  'khu-luu-niem-nguyen-du': NGUYEN_DU_SCENES,
  'nga-ba-dong-loc': DONG_LOC_SCENES,
};

export function getDemoSceneDefinitions(slug: string): readonly DemoSceneDefinition[] {
  return SCENES_BY_SLUG[slug] ?? [];
}

export function buildDemoDestinationTour(
  destination: DestinationPreviewVm,
  mode: DemoTourBuildMode = 'public',
): DestinationTour {
  const definitions = getDemoSceneDefinitions(destination.slug);
  const scenes = definitions.map((definition) => toTourScene(destination.slug, definition, mode));
  const links = createSequentialLinks(scenes);
  const hotspots = createDemoHotspots(destination.slug, scenes);
  const audioTracks: readonly ImmersiveAudioTrack[] = [
    {
      id: `ambient:${destination.slug}`,
      type: 'ambient',
      label: 'Âm thanh không gian',
      src: null,
      rights: 'demo-only',
    },
    {
      id: `narration:${destination.slug}:intro`,
      type: 'narration',
      label: `Thuyết minh ${destination.name}`,
      src: null,
      rights: 'demo-only',
    },
  ];

  return {
    destinationSlug: destination.slug,
    title: destination.name,
    defaultSceneId: scenes[0]?.id ?? destination.defaultSceneId ?? '',
    mediaMode: mode === 'synthetic' ? 'synthetic' : 'demo-only',
    scenes,
    links,
    hotspots,
    audioTracks,
    ambientTrackId: `ambient:${destination.slug}`,
  };
}

export function buildDemoManifest(
  destination: DestinationPreviewVm,
  mode: DemoTourBuildMode = 'synthetic',
): ImmersiveManifestVm {
  const tour = buildDemoDestinationTour(destination, mode);
  const nodes: SceneNodeVm[] = tour.scenes.map((scene, index) => ({
    id: scene.id,
    name: scene.name,
    lat: scene.lat,
    lng: scene.lng,
    heading: scene.initialView.heading,
    isVisited: index === 0,
    isCurrent: index === 0,
  }));
  const links: SceneLinkVm[] = tour.links.flatMap((link) => [
    {
      id: link.id,
      sourceSceneId: link.sourceSceneId,
      targetSceneId: link.targetSceneId,
      label: `Đi tới ${tour.scenes.find((scene) => scene.id === link.targetSceneId)?.name ?? 'điểm tiếp theo'}`,
      yaw: link.yaw,
      pitch: link.pitch,
    },
  ]);
  const panoramaNodes = tour.scenes.flatMap((scene) => {
    const panoramaUrl = scene.panoramaUrl;
    if (!panoramaUrl) {
      return [];
    }
    return [
      {
        id: scene.id,
        name: scene.name,
        destinationSlug: destination.slug,
        ...(scene.thumbnailUrl !== undefined ? { thumbnailUrl: scene.thumbnailUrl } : {}),
        role: scene.role,
        panoramaUrl,
        previewUrl: scene.previewUrl,
        mediaQuality: scene.mediaQuality,
        mediaRights: scene.mediaRights,
        lat: scene.lat,
        lng: scene.lng,
        initialView: scene.initialView,
        ...(scene.narrationTrackId !== undefined
          ? { narrationTrackId: scene.narrationTrackId }
          : {}),
        ...(tour.ambientTrackId !== undefined ? { ambientTrackId: tour.ambientTrackId } : {}),
        links: tour.links
          .filter((link) => link.sourceSceneId === scene.id)
          .map((link) => ({ targetNodeId: link.targetSceneId, yaw: link.yaw, pitch: link.pitch })),
      },
    ];
  });

  return {
    destination: { ...destination, defaultSceneId: tour.defaultSceneId },
    defaultSceneId: tour.defaultSceneId,
    overviewTarget: {
      ...(destination.cameraPreset?.center ?? {
        lat: destination.geoPoint?.latitude ?? 18.3421,
        lng: destination.geoPoint?.longitude ?? 105.9032,
        altitude: 120,
      }),
      heading: destination.cameraPreset?.heading ?? 0,
      tilt: destination.cameraPreset?.tilt ?? 55,
      range: destination.cameraPreset?.range ?? 900,
    },
    nodes,
    panoramaNodes,
    links,
    hotspots: tour.hotspots.map((hotspot) => ({ ...hotspot })),
    audioTracks: [...tour.audioTracks],
    ...(tour.ambientTrackId !== undefined ? { ambientTrackId: tour.ambientTrackId } : {}),
  };
}

function toTourScene(
  destinationSlug: string,
  definition: DemoSceneDefinition,
  mode: DemoTourBuildMode,
): DestinationTourScene {
  const mediaPath = resolveMediaPath(destinationSlug, definition, mode);
  const isSynthetic = mode === 'synthetic';
  const mediaQuality: PanoramaMediaQuality = isSynthetic
    ? 'ready'
    : mediaPath
      ? 'low-resolution'
      : 'missing';
  const mediaRights: PanoramaMediaRights = 'demo-only';

  return {
    id: definition.id,
    destinationSlug,
    name: definition.name,
    role: definition.role,
    lat: definition.lat,
    lng: definition.lng,
    initialView: { heading: definition.heading, pitch: 0, fov: 88 },
    panoramaUrl: mediaPath,
    previewUrl: mediaPath ? mediaPath.replace('/manifest.json', '/preview.webp') : null,
    thumbnailUrl: mediaPath ? mediaPath.replace('/manifest.json', '/preview.webp') : null,
    mediaQuality,
    mediaRights,
    narrationTrackId: `narration:${destinationSlug}:intro`,
  };
}

function resolveMediaPath(
  destinationSlug: string,
  definition: DemoSceneDefinition,
  mode: DemoTourBuildMode,
): string | null {
  if (mode === 'synthetic') {
    return `/demo/test/360/${destinationSlug}/${definition.id}/manifest.json`;
  }
  if (!definition.mediaPath) {
    return null;
  }
  const directory =
    definition.mediaPath === 'son-trang-tour' ? `son-trang-tour/${definition.id}` : definition.id;
  return `/demo/360/${directory}/manifest.json`;
}

function createSequentialLinks(scenes: readonly DestinationTourScene[]) {
  return scenes.slice(0, -1).flatMap((source, index) => {
    const target = scenes[index + 1];
    if (!target) {
      return [];
    }
    return [
      {
        id: `${source.id}:${target.id}`,
        sourceSceneId: source.id,
        targetSceneId: target.id,
        yaw: target.initialView.heading,
        pitch: 0,
      },
      {
        id: `${target.id}:${source.id}`,
        sourceSceneId: target.id,
        targetSceneId: source.id,
        yaw: source.initialView.heading,
        pitch: 0,
      },
    ];
  });
}

function createDemoHotspots(
  destinationSlug: string,
  scenes: readonly DestinationTourScene[],
): readonly DestinationTourHotspot[] {
  const first = scenes[0];
  const second = scenes[1];
  if (!first) {
    return [];
  }
  const hotspots: DestinationTourHotspot[] = [
    {
      id: `${destinationSlug}:story`,
      sceneId: first.id,
      type: 'information',
      label: 'Điểm đáng chú ý',
      content: 'Một điểm dừng trong hành trình khám phá Hà Tĩnh.',
      yaw: first.initialView.heading,
      pitch: 0,
    },
  ];
  if (second) {
    hotspots.push({
      id: `${destinationSlug}:next`,
      sceneId: first.id,
      type: 'scene-navigation',
      targetSceneId: second.id,
      label: `Mở ${second.name}`,
      yaw: (first.initialView.heading + 24) % 360,
      pitch: 0,
    });
  }
  return hotspots;
}
