import { useEffect, useMemo, useState, type FC } from 'react';

import type {
  ReferenceParityPresentationActions,
  ReferenceParityPresentationVm,
  ReferenceParitySceneVm,
} from './reference-parity.presentation';
import './ImmersiveControls.css';

export interface ReferenceParityControlsProps {
  vm: ReferenceParityPresentationVm;
  actions: ReferenceParityPresentationActions;
  minimapOpen?: boolean;
  isCustomerDemo?: boolean;
}

export const ReferenceParityControls: FC<ReferenceParityControlsProps> = ({
  vm,
  actions,
  minimapOpen = false,
  isCustomerDemo = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync fullscreen state with browser fullscreenchange/Escape
  useEffect(() => {
    const syncFullscreenState = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', syncFullscreenState);
    return () => document.removeEventListener('fullscreenchange', syncFullscreenState);
  }, []);

  const currentScene = useMemo<ReferenceParitySceneVm | null>(
    () => vm.scenes.find((scene) => scene.isCurrent) ?? null,
    [vm.scenes],
  );

  const handleShare = () => {
    void actions.onShare().then((result) => {
      if (result === 'copied') {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    });
  };

  const handleFullscreen = () => {
    actions.onFullscreen();
  };

  // Truthful Unavailable Composition: exactly one card, one Back action, no rail, no minimap, no directional actions
  if (vm.mediaUnavailable) {
    return (
      <div
        className="panorama-controls panorama-controls--unavailable"
        role="region"
        aria-label="Thông báo 360°"
      >
        <div className="panorama-tour-unavailable" role="status" aria-live="polite">
          <div className="panorama-tour-unavailable__card">
            {isCustomerDemo ? (
              <span className="panorama-demo-badge" data-testid="panorama-demo-badge">
                Bản demo 360° · Ảnh tham khảo
              </span>
            ) : null}
            <h2 className="panorama-tour-unavailable__title">360° đang được cập nhật</h2>
            <p className="panorama-tour-unavailable__body">
              Hình ảnh độ phân giải cao đang được chuẩn bị.
            </p>
            <button
              type="button"
              className="panorama-tour-unavailable__btn"
              onClick={actions.onBack}
              aria-label={`Quay lại ${vm.destinationName}`}
            >
              Quay lại {vm.destinationName}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="panorama-controls reference-parity-controls"
      role="region"
      aria-label="Các công cụ tiện ích"
    >
      {/* Top-Left Back + Destination/Scene Context */}
      <div className="panorama-tour-top-bar reference-parity__top-left">
        <button
          type="button"
          className="panorama-control panorama-tour-back-btn"
          onClick={actions.onBack}
          aria-label={`Quay lại ${vm.destinationName}`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{
              width: 'var(--icon-size-base, 1.25rem)',
              height: 'var(--icon-size-base, 1.25rem)',
            }}
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span className="panorama-tour-back-label">Quay lại</span>
        </button>

        {currentScene ? (
          <div className="panorama-tour-context reference-parity__context" aria-live="polite">
            <span className="panorama-tour-context__badge">{vm.destinationName}</span>
            <span className="panorama-tour-context__title">{currentScene.label}</span>
            {isCustomerDemo ? (
              <span className="panorama-demo-badge" data-testid="panorama-demo-badge">
                Bản demo 360° · Ảnh tham khảo
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Top-Right restrained utilities (minimap, share, fullscreen). Media actions live in the dock. */}
      <div className="panorama-controls__utilities reference-parity__utilities">
        {/* Minimap Toggle */}
        <button
          type="button"
          className={`panorama-control reference-parity__minimap-btn${minimapOpen ? ' is-active' : ''}`}
          onClick={actions.onToggleMinimap}
          aria-pressed={minimapOpen}
          aria-label={minimapOpen ? 'Đóng bản đồ thu nhỏ' : 'Mở bản đồ thu nhỏ'}
          title={minimapOpen ? 'Đóng bản đồ thu nhỏ' : 'Mở bản đồ thu nhỏ'}
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
          >
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
            <line x1="8" y1="2" x2="8" y2="18" />
            <line x1="16" y1="6" x2="16" y2="22" />
          </svg>
        </button>

        {/* Locale is a semantic panorama capability, not Explore-only chrome. */}
        <button
          type="button"
          className="panorama-control panorama-locale-control"
          onClick={actions.onToggleLocale}
          aria-label={`Đổi ngôn ngữ sang ${vm.locale === 'vi' ? 'Tiếng Anh' : 'Tiếng Việt'}`}
          title={`Đổi ngôn ngữ sang ${vm.locale === 'vi' ? 'Tiếng Anh' : 'Tiếng Việt'}`}
        >
          {vm.locale.toUpperCase()}
        </button>

        {/* Share Control */}
        <button
          type="button"
          className="panorama-control panorama-share-control"
          onClick={handleShare}
          aria-label={copied ? 'Đã sao chép liên kết' : 'Chia sẻ cảnh này'}
          title={copied ? 'Đã sao chép liên kết' : 'Chia sẻ cảnh này'}
        >
          {copied ? (
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          )}
        </button>

        {/* Fullscreen Control */}
        <button
          type="button"
          className="panorama-control panorama-fullscreen-control"
          onClick={handleFullscreen}
          aria-pressed={isFullscreen}
          aria-label={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
          title={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
        >
          {isFullscreen ? (
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          )}
        </button>
      </div>

      {/* Bottom Scene Thumbnail Rail (Secondary Orientation & Direct Scene Jump) */}
      <div className="panorama-controls__scenes reference-parity__scenes">
        <div className="panorama-tour-layout">
          <div className="panorama-tour-rail-container">
            <nav
              className="panorama-tour-rail reference-parity__rail"
              aria-label={`Hành trình 360 ${vm.destinationName}`}
            >
              <ul role="list">
                {vm.scenes.map((scene) => {
                  const isUnavailable = !scene.canNavigate;
                  const isDisabled = !scene.canNavigate || vm.isTransitioning;
                  const isMajor = scene.isMajorStop;

                  return (
                    <li key={scene.id}>
                      <button
                        type="button"
                        className={`panorama-tour-rail__btn ${
                          isMajor
                            ? 'panorama-tour-rail__btn--major'
                            : 'panorama-tour-rail__btn--connector'
                        } ${scene.isCurrent ? 'is-current' : ''} ${
                          scene.isVisited && !scene.isCurrent ? 'is-visited' : ''
                        } ${isUnavailable ? 'is-unavailable' : ''}`}
                        aria-current={scene.isCurrent ? 'step' : undefined}
                        aria-label={`${scene.label}${isUnavailable ? ' (Chưa có dữ liệu)' : ''}`}
                        disabled={isDisabled}
                        onClick={() => {
                          if (!isDisabled) {
                            actions.onSelectScene(scene.id);
                          }
                        }}
                      >
                        {scene.thumbnailUrl && isMajor ? (
                          <span className="reference-parity__rail-thumb" aria-hidden="true">
                            <img
                              src={scene.thumbnailUrl}
                              alt=""
                              loading="lazy"
                              className="reference-parity__rail-img"
                            />
                          </span>
                        ) : (
                          <span
                            className={`panorama-tour-rail__indicator ${
                              isMajor
                                ? 'panorama-tour-rail__indicator--major'
                                : 'panorama-tour-rail__indicator--connector'
                            }`}
                            aria-hidden="true"
                          >
                            {scene.isCurrent ? (
                              <span className="panorama-tour-rail__indicator-inner" />
                            ) : null}
                          </span>
                        )}
                        <span className="panorama-tour-rail__label">{scene.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          {/* Error & Retry banner */}
          {vm.status === 'error' ? (
            <div className="panorama-tour-message panorama-tour-message--error" role="alert">
              <p>Không thể tải dữ liệu cảnh 360°.</p>
              <button type="button" onClick={actions.onRetry} className="panorama-tour-retry-btn">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 2v6h-6" />
                  <path d="M3 12a9 9 0 1 0 2.13-5.85L21 8" />
                </svg>
                Thử lại
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
