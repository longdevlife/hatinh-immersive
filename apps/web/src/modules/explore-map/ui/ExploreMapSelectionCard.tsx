import './ExploreMapSelectionCard.css';

export interface ExploreMapSelectionDestination {
  id: string;
  name: string;
  summary: string;
  categoryLabel: string | null;
  geoPoint: { latitude: number; longitude: number } | null;
}

export interface ExploreMapSelectionCardProps {
  destination: ExploreMapSelectionDestination;
  directionsHref: string | null;
  onOpenDetail?: (() => void) | undefined;
}

function isExternalDirectionsHref(href: string | null): href is string {
  if (!href) {
    return false;
  }

  try {
    const url = new URL(href, 'https://hatinh.local');
    return (
      (url.protocol === 'https:' || url.protocol === 'http:') &&
      url.origin !== 'https://hatinh.local'
    );
  } catch {
    return false;
  }
}

export function ExploreMapSelectionCard({
  destination,
  directionsHref,
  onOpenDetail,
}: ExploreMapSelectionCardProps) {
  return (
    <aside
      className="explore-map-selection-card"
      aria-label={`Điểm đến đang chọn: ${destination.name}`}
      aria-live="polite"
      data-destination-id={destination.id}
      data-testid="explore-selected-destination"
    >
      <div className="explore-map-selection-card__eyebrow-row">
        <span className="explore-map-selection-card__eyebrow">Điểm đến đang chọn</span>
        {destination.categoryLabel ? (
          <span className="explore-map-selection-card__category">{destination.categoryLabel}</span>
        ) : null}
      </div>

      <h2 className="explore-map-selection-card__title">{destination.name}</h2>
      <p className="explore-map-selection-card__summary">{destination.summary}</p>

      <div className="explore-map-selection-card__actions">
        {onOpenDetail ? (
          <button
            className="explore-map-selection-card__detail"
            type="button"
            onClick={onOpenDetail}
          >
            Xem chi tiết
          </button>
        ) : null}
        {isExternalDirectionsHref(directionsHref) ? (
          <a
            className="explore-map-selection-card__directions"
            href={directionsHref}
            aria-label={`Mở tuyến đường đến ${destination.name}`}
            target="_blank"
            rel="noreferrer"
          >
            Tuyến gợi ý<span aria-hidden="true">↗</span>
          </a>
        ) : null}
      </div>
    </aside>
  );
}
