import { useMemo } from 'react';
import { DestinationCard } from './DestinationCard';
import type { DestinationPreviewVm } from '../../../shared/contracts';

export interface DestinationPanelProps {
  availableDestinations: readonly DestinationPreviewVm[];
  destinations: readonly DestinationPreviewVm[];
  selectedDestinationId: string | null;
  selectedDestination?: DestinationPreviewVm | undefined;
  query: string;
  category: string;
  onQueryChange(query: string): void;
  onCategoryChange(category: string): void;
  onSelectDestination(destinationId: string): void;
  onOpenDestination?: ((destination: DestinationPreviewVm) => void) | undefined;
  onOpenMap(): void;
}

const copy = {
  title: 'Khám phá Hà Tĩnh',
  searchPlaceholder: 'Tìm điểm đến, hoạt động...',
  allCategory: 'Tất cả',
  openMap: 'Xem bản đồ',
  emptyState: 'Không tìm thấy điểm đến nào phù hợp.',
};

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: '1rem', height: '1rem' }}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  );
}

function MapIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0 }}
      aria-hidden="true"
    >
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon>
      <line x1="9" y1="3" x2="9" y2="21"></line>
      <line x1="15" y1="3" x2="15" y2="21"></line>
    </svg>
  );
}

export function DestinationPanel({
  availableDestinations,
  destinations,
  selectedDestinationId,
  selectedDestination,
  query,
  category,
  onQueryChange,
  onCategoryChange,
  onSelectDestination,
  onOpenDestination,
  onOpenMap,
}: DestinationPanelProps) {
  const categories = useMemo(() => {
    const uniqueCategories = new Set<string>();
    availableDestinations.forEach((d) => {
      if (d.categoryLabel) {
        uniqueCategories.add(d.categoryLabel);
      }
    });
    return [copy.allCategory, ...Array.from(uniqueCategories)];
  }, [availableDestinations]);

  return (
    <div className="destination-panel">
      <header className="destination-panel__header">
        <div className="destination-panel__search">
          <span className="destination-panel__search-icon" aria-hidden="true">
            <SearchIcon />
          </span>
          <input
            type="search"
            className="destination-panel__search-input"
            placeholder={copy.searchPlaceholder}
            aria-label={copy.searchPlaceholder}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
          />
        </div>

        <div className="destination-panel__filters" role="group" aria-label="Lọc theo chủ đề">
          {categories.map((cat) => {
            const isSelected = category === cat || (!category && cat === copy.allCategory);
            return (
              <button
                key={cat}
                type="button"
                className={`destination-panel__filter-chip ${isSelected ? 'destination-panel__filter-chip--active' : ''}`}
                aria-pressed={isSelected}
                onClick={() => onCategoryChange(cat === copy.allCategory ? '' : cat)}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </header>

      <div className="destination-panel__list-container">
        {destinations.length > 0 ? (
          <div className="destination-panel__list" role="list" aria-label="Danh sách điểm đến">
            {destinations.map((destination) => (
              <div key={destination.id} role="listitem">
                <DestinationCard
                  destination={destination}
                  selected={destination.id === selectedDestinationId}
                  onSelect={onSelectDestination}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="destination-panel__empty" role="status">
            <p>{copy.emptyState}</p>
          </div>
        )}
      </div>

      <div className="destination-panel__mobile-actions">
        {selectedDestination ? (
          <div className="destination-panel__selected-preview">
            <div className="destination-panel__preview-info">
              <span className="destination-panel__preview-title">{selectedDestination.name}</span>
            </div>
            {onOpenDestination && (
              <button
                type="button"
                className="explore-experience__detail-action"
                onClick={() => onOpenDestination(selectedDestination)}
              >
                Xem chi tiết
              </button>
            )}
          </div>
        ) : null}
        <button
          type="button"
          className="destination-panel__map-toggle immersive-button immersive-button--primary"
          onClick={onOpenMap}
        >
          <MapIcon />
          <span>{copy.openMap}</span>
        </button>
      </div>
    </div>
  );
}
