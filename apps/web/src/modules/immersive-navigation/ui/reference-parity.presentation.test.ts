import { describe, expect, it } from 'vitest';

import type {
  ImmersiveAudioTrack,
  ImmersiveTranscriptContent,
  PanoramaNode,
} from '../../../shared/contracts';
import type { ImmersiveAudioState } from '../../immersive-audio';
import {
  buildImmersiveMediaDockVm,
  buildReferenceParityPresentationVm,
  type ImmersiveMediaDockActions,
} from './reference-parity.presentation';

function node(id: string, quality: PanoramaNode['mediaQuality'] = 'ready'): PanoramaNode {
  return {
    id,
    name: id,
    destinationSlug: 'bien-thien-cam',
    thumbnailUrl: `/demo/360/${id}/preview.webp`,
    role: id === 'connector' ? 'connector' : 'major-stop',
    panoramaUrl: `/demo/360/${id}/manifest.json`,
    previewUrl: `/demo/360/${id}/preview.webp`,
    mediaQuality: quality,
    mediaRights: 'demo-only',
    lat: 18.27,
    lng: 106.09,
    initialView: { heading: 0, pitch: 0, fov: 88 },
  };
}

const audioState: ImmersiveAudioState = {
  masterMuted: false,
  ambientEnabled: true,
  narrationEnabled: true,
  ambientTrackId: 'ambient-demo',
  ambientPlaying: true,
  narrationTrackId: null,
  ambientVolume: 0.18,
  narrationVolume: 1,
  narrationPlaying: false,
  narrationCurrentTimeSeconds: 0,
  narrationDurationSeconds: 0,
  narrationCanSeek: false,
  autoplayBlocked: false,
};

const narrationTrack: ImmersiveAudioTrack = {
  id: 'narration-major',
  type: 'narration',
  label: 'Câu chuyện chính',
  src: '/demo/audio/narration-major.mp3',
  rights: 'demo-only',
  locale: 'vi',
};

const transcript: ImmersiveTranscriptContent = {
  locale: 'vi',
  title: 'Câu chuyện chính',
  segments: [{ id: 'segment-1', startMs: 0, endMs: 1000, text: 'Một câu chuyện Hà Tĩnh.' }],
};

const mediaDockActions: ImmersiveMediaDockActions = {
  onEnableSound: async () => true,
  onContinueMuted: () => undefined,
  onPlayNarration: () => undefined,
  onResumeNarration: () => undefined,
  onPauseNarration: () => undefined,
  onToggleMasterMute: () => undefined,
  onSeekNarration: () => undefined,
  onToggleCaptions: () => undefined,
  onOpenTranscript: () => undefined,
  onCloseTranscript: () => undefined,
  onStartAutoTour: () => undefined,
  onPauseAutoTour: () => undefined,
  onResumeAutoTour: () => undefined,
  onSkipStory: () => undefined,
  onPreviousScene: () => undefined,
  onNextScene: () => undefined,
  onExitAutoTour: () => undefined,
  onListenInLocale: () => undefined,
};

const freeExploreAutoTour = {
  isActive: false,
  isPaused: false,
  phase: 'idle' as const,
  currentSceneId: null,
  capabilities: {
    canStart: true,
    canPause: false,
    canResume: false,
    canSkipStory: false,
    canPrevious: false,
    canNext: false,
    canExit: false,
  },
};

const activeAutoTour = {
  isActive: true,
  isPaused: false,
  phase: 'narrating' as const,
  currentSceneId: 'major',
  capabilities: {
    canStart: false,
    canPause: true,
    canResume: false,
    canSkipStory: true,
    canPrevious: true,
    canNext: true,
    canExit: true,
  },
};

describe('reference parity presentation contract', () => {
  it('builds a compact scene rail with current, visited, role, and thumbnail state', () => {
    const vm = buildReferenceParityPresentationVm({
      destination: { slug: 'bien-thien-cam', name: 'Biển Thiên Cầm' },
      nodes: [node('major'), node('connector')],
      currentSceneId: 'major',
      visitedSceneIds: ['major'],
      status: 'ready',
      isTransitioning: false,
      audioState,
      audioTracks: [
        {
          id: 'ambient-demo',
          type: 'ambient',
          label: 'Ambient',
          src: '/demo/audio/ambient.ogg',
          rights: 'demo-only',
        },
      ],
      autoTour: { isRunning: false, isPaused: false },
      hotspots: [],
    });

    expect(vm.destinationName).toBe('Biển Thiên Cầm');
    expect(vm.mediaUnavailable).toBe(false);
    expect(vm.scenes[0]).toMatchObject({
      id: 'major',
      isCurrent: true,
      isVisited: true,
      role: 'major-stop',
      thumbnailUrl: '/demo/360/major/preview.webp',
    });
    expect(vm.scenes[1]?.role).toBe('connector');
    expect(vm.audio.ambientAvailable).toBe(true);
  });

  it('marks the public rail unavailable when every scene lacks usable media', () => {
    const vm = buildReferenceParityPresentationVm({
      destination: { slug: 'son-trang-co-dam', name: 'Sơn Trang Cổ Đạm' },
      nodes: [node('gate', 'low-resolution'), node('culture', 'missing')],
      currentSceneId: null,
      visitedSceneIds: [],
      status: 'unavailable',
      isTransitioning: false,
      autoTour: { isRunning: false, isPaused: false },
      hotspots: [],
    });

    expect(vm.mediaUnavailable).toBe(true);
    expect(vm.scenes.every((scene) => !scene.canNavigate)).toBe(true);
    expect(vm.autoTour.canStart).toBe(false);
  });

  it('preserves an explicit null thumbnail for synthetic fixtures', () => {
    const vm = buildReferenceParityPresentationVm({
      destination: { slug: 'son-trang-co-dam', name: 'Sơn Trang Cổ Đạm' },
      nodes: [{ ...node('gate'), thumbnailUrl: null }, node('culture')],
      currentSceneId: 'gate',
      visitedSceneIds: ['gate'],
      status: 'ready',
      isTransitioning: false,
      autoTour: { isRunning: false, isPaused: false },
    });

    expect(vm.scenes[0]?.thumbnailUrl).toBeNull();
  });

  it('exposes only supported hotspot types and auto-tour state', () => {
    const vm = buildReferenceParityPresentationVm({
      destination: { slug: 'bien-thien-cam', name: 'Biển Thiên Cầm' },
      nodes: [node('one'), node('two')],
      currentSceneId: 'one',
      visitedSceneIds: ['one'],
      status: 'ready',
      isTransitioning: false,
      audioState,
      autoTour: { isRunning: true, isPaused: false },
      hotspots: [
        {
          id: 'next',
          sceneId: 'one',
          type: 'scene-navigation',
          targetSceneId: 'two',
          label: 'Điểm tiếp theo',
          yaw: 0,
          pitch: 0,
        },
      ],
    });

    expect(vm.hotspots).toHaveLength(1);
    expect(vm.hotspots[0]).toMatchObject({ id: 'next', targetSceneId: 'two' });
    expect(vm.autoTour).toMatchObject({ isRunning: true, canStart: true });
  });

  it('free explore exposes an idle listen-story state without activating Auto Tour', () => {
    const vm = buildImmersiveMediaDockVm({
      mode: 'free-explore',
      scene: {
        ...node('major'),
        narrationTrackId: narrationTrack.id,
        transcripts: { vi: transcript },
      },
      tourEligibleNodes: [node('major'), node('connector')],
      currentSceneId: 'major',
      destinationAmbientTrackId: null,
      locale: 'vi',
      audioTracks: [narrationTrack],
      audioState,
      autoTour: freeExploreAutoTour,
      captionsEnabled: false,
      soundGateRequired: false,
    });

    expect(vm.mode).toBe('free-explore');
    expect(vm.sceneLabel).toBe('major');
    expect(vm.narration).toMatchObject({
      available: true,
      status: 'idle',
      activeLocale: 'vi',
      currentTimeSeconds: 0,
      durationSeconds: 0,
      canSeek: false,
    });
    expect(vm.transcript).toMatchObject({ available: true, content: transcript });
    expect(vm.captionsEnabled).toBe(false);
    expect(vm.autoTour).toEqual({
      isActive: false,
      isPaused: false,
      phase: 'idle',
      currentIndex: 0,
      total: 2,
      canStart: true,
      canPause: false,
      canResume: false,
      canSkipStory: false,
      canPrevious: false,
      canNext: false,
      canExit: false,
    });
    expect(mediaDockActions.onPlayNarration).toBeTypeOf('function');
  });

  it('maps narration playback, pause, progress, seeking and Auto Tour index', () => {
    const playingState: ImmersiveAudioState = {
      ...audioState,
      narrationTrackId: narrationTrack.id,
      narrationPlaying: true,
      narrationCurrentTimeSeconds: 12,
      narrationDurationSeconds: 30,
      narrationCanSeek: true,
    };
    const vm = buildImmersiveMediaDockVm({
      mode: 'auto-tour',
      scene: {
        ...node('major'),
        narrationTrackId: narrationTrack.id,
        transcripts: { vi: transcript },
      },
      tourEligibleNodes: [node('major'), node('connector')],
      currentSceneId: 'major',
      destinationAmbientTrackId: null,
      locale: 'vi',
      audioTracks: [narrationTrack],
      audioState: playingState,
      narrationLoading: false,
      autoTour: activeAutoTour,
      captionsEnabled: true,
      soundGateRequired: false,
    });

    expect(vm.narration).toMatchObject({
      status: 'playing',
      currentTimeSeconds: 12,
      durationSeconds: 30,
      canSeek: true,
    });
    expect(vm.captionsEnabled).toBe(true);
    expect(vm.autoTour).toEqual({
      isActive: true,
      isPaused: false,
      phase: 'narrating',
      currentIndex: 1,
      total: 2,
      canStart: false,
      canPause: true,
      canResume: false,
      canSkipStory: true,
      canPrevious: true,
      canNext: true,
      canExit: true,
    });

    const pausedVm = buildImmersiveMediaDockVm({
      mode: 'auto-tour',
      scene: {
        ...node('major'),
        narrationTrackId: narrationTrack.id,
        transcripts: { vi: transcript },
      },
      tourEligibleNodes: [node('major'), node('connector')],
      currentSceneId: 'major',
      destinationAmbientTrackId: null,
      locale: 'vi',
      audioTracks: [narrationTrack],
      audioState: { ...playingState, narrationPlaying: false },
      autoTour: {
        ...activeAutoTour,
        isPaused: true,
        phase: 'paused' as const,
        capabilities: {
          ...activeAutoTour.capabilities,
          canPause: false,
          canResume: true,
        },
      },
      captionsEnabled: true,
      soundGateRequired: false,
    });

    expect(pausedVm.narration.status).toBe('paused');
    expect(pausedVm.autoTour.isPaused).toBe(true);
  });

  it('keeps English audio missing explicit while exposing Vietnamese alternate and transcript', () => {
    const englishTranscript: ImmersiveTranscriptContent = {
      ...transcript,
      locale: 'en',
      title: 'The main story',
    };
    const vm = buildImmersiveMediaDockVm({
      mode: 'free-explore',
      scene: {
        ...node('major'),
        narrationTrackIds: { vi: narrationTrack.id },
        transcripts: { en: englishTranscript },
      },
      tourEligibleNodes: [node('major')],
      currentSceneId: 'major',
      destinationAmbientTrackId: null,
      locale: 'en',
      audioTracks: [narrationTrack],
      audioState,
      autoTour: freeExploreAutoTour,
      captionsEnabled: false,
      soundGateRequired: false,
    });

    expect(vm.narration).toMatchObject({
      available: false,
      status: 'unavailable',
      activeLocale: null,
      alternateLocales: ['vi'],
    });
    expect(vm.transcript).toEqual({ available: true, content: englishTranscript });
  });

  it('keeps transcript usable and exposes the sound gate when audio is unavailable', () => {
    const vm = buildImmersiveMediaDockVm({
      mode: 'free-explore',
      scene: { ...node('major'), transcripts: { vi: transcript } },
      tourEligibleNodes: [node('major')],
      currentSceneId: 'major',
      destinationAmbientTrackId: null,
      locale: 'vi',
      audioTracks: [],
      audioState: { ...audioState, autoplayBlocked: true },
      autoTour: freeExploreAutoTour,
      captionsEnabled: false,
      soundGateRequired: true,
    });

    expect(vm.sound.available).toBe(false);
    expect(vm.soundGateRequired).toBe(false);
    expect(vm.narration).toMatchObject({ available: false, status: 'unavailable' });
    expect(vm.transcript).toEqual({ available: true, content: transcript });
  });

  it('treats a resolved source-capable narration with no file URL as available sound', () => {
    const speechNarrationTrack: ImmersiveAudioTrack = {
      ...narrationTrack,
      src: null,
    };
    const vm = buildImmersiveMediaDockVm({
      mode: 'free-explore',
      scene: {
        ...node('major'),
        narrationTrackId: speechNarrationTrack.id,
        transcripts: { vi: transcript },
      },
      tourEligibleNodes: [node('major')],
      currentSceneId: 'major',
      destinationAmbientTrackId: null,
      locale: 'vi',
      audioTracks: [speechNarrationTrack],
      audioState,
      autoTour: freeExploreAutoTour,
      captionsEnabled: false,
    });

    expect(vm.sound.available).toBe(true);
    expect(vm.narration.available).toBe(true);
  });
});
