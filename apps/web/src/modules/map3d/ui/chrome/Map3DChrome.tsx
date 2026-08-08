import React, { useState } from 'react';
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

  /** The title displayed in the top chrome */
  title?: string;
  /** The subtitle or location name displayed below the title */
  subtitle?: string;

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
}

export function Map3DChrome({
  children,
  language = 'vi',
  isFullscreen = false,
  title = 'Khu Di Tích Ngã Ba Đồng Lộc',
  subtitle,
  selectedLocationId = null,
  locations = [],
  onLanguageToggle,
  onShare,
  onToggleFullscreen,
  onShowInfo,
  onLocationSelected,
  onEnter360,
}: Map3DChromeProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLocations = locations.filter((loc) =>
    loc.label.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="map3d-chrome">
      {/* Background/Viewport Layer */}
      <div className="map3d-chrome__viewport">{children}</div>

      {/* Top Chrome: Brand, Title, Actions */}
      <header className="map3d-chrome__topbar">
        <div className="map3d-chrome__brand-title">
          <h1 className="map3d-chrome__title">{title}</h1>
          {subtitle && <p className="map3d-chrome__subtitle">{subtitle}</p>}
        </div>

        <div className="map3d-chrome__actions">
          <button
            type="button"
            className="map3d-chrome__icon-btn"
            onClick={onLanguageToggle}
            aria-label={`Switch language to ${language === 'vi' ? 'English' : 'Vietnamese'}`}
          >
            {language === 'vi' ? 'EN' : 'VI'}
          </button>
          <button
            type="button"
            className="map3d-chrome__icon-btn"
            onClick={onShare}
            aria-label="Share location"
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
            aria-label="View info"
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
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
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
        </div>
      </header>

      {/* Left Navigation Rail: Search & Locations list */}
      <aside className="map3d-chrome__nav-rail">
        <div className="map3d-chrome__search-container">
          <input
            type="search"
            className="map3d-chrome__search-input"
            placeholder="Tìm kiếm địa điểm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Tìm kiếm địa điểm"
          />
          <svg
            className="map3d-chrome__search-icon"
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
        </div>

        <ul className="map3d-chrome__location-list" role="listbox">
          {filteredLocations.map((loc) => {
            const isSelected = selectedLocationId === loc.id;
            return (
              <li key={loc.id} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  className={`map3d-chrome__location-btn ${isSelected ? 'map3d-chrome__location-btn--selected' : ''}`}
                  onClick={() => onLocationSelected?.(loc.id)}
                >
                  <span className="map3d-chrome__location-name">{loc.label}</span>
                </button>
              </li>
            );
          })}
          {filteredLocations.length === 0 && (
            <li className="map3d-chrome__location-empty">Không tìm thấy địa điểm nào.</li>
          )}
        </ul>
      </aside>

      {/* Bottom Area: Handoff / Main Call to action */}
      {selectedLocationId && onEnter360 && (
        <div className="map3d-chrome__handoff">
          <button type="button" className="map3d-chrome__enter-360-btn" onClick={onEnter360}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="map3d-chrome__handoff-icon"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            <span>Khám phá 360°</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default Map3DChrome;
