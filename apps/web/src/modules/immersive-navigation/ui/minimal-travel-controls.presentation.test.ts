import { describe, expect, it, vi } from 'vitest';

import type {
  ImmersiveMediaDockActions,
  ImmersiveMediaDockVm,
  ReferenceParityPresentationActions,
  ReferenceParityPresentationVm,
} from './reference-parity.presentation';
import { createMinimalTravelControlBindings } from './minimal-travel-controls.presentation';

describe('minimal travel control presentation bindings', () => {
  it('composes ambient and journey controls from frozen contracts without deriving domain state', () => {
    const onToggleAmbient = vi.fn();
    const onStartAutoTour = vi.fn();
    const autoTour: ImmersiveMediaDockVm['autoTour'] = {
      isActive: false,
      isPaused: false,
      currentIndex: 0,
      total: 3,
      canStart: true,
      canPause: false,
      canResume: false,
      canSkipStory: false,
      canPrevious: false,
      canNext: false,
      canExit: false,
    };

    const result = createMinimalTravelControlBindings({
      referenceVm: {
        audio: { ambientAvailable: true, ambientEnabled: false },
      } as ReferenceParityPresentationVm,
      referenceActions: {
        onBack: vi.fn(),
        onToggleLocale: vi.fn(),
        onSelectScene: vi.fn(),
        onSelectHotspot: vi.fn(),
        onToggleMinimap: vi.fn(),
        onToggleMasterMute: vi.fn(),
        onEnableAudio: vi.fn(),
        onToggleAmbient,
        onToggleNarration: vi.fn(),
        onToggleAutoTour: vi.fn(),
        onRetry: vi.fn(),
        onShare: vi.fn().mockResolvedValue('copied'),
        onFullscreen: vi.fn(),
      } satisfies ReferenceParityPresentationActions,
      dockVm: { autoTour } as ImmersiveMediaDockVm,
      dockActions: {
        onEnableSound: vi.fn().mockResolvedValue(true),
        onContinueMuted: vi.fn(),
        onPlayNarration: vi.fn(),
        onResumeNarration: vi.fn(),
        onPauseNarration: vi.fn(),
        onToggleMasterMute: vi.fn(),
        onSeekNarration: vi.fn(),
        onToggleCaptions: vi.fn(),
        onOpenTranscript: vi.fn(),
        onCloseTranscript: vi.fn(),
        onStartAutoTour,
        onPauseAutoTour: vi.fn(),
        onResumeAutoTour: vi.fn(),
        onSkipStory: vi.fn(),
        onPreviousScene: vi.fn(),
        onNextScene: vi.fn(),
        onExitAutoTour: vi.fn(),
        onListenInLocale: vi.fn(),
      } satisfies ImmersiveMediaDockActions,
    });

    expect(result.ambient).toEqual({
      available: true,
      enabled: false,
      onToggle: onToggleAmbient,
    });
    expect(result.journey.state).toBe(autoTour);
    expect(result.journey.actions.onStartAutoTour).toBe(onStartAutoTour);
  });
});
