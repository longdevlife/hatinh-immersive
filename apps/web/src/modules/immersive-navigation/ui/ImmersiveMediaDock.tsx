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
}) => {
  const [isStorySheetOpen, setIsStorySheetOpen] = useState(false);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [soundGateDismissed, setSoundGateDismissed] = useState(false);

  useEffect(() => {
    if (!vm.soundGateRequired) {
      setSoundGateDismissed(false);
    }
  }, [vm.soundGateRequired]);

  const activeCaption = useMemo(
    () =>
      vm.captionsEnabled
        ? getActiveTranscriptSegment(vm.transcript.content, vm.narration.currentTimeSeconds)
        : null,
    [vm.captionsEnabled, vm.narration.currentTimeSeconds, vm.transcript.content],
  );

  const openTranscript = () => {
    actions.onOpenTranscript();
    setIsStorySheetOpen(false);
    setIsTranscriptOpen(true);
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
              <span className="immersive-media-dock__scene-label">{vm.sceneLabel}</span>
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
                onClick={() => setIsStorySheetOpen(true)}
                aria-label="Mở câu chuyện"
                title="Mở câu chuyện"
              >
                Mở câu chuyện
              </button>
            </div>
          ) : vm.narration.status === 'playing' ? (
            /* Case 1: Free Explore narration is playing */
            <div className="immersive-media-dock__now-playing">
              <span className="immersive-media-dock__scene-label">{vm.sceneLabel}</span>
              <button
                type="button"
                className="immersive-media-dock__action-btn"
                onClick={actions.onPauseNarration}
                aria-label="Tạm dừng câu chuyện"
              >
                Tạm dừng câu chuyện
              </button>
              {hasMeaningfulNarrationProgress ? (
                <div
                  className="immersive-media-dock__narration-progress"
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
                  className="immersive-media-dock__captions-toggle"
                  onClick={actions.onToggleCaptions}
                  aria-pressed={vm.captionsEnabled}
                  aria-label={vm.captionsEnabled ? 'Tắt phụ đề' : 'Bật phụ đề'}
                >
                  {vm.captionsEnabled ? 'Tắt phụ đề' : 'Bật phụ đề'}
                </button>
              ) : null}
              {vm.transcript.available ? (
                <button
                  type="button"
                  className="immersive-media-dock__transcript-btn"
                  onClick={openTranscript}
                  aria-label="Mở bản chép lời"
                >
                  Bản chép lời
                </button>
              ) : null}
              <button
                type="button"
                className="immersive-media-dock__sheet-trigger"
                onClick={() => setIsStorySheetOpen(true)}
                aria-label="Mở câu chuyện"
                title="Mở câu chuyện"
              >
                Mở câu chuyện
              </button>
            </div>
          ) : vm.narration.status === 'paused' ? (
            /* Case 2: Narration is Paused */
            <div className="immersive-media-dock__paused-bar">
              <span className="immersive-media-dock__scene-label">{vm.sceneLabel}</span>
              <button
                type="button"
                className="immersive-media-dock__action-btn"
                onClick={actions.onResumeNarration}
                aria-label="Tiếp tục câu chuyện"
              >
                Tiếp tục câu chuyện
              </button>
              {hasMeaningfulNarrationProgress ? (
                <div
                  className="immersive-media-dock__narration-progress"
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
                onClick={() => setIsStorySheetOpen(true)}
                aria-label="Mở câu chuyện"
                title="Mở câu chuyện"
              >
                Mở câu chuyện
              </button>
            </div>
          ) : isNarrationPlayable ? (
            /* Case 3: Narration is Idle / Playable */
            <div className="immersive-media-dock__idle-bar">
              <button
                type="button"
                className="immersive-media-dock__action-btn"
                onClick={actions.onPlayNarration}
                aria-label="Nghe câu chuyện"
              >
                Nghe câu chuyện
              </button>
              <button
                type="button"
                className="immersive-media-dock__sheet-trigger"
                onClick={() => setIsStorySheetOpen(true)}
                aria-label="Mở câu chuyện"
                title="Mở câu chuyện"
              >
                Mở câu chuyện
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
                onClick={() => setIsStorySheetOpen(true)}
                aria-label="Mở câu chuyện"
                title="Mở câu chuyện"
              >
                Mở câu chuyện
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
