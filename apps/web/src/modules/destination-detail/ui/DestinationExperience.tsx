import type { RefObject } from 'react';
import type { DestinationExperienceProps } from '../model/destination-detail.types';
import '../../../app/styles/destination-detail.css';

export interface DestinationExperienceFocusProps {
  mainRef?: RefObject<HTMLElement | null>;
}

export function DestinationExperience({
  destination,
  onBackToExplore,
  onOpenMap,
  onEnterPanorama,
  onEnterSelected3D,
  mainRef,
}: DestinationExperienceProps & DestinationExperienceFocusProps) {
  const showPanoramaCta = destination.capabilities.hasPanorama && Boolean(onEnterPanorama);
  const show3dCta =
    destination.capabilities.hasSelected3D &&
    destination.capabilities.selected3DAvailability === 'available' &&
    Boolean(onEnterSelected3D);
  const show3dUnavailableStatus = destination.capabilities.selected3DAvailability === 'unavailable';

  return (
    <main
      ref={mainRef}
      className="destination-detail"
      aria-label="Thông tin điểm đến"
      tabIndex={-1}
    >
      <header className="destination-detail__navbar">
        <button type="button" className="destination-detail__btn-back" onClick={onBackToExplore}>
          <span aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: '1.2rem', height: '1.2rem', flexShrink: 0 }}
            >
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </span>
          Quay lại khám phá
        </button>
      </header>

      <article className="destination-detail__content">
        <div className="destination-detail__media-hero">
          {destination.coverImageUrl ? (
            <img
              src={destination.coverImageUrl}
              alt={`Hình ảnh của ${destination.name}`}
              className="destination-detail__image"
            />
          ) : (
            <div className="destination-detail__image-empty">
              <span aria-hidden="true">Chưa có hình ảnh</span>
            </div>
          )}
        </div>

        <div className="destination-detail__decision-card">
          <div className="destination-detail__tags">
            {destination.categoryLabel && (
              <span className="destination-detail__category">{destination.categoryLabel}</span>
            )}
            {destination.locationLabel && (
              <span className="destination-detail__location">
                <span aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ width: '1rem', height: '1rem', flexShrink: 0 }}
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                </span>{' '}
                {destination.locationLabel}
              </span>
            )}
          </div>

          <h1 className="destination-detail__name">{destination.name}</h1>
          <p className="destination-detail__summary">{destination.summary}</p>

          <div className="destination-detail__actions">
            {showPanoramaCta && onEnterPanorama && (
              <button
                type="button"
                className="destination-detail__cta destination-detail__cta--primary"
                onClick={onEnterPanorama}
              >
                Khám phá 360°
              </button>
            )}

            {show3dCta && onEnterSelected3D && (
              <button
                type="button"
                className="destination-detail__cta destination-detail__cta--secondary"
                onClick={onEnterSelected3D}
              >
                Xem 3D
              </button>
            )}

            {show3dUnavailableStatus && (
              <p role="status" className="destination-detail__status-notice">
                Mô hình 3D khu vực này đang được cập nhật
              </p>
            )}

            {destination.hasMapLocation && (
              <button
                type="button"
                className="destination-detail__cta destination-detail__cta--outline"
                onClick={onOpenMap}
              >
                Xem trên bản đồ
              </button>
            )}
          </div>
        </div>
      </article>
    </main>
  );
}
