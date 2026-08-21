import { describe, expect, it } from 'vitest';

import type { ImmersiveAudioState } from '../../immersive-audio';
import type {
  ImmersiveAudioTrack,
  ImmersiveCaptionCapability,
  PanoramaNode,
} from '../../../shared/contracts';
import {
  buildImmersiveMediaDockVm,
  type ImmersiveMediaDockVmInput,
} from '../ui/reference-parity.presentation';
import {
  toImmersiveSceneTransactionContract,
  type ImmersiveMediaDockContract,
} from './immersive-contracts';

const scene: PanoramaNode = {
  id: 'scene-a',
  name: 'Cảnh A',
  destinationSlug: 'bien-thien-cam',
  panoramaUrl: '/demo/360/scene-a/manifest.json',
  previewUrl: '/demo/360/scene-a/preview.webp',
  mediaQuality: 'ready',
  mediaRights: 'demo-only',
  narrationTrackId: 'narration-a',
  transcripts: {},
  lat: 18.27,
  lng: 106.09,
  initialView: { heading: 0, pitch: 0, fov: 88 },
};

const narration: ImmersiveAudioTrack = {
  id: 'narration-a',
  type: 'narration',
  label: 'Câu chuyện A',
  src: '/demo/audio/narration-a.mp3',
  rights: 'demo-only',
  locale: 'vi',
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

const autoTourInput: ImmersiveMediaDockVmInput['autoTour'] = {
  isActive: true,
  isPaused: false,
  phase: 'narrating',
  currentSceneId: 'scene-a',
  capabilities: {
    canStart: false,
    canPause: true,
    canResume: false,
    canSkipStory: true,
    canPrevious: false,
    canNext: true,
    canExit: true,
  },
};

function buildDockContract(): ImmersiveMediaDockContract {
  return buildImmersiveMediaDockVm({
    mode: 'auto-tour',
    scene,
    tourEligibleNodes: [scene],
    currentSceneId: scene.id,
    destinationAmbientTrackId: null,
    locale: 'vi',
    audioTracks: [narration],
    canPlayTrack: () => true,
    audioState,
    autoTour: autoTourInput,
    captionsEnabled: false,
    soundGateRequired: false,
  });
}

describe('Phase 2 frozen immersive contracts', () => {
  it('keeps caption capability as the exact closed product union', () => {
    const capabilities: ImmersiveCaptionCapability[] = [
      'none',
      'plain-transcript',
      'timed-captions',
    ];

    expect(capabilities).toEqual(['none', 'plain-transcript', 'timed-captions']);
  });

  it('does not expose the internal Auto Tour phase through the Media Dock contract', () => {
    const dock = buildDockContract();

    expect('phase' in dock.autoTour).toBe(false);
    expect(dock.autoTour).toMatchObject({
      isActive: true,
      isPaused: false,
      currentIndex: 1,
      total: 1,
      canPause: true,
      canSkipStory: true,
      canNext: true,
    });
  });

  it('projects only committed/requested scene identity and observable transition status', () => {
    expect(
      toImmersiveSceneTransactionContract({
        committedSceneId: 'scene-a',
        requestedSceneId: 'scene-b',
        transition: 'navigating-scene',
      }),
    ).toEqual({
      committedSceneId: 'scene-a',
      requestedSceneId: 'scene-b',
      status: 'navigating-scene',
      isPending: true,
    });
  });
});
