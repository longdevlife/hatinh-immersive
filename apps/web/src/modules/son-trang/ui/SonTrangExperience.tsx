import React from 'react';
import type { RefObject } from 'react';
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
          &larr; Khám phá Hà Tĩnh
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
            <li>
              <strong>Loại hình:</strong> {destination.categoryLabel}
            </li>
          )}
          {destination.geoPoint !== null && (
            <li>
              <strong>Vị trí:</strong> Đã xác định trên bản đồ
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
