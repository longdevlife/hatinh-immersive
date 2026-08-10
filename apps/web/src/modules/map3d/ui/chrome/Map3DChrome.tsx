import React, { useState, useRef, useEffect } from 'react';
import './Map3DChrome.css';

export interface Map3DChromeLocation {
  id: string;
  label: string;
}

export interface Map3DChromeProps {
  /** The 3D map viewport to render inside the chrome */
  children?: React.ReactNode;

  /** Current language */
  language?: 'vi' | 'en';
  /** Is the view currently in fullscreen? */
  isFullscreen?: boolean;
  /** Is the destination information drawer open? */
  isInfoOpen?: boolean;
  /** Current connection quality for a non-blocking status badge. */
  networkQuality?: 'good' | 'constrained' | 'offline';

  /** Currently selected location ID */
  selectedLocationId?: string | null;
  /** List of locations available for search and marker selection */
  locations?: Map3DChromeLocation[];

  // Callbacks
  onLanguageToggle?: () => void;
  onShare?: () => void;
  onToggleFullscreen?: () => void;
  onShowInfo?: () => void;

  /** User selects a location from the search/list */
  onLocationSelected?: (id: string) => void;
  /** User clicks the affordance to enter 360 mode */
  onEnter360?: () => void;
  /** User clicks to retry loading the 360 view */
  onRetry360?: () => void;
}

export function Map3DChrome({
  children,
  language = 'vi',
  isFullscreen = false,
  isInfoOpen = false,
  networkQuality = 'good',

  selectedLocationId = null,
  locations = [],
  onLanguageToggle,
  onShare,
  onToggleFullscreen,
  onShowInfo,
  onLocationSelected,
  onEnter360,
  onRetry360,
}: Map3DChromeProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isListOpen, setIsListOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredLocations = locations.filter((loc) =>
    loc.label.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const selectedLocation = locations.find((loc) => loc.id === selectedLocationId);

  const labels =
    language === 'vi'
      ? {
          emptyLocations: 'Không tìm thấy địa điểm nào.',
          enter360: 'Khám phá 360°',
          fullscreen: isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình',
          info: 'Thông tin',
          language: 'Đổi ngôn ngữ sang Tiếng Anh',
          offline: 'Ngoại tuyến',
          search: 'Tìm kiếm địa điểm',
          searchPlaceholder: 'Nhập tên địa điểm...',
          share: 'Chia sẻ địa điểm',
          constrained: 'Kết nối yếu',
          preparing360: '360° đang được chuẩn bị',
          retry: 'Thử lại',
        }
      : {
          emptyLocations: 'No locations found.',
          enter360: 'Explore in 360°',
          fullscreen: isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen',
          info: 'View information',
          language: 'Switch language to Vietnamese',
          offline: 'Offline',
          search: 'Search locations',
          searchPlaceholder: 'Type a location...',
          share: 'Share location',
          constrained: 'Weak connection',
          preparing360: '360° is being prepared',
          retry: 'Retry',
        };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsListOpen(false);
      }
    }
    if (isListOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isListOpen]);

  return (
    <div className="map3d-chrome">
      {/* Background/Viewport Layer */}
      <div className="map3d-chrome__viewport">{children}</div>

      {/* Top Chrome: Brand, Title, Actions (Compact) */}
      <header className="map3d-chrome__topbar">
        <div className="map3d-chrome__actions">
          <button
            type="button"
            className="map3d-chrome__icon-btn"
            onClick={onLanguageToggle}
            aria-label={labels.language}
          >
            {language === 'vi' ? 'EN' : 'VI'}
          </button>
          <button
            type="button"
            className="map3d-chrome__icon-btn"
            onClick={onShare}
            aria-label={labels.share}
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
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
          </button>
          <button
            type="button"
            className="map3d-chrome__icon-btn"
            onClick={onShowInfo}
            aria-controls="destination-info-panel"
            aria-expanded={isInfoOpen}
            aria-label={labels.info}
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
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </button>
          <button
            type="button"
            className="map3d-chrome__icon-btn"
            onClick={onToggleFullscreen}
            aria-label={labels.fullscreen}
          >
            {isFullscreen ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
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
                aria-hidden="true"
              >
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
              </svg>
            )}
          </button>
          {networkQuality !== 'good' ? (
            <span
              className={`map3d-chrome__network map3d-chrome__network--${networkQuality}`}
              role="status"
            >
              {networkQuality === 'offline' ? labels.offline : labels.constrained}
            </span>
          ) : null}
        </div>
      </header>

      {/* Floating Launcher (Search & List) */}
      <aside className="map3d-chrome__launcher" ref={dropdownRef}>
        <button
          type="button"
          className="map3d-chrome__launcher-toggle"
          onClick={() => setIsListOpen(!isListOpen)}
          aria-expanded={isListOpen}
          aria-label={labels.search}
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
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <span className="map3d-chrome__launcher-text">
            {selectedLocation ? selectedLocation.label : labels.search}
          </span>
          <svg
            className={`map3d-chrome__chevron ${isListOpen ? 'map3d-chrome__chevron--open' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>

        {isListOpen && (
          <div className="map3d-chrome__launcher-dropdown">
            <div className="map3d-chrome__search-container">
              <input
                type="search"
                className="map3d-chrome__search-input"
                placeholder={labels.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label={labels.search}
                autoFocus
              />
            </div>
            <div aria-label={labels.search} className="map3d-chrome__location-list" role="listbox">
              {filteredLocations.map((loc) => {
                const isSelected = selectedLocationId === loc.id;
                return (
                  <button
                    key={loc.id}
                    role="option"
                    aria-selected={isSelected}
                    type="button"
                    className={`map3d-chrome__location-btn ${isSelected ? 'map3d-chrome__location-btn--selected' : ''}`}
                    onClick={() => {
                      onLocationSelected?.(loc.id);
                      setIsListOpen(false);
                    }}
                  >
                    {loc.label}
                  </button>
                );
              })}
              {filteredLocations.length === 0 && (
                <p className="map3d-chrome__location-empty" role="status">
                  {labels.emptyLocations}
                </p>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Bottom Area: Handoff CTA */}
      {selectedLocationId && (
        <div className="map3d-chrome__handoff">
          {onEnter360 ? (
            <button
              type="button"
              className="map3d-chrome__enter-360-btn"
              onClick={onEnter360}
              aria-label={labels.enter360}
            >
              <span className="map3d-chrome__handoff-action" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
                {labels.enter360}
              </span>
            </button>
          ) : onRetry360 ? (
            <button
              type="button"
              className="map3d-chrome__retry-btn"
              onClick={onRetry360}
              aria-label={labels.retry}
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
                <path d="M21 2v6h-6"></path>
                <path d="M3 12a9 9 0 1 0 2.13-5.85L21 8"></path>
              </svg>
              {labels.retry}
            </button>
          ) : (
            <div className="map3d-chrome__handoff-status" role="status">
              <span className="map3d-chrome__spinner" aria-hidden="true" />
              {labels.preparing360}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Map3DChrome;
