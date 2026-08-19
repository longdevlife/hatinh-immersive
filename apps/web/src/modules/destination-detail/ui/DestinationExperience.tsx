import React, { useState, useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { DestinationDetailPresentationVm } from '../model/destination-detail.types';
import { MediaCredits, ResponsiveImage } from '../../media';
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

  const allImages = [destination.media.hero, ...destination.media.gallery].filter(
    (asset): asset is NonNullable<typeof asset> => asset !== null,
  );
  const creditedAssets = allImages;

  const [activeImage, setActiveImage] = useState(destination.media.hero);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHeroHovered, setIsHeroHovered] = useState(false);
  const heroContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveImage(destination.media.hero);
  }, [destination.media.hero]);

  const activeIndex = allImages.findIndex((img) => img.id === activeImage?.id);

  const handleNextImage = () => {
    if (allImages.length === 0) return;
    const nextIdx = (activeIndex + 1) % allImages.length;
    const nextImg = allImages[nextIdx];
    if (nextImg) {
      setActiveImage(nextImg);
    }
  };

  const handlePrevImage = () => {
    if (allImages.length === 0) return;
    const prevIdx = (activeIndex - 1 + allImages.length) % allImages.length;
    const prevImg = allImages[prevIdx];
    if (prevImg) {
      setActiveImage(prevImg);
    }
  };

  // Auto-advance slideshow when multiple images exist
  useEffect(() => {
    if (allImages.length <= 1 || isFullscreen || isHeroHovered) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveImage((current) => {
        const curIdx = allImages.findIndex((img) => img.id === current?.id);
        const nextIdx = (curIdx + 1) % allImages.length;
        return allImages[nextIdx] ?? current;
      });
    }, 4500);

    return () => window.clearInterval(timer);
  }, [allImages, isFullscreen, isHeroHovered]);

  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      } else if (e.key === 'ArrowRight') {
        handleNextImage();
      } else if (e.key === 'ArrowLeft') {
        handlePrevImage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleImageSelect = (asset: NonNullable<typeof destination.media.hero>) => {
    setActiveImage(asset);
  };

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
        <div
          className="destination-detail__hero-container"
          ref={heroContainerRef}
          onMouseEnter={() => setIsHeroHovered(true)}
          onMouseLeave={() => setIsHeroHovered(false)}
        >
          {allImages.length > 0 ? (
            <button
              type="button"
              className="destination-detail__hero-image-btn"
              onClick={() => setIsFullscreen(true)}
              aria-label="Xem ảnh toàn màn hình"
            >
              {allImages.map((asset) => {
                const isActive = activeImage?.id === asset.id;
                return (
                  <div
                    key={asset.id}
                    className={`destination-detail__hero-slide ${isActive ? 'is-active' : ''}`}
                    aria-hidden={!isActive}
                  >
                    <ResponsiveImage
                      asset={asset}
                      className="destination-detail__hero-image"
                      loading={asset.id === destination.media.hero?.id ? 'eager' : 'lazy'}
                    />
                  </div>
                );
              })}
              <div className="destination-detail__hero-overlay-scrim" aria-hidden="true" />
            </button>
          ) : (
            <div className="destination-detail__hero-placeholder" aria-hidden="true"></div>
          )}

          {destination.media.gallery && destination.media.gallery.length > 0 && (
            <div className="destination-detail__thumbnails-dock">
              <div className="destination-detail__thumbnails">
                {allImages.map((asset) => (
                  <button
                    key={asset.id}
                    className={`destination-detail__thumbnail-btn ${activeImage?.id === asset.id ? 'is-active' : ''}`}
                    onClick={() => handleImageSelect(asset)}
                    aria-label="Xem hình ảnh này"
                  >
                    <ResponsiveImage asset={asset} className="destination-detail__thumbnail-img" />
                  </button>
                ))}
              </div>
            </div>
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
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ marginRight: '8px' }}
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                  <path d="M2 12h20" />
                </svg>
                Khám phá 360°
              </button>
            )}

            {show3dCta && onEnterSelected3D && (
              <button
                type="button"
                className="destination-detail__cta destination-detail__cta--secondary"
                onClick={onEnterSelected3D}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ marginRight: '8px' }}
                  aria-hidden="true"
                >
                  <path d="m21 16-9 5-9-5V8l9-5 9 5v8Z" />
                  <path d="m3.3 7 8.7 5 8.7-5" />
                  <path d="M12 22V12" />
                </svg>
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
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ marginRight: '8px' }}
                  aria-hidden="true"
                >
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                Xem trên bản đồ
              </button>
            )}
          </div>

          {destination.facts && destination.facts.length > 0 && (
            <section className="destination-detail__facts" aria-label="Thông tin nhanh">
              <h2 className="destination-detail__section-title">Thông tin nhanh</h2>
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
                  <button
                    key={asset.id}
                    type="button"
                    className="destination-detail__gallery-btn"
                    onClick={() => handleImageSelect(asset)}
                    aria-label="Xem hình ảnh này ở kích thước lớn"
                  >
                    <ResponsiveImage asset={asset} className="destination-detail__gallery-image" />
                  </button>
                ))}
              </div>
            </section>
          )}

          <MediaCredits assets={creditedAssets} />
        </div>
      </article>

      {isFullscreen && activeImage && (
        <div
          className="destination-detail__fullscreen"
          onClick={() => setIsFullscreen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Xem ảnh toàn màn hình"
        >
          <button
            type="button"
            className="destination-detail__fullscreen-close"
            onClick={() => setIsFullscreen(false)}
            aria-label="Đóng"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: '1.5rem', height: '1.5rem' }}
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          {allImages.length > 1 && (
            <>
              <button
                type="button"
                className="destination-detail__fullscreen-nav destination-detail__fullscreen-nav--prev"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevImage();
                }}
                aria-label="Ảnh trước"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                type="button"
                className="destination-detail__fullscreen-nav destination-detail__fullscreen-nav--next"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextImage();
                }}
                aria-label="Ảnh tiếp theo"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </>
          )}

          <ResponsiveImage
            asset={activeImage}
            className="destination-detail__fullscreen-image"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </main>
  );
}
