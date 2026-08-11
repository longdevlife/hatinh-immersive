import React from 'react';
import type { DestinationCapabilities } from '../../destination-detail/model/destination-detail.types';
import type { SonTrangExperienceVm } from '../model/son-trang.types';

export interface SonTrangExperienceProps {
  experience: SonTrangExperienceVm;
  capabilities: DestinationCapabilities;
  onBackToExplore(): void;
  onOpenMap(): void;
  onEnterPanorama?(): void;
  onEnterSelected3D?(): void;
}

export function SonTrangExperience({
  experience,
  capabilities,
  onBackToExplore,
  onOpenMap,
  onEnterPanorama,
  onEnterSelected3D,
}: SonTrangExperienceProps) {
  const { destination, pillars, zones } = experience;

  return (
    <main className="son-trang-experience" aria-label="Trải nghiệm Sơn Trang Cổ Đạm">
      <header className="son-trang-experience__header">
        <button
          type="button"
          className="son-trang-experience__back-button"
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
                className="son-trang-experience__button son-trang-experience__button--primary"
                onClick={onEnterPanorama}
              >
                Khám phá 360&deg;
              </button>
            )}

            {capabilities.hasSelected3D && onEnterSelected3D && (
              <button
                type="button"
                className="son-trang-experience__button son-trang-experience__button--primary"
                onClick={onEnterSelected3D}
              >
                Xem 3D
              </button>
            )}

            {destination.geoPoint !== null && (
              <button
                type="button"
                className="son-trang-experience__button son-trang-experience__button--secondary"
                onClick={onOpenMap}
              >
                Xem trên bản đồ
              </button>
            )}
          </div>
        </div>

        <div className="son-trang-experience__hero-media-wrapper">
          {destination.coverImageUrl ? (
            <img
              src={destination.coverImageUrl}
              alt={destination.name}
              className="son-trang-experience__hero-media"
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
          <div className="son-trang-experience__pillars">
            {pillars.map((pillar, index) => (
              <div key={index} className="son-trang-experience__pillar">
                <h3 className="son-trang-experience__pillar-title">{pillar}</h3>
              </div>
            ))}
          </div>
        </section>
      )}

      {zones && zones.length > 0 && (
        <section className="son-trang-experience__section">
          <h2 className="son-trang-experience__section-title">Các phân khu trải nghiệm</h2>
          <div className="son-trang-experience__zones">
            {zones.map((zone) => (
              <article key={zone.id} className="son-trang-experience__zone-card">
                {zone.coverImageUrl ? (
                  <img
                    src={zone.coverImageUrl}
                    alt={zone.name}
                    className="son-trang-experience__zone-media"
                  />
                ) : (
                  <div className="son-trang-experience__zone-media son-trang-experience__zone-media--empty">
                    Chưa có hình ảnh
                  </div>
                )}
                <div className="son-trang-experience__zone-content">
                  <h3 className="son-trang-experience__zone-title">{zone.name}</h3>
                  <p className="son-trang-experience__zone-summary">{zone.summary}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
