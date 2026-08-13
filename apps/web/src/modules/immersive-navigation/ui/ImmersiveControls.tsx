import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

import type {
  DestinationPreviewVm,
  ImmersiveLocale,
  SceneLinkVm,
  SceneNodeVm,
} from '../../../shared/contracts';
import type {
  PanoramaTourPresentationActions,
  PanoramaTourPresentationVm,
} from '../../panorama-tour';

import './ImmersiveControls.css';

export interface ImmersiveControlsProps {
  nodes: Pick<SceneNodeVm, 'id' | 'name'>[];
  links?: Pick<SceneLinkVm, 'targetSceneId'>[] | undefined;
  currentSceneId?: string | null | undefined;
  destinations?: DestinationPreviewVm[] | undefined;
  locale?: ImmersiveLocale | undefined;
  searchLoading?: boolean | undefined;
  onNavigateScene?: ((id: string) => void) | undefined;
  onSearchDestination?: ((query: string) => void) | undefined;
  onSelectDestination?: ((destination: DestinationPreviewVm) => void) | undefined;
  onLocaleChange?: ((locale: ImmersiveLocale) => void) | undefined;
  tour?: PanoramaTourPresentationVm | undefined;
  tourActions?: PanoramaTourPresentationActions | undefined;
}

export interface DestinationSearchProps {
  destinations?: DestinationPreviewVm[] | undefined;
  isLoading?: boolean | undefined;
  onSearch?: ((query: string) => void) | undefined;
  onSelectDestination?: ((destination: DestinationPreviewVm) => void) | undefined;
}

export function DestinationSearch({
  destinations = [],
  isLoading = false,
  onSearch,
  onSelectDestination,
}: DestinationSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const launcherRef = useRef<HTMLButtonElement>(null);
  const restoreLauncherFocusRef = useRef(false);
  const normalizedQuery = query.trim();
  const results = useMemo(() => {
    if (normalizedQuery.length < 2) {
      return [];
    }

    const search = normalizedQuery.toLocaleLowerCase('vi');
    return destinations.filter((destination) =>
      [destination.name, destination.summary, destination.categoryLabel ?? '']
        .join(' ')
        .toLocaleLowerCase('vi')
        .includes(search),
    );
  }, [destinations, normalizedQuery]);

  useEffect(() => {
    document.body.classList.toggle('is-search-open', isOpen);
    return () => document.body.classList.remove('is-search-open');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen && restoreLauncherFocusRef.current) {
      restoreLauncherFocusRef.current = false;
      launcherRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !onSearch || normalizedQuery.length < 2) {
      return undefined;
    }

    const timeout = window.setTimeout(() => onSearch(normalizedQuery), 300);
    return () => window.clearTimeout(timeout);
  }, [isOpen, normalizedQuery, onSearch]);

  function openSearch() {
    restoreLauncherFocusRef.current = false;
    setIsOpen(true);
  }

  function closeSearch() {
    restoreLauncherFocusRef.current = true;
    setIsOpen(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (normalizedQuery.length >= 2) {
      onSearch?.(normalizedQuery);
    }
  }

  if (!isOpen) {
    return (
      <button
        ref={launcherRef}
        className="panorama-control panorama-search-launcher"
        onClick={openSearch}
        aria-label="Mở tìm kiếm"
        type="button"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: 'var(--icon-size-base)', height: 'var(--icon-size-base)' }}
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </button>
    );
  }

  return (
    <form
      className="panorama-search"
      onSubmit={handleSubmit}
      role="search"
      aria-label="Tìm kiếm điểm đến"
    >
      <input
        type="search"
        autoFocus
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Tìm điểm tham quan..."
        aria-label="Nhập tên điểm đến"
      />
      <button type="button" onClick={closeSearch} aria-label="Đóng tìm kiếm">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: 'var(--icon-size-base)', height: 'var(--icon-size-base)' }}
          aria-hidden="true"
        >
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      {normalizedQuery.length >= 2 ? (
        <div className="panorama-search__results" aria-live="polite">
          {isLoading ? <p role="status">Đang tìm điểm đến…</p> : null}
          {!isLoading && results.length === 0 ? <p>Không tìm thấy điểm đến.</p> : null}
          {!isLoading && results.length > 0 ? (
            <ul aria-label="Kết quả điểm đến">
              {results.map((destination) => (
                <li key={destination.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectDestination?.(destination);
                      closeSearch();
                    }}
                  >
                    <span>{destination.categoryLabel}</span>
                    <strong>{destination.name}</strong>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}

export function SceneBrowser({
  nodes,
  currentSceneId,
  onNavigate,
}: {
  nodes: Pick<SceneNodeVm, 'id' | 'name'>[];
  currentSceneId?: string | null | undefined;
  onNavigate?: ((id: string) => void) | undefined;
}) {
  return (
    <nav className="panorama-scene-browser" aria-label="Danh sách cảnh quan">
      <ul role="list">
        {nodes.map((node) => {
          const isCurrent = node.id === currentSceneId;
          return (
            <li key={node.id}>
              <button
                type="button"
                onClick={() => onNavigate?.(node.id)}
                aria-current={isCurrent ? 'step' : undefined}
                className={isCurrent ? 'active' : ''}
              >
                <span className="panorama-scene-browser__state" aria-hidden="true" />
                <span>{node.name || 'Cảnh chưa đặt tên'}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function LocaleControl({
  locale = 'vi',
  onChange,
}: {
  locale?: ImmersiveLocale | undefined;
  onChange?: ((locale: ImmersiveLocale) => void) | undefined;
}) {
  const [uncontrolledLocale, setUncontrolledLocale] = useState<ImmersiveLocale>(locale);
  const activeLocale = onChange ? locale : uncontrolledLocale;

  useEffect(() => {
    if (!onChange) {
      setUncontrolledLocale(locale);
    }
  }, [locale, onChange]);

  function toggle() {
    const nextLocale: ImmersiveLocale = activeLocale === 'vi' ? 'en' : 'vi';
    if (!onChange) {
      setUncontrolledLocale(nextLocale);
    }
    onChange?.(nextLocale);
  }

  return (
    <button
      className="panorama-control panorama-locale-control"
      type="button"
      onClick={toggle}
      aria-label={`Đổi ngôn ngữ sang ${activeLocale === 'vi' ? 'Tiếng Anh' : 'Tiếng Việt'}`}
    >
      {activeLocale.toUpperCase()}
    </button>
  );
}

export function FullscreenControl() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const syncFullscreenState = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', syncFullscreenState);
    return () => document.removeEventListener('fullscreenchange', syncFullscreenState);
  }, []);

  async function toggle() {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else {
          setIsFullscreen(true);
        }
      } else if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {
      setIsFullscreen(false);
    }
  }

  return (
    <button
      className="panorama-control panorama-fullscreen-control"
      type="button"
      onClick={() => void toggle()}
      aria-pressed={isFullscreen}
      aria-label={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
    >
      {isFullscreen ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: 'var(--icon-size-base)', height: 'var(--icon-size-base)' }}
          aria-hidden="true"
        >
          <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: 'var(--icon-size-base)', height: 'var(--icon-size-base)' }}
          aria-hidden="true"
        >
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
        </svg>
      )}
    </button>
  );
}

export function ShareControl() {
  const [copied, setCopied] = useState(false);

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Hà Tĩnh Immersive',
          url: window.location.href,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      className="panorama-control panorama-share-control"
      type="button"
      onClick={() => void share()}
      aria-label={copied ? 'Đã sao chép liên kết' : 'Chia sẻ cảnh này'}
      aria-live="polite"
    >
      {copied ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: 'var(--icon-size-base)', height: 'var(--icon-size-base)' }}
          aria-hidden="true"
        >
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: 'var(--icon-size-base)', height: 'var(--icon-size-base)' }}
          aria-hidden="true"
        >
          <circle cx="18" cy="5" r="3"></circle>
          <circle cx="6" cy="12" r="3"></circle>
          <circle cx="18" cy="19" r="3"></circle>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
        </svg>
      )}
    </button>
  );
}

export function ImmersiveControlsGroup({
  nodes,
  links,
  currentSceneId,
  destinations,
  locale = 'vi',
  searchLoading,
  onNavigateScene,
  onSearchDestination,
  onSelectDestination,
  onLocaleChange,
  tour,
  tourActions,
}: ImmersiveControlsProps) {
  const visibleNodes = useMemo(() => {
    if (!currentSceneId || links === undefined) {
      return nodes;
    }

    const visibleIds = new Set([currentSceneId, ...links.map((link) => link.targetSceneId)]);
    return nodes.filter((node) => visibleIds.has(node.id));
  }, [currentSceneId, links, nodes]);

  return (
    <div className="panorama-controls" role="region" aria-label="Các công cụ tiện ích">
      <div className="panorama-controls__utilities">
        <DestinationSearch
          destinations={destinations}
          isLoading={searchLoading}
          onSearch={onSearchDestination}
          onSelectDestination={onSelectDestination}
        />
        <div className="panorama-controls__secondary">
          <LocaleControl locale={locale} onChange={onLocaleChange} />
          <ShareControl />
          <FullscreenControl />
        </div>
      </div>
      <div className="panorama-controls__scenes">
        {tour ? (
          <div className="panorama-tour-layout">
            {tour.hotspots && tour.hotspots.length > 0 && (
              <div className="panorama-tour-hotspots" role="group" aria-label="Điểm di chuyển">
                <ul role="list">
                  {tour.hotspots.map((hotspot) => (
                    <li key={hotspot.id}>
                      <button
                        type="button"
                        className="panorama-tour-hotspot-btn"
                        disabled={!hotspot.canNavigate || tour.isTransitioning}
                        onClick={() => tourActions?.onSelectHotspot(hotspot.id)}
                        aria-label={`Đi đến ${hotspot.label}`}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                        <span>{hotspot.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="panorama-tour-rail-container">
              <button
                type="button"
                className="panorama-control panorama-tour-back-btn"
                onClick={() => tourActions?.onBack()}
                aria-label="Quay lại"
                disabled={tour.isTransitioning}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  style={{ width: 'var(--icon-size-base)', height: 'var(--icon-size-base)' }}
                >
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>

              <nav className="panorama-tour-rail" aria-label="Hành trình 360 Sơn Trang">
                <ul role="list">
                  {tour.scenes.map((scene) => {
                    const isUnavailable =
                      scene.mediaAvailability === 'missing' ||
                      scene.mediaAvailability === 'invalid' ||
                      scene.mediaAvailability === 'low-resolution';
                    const isDisabled = !scene.canNavigate || tour.isTransitioning;

                    return (
                      <li key={scene.id}>
                        <button
                          type="button"
                          className={`panorama-tour-rail__btn ${
                            scene.isCurrent ? 'is-current' : ''
                          } ${scene.isVisited && !scene.isCurrent ? 'is-visited' : ''} ${
                            isUnavailable ? 'is-unavailable' : ''
                          }`}
                          aria-current={scene.isCurrent ? 'step' : undefined}
                          aria-label={`${scene.label}${isUnavailable ? ' (Chưa có dữ liệu)' : ''}`}
                          disabled={isDisabled}
                          onClick={() => {
                            if (!isDisabled) {
                              tourActions?.onSelectScene(scene.id);
                            }
                          }}
                        >
                          <span className="panorama-tour-rail__indicator" aria-hidden="true">
                            {scene.isCurrent ? (
                              <span className="panorama-tour-rail__indicator-inner" />
                            ) : null}
                          </span>
                          <span className="panorama-tour-rail__label">{scene.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </div>

            {tour.status === 'error' ? (
              <div className="panorama-tour-message panorama-tour-message--error" role="alert">
                <p>Không thể tải dữ liệu cảnh 360°.</p>
                <button
                  type="button"
                  onClick={() => tourActions?.onRetry()}
                  className="panorama-tour-retry-btn"
                >
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
            {tour.status === 'unavailable' ? (
              <div
                className="panorama-tour-message panorama-tour-message--unavailable"
                role="status"
              >
                <p>Cảnh 360° hiện chưa có sẵn dữ liệu hình ảnh đạt chuẩn.</p>
              </div>
            ) : null}
          </div>
        ) : (
          <SceneBrowser
            nodes={visibleNodes}
            currentSceneId={currentSceneId}
            onNavigate={onNavigateScene}
          />
        )}
      </div>
    </div>
  );
}
