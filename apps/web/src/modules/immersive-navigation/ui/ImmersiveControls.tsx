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

  return (
    <form
      className="immersive-control-search"
      onSubmit={handleSubmit}
      role="search"
      aria-label="Tìm kiếm điểm đến"
    >
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Tìm điểm tham quan..."
        aria-label="Nhập tên điểm đến"
      />
      <button type="submit" aria-label="Thực hiện tìm kiếm">
        🔍
      </button>
      {normalizedQuery.length >= 2 ? (
        <div className="immersive-control-search__results" aria-live="polite">
          {isLoading ? <p role="status">Đang tìm điểm đến…</p> : null}
          {!isLoading && results.length === 0 ? <p>Không tìm thấy điểm đến.</p> : null}
          {!isLoading && results.length > 0 ? (
            <ul aria-label="Kết quả điểm đến">
              {results.map((destination) => (
                <li key={destination.id}>
                  <button type="button" onClick={() => onSelectDestination?.(destination)}>
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
  const currentIndex = nodes.findIndex((node) => node.id === currentSceneId);
  const progressLabel =
    currentIndex >= 0 ? `${currentIndex + 1}/${nodes.length}` : `${nodes.length} cảnh`;

  return (
    <nav className="immersive-control-browser" aria-label="Danh sách cảnh quan">
      <div className="immersive-control-browser__header">
        <span>Lộ trình 360°</span>
        <span>{progressLabel}</span>
      </div>
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
      {isFullscreen ? '↙' : '↗'}
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
      {copied ? 'Đã chép' : 'Chia sẻ'}
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
