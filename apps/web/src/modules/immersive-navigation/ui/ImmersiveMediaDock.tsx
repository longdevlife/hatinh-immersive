import { useEffect, useMemo, useState, type ChangeEvent, type FC } from 'react';

import type { ImmersiveLocale, ImmersiveTranscriptContent } from '../../../shared/contracts';
import {
  type ImmersiveMediaDockActions,
  type ImmersiveMediaDockVm,
} from './reference-parity.presentation';
import { ImmersiveTranscriptPanel } from './ImmersiveTranscriptPanel';
import './ImmersiveMediaDock.css';

export interface ImmersiveMediaDockProps {
  vm: ImmersiveMediaDockVm;
  actions: ImmersiveMediaDockActions;
}

const LOCALE_LABELS: Record<ImmersiveLocale, string> = {
  vi: 'Tiếng Việt',
  en: 'English',
};

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

export const ImmersiveMediaDock: FC<ImmersiveMediaDockProps> = ({ vm, actions }) => {
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [soundGateDismissed, setSoundGateDismissed] = useState(false);
  const [isMobileDockExpanded, setIsMobileDockExpanded] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? false : true,
  );

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

  const onSeek = (event: ChangeEvent<HTMLInputElement>) => {
    actions.onSeekNarration(Number(event.target.value));
  };

  const openTranscript = () => {
    actions.onOpenTranscript();
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

  const toggleSound = async () => {
    if (vm.sound.masterMuted) {
      try {
        const didEnable = await actions.onEnableSound();
        setSoundGateDismissed(didEnable);
      } catch {
        setSoundGateDismissed(false);
      }
      return;
    }

    actions.onToggleMasterMute();
  };

  const narrationActionLabel =
    vm.narration.status === 'playing'
      ? 'Tạm dừng câu chuyện'
      : vm.narration.status === 'paused'
        ? 'Tiếp tục câu chuyện'
        : 'Nghe câu chuyện';
  const isNarrationPlayable = vm.narration.available && vm.narration.status !== 'loading';
  const hasMeaningfulNarrationProgress = vm.narration.durationSeconds > 0;
  const hasAudioControls = vm.sound.available || vm.narration.available;
  const hasAutoTourControls = vm.mode === 'auto-tour' && vm.autoTour.isActive;
  const storyState = hasAutoTourControls ? 'auto-tour' : vm.narration.status;

  const handleNarrationAction = () => {
    if (vm.narration.status === 'playing') {
      actions.onPauseNarration();
    } else if (vm.narration.status === 'paused') {
      actions.onResumeNarration();
    } else {
      actions.onPlayNarration();
    }
  };

  return (
    <section
      className="immersive-media-dock"
      role="region"
      aria-label="Media dock trải nghiệm"
      data-mode={vm.mode}
      data-scene-id={vm.sceneId ?? undefined}
      data-mobile-expanded={isMobileDockExpanded}
      data-presentation="cinematic-wayfinding"
      data-story-state={storyState}
    >
      <div className="immersive-media-dock__utility-row">
        <span className="immersive-media-dock__mobile-scene-label">{vm.sceneLabel}</span>
        {!isMobileDockExpanded && vm.mode === 'free-explore' && isNarrationPlayable ? (
          <button
            type="button"
            className="immersive-media-dock__mobile-primary-action"
            onClick={handleNarrationAction}
            aria-label={narrationActionLabel}
          >
            {narrationActionLabel}
          </button>
        ) : null}
        {!isMobileDockExpanded && hasAutoTourControls ? (
          <button
            type="button"
            className="immersive-media-dock__mobile-primary-action immersive-media-dock__mobile-primary-action--tour"
            onClick={vm.autoTour.isPaused ? actions.onResumeAutoTour : actions.onPauseAutoTour}
            aria-label={
              vm.autoTour.isPaused ? 'Tiếp tục tự động tham quan' : 'Tạm dừng tự động tham quan'
            }
          >
            {vm.autoTour.isPaused ? 'Tiếp tục tour' : 'Đang tham quan'}
          </button>
        ) : null}
        {vm.sound.available && (!vm.soundGateRequired || soundGateDismissed) ? (
          <button
            type="button"
            className="immersive-media-dock__sound-toggle"
            onClick={toggleSound}
            aria-pressed={!vm.sound.masterMuted}
            aria-label={vm.sound.masterMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          >
            <svg
              className="immersive-media-dock__sound-icon"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M11 5 6 9H3v6h3l5 4V5Z" />
              {vm.sound.masterMuted ? (
                <path d="m17 9 4 6m0-6-4 6" />
              ) : (
                <path d="M15 9.5a4 4 0 0 1 0 5" />
              )}
            </svg>
            <span className="immersive-media-dock__sound-label">
              {vm.sound.masterMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            </span>
          </button>
        ) : null}
        {hasAudioControls || hasAutoTourControls ? (
          <button
            type="button"
            className="immersive-media-dock__mobile-toggle"
            aria-expanded={isMobileDockExpanded}
            aria-controls="immersive-media-dock-content"
            aria-label={
              isMobileDockExpanded ? 'Thu gọn điều khiển trải nghiệm' : 'Mở điều khiển trải nghiệm'
            }
            onClick={() => setIsMobileDockExpanded((expanded) => !expanded)}
          >
            {isMobileDockExpanded ? 'Thu gọn' : 'Mở điều khiển'}
          </button>
        ) : null}
      </div>

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

      <div
        id="immersive-media-dock-content"
        className="immersive-media-dock__content"
        hidden={!isMobileDockExpanded}
      >
        {activeCaption ? (
          <div className="immersive-media-dock__captions" aria-label="Phụ đề câu chuyện">
            {activeCaption.text}
          </div>
        ) : null}

        <div className="immersive-media-dock__story" aria-label="Câu chuyện hiện tại">
          <strong>{vm.sceneLabel}</strong>
          {vm.mode === 'free-explore' ? (
            isNarrationPlayable ? (
              <button
                type="button"
                onClick={handleNarrationAction}
                disabled={vm.narration.status === 'loading'}
              >
                {narrationActionLabel}
              </button>
            ) : vm.transcript.available ? (
              <p>Âm thanh thuyết minh chưa có</p>
            ) : null
          ) : null}

          {vm.narration.available && hasMeaningfulNarrationProgress ? (
            <div className="immersive-media-dock__narration" aria-label="Điều khiển câu chuyện">
              <label>
                <span>Tiến độ câu chuyện</span>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, vm.narration.durationSeconds)}
                  step={0.1}
                  value={Math.min(vm.narration.currentTimeSeconds, vm.narration.durationSeconds)}
                  disabled={!vm.narration.canSeek}
                  onChange={onSeek}
                  aria-label="Tiến độ câu chuyện"
                />
              </label>
              <output aria-label="Thời lượng câu chuyện">
                {formatDuration(vm.narration.currentTimeSeconds)} /{' '}
                {formatDuration(vm.narration.durationSeconds)}
              </output>
            </div>
          ) : null}

          {vm.transcript.available ? (
            <div className="immersive-media-dock__transcript-actions">
              {vm.transcript.capability === 'timed-captions' ? (
                <button
                  type="button"
                  onClick={actions.onToggleCaptions}
                  aria-pressed={vm.captionsEnabled}
                  aria-label={vm.captionsEnabled ? 'Tắt phụ đề' : 'Bật phụ đề'}
                >
                  {vm.captionsEnabled ? 'Tắt phụ đề' : 'Bật phụ đề'}
                </button>
              ) : null}
              <button type="button" onClick={openTranscript} aria-label="Mở bản chép lời">
                Bản chép lời
              </button>
            </div>
          ) : null}

          {vm.narration.alternateLocales.map((locale) => (
            <button
              key={locale}
              type="button"
              onClick={() => actions.onListenInLocale(locale)}
              aria-label={`Nghe bằng ${LOCALE_LABELS[locale]}`}
            >
              Nghe bằng {LOCALE_LABELS[locale]}
            </button>
          ))}

          {vm.mode === 'free-explore' && vm.autoTour.canStart ? (
            <button
              type="button"
              className="immersive-media-dock__start-autotour-btn"
              onClick={actions.onStartAutoTour}
            >
              Bắt đầu tự động tham quan
            </button>
          ) : null}
        </div>

        {vm.mode === 'auto-tour' && vm.autoTour.isActive ? (
          <div
            className="immersive-media-dock__auto-tour"
            role="group"
            aria-label="Điều khiển tự động tham quan"
          >
            <strong>
              Tự động tham quan ·{' '}
              <span data-testid="immersive-media-dock-progress">
                {`Cảnh ${vm.autoTour.currentIndex} / ${vm.autoTour.total}`}
              </span>
            </strong>
            <span data-testid="immersive-media-dock-status">
              {vm.autoTour.isPaused ? 'Đang tạm dừng' : 'Đang tham quan'}
            </span>
            {vm.autoTour.isPaused ? (
              <button type="button" onClick={actions.onResumeAutoTour}>
                Tiếp tục tự động tham quan
              </button>
            ) : vm.autoTour.canPause ? (
              <button type="button" onClick={actions.onPauseAutoTour}>
                Tạm dừng tự động tham quan
              </button>
            ) : null}
            {vm.autoTour.canPrevious ? (
              <button type="button" onClick={actions.onPreviousScene}>
                Cảnh trước
              </button>
            ) : null}
            {vm.autoTour.canSkipStory ? (
              <button type="button" onClick={actions.onSkipStory}>
                Bỏ qua câu chuyện
              </button>
            ) : null}
            {vm.autoTour.canNext ? (
              <button type="button" onClick={actions.onNextScene}>
                Cảnh tiếp theo
              </button>
            ) : null}
            {vm.autoTour.canExit ? (
              <button type="button" onClick={actions.onExitAutoTour}>
                Thoát tự động tham quan
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {isTranscriptOpen && vm.transcript.content ? (
        <ImmersiveTranscriptPanel content={vm.transcript.content} onClose={closeTranscript} />
      ) : null}
    </section>
  );
};
