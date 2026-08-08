import React, { useState } from 'react';
import './ImmersiveControls.css';

export interface ImmersiveControlsProps {
  nodes: { id: string; name: string }[];
  currentSceneId?: string | null;
  onNavigateScene?: ((id: string) => void) | undefined;
  onSearchDestination?: ((query: string) => void) | undefined;
}

export function DestinationSearch({
  onSearch,
}: {
  onSearch?: ((query: string) => void) | undefined;
}) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) onSearch(query);
  };

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
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Tìm điểm tham quan..."
        aria-label="Nhập tên điểm đến"
      />
      <button type="submit" aria-label="Thực hiện tìm kiếm">
        🔍
      </button>
    </form>
  );
}

export function SceneBrowser({
  nodes,
  currentSceneId,
  onNavigate,
}: {
  nodes: { id: string; name: string }[];
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

export function LocaleControl() {
  const [locale, setLocale] = useState<'vi' | 'en'>('vi');

  const toggle = () => setLocale(locale === 'vi' ? 'en' : 'vi');

  return (
    <button
      className="immersive-control-btn locale-btn"
      type="button"
      onClick={toggle}
      aria-label={`Đổi ngôn ngữ sang ${locale === 'vi' ? 'Tiếng Anh' : 'Tiếng Việt'}`}
    >
      {locale.toUpperCase()}
    </button>
  );
}

export function FullscreenControl() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggle = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <button
      className="immersive-control-btn fullscreen-btn"
      type="button"
      onClick={toggle}
      aria-pressed={isFullscreen}
      aria-label={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
    >
      {isFullscreen ? '↙' : '↗'}
    </button>
  );
}

export function ShareControl() {
  const [copied, setCopied] = useState(false);

  const share = () => {
    if (navigator.share) {
      navigator
        .share({
          title: 'Hà Tĩnh Immersive',
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <button
      className="immersive-control-btn share-btn"
      type="button"
      onClick={share}
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
  onNavigateScene,
  onSearchDestination,
}: ImmersiveControlsProps) {
  return (
    <div className="immersive-controls-group" role="region" aria-label="Các công cụ tiện ích">
      <div className="immersive-controls-top-right">
        <DestinationSearch onSearch={onSearchDestination} />
        <LocaleControl />
        <ShareControl />
        <FullscreenControl />
      </div>
      <div className="immersive-controls-bottom">
        <SceneBrowser nodes={nodes} currentSceneId={currentSceneId} onNavigate={onNavigateScene} />
      </div>
    </div>
  );
}
