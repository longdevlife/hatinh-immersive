import React from 'react';
import type { RefObject } from 'react';
import '../../../app/styles/son-trang.css';
import type { DestinationCapabilities } from '../../../shared/contracts';
import type { SonTrangExperienceVm } from '../model/son-trang.types';
import { MediaCredits, ResponsiveImage } from '../../media';

export interface SonTrangExperienceProps {
  experience: SonTrangExperienceVm;
  capabilities: DestinationCapabilities;
  onBackToExplore(): void;
  onOpenMap?: (() => void) | undefined;
  onEnterPanorama?(): void;
  onEnterSelected3D?(): void;
  mainRef?: RefObject<HTMLElement | null>;
}

export function SonTrangExperience({
  experience,
  capabilities,
  onBackToExplore,
  onOpenMap,
  onEnterPanorama,
  onEnterSelected3D,
  mainRef,
}: SonTrangExperienceProps) {
  const { destination, hero, pillars, zones, gallery } = experience;
  const creditedAssets = [hero, ...zones.map((zone) => zone.media), ...gallery].filter(
    (asset): asset is NonNullable<typeof asset> => asset !== null,
  );

  return (
    <main
      ref={mainRef}
      className="son-trang-experience"
      aria-label="Trải nghiệm Sơn Trang Cổ Đạm"
      tabIndex={-1}
    >
      <header className="son-trang-experience__header">
        <button
          type="button"
          className="son-trang-experience__back-button son-trang-experience__touch-target"
          onClick={onBackToExplore}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
          </svg>
          Khám phá Hà Tĩnh
        </button>
      </header>

      <section className="son-trang-experience__hero">
        <div className="son-trang-experience__hero-content">
          {destination.categoryLabel && (
            <span className="son-trang-experience__category">{destination.categoryLabel}</span>
          )}
          <h1>{destination.name}</h1>
          <p className="son-trang-experience__summary">{destination.summary}</p>

          <div className="son-trang-experience__actions">
            {capabilities.hasPanorama && onEnterPanorama && (
              <button
                type="button"
                className="son-trang-experience__button son-trang-experience__button--primary son-trang-experience__touch-target"
                onClick={onEnterPanorama}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ marginRight: '8px' }}
                >
                  <path d="M2 12c0 3.31 4.48 6 10 6s10-2.69 10-6-4.48-6-10-6-10 2.69-10 6Z" />
                  <path d="M12 6v12" />
                  <path d="M22 12h-4" />
                  <path d="M6 12H2" />
                </svg>
                Khám phá 360&deg;
              </button>
            )}

            {capabilities.hasSelected3D &&
              capabilities.selected3DAvailability === 'available' &&
              onEnterSelected3D && (
                <button
                  type="button"
                  className="son-trang-experience__button son-trang-experience__button--primary son-trang-experience__touch-target"
                  onClick={onEnterSelected3D}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ marginRight: '8px' }}
                  >
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                  Xem 3D
                </button>
              )}

            {capabilities.selected3DAvailability === 'unavailable' && (
              <p role="status" className="son-trang-experience__status-notice">
                Mô hình 3D khu vực này đang được cập nhật
              </p>
            )}

            {destination.geoPoint !== null && onOpenMap && (
              <button
                type="button"
                className="son-trang-experience__button son-trang-experience__button--secondary son-trang-experience__touch-target"
                onClick={onOpenMap}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ marginRight: '8px' }}
                >
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                Xem trên bản đồ
              </button>
            )}
          </div>
        </div>

        <div className="son-trang-experience__hero-media-wrapper">
          {hero ? (
            <ResponsiveImage
              asset={hero}
              className="son-trang-experience__hero-media"
              loading="eager"
            />
          ) : (
            <div className="son-trang-experience__hero-media son-trang-experience__hero-media--empty">
              Chưa có hình ảnh
            </div>
          )}
        </div>
      </section>

      <section className="son-trang-experience__quick-facts" aria-label="Thông tin nhanh">
        <ul className="son-trang-experience__facts-list">
          {destination.categoryLabel && (
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="son-trang-experience__fact-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
                  <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
                </svg>
              </span>
              <span>
                <strong>Loại hình:</strong> {destination.categoryLabel}
              </span>
            </li>
          )}
          {destination.geoPoint !== null && (
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="son-trang-experience__fact-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </span>
              <span>
                <strong>Vị trí:</strong> Đã xác định trên bản đồ
              </span>
            </li>
          )}
        </ul>
      </section>

      {pillars && pillars.length > 0 && (
        <section className="son-trang-experience__section">
          <h2 className="son-trang-experience__section-title">Bốn lớp trải nghiệm</h2>
          <ul className="son-trang-experience__pillars" aria-label="Bốn lớp trải nghiệm">
            {pillars.map((pillar, index) => (
              <li key={index} className="son-trang-experience__pillar">
                <h3 className="son-trang-experience__pillar-title">{pillar}</h3>
              </li>
            ))}
          </ul>
        </section>
      )}

      {zones && zones.length > 0 && (
        <section className="son-trang-experience__section">
          <h2 className="son-trang-experience__section-title">Các phân khu trải nghiệm</h2>
          <div className="son-trang-experience__zones">
            {zones.map((zone) => (
              <article key={zone.id} className="son-trang-experience__zone-card">
                {zone.media ? (
                  <ResponsiveImage
                    asset={zone.media}
                    className="son-trang-experience__zone-media"
                    loading="lazy"
                  />
                ) : (
                  <div className="son-trang-experience__zone-media son-trang-experience__zone-media--empty">
                    Chưa có hình ảnh
                  </div>
                )}
                <div className="son-trang-experience__zone-content">
                  <h3 className="son-trang-experience__zone-title">{zone.name}</h3>
                  {zone.summary ? (
                    <p className="son-trang-experience__zone-summary">{zone.summary}</p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {gallery.length > 0 && (
        <section
          className="son-trang-experience__section son-trang-experience__gallery"
          aria-label="Thư viện ảnh Sơn Trang"
        >
          <div className="son-trang-experience__gallery-heading">
            <p className="son-trang-experience__gallery-kicker">Hình ảnh tham khảo</p>
            <h2 className="son-trang-experience__section-title">Những lát cắt của Sơn Trang</h2>
          </div>
          <div className="son-trang-experience__gallery-grid">
            {gallery.map((asset) => (
              <ResponsiveImage
                key={asset.id}
                asset={asset}
                className="son-trang-experience__gallery-image"
                sizes="(max-width: 767px) 85vw, (max-width: 1199px) 45vw, 32vw"
              />
            ))}
          </div>
        </section>
      )}

      <MediaCredits assets={creditedAssets} />
    </main>
  );
}
