import { useEffect, type FC } from 'react';

import type { ImmersiveLocale } from '../../../shared/contracts';
import {
  type ImmersiveMediaDockActions,
  type ImmersiveMediaDockVm,
} from './reference-parity.presentation';
import type { MinimalTravelAmbientControl } from './minimal-travel-controls.presentation';

export interface ImmersiveStorySheetProps {
  vm: ImmersiveMediaDockVm;
  actions: ImmersiveMediaDockActions;
  ambientControl: MinimalTravelAmbientControl;
  onClose(): void;
  onOpenTranscript(): void;
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

export const ImmersiveStorySheet: FC<ImmersiveStorySheetProps> = ({
  vm,
  actions,
  ambientControl,
  onClose,
  onOpenTranscript,
}) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isNarrationUnavailable = !vm.narration.available || vm.narration.status === 'unavailable';
  const isNarrationPlayable = !isNarrationUnavailable && vm.narration.status !== 'loading';
  const hasMeaningfulNarrationProgress = vm.narration.durationSeconds > 0;

  const isAutoTourOwned = vm.mode === 'auto-tour' && vm.autoTour.isActive;

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-label="Câu chuyện"
      className="immersive-story-sheet"
    >
      <header className="immersive-story-sheet__header">
        <p className="immersive-story-sheet__title">{vm.sceneLabel}</p>
        <button
          type="button"
          className="immersive-story-sheet__close-btn"
          aria-label="Đóng câu chuyện"
          onClick={onClose}
        >
          <svg
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
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </header>

      <div className="immersive-story-sheet__body">
        {/* Primary Narration Control */}
        <div className="immersive-story-sheet__narration-row">
          {isAutoTourOwned ? (
            <p className="immersive-story-sheet__transport-status">
              {vm.autoTour.isPaused
                ? 'Hành trình đang tạm dừng'
                : vm.narration.status === 'playing'
                  ? 'Đang nghe câu chuyện trong hành trình'
                  : 'Câu chuyện do hành trình điều khiển'}
            </p>
          ) : isNarrationPlayable ? (
            <button
              type="button"
              className="immersive-story-sheet__primary-btn"
              onClick={
                vm.narration.status === 'playing'
                  ? actions.onPauseNarration
                  : vm.narration.status === 'paused'
                    ? actions.onResumeNarration
                    : actions.onPlayNarration
              }
              aria-label={
                vm.narration.status === 'playing'
                  ? 'Tạm dừng câu chuyện'
                  : vm.narration.status === 'paused'
                    ? 'Tiếp tục câu chuyện'
                    : 'Nghe câu chuyện'
              }
            >
              {vm.narration.status === 'playing'
                ? 'Tạm dừng câu chuyện'
                : vm.narration.status === 'paused'
                  ? 'Tiếp tục câu chuyện'
                  : 'Nghe câu chuyện'}
            </button>
          ) : isNarrationUnavailable ? (
            <p className="immersive-story-sheet__unavailable-text">Âm thanh thuyết minh chưa có</p>
          ) : null}

          {/* Meaningful Progress Bar */}
          {vm.narration.available && hasMeaningfulNarrationProgress && !isAutoTourOwned ? (
            <div className="immersive-story-sheet__progress" aria-label="Điều khiển câu chuyện">
              <label>
                <span>Tiến độ câu chuyện</span>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, vm.narration.durationSeconds)}
                  step={0.1}
                  value={Math.min(vm.narration.currentTimeSeconds, vm.narration.durationSeconds)}
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
        </div>

        {/* Ambient background music toggle */}
        {ambientControl.available ? (
          <div className="immersive-story-sheet__ambient-row">
            <button
              type="button"
              className="immersive-story-sheet__ambient-btn"
              onClick={ambientControl.onToggle}
              aria-pressed={ambientControl.enabled}
              aria-label={ambientControl.enabled ? 'Tắt nhạc nền' : 'Bật nhạc nền'}
            >
              {ambientControl.enabled ? 'Tắt nhạc nền' : 'Bật nhạc nền'}
            </button>
          </div>
        ) : null}

        {/* Captions and Transcript */}
        {vm.transcript.available ? (
          <div className="immersive-story-sheet__transcript-row">
            {vm.transcript.capability === 'timed-captions' ? (
              <button
                type="button"
                className="immersive-story-sheet__captions-btn"
                onClick={actions.onToggleCaptions}
                aria-pressed={vm.captionsEnabled}
                aria-label={vm.captionsEnabled ? 'Tắt phụ đề' : 'Bật phụ đề'}
              >
                {vm.captionsEnabled ? 'Tắt phụ đề' : 'Bật phụ đề'}
              </button>
            ) : null}
            <button
              type="button"
              className="immersive-story-sheet__transcript-btn"
              onClick={onOpenTranscript}
              aria-label="Mở bản chép lời"
            >
              Bản chép lời
            </button>
          </div>
        ) : null}

        {/* Locale control in Story Sheet */}
        {vm.narration.alternateLocales.length > 0 ? (
          <div className="immersive-story-sheet__locales-row">
            {vm.narration.alternateLocales.map((locale) => (
              <button
                key={locale}
                type="button"
                className="immersive-story-sheet__locale-btn"
                onClick={() => actions.onListenInLocale(locale)}
                aria-label={`Nghe bằng ${LOCALE_LABELS[locale]}`}
              >
                Nghe bằng {LOCALE_LABELS[locale]}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
};
