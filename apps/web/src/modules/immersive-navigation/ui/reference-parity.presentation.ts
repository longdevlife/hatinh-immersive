import type {
  HotspotVm,
  ImmersiveAudioTrack,
  ImmersiveAudioTrackType,
  PanoramaNode,
  RendererStatus,
} from '../../../shared/contracts';
import type { ImmersiveAudioState } from '../../immersive-audio';
import { getPanoramaTourSceneRole, isPanoramaSceneUsable } from '../../panorama-tour';
import type { ImmersiveShareResult } from '../model/reference-parity.actions';

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
      thumbnailUrl: node.thumbnailUrl ?? node.previewUrl,
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
