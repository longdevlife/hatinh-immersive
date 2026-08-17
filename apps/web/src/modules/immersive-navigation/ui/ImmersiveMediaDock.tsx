import { useEffect, useMemo, useState, type ChangeEvent, type FC } from 'react';

import type { ImmersiveLocale, ImmersiveTranscriptContent } from '../../../shared/contracts';
import {
  type ImmersiveMediaDockActions,
  type ImmersiveMediaDockVm,
} from './reference-parity.presentation';
import { ImmersiveTranscriptPanel } from './ImmersiveTranscriptPanel';

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

  const currentTimeMs = Math.max(0, currentTimeSeconds * 1000);
  return (
    content.segments.find(
      (segment) =>
        currentTimeMs >= segment.startMs &&
        (segment.endMs === undefined || currentTimeMs < segment.endMs),
    ) ?? null
  );
}

export const ImmersiveMediaDock: FC<ImmersiveMediaDockProps> = ({ vm, actions }) => {
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

  const enableSound = () => {
    setSoundGateDismissed(true);
    actions.onEnableSound();
  };

  const continueMuted = () => {
    setSoundGateDismissed(true);
    actions.onContinueMuted();
  };

  const narrationActionLabel =
    vm.narration.status === 'playing'
      ? 'Tạm dừng câu chuyện'
      : vm.narration.status === 'paused'
        ? 'Nghe lại câu chuyện'
        : 'Nghe câu chuyện';
  const isNarrationPlayable = vm.narration.available && vm.narration.status !== 'loading';

  return (
    <section
      className="immersive-media-dock"
      role="region"
      aria-label="Media dock trải nghiệm"
      data-mode={vm.mode}
      data-scene-id={vm.sceneId ?? undefined}
    >
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

      <div className="immersive-media-dock__story" aria-label="Câu chuyện hiện tại">
        <strong>{vm.sceneLabel}</strong>
        {vm.mode === 'free-explore' ? (
          isNarrationPlayable ? (
            <button
              type="button"
              onClick={
                vm.narration.status === 'playing'
                  ? actions.onPauseNarration
                  : actions.onPlayNarration
              }
              disabled={vm.narration.status === 'loading'}
            >
              {narrationActionLabel}
            </button>
          ) : vm.transcript.available ? (
            <p>Âm thanh thuyết minh chưa có</p>
          ) : null
        ) : null}

        {vm.narration.available ? (
          <div className="immersive-media-dock__narration" aria-label="Điều khiển câu chuyện">
            {vm.mode === 'auto-tour' ? (
              <button
                type="button"
                onClick={
                  vm.narration.status === 'playing'
                    ? actions.onPauseNarration
                    : actions.onPlayNarration
                }
                disabled={!isNarrationPlayable}
                aria-label={narrationActionLabel}
              >
                {narrationActionLabel}
              </button>
            ) : null}
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
            <button
              type="button"
              onClick={actions.onToggleCaptions}
              aria-pressed={vm.captionsEnabled}
              aria-label={vm.captionsEnabled ? 'Tắt phụ đề' : 'Bật phụ đề'}
            >
              {vm.captionsEnabled ? 'Tắt phụ đề' : 'Bật phụ đề'}
            </button>
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
          <span aria-live="polite">{vm.autoTour.phase}</span>
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
      ) : vm.mode === 'free-explore' && vm.autoTour.canStart ? (
        <button type="button" onClick={actions.onStartAutoTour}>
          Bắt đầu tự động tham quan
        </button>
      ) : null}

      {activeCaption ? (
        <div
          className="immersive-media-dock__captions"
          role="status"
          aria-label="Phụ đề câu chuyện"
        >
          {activeCaption.text}
        </div>
      ) : null}

      {isTranscriptOpen && vm.transcript.content ? (
        <ImmersiveTranscriptPanel content={vm.transcript.content} onClose={closeTranscript} />
      ) : null}
    </section>
  );
};
