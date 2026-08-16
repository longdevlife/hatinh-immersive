import type {
  ImmersiveAudioTrack,
  ImmersiveLocale,
  ImmersiveTranscriptContent,
  PanoramaMediaQuality,
  PanoramaMediaRights,
  PanoramaView,
} from '../../../shared/contracts';

export type DestinationTourMediaMode = 'public' | 'demo-only' | 'synthetic';

export type DestinationTourSceneRole = 'major-stop' | 'connector';

export interface DestinationTourScene {
  id: string;
  destinationSlug: string;
  name: string;
  role: DestinationTourSceneRole;
  lat: number;
  lng: number;
  initialView: PanoramaView;
  panoramaUrl: string | null;
  previewUrl: string | null;
  thumbnailUrl?: string | null;
  mediaQuality: PanoramaMediaQuality;
  mediaRights: PanoramaMediaRights;
  ambientTrackId?: string | null;
  narrationTrackId?: string | null;
  narrationTrackIds?: Partial<Record<ImmersiveLocale, string>>;
  transcripts?: Partial<Record<ImmersiveLocale, ImmersiveTranscriptContent>>;
  fallbackDurationMs?: number;
}

export interface DestinationTourLink {
  id: string;
  sourceSceneId: string;
  targetSceneId: string;
  yaw: number;
  pitch: number;
}

export interface DestinationTourHotspot {
  id: string;
  sceneId: string;
  type: 'information' | 'media' | 'audio' | 'scene-navigation' | 'external';
  label: string | null;
  content?: string | null;
  mediaUrl?: string | null;
  targetSceneId?: string | null;
  audioTrackId?: string | null;
  yaw: number;
  pitch: number;
}

export interface DestinationTour {
  destinationSlug: string;
  title: string;
  defaultSceneId: string;
  mediaMode: DestinationTourMediaMode;
  scenes: readonly DestinationTourScene[];
  links: readonly DestinationTourLink[];
  hotspots: readonly DestinationTourHotspot[];
  audioTracks: readonly ImmersiveAudioTrack[];
  ambientTrackId?: string | null;
}

export interface DestinationTourGraphValidation {
  valid: boolean;
  issues: string[];
}

export function validateDestinationTour(tour: DestinationTour): DestinationTourGraphValidation {
  const issues: string[] = [];
  const scenesById = new Map<string, DestinationTourScene>();
  const audioTrackIds = new Set<string>();

  for (const track of tour.audioTracks) {
    if (audioTrackIds.has(track.id)) {
      issues.push(`DUPLICATE_AUDIO_TRACK:${track.id}`);
    }
    audioTrackIds.add(track.id);
  }

  for (const scene of tour.scenes) {
    if (scenesById.has(scene.id)) {
      issues.push(`DUPLICATE_SCENE:${scene.id}`);
    }
    scenesById.set(scene.id, scene);

    if (scene.destinationSlug !== tour.destinationSlug) {
      issues.push(`SCENE_DESTINATION_MISMATCH:${scene.id}`);
    }

    for (const locale of ['vi', 'en'] as const) {
      const trackId = scene.narrationTrackIds?.[locale];
      if (trackId && !audioTrackIds.has(trackId)) {
        issues.push(`NARRATION_TRACK_NOT_FOUND:${scene.id}:${locale}:${trackId}`);
      }
    }

    if (scene.ambientTrackId && !audioTrackIds.has(scene.ambientTrackId)) {
      issues.push(`SCENE_AMBIENT_TRACK_NOT_FOUND:${scene.id}:${scene.ambientTrackId}`);
    }

    if (scene.fallbackDurationMs !== undefined && scene.fallbackDurationMs < 0) {
      issues.push(`INVALID_FALLBACK_DURATION:${scene.id}`);
    }
  }

  if (!scenesById.has(tour.defaultSceneId)) {
    issues.push(`DEFAULT_SCENE_NOT_FOUND:${tour.defaultSceneId}`);
  }

  const linkIds = new Set<string>();
  for (const link of tour.links) {
    if (linkIds.has(link.id)) {
      issues.push(`DUPLICATE_LINK:${link.id}`);
    }
    linkIds.add(link.id);

    const source = scenesById.get(link.sourceSceneId);
    const target = scenesById.get(link.targetSceneId);
    if (!source) {
      issues.push(`LINK_SOURCE_NOT_FOUND:${link.id}`);
    }
    if (!target) {
      issues.push(`LINK_TARGET_NOT_FOUND:${link.id}`);
    }
    if (source && target && source.destinationSlug !== target.destinationSlug) {
      issues.push(`LINK_CROSS_DESTINATION:${link.id}`);
    }
  }

  const hotspotIds = new Set<string>();
  for (const hotspot of tour.hotspots) {
    if (hotspotIds.has(hotspot.id)) {
      issues.push(`DUPLICATE_HOTSPOT:${hotspot.id}`);
    }
    hotspotIds.add(hotspot.id);

    const source = scenesById.get(hotspot.sceneId);
    if (!source) {
      issues.push(`HOTSPOT_SCENE_NOT_FOUND:${hotspot.id}`);
    }

    if (hotspot.targetSceneId) {
      const target = scenesById.get(hotspot.targetSceneId);
      if (!target) {
        issues.push(`HOTSPOT_TARGET_NOT_FOUND:${hotspot.id}`);
      } else if (source && source.destinationSlug !== target.destinationSlug) {
        issues.push(`HOTSPOT_CROSS_DESTINATION:${hotspot.id}`);
      }
    }
  }

  if (tour.ambientTrackId && !audioTrackIds.has(tour.ambientTrackId)) {
    issues.push(`AMBIENT_TRACK_NOT_FOUND:${tour.ambientTrackId}`);
  }

  return { valid: issues.length === 0, issues };
}
