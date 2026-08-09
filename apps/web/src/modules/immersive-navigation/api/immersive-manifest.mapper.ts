import type { GetImmersiveManifest200 } from '@hatinh/api-client';

import type {
  CameraTarget,
  DestinationPreviewVm,
  HotspotVm,
  PanoramaNode,
  SceneLinkVm,
  SceneNodeVm,
} from '../../../shared/contracts';

export interface ImmersiveManifestVm {
  destination: DestinationPreviewVm;
  defaultSceneId: string | null;
  overviewTarget: CameraTarget;
  nodes: SceneNodeVm[];
  panoramaNodes: PanoramaNode[];
  links: SceneLinkVm[];
  hotspots: HotspotVm[];
}

export function mapImmersiveManifest(dto: GetImmersiveManifest200): ImmersiveManifestVm {
  const orderedNodes = dto.nodes
    .filter((node) => node.status === 'published')
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const links = dto.links.flatMap(toSceneLinks);
  const nodes = orderedNodes.map(toSceneNode);
  const panoramaNodes = orderedNodes.flatMap((node) => {
    if (node.panoramaManifestUrl === null) {
      return [];
    }

    return [toPanoramaNode(node, links)];
  });

  return {
    destination: toDestination(dto),
    defaultSceneId: dto.defaultSceneId,
    overviewTarget: toOverviewTarget(dto, orderedNodes),
    nodes,
    panoramaNodes,
    links,
    hotspots: dto.hotspots.filter((hotspot) => hotspot.status === 'published').map(toHotspot),
  };
}

export function getSceneLinks(links: SceneLinkVm[], sceneId: string | null): SceneLinkVm[] {
  if (!sceneId) {
    return [];
  }

  return links.filter((link) => link.sourceSceneId === sceneId);
}

function toDestination(dto: GetImmersiveManifest200): DestinationPreviewVm {
  return {
    id: dto.destination.id,
    slug: dto.destination.slug,
    name: dto.destination.name || dto.destination.slug,
    summary: dto.destination.summary || dto.destination.description,
    coverImageUrl: dto.destination.coverImageUrl,
    categoryLabel: dto.destination.categoryLabel,
  };
}

function toSceneNode(node: GetImmersiveManifest200['nodes'][number]): SceneNodeVm {
  return {
    id: node.id,
    name: node.name,
    lat: node.lat,
    lng: node.lng,
    heading: node.initialHeading,
    isVisited: false,
    isCurrent: false,
  };
}

function toPanoramaNode(
  node: GetImmersiveManifest200['nodes'][number],
  links: SceneLinkVm[],
): PanoramaNode {
  if (node.panoramaManifestUrl === null) {
    throw new Error(`PANORAMA_MANIFEST_URL_REQUIRED:${node.id}`);
  }

  return {
    id: node.id,
    name: node.name,
    panoramaUrl: node.panoramaManifestUrl,
    previewUrl: node.panoramaPreviewUrl ?? derivePreviewUrl(node.panoramaManifestUrl),
    lat: node.lat,
    lng: node.lng,
    initialView: {
      heading: node.initialHeading,
      pitch: node.initialPitch,
      fov: node.initialFov,
    },
    links: getSceneLinks(links, node.id).map((link) => ({
      targetNodeId: link.targetSceneId,
      yaw: link.yaw,
      pitch: link.pitch,
    })),
  };
}

function toSceneLinks(link: GetImmersiveManifest200['links'][number]): SceneLinkVm[] {
  const forward: SceneLinkVm = {
    id: link.id,
    sourceSceneId: link.fromSceneId,
    targetSceneId: link.toSceneId,
    label: 'Đi tiếp',
    yaw: link.yaw,
    pitch: link.pitch,
  };

  if (!link.bidirectional) {
    return [forward];
  }

  return [
    forward,
    {
      id: `${link.id}:reverse`,
      sourceSceneId: link.toSceneId,
      targetSceneId: link.fromSceneId,
      label: 'Quay lại',
      yaw: normalizeHeading(link.yaw + 180),
      pitch: link.pitch,
    },
  ];
}

function toHotspot(hotspot: GetImmersiveManifest200['hotspots'][number]): HotspotVm {
  const title = hotspot.payload.title;
  const label = hotspot.payload.label;
  const content = firstString(
    hotspot.payload.content,
    hotspot.payload.text,
    hotspot.payload.description,
  );
  const mediaUrl = safeMediaUrl(
    firstString(hotspot.payload.mediaUrl, hotspot.payload.audioUrl, hotspot.payload.url),
  );

  return {
    id: hotspot.id,
    sceneId: hotspot.sceneId,
    type: hotspot.type,
    yaw: hotspot.yaw,
    pitch: hotspot.pitch,
    label: typeof title === 'string' ? title : typeof label === 'string' ? label : null,
    content,
    mediaUrl,
  };
}

function firstString(...values: unknown[]): string | null {
  return (
    values.find((value): value is string => typeof value === 'string' && value.trim() !== '') ??
    null
  );
}

function safeMediaUrl(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function toOverviewTarget(
  dto: GetImmersiveManifest200,
  nodes: GetImmersiveManifest200['nodes'],
): CameraTarget {
  const firstNode = nodes[0];
  const latitude = dto.destination.geoPoint?.latitude ?? firstNode?.lat ?? 18.3421;
  const longitude = dto.destination.geoPoint?.longitude ?? firstNode?.lng ?? 105.9032;

  return {
    lat: latitude,
    lng: longitude,
    altitude: 120,
    heading: 0,
    tilt: 55,
    range: 900,
  };
}

function derivePreviewUrl(manifestUrl: string): string | null {
  try {
    return new URL('preview.webp', manifestUrl).toString();
  } catch {
    return null;
  }
}

function normalizeHeading(heading: number): number {
  const normalized = heading % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}
