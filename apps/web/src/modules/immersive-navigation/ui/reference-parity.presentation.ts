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
import type { ImmersiveShareResult } from '../model/reference-parity.actions';
import type { AutoTourPhase } from '../model/auto-tour.controller';

export interface ReferenceParitySceneVm {
  id: string;
  label: string;
  shortLabel: string;
  role: 'major-stop' | 'connector';
  isMajorStop: boolean;
  isCurrent: boolean;
  isVisited: boolean;
  mediaQuality: NonNullable<PanoramaNode['mediaQuality']>;
  thumbnailUrl: string | null;
  canNavigate: boolean;
}

export interface ReferenceParityAudioVm {
  ambientAvailable: boolean;
  narrationAvailable: boolean;
  masterMuted: boolean;
  ambientEnabled: boolean;
  narrationEnabled: boolean;
  narrationPlaying: boolean;
  autoplayBlocked: boolean;
}

export interface ReferenceParityAutoTourVm {
  isRunning: boolean;
  isPaused: boolean;
  canStart: boolean;
}

export interface ReferenceParityPresentationVm {
  destinationSlug: string;
  destinationName: string;
  currentSceneId: string | null;
  status: RendererStatus;
  isTransitioning: boolean;
  mediaUnavailable: boolean;
  scenes: ReferenceParitySceneVm[];
  hotspots: HotspotVm[];
  audio: ReferenceParityAudioVm;
  autoTour: ReferenceParityAutoTourVm;
}

export interface ReferenceParityPresentationActions {
  onBack(): void;
  onSelectScene(sceneId: string): void;
  onSelectHotspot(hotspotId: string): void;
  onToggleMinimap(): void;
  onToggleMasterMute(): void;
  onEnableAudio(): void;
  onToggleAmbient(): void;
  onToggleNarration(): void;
  onToggleAutoTour(): void;
  onRetry(): void;
  onShare(): Promise<ImmersiveShareResult>;
  onFullscreen(): void;
}

export interface ReferenceParityAudioInput {
  state?: ImmersiveAudioState;
  tracks?: readonly ImmersiveAudioTrack[];
}

export type ImmersiveMediaDockMode = 'free-explore' | 'auto-tour';

export type ImmersiveMediaDockNarrationStatus =
  'idle' | 'loading' | 'playing' | 'paused' | 'unavailable';

export interface ImmersiveMediaDockVm {
  mode: ImmersiveMediaDockMode;
  sceneId: string | null;
  sceneLabel: string;
  soundGateRequired: boolean;
  captionsEnabled: boolean;
  narration: {
    available: boolean;
    status: ImmersiveMediaDockNarrationStatus;
    currentTimeSeconds: number;
    durationSeconds: number;
    canSeek: boolean;
    activeLocale: ImmersiveLocale | null;
    alternateLocales: readonly ImmersiveLocale[];
  };
  transcript: {
    available: boolean;
    content: ImmersiveTranscriptContent | null;
  };
  autoTour: {
    isActive: boolean;
    isPaused: boolean;
    phase: AutoTourPhase;
    currentIndex: number;
    total: number;
    canStart: boolean;
    canPause: boolean;
    canResume: boolean;
    canSkipStory: boolean;
    canPrevious: boolean;
    canNext: boolean;
    canExit: boolean;
  };
}

export interface ImmersiveMediaDockAutoTourCapabilities {
  canStart: boolean;
  canPause: boolean;
  canResume: boolean;
  canSkipStory: boolean;
  canPrevious: boolean;
  canNext: boolean;
  canExit: boolean;
}

export interface ImmersiveMediaDockActions {
  onEnableSound(): void;
  onContinueMuted(): void;
  onPlayNarration(): void;
  onPauseNarration(): void;
  onSeekNarration(seconds: number): void;
  onToggleCaptions(): void;
  onOpenTranscript(): void;
  onCloseTranscript(): void;
  onStartAutoTour(): void;
  onPauseAutoTour(): void;
  onResumeAutoTour(): void;
  onSkipStory(): void;
  onPreviousScene(): void;
  onNextScene(): void;
  onExitAutoTour(): void;
  onListenInLocale(locale: ImmersiveLocale): void;
}

export interface ImmersiveMediaDockVmInput {
  mode: ImmersiveMediaDockMode;
  scene: PanoramaNode | null;
  tourEligibleNodes: readonly PanoramaNode[];
  currentSceneId: string | null;
  destinationAmbientTrackId: string | null;
  locale: ImmersiveLocale;
  audioTracks?: readonly ImmersiveAudioTrack[];
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
        narrationTrack: null,
        transcript: null,
        narrationLocale: null,
        alternateNarrationLocales: [],
      };
  const narrationTrackId = resolved.narrationTrack?.id ?? null;
  const narrationMatchesCurrentTrack = audioState?.narrationTrackId === narrationTrackId;
  const narrationStatus: ImmersiveMediaDockNarrationStatus = !resolved.narrationTrack
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

  return {
    mode,
    sceneId: currentSceneId,
    sceneLabel: scene?.name ?? scene?.id ?? '',
    soundGateRequired: soundGateRequired ?? audioState?.autoplayBlocked ?? false,
    captionsEnabled,
    narration: {
      available: resolved.narrationTrack !== null,
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
      content: resolved.transcript,
    },
    autoTour: {
      isActive: autoTour.isActive,
      isPaused: autoTour.isPaused,
      phase: autoTour.phase,
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
  audioState,
  audioTracks = [],
  autoTour,
  hotspots = [],
}: {
  destination: { slug: string; name: string };
  nodes: readonly PanoramaNode[];
  currentSceneId: string | null;
  visitedSceneIds: readonly string[];
  status: RendererStatus;
  isTransitioning: boolean;
  audioState?: ImmersiveAudioState;
  audioTracks?: readonly ImmersiveAudioTrack[];
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
  const ambientTrack = audioTracks.find((track) => track.type === 'ambient');
  const narrationTrack = audioTracks.find((track) => track.type === 'narration');
  const audio = toAudioVm(audioState, ambientTrack, narrationTrack);

  return {
    destinationSlug: destination.slug,
    destinationName: destination.name,
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
  ambientTrack: ImmersiveAudioTrack | undefined,
  narrationTrack: ImmersiveAudioTrack | undefined,
): ReferenceParityAudioVm {
  return {
    ambientAvailable: Boolean(ambientTrack?.src),
    narrationAvailable: Boolean(narrationTrack?.src),
    masterMuted: state?.masterMuted ?? false,
    ambientEnabled: state?.ambientEnabled ?? true,
    narrationEnabled: state?.narrationEnabled ?? true,
    narrationPlaying: state?.narrationPlaying ?? false,
    autoplayBlocked: state?.autoplayBlocked ?? false,
  };
}

export function findAudioTrack(
  tracks: readonly ImmersiveAudioTrack[],
  type: ImmersiveAudioTrackType,
  id?: string | null,
): ImmersiveAudioTrack | null {
  return tracks.find((track) => track.type === type && (!id || track.id === id)) ?? null;
}
