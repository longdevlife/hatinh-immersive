import type { ExploreMapLocationStatus, ExploreMapStyleOption } from '../model/explore-map.types';

import './ExploreMapControls.css';

export interface ExploreMapControlsProps {
  categories: readonly string[];
  selectedCategory: string;
  locationStatus: ExploreMapLocationStatus;
  canUseGeolocation: boolean;
  mapStyles: readonly ExploreMapStyleOption[];
  activeMapStyleId: string;
  canUseFullscreen: boolean;
  isFullscreen: boolean;
  onCategoryChange(category: string): void;
  onRequestUserLocation(): void;
  onChangeMapStyle(styleId: string): void;
  onToggleFullscreen(): void;
}

const ALL_CATEGORY_LABEL = 'Tất cả';

const locationStatusCopy: Record<Exclude<ExploreMapLocationStatus, 'idle'>, string> = {
  requesting: 'Đang tìm vị trí…',
  available: 'Đã xác định vị trí',
  denied: 'Quyền vị trí đang tắt',
  unavailable: 'Không thể xác định vị trí',
};

function MapIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m4 6 6-3 5 3 5-3v15l-5 3-5-3-6 3V6Z" />
      <path d="M10 3v15M15 6v15" />
    </svg>
  );
}

function LocateIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
}

function FullscreenIcon({ isFullscreen }: { isFullscreen: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {isFullscreen ? (
        <path d="M8 3v5H3M16 3v5h5M8 21v-5H3M16 21v-5h5" />
      ) : (
        <path d="M3 8V3h5M21 8V3h-5M3 16v5h5M21 16v5h-5" />
      )}
    </svg>
  );
}

export function ExploreMapControls({
  categories,
  selectedCategory,
  locationStatus,
  canUseGeolocation,
  mapStyles,
  activeMapStyleId,
  canUseFullscreen,
  isFullscreen,
  onCategoryChange,
  onRequestUserLocation,
  onChangeMapStyle,
  onToggleFullscreen,
}: ExploreMapControlsProps) {
  const hasStyleOptions = mapStyles.length >= 2;
  const statusMessage = locationStatus === 'idle' ? null : locationStatusCopy[locationStatus];

  return (
    <div className="explore-map-controls" aria-label="Công cụ bản đồ">
      {categories.length > 0 ? (
        <div className="explore-map-controls__categories" role="group" aria-label="Lọc điểm đến">
          <span className="explore-map-controls__eyebrow">Khám phá theo chủ đề</span>
          <div className="explore-map-controls__category-list">
            {categories.map((category) => {
              const isAllCategory = category === ALL_CATEGORY_LABEL;
              const isSelected = isAllCategory
                ? selectedCategory === ''
                : selectedCategory === category;

              return (
                <button
                  className="explore-map-controls__category"
                  key={category}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onCategoryChange(isAllCategory ? '' : category)}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="explore-map-controls__actions" role="group" aria-label="Tùy chọn bản đồ">
        {hasStyleOptions ? (
          <label className="explore-map-controls__style">
            <MapIcon />
            <span className="sr-only">Kiểu bản đồ</span>
            <select
              aria-label="Kiểu bản đồ"
              value={activeMapStyleId}
              onChange={(event) => onChangeMapStyle(event.target.value)}
            >
              {mapStyles.map((style) => (
                <option key={style.id} value={style.id}>
                  {style.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {canUseGeolocation ? (
          <button
            className="explore-map-controls__action"
            type="button"
            disabled={locationStatus === 'requesting'}
            aria-busy={locationStatus === 'requesting'}
            aria-label="Tìm vị trí của tôi"
            onClick={onRequestUserLocation}
          >
            <LocateIcon />
            <span className="explore-map-controls__action-label">Vị trí của tôi</span>
          </button>
        ) : null}

        {canUseFullscreen ? (
          <button
            className="explore-map-controls__action"
            type="button"
            aria-pressed={isFullscreen}
            aria-label={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
            onClick={onToggleFullscreen}
          >
            <FullscreenIcon isFullscreen={isFullscreen} />
            <span className="explore-map-controls__action-label">
              {isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
            </span>
          </button>
        ) : null}
      </div>

      {statusMessage ? (
        <p
          className={`explore-map-controls__status explore-map-controls__status--${locationStatus}`}
          data-testid="explore-map-location-status"
          role="status"
          aria-live="polite"
        >
          {statusMessage}
        </p>
      ) : null}
    </div>
  );
}
