import { useEffect, useMemo, useState, type FC } from 'react';

import type { ImmersiveTranscriptContent } from '../../../shared/contracts';
import {
  type ImmersiveMediaDockActions,
  type ImmersiveMediaDockVm,
} from './reference-parity.presentation';
import type { MinimalTravelAmbientControl } from './minimal-travel-controls.presentation';
import { ImmersiveStorySheet } from './ImmersiveStorySheet';
import { ImmersiveTranscriptPanel } from './ImmersiveTranscriptPanel';
import './ImmersiveMediaDock.css';

export interface ImmersiveMediaDockProps {
  vm: ImmersiveMediaDockVm;
  actions: ImmersiveMediaDockActions;
  ambientControl: MinimalTravelAmbientControl;
  externalSecondarySurfaceOpen?: boolean;
  onOpenSecondarySurface?(): void;
}

function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}

function getActiveTranscriptSegment(
  content: ImmersiveTranscriptContent | null,
  currentTimeSeconds: number,
) {
  if (!content) {
    return null;
  }

  if (content.timingMode !== 'timed') {
    return null;
  }

  const currentTimeMs = Math.max(0, currentTimeSeconds * 1000);
  return (
    content.segments.find(
      (segment) =>
        segment.startMs !== null &&
        currentTimeMs >= segment.startMs &&
        (segment.endMs === null || currentTimeMs < segment.endMs),
    ) ?? null
  );
}

export const ImmersiveMediaDock: FC<ImmersiveMediaDockProps> = ({
  vm,
  actions,
  ambientControl,
  externalSecondarySurfaceOpen = false,
  onOpenSecondarySurface,
}) => {
  const [isStorySheetOpen, setIsStorySheetOpen] = useState(false);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [soundGateDismissed, setSoundGateDismissed] = useState(false);

  useEffect(() => {
    if (!vm.soundGateRequired) {
      setSoundGateDismissed(false);
    }
  }, [vm.soundGateRequired]);

  useEffect(() => {
    if (!externalSecondarySurfaceOpen) {
      return;
    }

    setIsStorySheetOpen(false);
    if (isTranscriptOpen) {
      actions.onCloseTranscript();
      setIsTranscriptOpen(false);
    }
  }, [actions, externalSecondarySurfaceOpen, isTranscriptOpen]);

  const activeCaption = useMemo(
    () =>
      vm.captionsEnabled
        ? getActiveTranscriptSegment(vm.transcript.content, vm.narration.currentTimeSeconds)
        : null,
    [vm.captionsEnabled, vm.narration.currentTimeSeconds, vm.transcript.content],
  );

  const openTranscript = () => {
    onOpenSecondarySurface?.();
    actions.onOpenTranscript();
    setIsStorySheetOpen(false);
    setIsTranscriptOpen(true);
  };

  const openStorySheet = () => {
    onOpenSecondarySurface?.();
    setIsTranscriptOpen(false);
    setIsStorySheetOpen(true);
  };

  const closeTranscript = () => {
    actions.onCloseTranscript();
    setIsTranscriptOpen(false);
  };

  const enableSound = async () => {
    try {
      const didEnable = await actions.onEnableSound();
      setSoundGateDismissed(didEnable);
    } catch {
      setSoundGateDismissed(false);
    }
  };

  const continueMuted = () => {
    setSoundGateDismissed(true);
    actions.onContinueMuted();
  };

  const isNarrationUnavailable = !vm.narration.available || vm.narration.status === 'unavailable';
  const isNarrationPlayable = !isNarrationUnavailable && vm.narration.status !== 'loading';
  const hasMeaningfulNarrationProgress = vm.narration.durationSeconds > 0;
  const hasAutoTourActive = vm.mode === 'auto-tour' && vm.autoTour.isActive;
  const storyState = hasAutoTourActive ? 'auto-tour' : vm.narration.status;

  const hasStoryCapability = vm.narration.available || vm.transcript.available;

  return (
    <section
      className="immersive-media-dock"
      role="region"
      aria-label="Media dock trải nghiệm"
      data-mode={vm.mode}
      data-scene-id={vm.sceneId ?? undefined}
      data-presentation="cinematic-wayfinding"
      data-story-state={storyState}
    >
      {/* Sound Gate recovery prompt */}
      {vm.soundGateRequired && !soundGateDismissed ? (
        <div
          className="immersive-media-dock__sound-gate"
          role="group"
          aria-label="Âm thanh trải nghiệm"
        >
          <p>Âm thanh trải nghiệm đang chờ bạn bật.</p>
          <button type="button" onClick={enableSound}>
            Bật âm thanh trải nghiệm
          </button>
          <button type="button" onClick={continueMuted}>
            Tiếp tục không âm thanh
          </button>
        </div>
      ) : null}

      {/* Active Caption overlay */}
      {activeCaption ? (
        <div className="immersive-media-dock__captions" aria-label="Phụ đề câu chuyện">
          {activeCaption.text}
        </div>
      ) : null}

      {/* Default Lightweight Story Entry / Compact Now-Playing */}
      {hasStoryCapability ? (
        <div className="immersive-media-dock__story-bar">
          {/* Auto Tour owns narration transport; this surface remains informational. */}
          {hasAutoTourActive ? (
            <div className="immersive-media-dock__tour-story-bar">
              <span className="immersive-media-dock__tour-story-status">
                {vm.autoTour.isPaused
                  ? 'Hành trình đang tạm dừng'
                  : vm.narration.status === 'playing'
                    ? 'Đang nghe câu chuyện'
                    : 'Câu chuyện theo hành trình'}
              </span>
              <button
                type="button"
                className="immersive-media-dock__sheet-trigger"
                onClick={openStorySheet}
                aria-label="Mở tùy chọn câu chuyện"
                title="Mở tùy chọn câu chuyện"
              >
                <span className="immersive-media-dock__sheet-trigger-icon" aria-hidden="true">
                  <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
                    <circle cx="5" cy="10" r="1.5" />
                    <circle cx="10" cy="10" r="1.5" />
                    <circle cx="15" cy="10" r="1.5" />
                  </svg>
                </span>
                <span className="immersive-media-dock__sheet-trigger-label">Tùy chọn</span>
              </button>
            </div>
          ) : vm.narration.status === 'playing' ? (
            /* Case 1: Free Explore narration is playing */
            <div className="immersive-media-dock__now-playing">
              <button
                type="button"
                className="immersive-media-dock__action-btn immersive-media-dock__action-btn--primary"
                onClick={actions.onPauseNarration}
                aria-label="Tạm dừng câu chuyện"
              >
                <span className="immersive-media-dock__btn-icon" aria-hidden="true">
                  <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
                    <rect x="5" y="4" width="3" height="12" rx="1" />
                    <rect x="12" y="4" width="3" height="12" rx="1" />
                  </svg>
                </span>
                <span>Tạm dừng câu chuyện</span>
              </button>
              {hasMeaningfulNarrationProgress ? (
                <div
                  className="immersive-media-dock__narration-progress immersive-media-dock__narration-progress--desktop-only"
                  aria-label="Điều khiển câu chuyện"
                >
                  <label>
                    <span>Tiến độ câu chuyện</span>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, vm.narration.durationSeconds)}
                      step={0.1}
                      value={Math.min(
                        vm.narration.currentTimeSeconds,
                        vm.narration.durationSeconds,
                      )}
                      disabled={!vm.narration.canSeek}
                      onChange={(event) => actions.onSeekNarration(Number(event.target.value))}
                      aria-label="Tiến độ câu chuyện"
                    />
                  </label>
                  <output aria-label="Thời lượng câu chuyện">
                    {formatDuration(vm.narration.currentTimeSeconds)} /{' '}
                    {formatDuration(vm.narration.durationSeconds)}
                  </output>
                </div>
              ) : null}
              {vm.transcript.available && vm.transcript.capability === 'timed-captions' ? (
                <button
                  type="button"
                  className="immersive-media-dock__captions-toggle immersive-media-dock__captions-toggle--desktop-only"
                  onClick={actions.onToggleCaptions}
                  aria-pressed={vm.captionsEnabled}
                  aria-label={vm.captionsEnabled ? 'Tắt phụ đề' : 'Bật phụ đề'}
                >
                  {vm.captionsEnabled ? 'Tắt phụ đề' : 'Bật phụ đề'}
                </button>
              ) : null}
              <button
                type="button"
                className="immersive-media-dock__sheet-trigger"
                onClick={openStorySheet}
                aria-label="Mở tùy chọn câu chuyện"
                title="Mở tùy chọn câu chuyện"
              >
                <span className="immersive-media-dock__sheet-trigger-icon" aria-hidden="true">
                  <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
                    <circle cx="5" cy="10" r="1.5" />
                    <circle cx="10" cy="10" r="1.5" />
                    <circle cx="15" cy="10" r="1.5" />
                  </svg>
                </span>
                <span className="immersive-media-dock__sheet-trigger-label">Tùy chọn</span>
              </button>
            </div>
          ) : vm.narration.status === 'paused' ? (
            /* Case 2: Narration is Paused */
            <div className="immersive-media-dock__paused-bar">
              <button
                type="button"
                className="immersive-media-dock__action-btn immersive-media-dock__action-btn--primary"
                onClick={actions.onResumeNarration}
                aria-label="Tiếp tục câu chuyện"
              >
                <span className="immersive-media-dock__btn-icon" aria-hidden="true">
                  <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                </span>
                <span>Tiếp tục câu chuyện</span>
              </button>
              {hasMeaningfulNarrationProgress ? (
                <div
                  className="immersive-media-dock__narration-progress immersive-media-dock__narration-progress--desktop-only"
                  aria-label="Điều khiển câu chuyện"
                >
                  <label>
                    <span>Tiến độ câu chuyện</span>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, vm.narration.durationSeconds)}
                      step={0.1}
                      value={Math.min(
                        vm.narration.currentTimeSeconds,
                        vm.narration.durationSeconds,
                      )}
                      disabled={!vm.narration.canSeek}
                      onChange={(event) => actions.onSeekNarration(Number(event.target.value))}
                      aria-label="Tiến độ câu chuyện"
                    />
                  </label>
                  <output aria-label="Thời lượng câu chuyện">
                    {formatDuration(vm.narration.currentTimeSeconds)} /{' '}
                    {formatDuration(vm.narration.durationSeconds)}
                  </output>
                </div>
              ) : null}
              <button
                type="button"
                className="immersive-media-dock__sheet-trigger"
                onClick={openStorySheet}
                aria-label="Mở tùy chọn câu chuyện"
                title="Mở tùy chọn câu chuyện"
              >
                <span className="immersive-media-dock__sheet-trigger-icon" aria-hidden="true">
                  <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
                    <circle cx="5" cy="10" r="1.5" />
                    <circle cx="10" cy="10" r="1.5" />
                    <circle cx="15" cy="10" r="1.5" />
                  </svg>
                </span>
                <span className="immersive-media-dock__sheet-trigger-label">Tùy chọn</span>
              </button>
            </div>
          ) : isNarrationPlayable ? (
            /* Case 3: Narration is Idle / Playable */
            <div className="immersive-media-dock__idle-bar">
              <button
                type="button"
                className="immersive-media-dock__action-btn immersive-media-dock__action-btn--primary"
                onClick={actions.onPlayNarration}
                aria-label="Nghe câu chuyện"
              >
                <span className="immersive-media-dock__btn-icon" aria-hidden="true">
                  <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                </span>
                <span>Nghe câu chuyện</span>
              </button>
              <button
                type="button"
                className="immersive-media-dock__sheet-trigger"
                onClick={openStorySheet}
                aria-label="Mở tùy chọn câu chuyện"
                title="Mở tùy chọn câu chuyện"
              >
                <span className="immersive-media-dock__sheet-trigger-icon" aria-hidden="true">
                  <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
                    <circle cx="5" cy="10" r="1.5" />
                    <circle cx="10" cy="10" r="1.5" />
                    <circle cx="15" cy="10" r="1.5" />
                  </svg>
                </span>
                <span className="immersive-media-dock__sheet-trigger-label">Tùy chọn</span>
              </button>
            </div>
          ) : isNarrationUnavailable && vm.transcript.available ? (
            /* Case 4: Transcript-Only (Narration is unavailable) */
            <div className="immersive-media-dock__transcript-bar">
              <button
                type="button"
                className="immersive-media-dock__action-btn"
                onClick={openTranscript}
                aria-label="Đọc câu chuyện"
              >
                Đọc câu chuyện
              </button>
              <button
                type="button"
                className="immersive-media-dock__sheet-trigger"
                onClick={openStorySheet}
                aria-label="Mở tùy chọn câu chuyện"
                title="Mở tùy chọn câu chuyện"
              >
                <span className="immersive-media-dock__sheet-trigger-icon" aria-hidden="true">
                  <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
                    <circle cx="5" cy="10" r="1.5" />
                    <circle cx="10" cy="10" r="1.5" />
                    <circle cx="15" cy="10" r="1.5" />
                  </svg>
                </span>
                <span className="immersive-media-dock__sheet-trigger-label">Tùy chọn</span>
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Story Sheet Modal / Disclosure */}
      {isStorySheetOpen ? (
        <ImmersiveStorySheet
          vm={vm}
          actions={actions}
          ambientControl={ambientControl}
          onClose={() => setIsStorySheetOpen(false)}
          onOpenTranscript={openTranscript}
        />
      ) : null}

      {/* Transcript Bottom Sheet / Panel */}
      {isTranscriptOpen && vm.transcript.content ? (
        <ImmersiveTranscriptPanel content={vm.transcript.content} onClose={closeTranscript} />
      ) : null}
    </section>
  );
};
