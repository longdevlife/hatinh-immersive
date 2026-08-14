import { useEffect, useMemo, useRef, type FocusEvent } from 'react';

import { ResponsiveImage } from '../../media';
import { getCinematicCarouselOrder, useCinematicCarousel } from '../model/use-cinematic-carousel';
import type { HomeDestinationVm } from '../model/home-destination';
import '../../../app/styles/home.css';

export interface CinematicHomeProps {
  destinations: readonly HomeDestinationVm[];
  exploreHref?: string;
}

function wrapIndex(index: number, itemCount: number): number {
  if (itemCount <= 0) {
    return 0;
  }

  return ((index % itemCount) + itemCount) % itemCount;
}

export function CinematicHome({ destinations, exploreHref = '/explore' }: CinematicHomeProps) {
  const carousel = useCinematicCarousel({
    itemCount: destinations.length,
    autoplayMs: 5000,
  });

  const isHoveredRef = useRef(false);
  const isFocusedRef = useRef(false);

  const activeDestination = destinations[carousel.activeIndex] ?? null;
  const nextIndex = wrapIndex(carousel.activeIndex + 1, destinations.length);
  const focusDestination = useMemo(
    () => destinations.find((destination) => destination.isFocus) ?? destinations[0] ?? null,
    [destinations],
  );

  const railOrder = useMemo(
    () => getCinematicCarouselOrder(carousel.activeIndex, destinations.length),
    [carousel.activeIndex, destinations.length],
  );

  useEffect(() => {
    if (destinations.length === 0) {
      carousel.pause();
    }
  }, [carousel, destinations.length]);

  if (!activeDestination) {
    return (
      <main className="home-cinematic home-cinematic--empty">
        <section className="home-cinematic__empty" aria-labelledby="home-cinematic-empty-title">
          <p className="home-cinematic__eyebrow">Hà Tĩnh / Những điểm đến đang chờ bạn</p>
          <h1 id="home-cinematic-empty-title">Khám phá Hà Tĩnh</h1>
          <p>Chọn một điểm đến để bắt đầu hành trình của bạn.</p>
          <a className="home-cinematic__button home-cinematic__button--primary" href={exploreHref}>
            Khám phá Hà Tĩnh
          </a>
        </section>
      </main>
    );
  }

  const handleMouseEnter = () => {
    isHoveredRef.current = true;
    carousel.pause();
  };

  const handleMouseLeave = () => {
    isHoveredRef.current = false;
    if (!isFocusedRef.current) {
      carousel.resume();
    }
  };

  const handleFocusCapture = () => {
    isFocusedRef.current = true;
    carousel.pause();
  };

  const handleBlurCapture = (event: FocusEvent<HTMLElement>) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
      isFocusedRef.current = false;
      if (!isHoveredRef.current) {
        carousel.resume();
      }
    }
  };

  return (
    <main className="home-cinematic">
      <section
        className="home-cinematic__hero"
        aria-label="Điểm đến nổi bật Hà Tĩnh"
        data-testid="home-cinematic-hero"
        data-active-slug={activeDestination.slug}
      >
        {/* Full-bleed photography background layers */}
        <div className="home-cinematic__backdrop" aria-hidden="true">
          {destinations.map((destination, index) => {
            const isVisible = index === carousel.activeIndex;
            const shouldPreload = isVisible || index === nextIndex;
            return (
              <div
                className={`home-cinematic__backdrop-layer${isVisible ? ' is-active' : ''}`}
                key={destination.id}
                data-visible={isVisible ? 'true' : 'false'}
              >
                <ResponsiveImage
                  asset={destination.hero}
                  loading={shouldPreload ? 'eager' : 'lazy'}
                  sizes="100vw"
                />
              </div>
            );
          })}
          <div className="home-cinematic__backdrop-scrim" />
        </div>

        {/* Vertical Stepper on far left */}
        <div className="home-cinematic__vertical-stepper" aria-hidden="true">
          <div className="home-cinematic__vertical-line" />
          {destinations.map((destination, index) => {
            const isActive = index === carousel.activeIndex;
            return (
              <button
                key={destination.id}
                type="button"
                tabIndex={-1}
                className={`home-cinematic__vertical-dot${isActive ? ' is-active' : ''}`}
                onClick={() => carousel.select(index)}
              >
                {isActive ? (
                  <span className="home-cinematic__vertical-badge">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                ) : (
                  <span className="home-cinematic__vertical-bullet" />
                )}
              </button>
            );
          })}
          <div className="home-cinematic__vertical-line" />
        </div>

        {/* Hero content grid (Left copy with fade-in-up + Right layered card rail) */}
        <div className="home-cinematic__hero-inner">
          <div className="home-cinematic__hero-copy" aria-live="polite">
            <div className="home-cinematic__hero-copy-content" key={activeDestination.id}>
              <p className="home-cinematic__eyebrow">Hà Tĩnh / {activeDestination.categoryLabel}</p>
              <p className="home-cinematic__kicker">Điểm đến đang được chọn</p>
              <h1>{activeDestination.name}</h1>
              <p className="home-cinematic__summary">{activeDestination.summary}</p>
              <div className="home-cinematic__hero-actions">
                <a
                  className="home-cinematic__button home-cinematic__button--primary"
                  href={activeDestination.detailHref}
                >
                  Khám phá {activeDestination.name} <span aria-hidden="true">→</span>
                </a>
                <a className="home-cinematic__text-link" href={exploreHref}>
                  Xem tất cả điểm đến <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>
          </div>

          <div
            className="home-cinematic__rail-wrap"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onFocusCapture={handleFocusCapture}
            onBlurCapture={handleBlurCapture}
          >
            <div className="home-cinematic__rail-header">
              <span>Hành trình Hà Tĩnh</span>
              <span className="home-cinematic__rail-count">
                {String(carousel.activeIndex + 1).padStart(2, '0')} /{' '}
                {String(destinations.length).padStart(2, '0')}
              </span>
            </div>
            <ul className="home-cinematic__rail" aria-label="Các điểm đến">
              {railOrder.map((originalIndex) => {
                const destination = destinations[originalIndex];
                if (!destination) {
                  return null;
                }
                const isActive = originalIndex === carousel.activeIndex;
                return (
                  <li
                    className={`home-cinematic__card${isActive ? ' is-active' : ''}`}
                    data-active={isActive ? 'true' : 'false'}
                    data-testid="home-cinematic-card"
                    data-destination-slug={destination.slug}
                    key={destination.id}
                  >
                    <button
                      className="home-cinematic__card-select"
                      type="button"
                      aria-label={`Chọn ${destination.name}`}
                      aria-pressed={isActive}
                      aria-current={isActive ? 'true' : undefined}
                      onClick={() => carousel.select(originalIndex)}
                    >
                      <ResponsiveImage
                        asset={destination.cardImage}
                        loading="eager"
                        sizes="(max-width: 768px) 70vw, (max-width: 1200px) 25vw, 18rem"
                      />
                      <span className="home-cinematic__card-overlay" />
                      <span className="home-cinematic__card-badge" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                          <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
                        </svg>
                      </span>
                      <span className="home-cinematic__card-copy">
                        <span className="home-cinematic__card-index">
                          {String(originalIndex + 1).padStart(2, '0')}
                        </span>
                        <span className="home-cinematic__card-name">{destination.name}</span>
                        {destination.categoryLabel ? (
                          <span className="home-cinematic__card-category">
                            {destination.categoryLabel}
                          </span>
                        ) : null}
                      </span>
                    </button>
                    <a className="home-cinematic__card-link" href={destination.detailHref}>
                      Xem chi tiết <span aria-hidden="true">↗</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Bottom bar with passive index indicator and progress track */}
        <div className="home-cinematic__bottom-bar">
          <div className="home-cinematic__bottom-index" aria-hidden="true">
            <span>{String(carousel.activeIndex + 1).padStart(2, '0')}</span>
            <span className="home-cinematic__bottom-divider">/</span>
            <span>{String(destinations.length).padStart(2, '0')}</span>
          </div>

          <div
            className="home-cinematic__progress"
            role="group"
            aria-label={`${carousel.activeIndex + 1} / ${destinations.length}`}
          >
            <div
              className="home-cinematic__progress-track"
              role="progressbar"
              aria-label="Tiến trình điểm đến"
              aria-valuemin={1}
              aria-valuemax={destinations.length}
              aria-valuenow={carousel.activeIndex + 1}
              aria-valuetext={`${activeDestination.name}, ${carousel.activeIndex + 1} trên ${destinations.length}`}
            >
              <span
                className="home-cinematic__progress-value"
                style={{ width: `${((carousel.activeIndex + 1) / destinations.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="home-cinematic__bottom-brand" aria-hidden="true">
            <span>Hà Tĩnh 360°</span>
          </div>
        </div>
      </section>

      {/* Concise Below-the-fold Sections */}
      <section className="home-cinematic__editorial" aria-labelledby="home-explore-title">
        <div className="home-cinematic__section-heading">
          <p className="home-cinematic__eyebrow">Mở ra một miền ký ức</p>
          <h2 id="home-explore-title">Khám phá Hà Tĩnh</h2>
          <p>Những điểm đến được tuyển chọn để bạn bắt đầu theo nhịp riêng.</p>
        </div>
        <div className="home-cinematic__editorial-grid">
          {destinations.slice(0, 3).map((destination, index) => (
            <a
              className={`home-cinematic__editorial-card home-cinematic__editorial-card--${index + 1}`}
              href={destination.detailHref}
              key={destination.id}
            >
              <ResponsiveImage
                asset={destination.hero}
                loading="lazy"
                sizes="(max-width: 768px) 90vw, 33vw"
              />
              <span className="home-cinematic__editorial-card-scrim" />
              <span className="home-cinematic__editorial-card-copy">
                <span>{destination.categoryLabel ?? 'Điểm đến Hà Tĩnh'}</span>
                <strong>{destination.name}</strong>
              </span>
            </a>
          ))}
        </div>
      </section>

      {focusDestination ? (
        <section className="home-cinematic__focus" aria-labelledby="home-focus-title">
          <div className="home-cinematic__focus-image">
            <ResponsiveImage
              asset={focusDestination.hero}
              loading="lazy"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
          <div className="home-cinematic__focus-copy">
            <p className="home-cinematic__eyebrow">Điểm hẹn tiêu biểu</p>
            <h2 id="home-focus-title">Sơn Trang Cổ Đạm</h2>
            <p>{focusDestination.summary}</p>
            <a className="home-cinematic__text-link" href={focusDestination.detailHref}>
              Xem câu chuyện Sơn Trang <span aria-hidden="true">↗</span>
            </a>
          </div>
        </section>
      ) : null}

      <section className="home-cinematic__immersive" aria-labelledby="home-immersive-title">
        <div>
          <p className="home-cinematic__eyebrow">Một cách khác để đi</p>
          <h2 id="home-immersive-title">Đi sâu hơn vào từng điểm đến.</h2>
        </div>
        <div className="home-cinematic__immersive-copy">
          <p>
            Bắt đầu từ bản đồ, chọn một nơi khiến bạn dừng lại, rồi bước vào những không gian được
            kể bằng hình ảnh.
          </p>
          <a className="home-cinematic__button home-cinematic__button--light" href={exploreHref}>
            Mở bản đồ khám phá
          </a>
        </div>
      </section>

      <section className="home-cinematic__closing" aria-labelledby="home-closing-title">
        <p className="home-cinematic__eyebrow">Hành trình bắt đầu từ đây</p>
        <h2 id="home-closing-title">Chạm vào Hà Tĩnh theo cách của bạn.</h2>
        <a className="home-cinematic__button home-cinematic__button--primary" href={exploreHref}>
          Khám phá Hà Tĩnh
        </a>
      </section>
    </main>
  );
}
