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
        <div className="immersive-story-sheet__header-text">
          <span className="immersive-story-sheet__eyebrow">Câu chuyện di sản</span>
          <h2 className="immersive-story-sheet__title">{vm.sceneLabel}</h2>
        </div>
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
        {/* Primary Narration Hero Transport */}
        <div className="immersive-story-sheet__narration-section">
          {isAutoTourOwned ? (
            <p className="immersive-story-sheet__transport-status">
              {vm.autoTour.isPaused
                ? 'Hành trình đang tạm dừng'
                : vm.narration.status === 'playing'
                  ? 'Đang nghe câu chuyện trong hành trình'
                  : 'Câu chuyện do hành trình điều khiển'}
            </p>
          ) : isNarrationPlayable ? (
            <div className="immersive-story-sheet__transport-card">
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
                <span className="immersive-story-sheet__primary-btn-icon" aria-hidden="true">
                  {vm.narration.status === 'playing' ? (
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16" rx="1.5" />
                      <rect x="14" y="4" width="4" height="16" rx="1.5" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5Z" />
                    </svg>
                  )}
                </span>
                <span>
                  {vm.narration.status === 'playing'
                    ? 'Tạm dừng câu chuyện'
                    : vm.narration.status === 'paused'
                      ? 'Tiếp tục câu chuyện'
                      : 'Nghe câu chuyện'}
                </span>
              </button>

              {/* Meaningful Progress Bar */}
              {vm.narration.available && hasMeaningfulNarrationProgress && !isAutoTourOwned ? (
                <div className="immersive-story-sheet__progress" aria-label="Điều khiển câu chuyện">
                  <label>
                    <span className="sr-only">Tiến độ câu chuyện</span>
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
            </div>
          ) : isNarrationUnavailable ? (
            <p className="immersive-story-sheet__unavailable-text">Âm thanh thuyết minh chưa có</p>
          ) : null}
        </div>

        {/* Quieter Semantic Options / Actions */}
        <div className="immersive-story-sheet__options-list">
          {/* Ambient sound toggle */}
          {ambientControl.available ? (
            <div className="immersive-story-sheet__option-row">
              <div className="immersive-story-sheet__option-info">
                <span className="immersive-story-sheet__option-icon" aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                </span>
                <span className="immersive-story-sheet__option-label">Nhạc nền không gian</span>
              </div>
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

          {/* Captions toggle */}
          {vm.transcript.available && vm.transcript.capability === 'timed-captions' ? (
            <div className="immersive-story-sheet__option-row">
              <div className="immersive-story-sheet__option-info">
                <span className="immersive-story-sheet__option-icon" aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M7 15h3M14 15h3M7 11h10" />
                  </svg>
                </span>
                <span className="immersive-story-sheet__option-label">Phụ đề trên màn hình</span>
              </div>
              <button
                type="button"
                className="immersive-story-sheet__captions-btn"
                onClick={actions.onToggleCaptions}
                aria-pressed={vm.captionsEnabled}
                aria-label={vm.captionsEnabled ? 'Tắt phụ đề' : 'Bật phụ đề'}
              >
                {vm.captionsEnabled ? 'Tắt phụ đề' : 'Bật phụ đề'}
              </button>
            </div>
          ) : null}

          {/* Transcript entry */}
          {vm.transcript.available ? (
            <div className="immersive-story-sheet__option-row">
              <div className="immersive-story-sheet__option-info">
                <span className="immersive-story-sheet__option-icon" aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                </span>
                <span className="immersive-story-sheet__option-label">
                  Bản chép lời thuyết minh
                </span>
              </div>
              <button
                type="button"
                className="immersive-story-sheet__transcript-btn"
                onClick={onOpenTranscript}
                aria-label="Mở bản chép lời"
              >
                Mở bản chép lời
              </button>
            </div>
          ) : null}

          {/* Locale selection */}
          {vm.narration.alternateLocales.length > 0 ? (
            <div className="immersive-story-sheet__option-row immersive-story-sheet__option-row--locales">
              <div className="immersive-story-sheet__option-info">
                <span className="immersive-story-sheet__option-label">Ngôn ngữ thuyết minh</span>
              </div>
              <div className="immersive-story-sheet__locales-list">
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
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};
