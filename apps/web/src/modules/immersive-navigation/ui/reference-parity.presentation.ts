import type {
  HotspotVm,
  ImmersiveAudioTrack,
  ImmersiveAudioTrackType,
  ImmersiveLocale,
  ImmersiveTranscriptContent,
  PanoramaNode,
  RendererStatus,
} from '../../../shared/contracts';
import type { ImmersiveAudioState } from '../../immersive-audio';
import { resolveSceneAudio } from '../../immersive-audio';
import { getPanoramaTourSceneRole, isPanoramaSceneUsable } from '../../panorama-tour';
import type { AutoTourPhase } from '../model/auto-tour.controller';
import type {
  ImmersiveMediaDockActionsContract,
  ImmersiveMediaDockAutoTourCapabilitiesContract,
  ImmersiveMediaDockContract,
  ImmersiveMediaDockMode,
  ImmersiveMediaDockNarrationStatus,
  ImmersiveCaptionCapabilityContract,
  ReferenceParityAudioContract,
  ReferenceParityAutoTourContract,
  ReferenceParityPresentationContract,
  ReferenceParitySceneContract,
} from '../model/immersive-contracts';

export type ReferenceParitySceneVm = ReferenceParitySceneContract;
export type ReferenceParityAudioVm = ReferenceParityAudioContract;
export type ReferenceParityAutoTourVm = ReferenceParityAutoTourContract;
export type ReferenceParityPresentationVm = ReferenceParityPresentationContract;
export type ImmersiveMediaDockVm = ImmersiveMediaDockContract;
export type ImmersiveMediaDockAutoTourCapabilities = ImmersiveMediaDockAutoTourCapabilitiesContract;
export type ImmersiveMediaDockActions = ImmersiveMediaDockActionsContract;
export type {
  ImmersiveMediaDockMode,
  ImmersiveMediaDockNarrationStatus,
} from '../model/immersive-contracts';

export interface ReferenceParityPresentationActions {
  onBack(): void;
  onToggleLocale(): void;
  onSelectScene(sceneId: string): void;
  onSelectHotspot(hotspotId: string): void;
  onToggleMinimap(): void;
  onToggleMasterMute(): void;
  onEnableAudio(): void;
  onToggleAmbient(): void;
  onToggleNarration(): void;
  onToggleAutoTour(): void;
  onRetry(): void;
  onShare(): Promise<import('../model/reference-parity.actions').ImmersiveShareResult>;
  onFullscreen(): void;
}

export interface ReferenceParityAudioInput {
  state?: ImmersiveAudioState;
  tracks?: readonly ImmersiveAudioTrack[];
}

export interface ImmersiveMediaDockVmInput {
  mode: ImmersiveMediaDockMode;
  scene: PanoramaNode | null;
  tourEligibleNodes: readonly PanoramaNode[];
  currentSceneId: string | null;
  destinationAmbientTrackId: string | null;
  locale: ImmersiveLocale;
  audioTracks?: readonly ImmersiveAudioTrack[];
  canPlayTrack: (track: ImmersiveAudioTrack) => boolean;
  audioState?: ImmersiveAudioState;
  narrationLoading?: boolean;
  autoTour: {
    isActive: boolean;
    isPaused: boolean;
    phase: AutoTourPhase;
    currentSceneId: string | null;
    capabilities: ImmersiveMediaDockAutoTourCapabilities;
  };
  captionsEnabled: boolean;
  soundGateRequired?: boolean;
}

export function buildImmersiveMediaDockVm({
  mode,
  scene,
  tourEligibleNodes,
  currentSceneId,
  destinationAmbientTrackId,
  locale,
  audioTracks = [],
  canPlayTrack,
  audioState,
  narrationLoading = false,
  autoTour,
  captionsEnabled,
  soundGateRequired,
}: ImmersiveMediaDockVmInput): ImmersiveMediaDockVm {
  const resolved = scene
    ? resolveSceneAudio({
        tracks: audioTracks,
        destinationAmbientTrackId,
        scene,
        locale,
      })
    : {
        ambientTrack: null,
        narrationTrack: null,
        transcript: null,
        narrationLocale: null,
        alternateNarrationLocales: [],
      };
  const narrationTrackId = resolved.narrationTrack?.id ?? null;
  const narrationMatchesCurrentTrack = audioState?.narrationTrackId === narrationTrackId;
  const narrationAvailable =
    resolved.narrationTrack !== null && canPlayTrack(resolved.narrationTrack);
  const captionCapability = getCaptionCapability(resolved.transcript);
  const narrationStatus: ImmersiveMediaDockNarrationStatus = !narrationAvailable
    ? 'unavailable'
    : narrationLoading
      ? 'loading'
      : audioState?.narrationPlaying && narrationMatchesCurrentTrack
        ? 'playing'
        : narrationMatchesCurrentTrack
          ? 'paused'
          : 'idle';
  const autoTourSceneId = autoTour.isActive ? autoTour.currentSceneId : null;
  const currentIndex = autoTourSceneId
    ? Math.max(0, tourEligibleNodes.findIndex((node) => node.id === autoTourSceneId) + 1)
    : 0;
  // Playability comes from the active source policy. The VM must not infer it
  // from a resolved track or URL because demo narration can be source-backed
  // without a file while browser-file mode cannot play that same track.
  const soundAvailable =
    (resolved.ambientTrack !== null && canPlayTrack(resolved.ambientTrack)) ||
    (resolved.narrationTrack !== null && canPlayTrack(resolved.narrationTrack));

  return {
    mode,
    sceneId: currentSceneId,
    sceneLabel: scene?.name ?? scene?.id ?? '',
    soundGateRequired:
      soundAvailable && (soundGateRequired ?? audioState?.autoplayBlocked ?? false),
    sound: {
      available: soundAvailable,
      masterMuted: audioState?.masterMuted ?? false,
    },
    captionsEnabled,
    narration: {
      available: narrationAvailable,
      status: narrationStatus,
      currentTimeSeconds: narrationMatchesCurrentTrack
        ? (audioState?.narrationCurrentTimeSeconds ?? 0)
        : 0,
      durationSeconds: narrationMatchesCurrentTrack
        ? (audioState?.narrationDurationSeconds ?? 0)
        : 0,
      canSeek: narrationMatchesCurrentTrack && (audioState?.narrationCanSeek ?? false),
      activeLocale: resolved.narrationLocale,
      alternateLocales: resolved.alternateNarrationLocales,
    },
    transcript: {
      available: resolved.transcript !== null,
      capability: captionCapability,
      content: resolved.transcript,
    },
    autoTour: {
      isActive: autoTour.isActive,
      isPaused: autoTour.isPaused,
      currentIndex,
      total: tourEligibleNodes.length,
      ...autoTour.capabilities,
    },
  };
}

export function buildReferenceParityPresentationVm({
  destination,
  nodes,
  currentSceneId,
  visitedSceneIds,
  status,
  isTransitioning,
  locale,
  audioState,
  audioTracks = [],
  canPlayTrack,
  destinationAmbientTrackId,
  autoTour,
  hotspots = [],
}: {
  destination: { slug: string; name: string };
  nodes: readonly PanoramaNode[];
  currentSceneId: string | null;
  visitedSceneIds: readonly string[];
  status: RendererStatus;
  isTransitioning: boolean;
  locale: ImmersiveLocale;
  audioState?: ImmersiveAudioState;
  audioTracks?: readonly ImmersiveAudioTrack[];
  canPlayTrack: (track: ImmersiveAudioTrack) => boolean;
  destinationAmbientTrackId: string | null;
  autoTour: Pick<ReferenceParityAutoTourVm, 'isRunning' | 'isPaused'>;
  hotspots?: readonly HotspotVm[];
}): ReferenceParityPresentationVm {
  const visited = new Set(visitedSceneIds);
  const scenes = nodes.map((node) => {
    const role = node.role ?? getPanoramaTourSceneRole(node.id);
    const label = node.name ?? node.id;
    return {
      id: node.id,
      label,
      shortLabel: label,
      role,
      isMajorStop: role === 'major-stop',
      isCurrent: node.id === currentSceneId,
      isVisited: visited.has(node.id),
      mediaQuality: node.mediaQuality ?? 'ready',
      thumbnailUrl: node.thumbnailUrl !== undefined ? node.thumbnailUrl : node.previewUrl,
      canNavigate: isPanoramaSceneUsable(node),
    } satisfies ReferenceParitySceneVm;
  });
  const mediaUnavailable =
    status === 'unavailable' || scenes.length === 0 || scenes.every((scene) => !scene.canNavigate);
  const ambientTrack = findAudioTrack(audioTracks, 'ambient', destinationAmbientTrackId);
  const narrationTrack = audioTracks.find(
    (track) => track.type === 'narration' && (track.locale === locale || track.locale === null),
  );
  const audio = toAudioVm(audioState, ambientTrack, narrationTrack, canPlayTrack);

  return {
    destinationSlug: destination.slug,
    destinationName: destination.name,
    locale,
    currentSceneId,
    status,
    isTransitioning,
    mediaUnavailable,
    scenes,
    hotspots: [...hotspots],
    audio,
    autoTour: {
      ...autoTour,
      canStart: !mediaUnavailable && scenes.filter((scene) => scene.canNavigate).length > 1,
    },
  };
}

function toAudioVm(
  state: ImmersiveAudioState | undefined,
  ambientTrack: ImmersiveAudioTrack | null | undefined,
  narrationTrack: ImmersiveAudioTrack | null | undefined,
  canPlayTrack: (track: ImmersiveAudioTrack) => boolean,
): ReferenceParityAudioVm {
  return {
    ambientAvailable: ambientTrack ? canPlayTrack(ambientTrack) : false,
    narrationAvailable: narrationTrack ? canPlayTrack(narrationTrack) : false,
    masterMuted: state?.masterMuted ?? false,
    ambientEnabled: state?.ambientEnabled ?? true,
    narrationEnabled: state?.narrationEnabled ?? true,
    narrationPlaying: state?.narrationPlaying ?? false,
    autoplayBlocked: state?.autoplayBlocked ?? false,
  };
}

function getCaptionCapability(
  content: ImmersiveTranscriptContent | null,
): ImmersiveCaptionCapabilityContract {
  if (!content) {
    return 'none';
  }

  return content.timingMode === 'timed' ? 'timed-captions' : 'plain-transcript';
}

export function findAudioTrack(
  tracks: readonly ImmersiveAudioTrack[],
  type: ImmersiveAudioTrackType,
  id?: string | null,
): ImmersiveAudioTrack | null {
  return tracks.find((track) => track.type === type && (!id || track.id === id)) ?? null;
}
