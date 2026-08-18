import type { GetImmersiveManifest200 } from '@hatinh/api-client';

import type {
  CameraTarget,
  DestinationPreviewVm,
  HotspotVm,
  ImmersiveAudioTrack,
  ImmersiveTranscriptContent,
  PanoramaNode,
  SceneLinkVm,
  SceneNodeVm,
} from '../../../shared/contracts';
import { toLocationCameraPreset } from '../../../shared/api/location-camera-preset';

export interface ImmersiveManifestVm {
  destination: DestinationPreviewVm;
  defaultSceneId: string | null;
  overviewTarget: CameraTarget;
  nodes: SceneNodeVm[];
  panoramaNodes: PanoramaNode[];
  links: SceneLinkVm[];
  hotspots: HotspotVm[];
  audioTracks: readonly ImmersiveAudioTrack[];
  ambientTrackId: string | null;
}

export function mapImmersiveManifest(dto: GetImmersiveManifest200): ImmersiveManifestVm {
  const orderedNodes = dto.nodes
    .filter((node) => node.status === 'published')
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const links = dto.links.flatMap(toSceneLinks);
  const nodes = orderedNodes.map(toSceneNode);
  const audioTracks = dto.audioTracks.map(toAudioTrack);
  const tracksById = new Map(audioTracks.map((track) => [track.id, track]));
  const transcriptsById = new Map(dto.transcripts.map((transcript) => [transcript.id, transcript]));
  const panoramaNodeIds = new Set(
    orderedNodes
      .filter((node) => node.panoramaManifestUrl !== null && node.panoramaAssetStatus === 'ready')
      .map((node) => node.id),
  );
  const panoramaLinks = links.filter(
    (link) =>
      Boolean(link.sourceSceneId) &&
      panoramaNodeIds.has(link.sourceSceneId!) &&
      panoramaNodeIds.has(link.targetSceneId),
  );
  const panoramaNodes = orderedNodes.flatMap((node) => {
    if (node.panoramaManifestUrl === null) {
      return [];
    }

    return [toPanoramaNode(node, panoramaLinks, tracksById, transcriptsById)];
  });

  return {
    destination: toDestination(dto),
    defaultSceneId: dto.defaultSceneId,
    overviewTarget: toOverviewTarget(dto, orderedNodes),
    nodes,
    panoramaNodes,
    links,
    hotspots: dto.hotspots.filter((hotspot) => hotspot.status === 'published').map(toHotspot),
    audioTracks,
    ambientTrackId: dto.ambientTrackId,
  };
}

export function getSceneLinks(links: SceneLinkVm[], sceneId: string | null): SceneLinkVm[] {
  if (!sceneId) {
    return [];
  }

  return links.filter((link) => link.sourceSceneId === sceneId);
}

function toDestination(dto: GetImmersiveManifest200): DestinationPreviewVm {
  const cameraPreset = toLocationCameraPreset(dto.destination.cameraPreset);

  return {
    id: dto.destination.id,
    slug: dto.destination.slug,
    name: dto.destination.name || dto.destination.slug,
    summary: dto.destination.summary || dto.destination.description,
    coverImageUrl: dto.destination.coverImageUrl,
    categoryLabel: dto.destination.categoryLabel,
    defaultSceneId: dto.destination.defaultSceneId,
    geoPoint: dto.destination.geoPoint,
    ...(cameraPreset ? { cameraPreset } : {}),
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
  tracksById: Map<string, ImmersiveAudioTrack>,
  transcriptsById: Map<string, GetImmersiveManifest200['transcripts'][number]>,
): PanoramaNode {
  if (node.panoramaManifestUrl === null) {
    throw new Error(`PANORAMA_MANIFEST_URL_REQUIRED:${node.id}`);
  }

  const narrationTrackIds = mapLocalizedIds(node.narrationTrackIds, tracksById, 'narration');
  const transcripts = mapLocalizedTranscripts(node.transcriptIds, transcriptsById);

  return {
    id: node.id,
    name: node.name,
    panoramaUrl: node.panoramaManifestUrl,
    previewUrl: node.panoramaPreviewUrl ?? derivePreviewUrl(node.panoramaManifestUrl),
    ...(resolveMediaQuality(node) ? { mediaQuality: resolveMediaQuality(node) } : {}),
    lat: node.lat,
    lng: node.lng,
    initialView: {
      heading: node.initialHeading,
      pitch: node.initialPitch,
      fov: node.initialFov,
    },
    ...(node.ambientOverrideTrackId ? { ambientTrackId: node.ambientOverrideTrackId } : {}),
    ...(Object.keys(narrationTrackIds).length > 0 ? { narrationTrackIds } : {}),
    ...(Object.keys(transcripts).length > 0 ? { transcripts } : {}),
    links: getSceneLinks(links, node.id).map((link) => ({
      targetNodeId: link.targetSceneId,
      yaw: link.yaw,
      pitch: link.pitch,
    })),
  };
}

function toAudioTrack(track: GetImmersiveManifest200['audioTracks'][number]): ImmersiveAudioTrack {
  return {
    id: track.id,
    type: track.type,
    label: track.label,
    src: track.src,
    rights: track.rights,
    locale: track.locale,
    durationMs: track.durationMs,
    voiceId: track.voiceId,
    version: track.version,
    publicationStatus: 'published',
    readiness: track.readiness,
  };
}

function mapLocalizedIds(
  ids: GetImmersiveManifest200['nodes'][number]['narrationTrackIds'],
  tracksById: Map<string, ImmersiveAudioTrack>,
  expectedType: ImmersiveAudioTrack['type'],
) {
  const result: Partial<Record<'vi' | 'en', string>> = {};
  for (const locale of ['vi', 'en'] as const) {
    const id = ids[locale];
    if (id && tracksById.get(id)?.type === expectedType) {
      result[locale] = id;
    }
  }
  return result;
}

function mapLocalizedTranscripts(
  ids: GetImmersiveManifest200['nodes'][number]['transcriptIds'],
  transcriptsById: Map<string, GetImmersiveManifest200['transcripts'][number]>,
): Partial<Record<'vi' | 'en', ImmersiveTranscriptContent>> {
  const result: Partial<Record<'vi' | 'en', ImmersiveTranscriptContent>> = {};
  for (const locale of ['vi', 'en'] as const) {
    const id = ids[locale];
    const transcript = id ? transcriptsById.get(id) : undefined;
    if (transcript) {
      result[locale] = {
        id: transcript.id,
        locale: transcript.locale,
        title: transcript.title,
        timingMode: transcript.timingMode,
        segments: transcript.segments.map((segment) => ({
          id: segment.id,
          startMs: segment.startMs,
          endMs: segment.endMs,
          text: segment.text,
        })),
      };
    }
  }
  return result;
}

function resolveMediaQuality(
  node: GetImmersiveManifest200['nodes'][number],
): Exclude<PanoramaNode['mediaQuality'], undefined> {
  if (node.panoramaAssetStatus !== 'ready') {
    return node.panoramaAssetStatus === null ? 'missing' : 'invalid';
  }

  return 'ready';
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
