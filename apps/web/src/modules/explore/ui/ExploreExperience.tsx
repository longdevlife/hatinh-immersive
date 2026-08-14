import { useEffect, useMemo, useRef, useState } from 'react';

import { useImmersiveDestinations } from '../../../shared/api/immersive';
import type { DestinationPreviewVm } from '../../../shared/contracts';
import { DEFAULT_HA_TINH_RASTER_STYLE } from '../../../shared/map/ha-tinh-raster-style';
import { DestinationPanel, filterDestinations } from '../../destination-catalog';
import {
  FakeExploreMapEngine,
  LazyMapLibreExploreMapEngine,
  ExploreMapViewport,
  type ExploreMapDestination,
  type ExploreMapEnginePort,
} from '../../explore-map';

export interface ExploreExperienceProps {
  destinations?: readonly DestinationPreviewVm[];
  mapEngine?: ExploreMapEnginePort;
  initialDestinationSlug?: string;
  initialQuery?: string;
  initialCategory?: string;
  onOpenDestination?(destination: DestinationPreviewVm, returnHref?: string): void;
}

const MOBILE_VIEWPORT_QUERY = '(max-width: 768px)';

function useIsMobileViewport(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }

    return window.matchMedia(MOBILE_VIEWPORT_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(MOBILE_VIEWPORT_QUERY);
    const onChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    setIsMobile(mediaQuery.matches);
    const usesEventListener = typeof mediaQuery.addEventListener === 'function';
    if (usesEventListener) {
      mediaQuery.addEventListener('change', onChange);
    } else {
      mediaQuery.addListener?.(onChange);
    }

    return () => {
      if (usesEventListener) {
        mediaQuery.removeEventListener('change', onChange);
      } else {
        mediaQuery.removeListener?.(onChange);
      }
    };
  }, []);

  return isMobile;
}

function toExploreMapDestination(destination: DestinationPreviewVm): ExploreMapDestination | null {
  if (!destination.geoPoint) {
    return null;
  }

  return {
    categoryLabel: destination.categoryLabel,
    featured: false,
    id: destination.id,
    label: destination.name,
    latitude: destination.geoPoint.latitude,
    longitude: destination.geoPoint.longitude,
  };
}

function createDefaultExploreMapEngine(): ExploreMapEnginePort {
  if (import.meta.env.VITE_EXPLORE_MAP_MODE === 'fake') {
    return new FakeExploreMapEngine();
  }

  const styleUrl =
    import.meta.env.VITE_EXPLORE_MAP_STYLE_URL?.trim() ||
    import.meta.env.VITE_MINIMAP_STYLE_URL?.trim();
  const allowDemoFallback =
    import.meta.env.DEV || import.meta.env.VITE_IMMERSIVE_DATA_MODE === 'fake';

  return new LazyMapLibreExploreMapEngine({
    ...(styleUrl
      ? { style: styleUrl }
      : allowDemoFallback
        ? { style: DEFAULT_HA_TINH_RASTER_STYLE }
        : {}),
  });
}

export function ExploreExperience({
  destinations: destinationsOverride,
  mapEngine: mapEngineOverride,
  initialDestinationSlug,
  initialQuery,
  initialCategory,
  onOpenDestination,
}: ExploreExperienceProps) {
  const destinationsQuery = useImmersiveDestinations('vi', destinationsOverride === undefined);
  const destinations = destinationsOverride ?? destinationsQuery.data;
  const mapEngine = useMemo(
    () => mapEngineOverride ?? createDefaultExploreMapEngine(),
    [mapEngineOverride],
  );
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);
  const [query, setQuery] = useState(initialQuery ?? '');
  const [category, setCategory] = useState(initialCategory ?? '');
  const [isMobileMapOpen, setIsMobileMapOpen] = useState(false);
  const appliedInitialDestinationSlug = useRef<string | null>(null);
  const isMobileViewport = useIsMobileViewport();
  const exploreMode = isMobileViewport && !isMobileMapOpen ? 'destination-list' : 'map';
  const filteredDestinations = useMemo(
    () => filterDestinations(destinations, { query, category }),
    [category, destinations, query],
  );
  const mapDestinations = useMemo(
    () =>
      filteredDestinations.flatMap((destination) => {
        const mapDestination = toExploreMapDestination(destination);
        return mapDestination ? [mapDestination] : [];
      }),
    [filteredDestinations],
  );
  const selectedDestination = filteredDestinations.find(
    (destination) => destination.id === selectedDestinationId,
  );

  useEffect(() => {
    setSelectedDestinationId((currentId) => {
      if (currentId && filteredDestinations.some((destination) => destination.id === currentId)) {
        return currentId;
      }

      return null;
    });
  }, [filteredDestinations]);

  useEffect(() => {
    if (
      !initialDestinationSlug ||
      appliedInitialDestinationSlug.current === initialDestinationSlug ||
      (destinationsOverride === undefined && destinationsQuery.isLoading)
    ) {
      return;
    }

    const destination = destinations.find(({ slug }) => slug === initialDestinationSlug);
    if (!destination) {
      return;
    }

    appliedInitialDestinationSlug.current = initialDestinationSlug;
    setSelectedDestinationId(destination.id);
  }, [destinations, destinationsOverride, destinationsQuery.isLoading, initialDestinationSlug]);

  function handleSelectDestination(destinationId: string) {
    if (filteredDestinations.some((destination) => destination.id === destinationId)) {
      setSelectedDestinationId(destinationId);
    }
  }

  function openDestination(destination: DestinationPreviewVm) {
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set('q', query.trim());
    }
    if (category.trim()) {
      params.set('category', category.trim());
    }
    params.set('destination', destination.slug);
    onOpenDestination?.(destination, `/explore?${params.toString()}`);
  }

  return (
    <main className="explore-experience" aria-label="Khám phá Hà Tĩnh">
      <div className="explore-experience__layout" data-explore-mode={exploreMode}>
        <section className="explore-experience__destinations" aria-label="Danh sách điểm đến">
          <header className="explore-experience__header">
            <p className="eyebrow">Hà Tĩnh / Explore</p>
            <h1 id="explore-title">Khám phá Hà Tĩnh</h1>
            <p>Chọn một điểm đến để bắt đầu hành trình của bạn.</p>
          </header>
          {destinationsQuery.isLoading && destinationsOverride === undefined ? (
            <p role="status">Đang tải điểm đến…</p>
          ) : destinationsQuery.isError && destinationsOverride === undefined ? (
            <p role="alert">Không thể tải danh sách điểm đến. Vui lòng thử lại sau.</p>
          ) : destinations.length === 0 ? (
            <p role="status">Hiện chưa có điểm đến để khám phá.</p>
          ) : (
            <DestinationPanel
              availableDestinations={destinations}
              destinations={filteredDestinations}
              selectedDestinationId={selectedDestinationId}
              query={query}
              category={category}
              onQueryChange={setQuery}
              onCategoryChange={setCategory}
              onSelectDestination={handleSelectDestination}
              onOpenDestination={onOpenDestination ? openDestination : undefined}
              onOpenMap={() => setIsMobileMapOpen(true)}
              selectedDestination={selectedDestination}
            />
          )}
        </section>

        <section
          className="explore-experience__map"
          data-explore-mode={exploreMode}
          data-map-open={isMobileMapOpen}
          data-testid="explore-map"
        >
          {isMobileViewport && isMobileMapOpen ? (
            <button
              className="explore-experience__back-to-list"
              type="button"
              onClick={() => setIsMobileMapOpen(false)}
            >
              Quay lại danh sách
            </button>
          ) : null}
          <ExploreMapViewport
            destinations={mapDestinations}
            enabled={!isMobileViewport || isMobileMapOpen}
            engine={mapEngine}
            onDestinationSelected={handleSelectDestination}
            selectedDestinationId={selectedDestinationId}
          />
          {selectedDestination ? (
            <div
              aria-live="polite"
              className="explore-experience__selection"
              data-testid="explore-selected-destination"
            >
              <p>Đang chọn: {selectedDestination.name}</p>
              {onOpenDestination ? (
                <button
                  type="button"
                  className="explore-experience__detail-action"
                  onClick={() => openDestination(selectedDestination)}
                >
                  Xem chi tiết
                </button>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
