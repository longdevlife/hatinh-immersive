import { useEffect, useMemo, useState, type FormEvent } from 'react';

import type { DestinationPreviewVm, ImmersiveLocale, SceneNodeVm } from '../../../shared/contracts';

import './ImmersiveControls.css';

export interface ImmersiveControlsProps {
  nodes: Pick<SceneNodeVm, 'id' | 'name'>[];
  currentSceneId?: string | null | undefined;
  destinations?: DestinationPreviewVm[] | undefined;
  locale?: ImmersiveLocale | undefined;
  searchLoading?: boolean | undefined;
  onNavigateScene?: ((id: string) => void) | undefined;
  onSearchDestination?: ((query: string) => void) | undefined;
  onSelectDestination?: ((destination: DestinationPreviewVm) => void) | undefined;
  onLocaleChange?: ((locale: ImmersiveLocale) => void) | undefined;
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
    if (!isOpen) return undefined;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!onSearch || normalizedQuery.length < 2) {
      return undefined;
    }

    const timeout = window.setTimeout(() => onSearch(normalizedQuery), 300);
    return () => window.clearTimeout(timeout);
  }, [normalizedQuery, onSearch]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (normalizedQuery.length >= 2) {
      onSearch?.(normalizedQuery);
    }
  }

  if (!isOpen) {
    return (
      <button
        className="immersive-control-btn search-toggle-btn"
        onClick={() => setIsOpen(true)}
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
        >
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </button>
    );
  }

  return (
    <form
      className="immersive-control-search"
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
      <button type="button" onClick={() => setIsOpen(false)} aria-label="Đóng tìm kiếm">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: 'var(--icon-size-base)', height: 'var(--icon-size-base)' }}
        >
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      {normalizedQuery.length >= 2 ? (
        <div className="immersive-control-search__results" aria-live="polite">
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
                      setIsOpen(false);
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
    <nav className="immersive-control-browser" aria-label="Danh sách cảnh quan">
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
                {node.name || 'Cảnh chưa đặt tên'}
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
      className="immersive-control-btn locale-btn"
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
      className="immersive-control-btn fullscreen-btn"
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
      className="immersive-control-btn share-btn"
      type="button"
      onClick={() => void share()}
      aria-label="Chia sẻ cảnh này"
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
  currentSceneId,
  destinations,
  locale = 'vi',
  searchLoading,
  onNavigateScene,
  onSearchDestination,
  onSelectDestination,
  onLocaleChange,
}: ImmersiveControlsProps) {
  return (
    <div className="immersive-controls-group" role="region" aria-label="Các công cụ tiện ích">
      <div className="immersive-controls-top-right">
        <DestinationSearch
          destinations={destinations}
          isLoading={searchLoading}
          onSearch={onSearchDestination}
          onSelectDestination={onSelectDestination}
        />
        <LocaleControl locale={locale} onChange={onLocaleChange} />
        <ShareControl />
        <FullscreenControl />
      </div>
      <div className="immersive-controls-bottom">
        <SceneBrowser nodes={nodes} currentSceneId={currentSceneId} onNavigate={onNavigateScene} />
      </div>
    </div>
  );
}
