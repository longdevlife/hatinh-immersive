import { beforeEach, describe, expect, it } from 'vitest';

import type {
  ImmersiveAudioTrack,
  ImmersiveTranscriptContent,
  PanoramaNode,
} from '../../../shared/contracts';
import type { ImmersiveAudioState } from '../../immersive-audio';
import { getDemoManifest } from '../fake-mode/demo-catalog';
import {
  buildImmersiveMediaDockVm,
  buildReferenceParityPresentationVm,
} from '../ui/reference-parity.presentation';
import { useImmersiveNavigation } from './navigation.store';
import { toImmersiveSceneTransactionContract } from './immersive-contracts';

const sceneA: PanoramaNode = {
  id: 'scene-a',
  name: 'Lối dạo',
  destinationSlug: 'bien-thien-cam',
  panoramaUrl: '/demo/360/scene-a/manifest.json',
  previewUrl: '/demo/360/scene-a/preview.webp',
  mediaQuality: 'ready',
  mediaRights: 'demo-only',
  narrationTrackIds: { vi: 'narration-a-vi' },
  lat: 18.27,
  lng: 106.09,
  initialView: { heading: 0, pitch: 0, fov: 88 },
};

const narrationVi: ImmersiveAudioTrack = {
  id: 'narration-a-vi',
  type: 'narration',
  label: 'Lời kể tiếng Việt',
  src: '/demo/audio/narration-a.mp3',
  rights: 'demo-only',
  locale: 'vi',
};

const transcriptVi: ImmersiveTranscriptContent = {
  id: 'transcript-a-vi',
  locale: 'vi',
  title: 'Lối dạo',
  timingMode: 'timed',
  segments: [{ id: 'intro', startMs: 0, endMs: null, text: 'Một lối dạo ven biển.' }],
};

const audioState: ImmersiveAudioState = {
  masterMuted: false,
  ambientEnabled: true,
  narrationEnabled: true,
  ambientTrackId: null,
  ambientPlaying: false,
  narrationTrackId: null,
  ambientVolume: 0.18,
  narrationVolume: 1,
  narrationPlaying: false,
  narrationCurrentTimeSeconds: 0,
  narrationDurationSeconds: 0,
  narrationCanSeek: false,
  autoplayBlocked: false,
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

describe('Phase 2 product acceptance contracts', () => {
  beforeEach(() => {
    useImmersiveNavigation.getState().reset();
  });

  it('keeps public Sơn Trang unavailable while explicit synthetic mode retains internal fixtures', () => {
    const publicManifest = getDemoManifest('son-trang-co-dam', 'public');
    const syntheticManifest = getDemoManifest('son-trang-co-dam', 'synthetic');

    expect(publicManifest.destination.defaultSceneId).toBeNull();
    expect(publicManifest.panoramaNodes).toHaveLength(0);
    expect(publicManifest.audioTracks).toHaveLength(0);
    expect(syntheticManifest.panoramaNodes).toHaveLength(8);
    expect(syntheticManifest.panoramaNodes.every((node) => node.panoramaUrl)).toBe(true);
  });

  it('projects one truthful unavailable presentation without navigable Auto Tour capability', () => {
    const vm = buildReferenceParityPresentationVm({
      destination: { slug: 'son-trang-co-dam', name: 'Sơn Trang Cổ Đạm' },
      nodes: [],
      currentSceneId: null,
      visitedSceneIds: [],
      status: 'unavailable',
      isTransitioning: false,
      locale: 'vi',
      canPlayTrack: () => false,
      destinationAmbientTrackId: null,
      autoTour: { isRunning: false, isPaused: false },
    });

    expect(vm).toMatchObject({
      mediaUnavailable: true,
      currentSceneId: null,
      scenes: [],
      autoTour: { isRunning: false, canStart: false },
    });
  });

  it('keeps Free Explore narration manual and exposes timed captions independently', () => {
    const vm = buildImmersiveMediaDockVm({
      mode: 'free-explore',
      scene: { ...sceneA, transcripts: { vi: transcriptVi } },
      tourEligibleNodes: [sceneA],
      currentSceneId: sceneA.id,
      destinationAmbientTrackId: null,
      locale: 'vi',
      audioTracks: [narrationVi],
      canPlayTrack: () => true,
      audioState,
      autoTour: freeExploreAutoTour,
      captionsEnabled: false,
      soundGateRequired: false,
    });

    expect(vm.mode).toBe('free-explore');
    expect(vm.narration).toMatchObject({ available: true, status: 'idle', activeLocale: 'vi' });
    expect(vm.transcript).toMatchObject({
      available: true,
      capability: 'timed-captions',
    });
    expect(vm.autoTour).toMatchObject({ isActive: false, isPaused: false, canStart: true });
    expect('phase' in vm.autoTour).toBe(false);
  });

  it('does not silently use Vietnamese narration for an English request', () => {
    const englishTranscript: ImmersiveTranscriptContent = {
      id: 'transcript-a-en',
      locale: 'en',
      title: 'The walk',
      timingMode: 'plain',
      segments: [{ id: 'intro', startMs: null, endMs: null, text: 'A walk by the sea.' }],
    };
    const vm = buildImmersiveMediaDockVm({
      mode: 'free-explore',
      scene: {
        ...sceneA,
        transcripts: { en: englishTranscript },
      },
      tourEligibleNodes: [sceneA],
      currentSceneId: sceneA.id,
      destinationAmbientTrackId: null,
      locale: 'en',
      audioTracks: [narrationVi],
      canPlayTrack: () => false,
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
    expect(vm.transcript).toMatchObject({
      available: true,
      capability: 'plain-transcript',
      content: englishTranscript,
    });
  });

  it('projects Auto Tour capabilities without exposing controller phases', () => {
    const vm = buildImmersiveMediaDockVm({
      mode: 'auto-tour',
      scene: sceneA,
      tourEligibleNodes: [sceneA, { ...sceneA, id: 'scene-b', name: 'Bờ biển' }],
      currentSceneId: sceneA.id,
      destinationAmbientTrackId: null,
      locale: 'vi',
      audioTracks: [narrationVi],
      canPlayTrack: () => true,
      audioState,
      autoTour: {
        isActive: true,
        isPaused: false,
        phase: 'narrating',
        currentSceneId: sceneA.id,
        capabilities: {
          canStart: false,
          canPause: true,
          canResume: false,
          canSkipStory: true,
          canPrevious: false,
          canNext: true,
          canExit: true,
        },
      },
      captionsEnabled: false,
      soundGateRequired: false,
    });

    expect(vm.autoTour).toMatchObject({
      isActive: true,
      isPaused: false,
      currentIndex: 1,
      total: 2,
      canPause: true,
      canSkipStory: true,
      canNext: true,
      canExit: true,
    });
    expect('phase' in vm.autoTour).toBe(false);
  });

  it('preserves committed scene while a newer scene request is pending and ignores stale completion', () => {
    const navigation = useImmersiveNavigation.getState();
    navigation.enterPanorama('scene-a');
    const requestB = navigation.navigateToScene('scene-b');
    const requestC = navigation.navigateToScene('scene-c');

    expect(toImmersiveSceneTransactionContract(useImmersiveNavigation.getState())).toMatchObject({
      committedSceneId: 'scene-a',
      requestedSceneId: 'scene-c',
      status: 'navigating-scene',
      isPending: true,
    });

    navigation.commitSceneTransition(requestB!, { heading: 0, pitch: 0, fov: 88 });
    expect(useImmersiveNavigation.getState().committedSceneId).toBe('scene-a');

    navigation.commitSceneTransition(requestC!, { heading: 10, pitch: 0, fov: 88 });
    expect(toImmersiveSceneTransactionContract(useImmersiveNavigation.getState())).toEqual({
      committedSceneId: 'scene-c',
      requestedSceneId: null,
      status: 'idle',
      isPending: false,
    });
  });
});
