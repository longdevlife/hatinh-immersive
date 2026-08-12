import type { RefObject } from 'react';
import type { DestinationDetailPresentationVm } from '../model/destination-detail.types';
import { ResponsiveImage } from '../../media';
import '../../../app/styles/destination-detail.css';

export interface DestinationDetailPresentationProps {
  destination: DestinationDetailPresentationVm;
  onBackToExplore(): void;
  onOpenMap?: (() => void) | undefined;
  onEnterPanorama?(): void;
  onEnterSelected3D?(): void;
  mainRef?: RefObject<HTMLElement | null>;
}

export function DestinationExperience({
  destination,
  onBackToExplore,
  onOpenMap,
  onEnterPanorama,
  onEnterSelected3D,
  mainRef,
}: DestinationDetailPresentationProps) {
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
        <div className="destination-detail__hero-container">
          {destination.media.hero ? (
            <ResponsiveImage
              asset={destination.media.hero}
              className="destination-detail__hero-image"
              loading="eager"
            />
          ) : (
            <div className="destination-detail__hero-placeholder" aria-hidden="true"></div>
          )}
        </div>

        <div className="destination-detail__editorial">
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

          <h1 className="destination-detail__title">{destination.name}</h1>
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

            {Boolean(onOpenMap) && (
              <button
                type="button"
                className="destination-detail__cta destination-detail__cta--outline"
                onClick={onOpenMap}
              >
                Xem trên bản đồ
              </button>
            )}
          </div>

          {destination.facts && destination.facts.length > 0 && (
            <section className="destination-detail__facts" aria-label="Thông tin nhanh">
              <dl className="destination-detail__facts-list">
                {destination.facts.map((fact) => (
                  <div key={fact.id} className="destination-detail__fact-item">
                    <dt className="destination-detail__fact-label">{fact.label}</dt>
                    <dd className="destination-detail__fact-value">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {destination.sections && destination.sections.length > 0 && (
            <div className="destination-detail__sections">
              {destination.sections.map((section) => (
                <section key={section.id} className="destination-detail__section">
                  <h2 className="destination-detail__section-title">{section.title}</h2>
                  <p className="destination-detail__section-body">{section.body}</p>
                </section>
              ))}
            </div>
          )}

          {destination.media.gallery && destination.media.gallery.length > 0 && (
            <section className="destination-detail__gallery" aria-label="Thư viện ảnh">
              <h2 className="destination-detail__section-title">Thư viện ảnh</h2>
              <div className="destination-detail__gallery-grid">
                {destination.media.gallery.map((asset) => (
                  <ResponsiveImage
                    key={asset.id}
                    asset={asset}
                    className="destination-detail__gallery-image"
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </article>
    </main>
  );
}
