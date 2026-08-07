import { useMemo, useState } from 'react';

import type { DestinationPreviewVm } from '../../../shared/contracts';

export interface DestinationSearchDialogProps {
  destinations: DestinationPreviewVm[];
  open: boolean;
  onClose(): void;
  onSelect(destinationId: string): void;
}

export function DestinationSearchDialog({
  destinations,
  open,
  onClose,
  onSelect,
}: DestinationSearchDialogProps) {
  const [query, setQuery] = useState('');
  const results = useMemo(
    () =>
      destinations.filter((destination) =>
        destination.name.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')),
      ),
    [destinations, query],
  );

  if (!open) {
    return null;
  }

  return (
    <div className="destination-search" role="dialog" aria-modal="true" aria-label="Tìm điểm đến">
      <div className="destination-search__panel">
        <div className="destination-search__header">
          <label htmlFor="destination-search-input">Tìm điểm đến</label>
          <button
            className="immersive-icon-button"
            type="button"
            onClick={onClose}
            aria-label="Đóng tìm kiếm"
          >
            ×
          </button>
        </div>
        <input
          id="destination-search-input"
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tên điểm đến"
        />
        <ul className="destination-search__results">
          {results.map((destination) => (
            <li key={destination.id}>
              <button type="button" onClick={() => onSelect(destination.id)}>
                <span>{destination.categoryLabel}</span>
                <strong>{destination.name}</strong>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
