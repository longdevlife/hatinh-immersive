import type { DestinationPreviewVm } from '../../../shared/contracts';

export interface DestinationCardProps {
  destination: DestinationPreviewVm;
  selected: boolean;
  onSelect(destinationId: string): void;
}

const copy = {
  selectAction: 'Chọn điểm đến',
  coverImageAlt: (name: string) => `Hình ảnh đại diện của ${name}`,
  noImage: 'Chưa có hình ảnh',
};

function LocationIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: '1rem', height: '1rem', flexShrink: 0 }}
      aria-hidden="true"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
      <circle cx="12" cy="10" r="3"></circle>
    </svg>
  );
}

export function DestinationCard({ destination, selected, onSelect }: DestinationCardProps) {
  const className = `destination-card ${selected ? 'destination-card--selected' : ''}`;
  const ariaCurrent = selected ? 'true' : undefined;

  return (
    <div
      className={className}
      aria-current={ariaCurrent}
      data-testid={`destination-card-${destination.id}`}
    >
      <div className="destination-card__media">
        {destination.coverImageUrl ? (
          <img
            src={destination.coverImageUrl}
            alt={copy.coverImageAlt(destination.name)}
            loading="lazy"
            className="destination-card__image"
          />
        ) : (
          <div className="destination-card__placeholder">
            <span aria-hidden="true">{copy.noImage}</span>
          </div>
        )}
      </div>

      <div className="destination-card__content">
        <div className="destination-card__header">
          {destination.categoryLabel && (
            <span className="destination-card__category">{destination.categoryLabel}</span>
          )}
        </div>

        <h3 className="destination-card__title">{destination.name}</h3>
        <p className="destination-card__summary">{destination.summary}</p>

        {destination.geoPoint && (
          <p className="destination-card__meta">
            <LocationIcon />
            <span className="sr-only">Vị trí: </span>
          </p>
        )}
      </div>

      <button
        type="button"
        className="destination-card__action"
        onClick={() => onSelect(destination.id)}
        aria-label={`${copy.selectAction} ${destination.name}`}
      >
        <span className="sr-only">{copy.selectAction}</span>
      </button>
    </div>
  );
}
