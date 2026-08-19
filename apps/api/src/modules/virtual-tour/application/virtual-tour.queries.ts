import { Inject, Injectable } from '@nestjs/common';

import { DestinationQueryService } from '../../catalog/application/destination.queries';
import type { DestinationDetail } from '../../catalog/application/destination.queries';
import {
  MEDIA_ASSET_REPOSITORY,
  type MediaAssetRepository,
} from '../../media/application/media.repository';
import {
  PUBLIC_MEDIA_URL_OPTIONS,
  resolvePanoramaMediaUrls,
  resolvePublicMediaUrl,
  type PublicMediaUrlOptions,
} from '../../media/application/public-media-url';
import type { MediaAsset } from '../../media/domain/media-asset';
import {
  PANORAMA_METADATA_REPOSITORY,
  type PanoramaAssetMetadata,
  type PanoramaMetadataRepository,
} from '../../media/application/panorama-metadata.repository';
import {
  VIRTUAL_TOUR_REPOSITORY,
  type ImmersiveAudioReadRows,
  type VirtualTourRepository,
} from './virtual-tour.repository';
import type { Hotspot } from '../domain/hotspot';
import type { SceneLink } from '../domain/scene-link';
import type { SceneNode } from '../domain/scene-node';

export interface SceneNodeResponse {
  id: string;
  destinationId: string;
  name: string;
  lat: number;
  lng: number;
  altitude: number | null;
  panoramaAssetId: string | null;
  panoramaAssetStatus: string | null;
  panoramaManifestUrl: string | null;
  panoramaPreviewUrl: string | null;
  initialHeading: number;
  initialPitch: number;
  initialFov: number;
  status: string;
  sortOrder: number;
  ambientOverrideTrackId: string | null;
  narrationTrackIds: LocalizedAudioIds;
  transcriptIds: LocalizedAudioIds;
}

export interface LocalizedAudioIds {
  vi: string | null;
  en: string | null;
}

export type AudioTrackReadiness = 'ready' | 'unavailable' | 'invalid';

export interface AudioTrackResponse {
  id: string;
  type: 'ambient' | 'narration';
  label: string;
  locale: 'vi' | 'en' | null;
  src: string | null;
  durationMs: number | null;
  rights: 'customer-owned' | 'licensed';
  readiness: AudioTrackReadiness;
  voiceId: string | null;
  version: string | null;
}

export interface TranscriptSegmentResponse {
  id: string;
  startMs: number | null;
  endMs: number | null;
  text: string;
}

export interface TranscriptResponse {
  id: string;
  locale: 'vi' | 'en';
  title: string;
  timingMode: 'plain' | 'timed';
  rights: 'customer-owned' | 'licensed';
  segments: TranscriptSegmentResponse[];
}

export interface SceneLinkResponse {
  id: string;
  fromSceneId: string;
  toSceneId: string;
  yaw: number;
  pitch: number;
  bidirectional: boolean;
  sortOrder: number;
}

export interface HotspotResponse {
  id: string;
  sceneId: string;
  type: string;
  yaw: number;
  pitch: number;
  payload: Record<string, unknown>;
  status: string;
}

export interface ImmersiveManifestResponse {
  destination: DestinationDetail;
  defaultSceneId: string | null;
  ambientTrackId: string | null;
  audioTracks: AudioTrackResponse[];
  transcripts: TranscriptResponse[];
  nodes: SceneNodeResponse[];
  links: SceneLinkResponse[];
  hotspots: HotspotResponse[];
}

export interface SceneNeighborResponse {
  link: SceneLinkResponse;
  scene: SceneNodeResponse;
}

@Injectable()
export class VirtualTourQueryService {
  constructor(
    @Inject(DestinationQueryService)
    private readonly destinationQueryService: DestinationQueryService,
    @Inject(VIRTUAL_TOUR_REPOSITORY) private readonly repository: VirtualTourRepository,
    @Inject(MEDIA_ASSET_REPOSITORY) private readonly mediaAssetRepository: MediaAssetRepository,
    @Inject(PANORAMA_METADATA_REPOSITORY)
    private readonly panoramaMetadataRepository: PanoramaMetadataRepository,
    @Inject(PUBLIC_MEDIA_URL_OPTIONS)
    private readonly publicMediaUrlOptions: PublicMediaUrlOptions,
  ) {}

  async findManifestByDestinationSlug(
    slug: string,
    locale = 'vi',
  ): Promise<ImmersiveManifestResponse | null> {
    const destination = await this.destinationQueryService.findPublishedBySlug(slug, locale);
    if (!destination) {
      return null;
    }

    const scenes = await this.repository.findScenesByDestinationId(destination.id, 'published');
    const sceneIds = scenes.map((scene) => scene.id);
    const [links, hotspots, audioRows] = await Promise.all([
      this.repository.findLinksByFromSceneIds(sceneIds),
      this.repository.findHotspotsBySceneIds(sceneIds, 'published'),
      this.repository.findImmersiveAudioReadRows(destination.id, sceneIds),
    ]);
    const audioAssetIds = audioRows.tracks
      .map((track) => track.mediaAssetId)
      .filter((assetId): assetId is string => assetId !== null);
    const panoramaAssetIds = scenes
      .map((scene) => scene.toPrimitives().panoramaAssetId)
      .filter((assetId): assetId is string => assetId !== null);
    const [mediaAssets, panoramaMetadata] = await Promise.all([
      this.mediaAssetRepository.findByIds([...panoramaAssetIds, ...audioAssetIds]),
      this.panoramaMetadataRepository.findByMediaAssetIds(panoramaAssetIds),
    ]);
    const publicAudio = toPublicAudioReadModel(audioRows, mediaAssets, this.publicMediaUrlOptions);

    const defaultSceneId =
      destination.defaultSceneId && sceneIds.includes(destination.defaultSceneId)
        ? destination.defaultSceneId
        : (sceneIds[0] ?? null);

    return {
      destination,
      defaultSceneId,
      ambientTrackId: publicAudio.ambientTrackId,
      audioTracks: publicAudio.audioTracks,
      transcripts: publicAudio.transcripts,
      nodes: scenes.map((scene) => {
        const audio = projectSceneAudio(scene.id, audioRows, publicAudio);
        return toSceneResponse(
          scene,
          getSceneMediaAsset(scene, mediaAssets),
          getScenePanoramaMetadata(scene, panoramaMetadata),
          this.publicMediaUrlOptions,
          audio,
        );
      }),
      links: links.map(toLinkResponse),
      hotspots: hotspots.map(toHotspotResponse),
    };
  }

  async findScene(id: string): Promise<SceneNodeResponse | null> {
    const scene = await this.repository.findSceneById(id);
    if (!scene || scene.status !== 'published') {
      return null;
    }

    const mediaAssetId = scene.toPrimitives().panoramaAssetId;
    const [mediaAsset, panoramaMetadata] = mediaAssetId
      ? await Promise.all([
          this.mediaAssetRepository.findById(mediaAssetId),
          this.panoramaMetadataRepository.findByMediaAssetId(mediaAssetId),
        ])
      : [null, null];
    return toSceneResponse(scene, mediaAsset, panoramaMetadata, this.publicMediaUrlOptions);
  }

  async findNeighbors(id: string): Promise<SceneNeighborResponse[] | null> {
    const scene = await this.repository.findSceneById(id);
    if (!scene || scene.status !== 'published') {
      return null;
    }

    const links = await this.repository.findLinksForScene(id);
    const neighbors = await Promise.all(
      links.map(async (link) => {
        const targetId = link.fromSceneId === id ? link.toSceneId : link.fromSceneId;
        const target = await this.repository.findSceneById(targetId);
        return target ? { link, scene: target } : null;
      }),
    );

    const resolvedNeighbors = neighbors.filter(
      (neighbor): neighbor is { link: SceneLink; scene: SceneNode } => neighbor !== null,
    );
    const panoramaAssetIds = resolvedNeighbors
      .map(({ scene }) => scene.toPrimitives().panoramaAssetId)
      .filter((assetId): assetId is string => assetId !== null);
    const [mediaAssets, panoramaMetadata] = await Promise.all([
      this.mediaAssetRepository.findByIds(panoramaAssetIds),
      this.panoramaMetadataRepository.findByMediaAssetIds(panoramaAssetIds),
    ]);

    return resolvedNeighbors.map(({ link, scene }) => ({
      link: toLinkResponse(link),
      scene: toSceneResponse(
        scene,
        getSceneMediaAsset(scene, mediaAssets),
        getScenePanoramaMetadata(scene, panoramaMetadata),
        this.publicMediaUrlOptions,
      ),
    }));
  }
}

function toSceneResponse(
  scene: SceneNode,
  mediaAsset: MediaAsset | null,
  panoramaMetadata: PanoramaAssetMetadata | null,
  publicMediaUrlOptions: PublicMediaUrlOptions,
  audio: {
    ambientOverrideTrackId: string | null;
    narrationTrackIds: LocalizedAudioIds;
    transcriptIds: LocalizedAudioIds;
  } = {
    ambientOverrideTrackId: null,
    narrationTrackIds: { vi: null, en: null },
    transcriptIds: { vi: null, en: null },
  },
): SceneNodeResponse {
  const props = scene.toPrimitives();
  const panoramaUrls = isPublicPanorama(mediaAsset, panoramaMetadata)
    ? resolvePanoramaMediaUrls(
        {
          manifestKey: panoramaMetadata.manifestKey,
          previewKey: panoramaMetadata.previewKey,
        },
        publicMediaUrlOptions,
      )
    : { manifestUrl: null, previewUrl: null };

  return {
    id: props.id,
    destinationId: props.destinationId,
    name: props.name,
    lat: props.geoPoint.latitude,
    lng: props.geoPoint.longitude,
    altitude: props.altitude,
    panoramaAssetId: props.panoramaAssetId,
    panoramaAssetStatus: props.panoramaAssetStatus,
    panoramaManifestUrl: panoramaUrls.manifestUrl,
    panoramaPreviewUrl: panoramaUrls.previewUrl,
    initialHeading: props.initialHeading,
    initialPitch: props.initialPitch,
    initialFov: props.initialFov,
    status: props.status,
    sortOrder: props.sortOrder,
    ...audio,
  };
}

function isPublicPanorama(
  mediaAsset: MediaAsset | null,
  metadata: PanoramaAssetMetadata | null,
): metadata is PanoramaAssetMetadata {
  const asset = mediaAsset?.toPrimitives();
  return Boolean(
    asset?.mediaKind === 'panorama' &&
    asset.status === 'ready' &&
    metadata?.qualityStatus === 'accepted' &&
    metadata.manifestKey?.trim() &&
    metadata.previewKey?.trim() &&
    metadata.rightsHolder.trim() &&
    metadata.rightsReference.trim() &&
    metadata.sourceReference.trim() &&
    metadata.version.trim(),
  );
}

function toPublicAudioReadModel(
  rows: ImmersiveAudioReadRows,
  mediaAssets: Map<string, MediaAsset>,
  publicMediaUrlOptions: PublicMediaUrlOptions,
) {
  const publicTracks = rows.tracks.filter(isPublicAudioTrack);
  const publicTranscripts = rows.transcripts.filter(isPublicTranscript);
  const publicTrackIds = new Set(publicTracks.map((track) => track.id));
  const publicTranscriptIds = new Set(publicTranscripts.map((transcript) => transcript.id));
  const trackById = new Map(publicTracks.map((track) => [track.id, track]));

  const audioTracks = publicTracks.map((track) =>
    toAudioTrackResponse(track, mediaAssets, publicMediaUrlOptions),
  );
  const transcripts = publicTranscripts.map((transcript) => ({
    id: transcript.id,
    locale: transcript.locale,
    title: transcript.title,
    timingMode: transcript.timingMode,
    rights: transcript.rights as 'customer-owned' | 'licensed',
    segments: rows.transcriptSegments
      .filter((segment) => segment.transcriptId === transcript.id)
      .map((segment) => ({
        id: segment.id,
        startMs: segment.startMs,
        endMs: segment.endMs,
        text: segment.text,
      })),
  }));

  const destinationAmbientTrackId = rows.destinationAmbient?.trackId ?? null;
  const ambientTrackId =
    destinationAmbientTrackId !== null &&
    publicTrackIds.has(destinationAmbientTrackId) &&
    trackById.get(destinationAmbientTrackId)?.kind === 'ambient'
      ? destinationAmbientTrackId
      : null;

  return {
    ambientTrackId,
    audioTracks,
    transcripts,
    publicTrackIds,
    publicTranscriptIds,
    trackById,
  };
}

function projectSceneAudio(
  sceneId: string,
  rows: ImmersiveAudioReadRows,
  publicAudio: ReturnType<typeof toPublicAudioReadModel>,
) {
  const ambientOverride = rows.sceneAmbientOverrides.find((row) => row.sceneId === sceneId);
  const ambientOverrideTrackId =
    ambientOverride &&
    publicAudio.publicTrackIds.has(ambientOverride.trackId) &&
    publicAudio.trackById.get(ambientOverride.trackId)?.kind === 'ambient'
      ? ambientOverride.trackId
      : null;

  const narrationTrackIds: LocalizedAudioIds = { vi: null, en: null };
  const transcriptIds: LocalizedAudioIds = { vi: null, en: null };
  for (const narration of rows.sceneNarrations) {
    if (narration.sceneId !== sceneId) {
      continue;
    }

    const locale = narration.locale;
    if (
      narration.trackId &&
      publicAudio.publicTrackIds.has(narration.trackId) &&
      publicAudio.trackById.get(narration.trackId)?.kind === 'narration'
    ) {
      narrationTrackIds[locale] = narration.trackId;
    }
    if (narration.transcriptId && publicAudio.publicTranscriptIds.has(narration.transcriptId)) {
      transcriptIds[locale] = narration.transcriptId;
    }
  }

  return { ambientOverrideTrackId, narrationTrackIds, transcriptIds };
}

function isPublicAudioTrack(track: ImmersiveAudioReadRows['tracks'][number]) {
  return track.publicationStatus === 'published' && track.rights !== 'demo-only';
}

function isPublicTranscript(transcript: ImmersiveAudioReadRows['transcripts'][number]) {
  return transcript.publicationStatus === 'published' && transcript.rights !== 'demo-only';
}

function toAudioTrackResponse(
  track: ImmersiveAudioReadRows['tracks'][number],
  mediaAssets: Map<string, MediaAsset>,
  publicMediaUrlOptions: PublicMediaUrlOptions,
): AudioTrackResponse {
  const asset = track.mediaAssetId ? mediaAssets.get(track.mediaAssetId) : null;
  const assetProps = asset?.toPrimitives();
  const isAudioAsset = assetProps?.mediaKind === 'audio';
  const src =
    isAudioAsset && assetProps.status === 'ready'
      ? resolvePublicMediaUrl(assetProps.storageKey, publicMediaUrlOptions)
      : null;
  let readiness: AudioTrackReadiness;
  if (track.mediaAssetId === null) {
    readiness = 'unavailable';
  } else if (!assetProps || !isAudioAsset || assetProps.status === 'failed') {
    readiness = 'invalid';
  } else if (assetProps.status === 'ready') {
    readiness = src ? 'ready' : 'invalid';
  } else {
    readiness = 'unavailable';
  }

  return {
    id: track.id,
    type: track.kind,
    label: track.label,
    locale: track.locale,
    src: readiness === 'ready' ? src : null,
    durationMs: track.durationMs,
    rights: track.rights as 'customer-owned' | 'licensed',
    readiness,
    voiceId: track.voiceId,
    version: track.version,
  };
}

function getSceneMediaAsset(
  scene: SceneNode,
  mediaAssets: Map<string, MediaAsset>,
): MediaAsset | null {
  const mediaAssetId = scene.toPrimitives().panoramaAssetId;
  return mediaAssetId ? (mediaAssets.get(mediaAssetId) ?? null) : null;
}

function getScenePanoramaMetadata(scene: SceneNode, metadata: Map<string, PanoramaAssetMetadata>) {
  const mediaAssetId = scene.toPrimitives().panoramaAssetId;
  return mediaAssetId ? (metadata.get(mediaAssetId) ?? null) : null;
}

function toLinkResponse(link: SceneLink): SceneLinkResponse {
  const props = link.toPrimitives();
  return {
    id: props.id,
    fromSceneId: props.fromSceneId,
    toSceneId: props.toSceneId,
    yaw: props.yaw,
    pitch: props.pitch,
    bidirectional: props.bidirectional,
    sortOrder: props.sortOrder,
  };
}

function toHotspotResponse(hotspot: Hotspot): HotspotResponse {
  const props = hotspot.toPrimitives();
  return {
    id: props.id,
    sceneId: props.sceneId,
    type: props.type,
    yaw: props.yaw,
    pitch: props.pitch,
    payload: props.payload,
    status: props.status,
  };
}
