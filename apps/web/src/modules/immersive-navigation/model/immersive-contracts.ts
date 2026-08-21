import type {
  HotspotVm,
  ImmersiveCaptionCapability,
  ImmersiveLocale,
  ImmersiveTranscriptContent,
  PanoramaNode,
  RendererStatus,
} from '../../../shared/contracts';
import type { ImmersiveShareResult } from './reference-parity.actions';

/**
 * Stable scene facts consumed by the unified panorama presentation.
 * Renderer/provider details intentionally do not cross this boundary.
 */
export interface ReferenceParitySceneContract {
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

export interface ReferenceParityAudioContract {
  ambientAvailable: boolean;
  narrationAvailable: boolean;
  masterMuted: boolean;
  ambientEnabled: boolean;
  narrationEnabled: boolean;
  narrationPlaying: boolean;
  autoplayBlocked: boolean;
}

export interface ReferenceParityAutoTourContract {
  isRunning: boolean;
  isPaused: boolean;
  canStart: boolean;
}

export interface ReferenceParityPresentationContract {
  destinationSlug: string;
  destinationName: string;
  locale: ImmersiveLocale;
  currentSceneId: string | null;
  status: RendererStatus;
  isTransitioning: boolean;
  mediaUnavailable: boolean;
  scenes: readonly ReferenceParitySceneContract[];
  hotspots: readonly HotspotVm[];
  audio: ReferenceParityAudioContract;
  autoTour: ReferenceParityAutoTourContract;
}

export type ImmersiveMediaDockMode = 'free-explore' | 'auto-tour';

export type ImmersiveMediaDockNarrationStatus =
  'idle' | 'loading' | 'playing' | 'paused' | 'unavailable';

export interface ImmersiveMediaDockAutoTourCapabilitiesContract {
  canStart: boolean;
  canPause: boolean;
  canResume: boolean;
  canSkipStory: boolean;
  canPrevious: boolean;
  canNext: boolean;
  canExit: boolean;
}

/**
 * Stable presentation facts for the Media Dock.
 *
 * The Auto Tour controller's internal phase/timer state is deliberately not
 * part of this contract. Presentation receives only observable state and
 * semantic capabilities.
 */
export interface ImmersiveMediaDockContract {
  mode: ImmersiveMediaDockMode;
  sceneId: string | null;
  sceneLabel: string;
  soundGateRequired: boolean;
  sound: {
    available: boolean;
    masterMuted: boolean;
  };
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
    capability: ImmersiveCaptionCapability;
    content: ImmersiveTranscriptContent | null;
  };
  autoTour: {
    isActive: boolean;
    isPaused: boolean;
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

export interface ImmersiveMediaDockActionsContract {
  onEnableSound(): Promise<boolean>;
  onContinueMuted(): void;
  onPlayNarration(): void;
  onResumeNarration(): void;
  onPauseNarration(): void;
  onToggleMasterMute(): void;
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

export type ImmersiveSceneTransactionStatus = 'idle' | 'entering-panorama' | 'navigating-scene';

export interface ImmersiveSceneTransactionContract {
  committedSceneId: string | null;
  requestedSceneId: string | null;
  status: ImmersiveSceneTransactionStatus;
  isPending: boolean;
}

export function toImmersiveSceneTransactionContract({
  committedSceneId,
  requestedSceneId,
  transition,
}: {
  committedSceneId: string | null;
  requestedSceneId: string | null;
  transition: ImmersiveSceneTransactionStatus;
}): ImmersiveSceneTransactionContract {
  return {
    committedSceneId,
    requestedSceneId,
    status: transition,
    isPending: requestedSceneId !== null,
  };
}
