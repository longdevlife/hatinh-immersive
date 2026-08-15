import { useEffect, useMemo, useRef, useState } from 'react';

import '../../../app/styles/explore.css';
import { useImmersiveDestinations } from '../../../shared/api/immersive';
import type { DestinationPreviewVm, RendererStatus } from '../../../shared/contracts';
import { DEFAULT_HA_TINH_RASTER_STYLE } from '../../../shared/map/ha-tinh-raster-style';
import { DestinationPanel, filterDestinations } from '../../destination-catalog';
import {
  FakeExploreMapEngine,
  LazyMapLibreExploreMapEngine,
  buildDirectionsUrl,
  isFullscreenSupported,
  requestBrowserLocation,
  toggleFullscreen,
  ExploreMapControls,
  ExploreMapSelectionCard,
  ExploreMapViewport,
  type ExploreMapLocationStatus,
  type ExploreMapStyleOption,
  type ExploreMapDestination,
  type ExploreMapEnginePort,
  type ExploreMapDiagnostics,
} from '../../explore-map';

export interface ExploreExperienceProps {
  destinations?: readonly DestinationPreviewVm[];
  mapEngine?: ExploreMapEnginePort;
  initialDestinationSlug?: string;
  initialQuery?: string;
  initialCategory?: string;
  initialView?: 'cards' | 'map';
  mapStyles?: readonly ExploreMapStyleOption[];
  onDiscoveryStateChange?(state: {
    query: string;
    category: string;
    destinationSlug: string | null;
    view: 'cards' | 'map';
  }): void;
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

function getConfiguredExploreMapStyles(): readonly ExploreMapStyleOption[] {
  const primaryStyleUrl =
    import.meta.env.VITE_EXPLORE_MAP_STYLE_URL?.trim() ||
    import.meta.env.VITE_MINIMAP_STYLE_URL?.trim();
  const allowDemoFallback =
    import.meta.env.DEV || import.meta.env.VITE_IMMERSIVE_DATA_MODE === 'fake';
  const primaryStyle = primaryStyleUrl || (allowDemoFallback ? DEFAULT_HA_TINH_RASTER_STYLE : null);
  if (!primaryStyle) {
    return [];
  }

  const styles: ExploreMapStyleOption[] = [{ id: 'default', label: 'Bản đồ', style: primaryStyle }];
  const alternateStyleUrl = import.meta.env.VITE_EXPLORE_MAP_ALT_STYLE_URL?.trim();
  if (alternateStyleUrl) {
    styles.push({ id: 'alternate', label: 'Lớp phụ', style: alternateStyleUrl });
  }

  return styles;
}

function createDefaultExploreMapEngine(
  styles: readonly ExploreMapStyleOption[],
): ExploreMapEnginePort {
  if (import.meta.env.VITE_EXPLORE_MAP_MODE === 'fake') {
    return new FakeExploreMapEngine();
  }

  const style = styles[0]?.style;

  return new LazyMapLibreExploreMapEngine({
    ...(style ? { style } : {}),
  });
}

export function ExploreExperience({
  destinations: destinationsOverride,
  mapEngine: mapEngineOverride,
  initialDestinationSlug,
  initialQuery,
  initialCategory,
  initialView,
  mapStyles: mapStylesOverride,
  onDiscoveryStateChange,
  onOpenDestination,
}: ExploreExperienceProps) {
  const destinationsQuery = useImmersiveDestinations('vi', destinationsOverride === undefined);
  const destinations = destinationsOverride ?? destinationsQuery.data;
  const configuredMapStyles = useMemo(getConfiguredExploreMapStyles, []);
  const availableMapStyles = mapStylesOverride ?? configuredMapStyles;
  const mapEngine = useMemo(
    () => mapEngineOverride ?? createDefaultExploreMapEngine(availableMapStyles),
    [availableMapStyles, mapEngineOverride],
  );
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);
  const [query, setQuery] = useState(initialQuery ?? '');
  const [category, setCategory] = useState(initialCategory ?? '');
  const [isMobileMapOpen, setIsMobileMapOpen] = useState(initialView === 'map');
  const [locationStatus, setLocationStatus] = useState<ExploreMapLocationStatus>('idle');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(
    null,
  );
  const [activeMapStyleId, setActiveMapStyleId] = useState(availableMapStyles[0]?.id ?? '');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canUseFullscreen, setCanUseFullscreen] = useState(false);
  const [mapStatus, setMapStatus] = useState<RendererStatus>('idle');
  const [mapDiagnostics, setMapDiagnostics] = useState<ExploreMapDiagnostics | null>(null);
  const mapShellRef = useRef<HTMLElement>(null);
  const appliedInitialDestinationSlug = useRef<string | null>(null);
  const isMobileViewport = useIsMobileViewport();
  const canUseGeolocation =
    typeof navigator !== 'undefined' &&
    typeof navigator.geolocation?.getCurrentPosition === 'function';
  const exploreMode = isMobileViewport && !isMobileMapOpen ? 'destination-list' : 'map';
  const isMapDebugEnabled =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('mapDebug') === '1';
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
  const categories = useMemo(() => {
    const values = new Set<string>();
    destinations.forEach((destination) => {
      if (destination.categoryLabel) {
        values.add(destination.categoryLabel);
      }
    });
    return ['Tất cả', ...values];
  }, [destinations]);

  useEffect(() => {
    if (!availableMapStyles.some((style) => style.id === activeMapStyleId)) {
      setActiveMapStyleId(availableMapStyles[0]?.id ?? '');
    }
  }, [activeMapStyleId, availableMapStyles]);

  useEffect(() => {
    const syncFullscreen = () => {
      const mapShell = mapShellRef.current;
      const documentLike = document;
      setCanUseFullscreen(isFullscreenSupported(mapShell, documentLike));
      setIsFullscreen(documentLike.fullscreenElement === mapShell);
    };

    syncFullscreen();
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

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

  useEffect(() => {
    if (isMobileViewport) {
      setIsMobileMapOpen(initialView === 'map');
    }
  }, [initialView, isMobileViewport]);

  useEffect(() => {
    if (!isMapDebugEnabled || mapStatus !== 'ready' || !mapEngine.getDiagnostics) {
      setMapDiagnostics(null);
      return undefined;
    }

    let cancelled = false;
    setMapDiagnostics(null);
    void mapEngine.getDiagnostics().then((diagnostics) => {
      if (!cancelled) {
        setMapDiagnostics(diagnostics);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    isMapDebugEnabled,
    mapDestinations,
    mapEngine,
    mapStatus,
    selectedDestinationId,
    userLocation,
  ]);

  function handleSelectDestination(destinationId: string) {
    const nextDestination = filteredDestinations.find(
      (destination) => destination.id === destinationId,
    );
    if (nextDestination) {
      setSelectedDestinationId(destinationId);
      onDiscoveryStateChange?.({
        query,
        category,
        destinationSlug: nextDestination.slug,
        view: isMobileViewport && !isMobileMapOpen ? 'cards' : 'map',
      });
    }
  }

  function setMobileMapMode(open: boolean) {
    setIsMobileMapOpen(open);
    onDiscoveryStateChange?.({
      query,
      category,
      destinationSlug: selectedDestination?.slug ?? null,
      view: open ? 'map' : 'cards',
    });
  }

  function updateQuery(nextQuery: string) {
    const nextFilteredDestinations = filterDestinations(destinations, {
      query: nextQuery,
      category,
    });
    const nextSelectedDestination = nextFilteredDestinations.find(
      (destination) => destination.id === selectedDestinationId,
    );
    setQuery(nextQuery);
    onDiscoveryStateChange?.({
      query: nextQuery,
      category,
      destinationSlug: nextSelectedDestination?.slug ?? null,
      view: isMobileViewport && !isMobileMapOpen ? 'cards' : 'map',
    });
  }

  function updateCategory(nextCategory: string) {
    const nextFilteredDestinations = filterDestinations(destinations, {
      query,
      category: nextCategory,
    });
    const nextSelectedDestination = nextFilteredDestinations.find(
      (destination) => destination.id === selectedDestinationId,
    );
    setCategory(nextCategory);
    onDiscoveryStateChange?.({
      query,
      category: nextCategory,
      destinationSlug: nextSelectedDestination?.slug ?? null,
      view: isMobileViewport && !isMobileMapOpen ? 'cards' : 'map',
    });
  }

  function handleRequestUserLocation() {
    if (!canUseGeolocation) {
      setLocationStatus('unavailable');
      return;
    }

    setLocationStatus('requesting');
    void requestBrowserLocation(navigator.geolocation).then((result) => {
      setLocationStatus(result.status);
      if (result.status !== 'available' || !result.location) {
        setUserLocation(null);
        return;
      }

      setUserLocation(result.location);
      void mapEngine.flyTo({
        latitude: result.location.latitude,
        longitude: result.location.longitude,
        zoom: 12,
      });
    });
  }

  function handleChangeMapStyle(styleId: string) {
    const nextStyle = availableMapStyles.find((style) => style.id === styleId);
    if (!nextStyle || nextStyle.id === activeMapStyleId) {
      return;
    }

    const previousStyleId = activeMapStyleId;
    setActiveMapStyleId(nextStyle.id);
    void mapEngine.changeStyle(nextStyle.style).catch(() => {
      setActiveMapStyleId(previousStyleId);
    });
  }

  function handleToggleFullscreen() {
    void toggleFullscreen(mapShellRef.current, document).catch(() => undefined);
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
    params.set('view', isMobileViewport && !isMobileMapOpen ? 'cards' : 'map');
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
              onQueryChange={updateQuery}
              onCategoryChange={updateCategory}
              onSelectDestination={handleSelectDestination}
              onOpenDestination={onOpenDestination ? openDestination : undefined}
              onOpenMap={() => setMobileMapMode(true)}
              selectedDestination={selectedDestination}
            />
          )}
        </section>

        <section
          ref={mapShellRef}
          className="explore-experience__map"
          data-explore-mode={exploreMode}
          data-map-open={isMobileMapOpen}
          data-testid="explore-map"
        >
          {isMobileViewport && isMobileMapOpen ? (
            <button
              className="explore-experience__back-to-list"
              type="button"
              onClick={() => setMobileMapMode(false)}
            >
              Quay lại danh sách
            </button>
          ) : null}
          <ExploreMapControls
            activeMapStyleId={activeMapStyleId}
            canUseFullscreen={canUseFullscreen}
            canUseGeolocation={canUseGeolocation}
            categories={isMobileViewport && isMobileMapOpen ? categories : []}
            isFullscreen={isFullscreen}
            locationStatus={locationStatus}
            mapStyles={availableMapStyles}
            onCategoryChange={(nextCategory) =>
              updateCategory(nextCategory === 'Tất cả' ? '' : nextCategory)
            }
            onChangeMapStyle={handleChangeMapStyle}
            onRequestUserLocation={handleRequestUserLocation}
            onToggleFullscreen={handleToggleFullscreen}
            selectedCategory={category}
          />
          <ExploreMapViewport
            destinations={mapDestinations}
            enabled={!isMobileViewport || isMobileMapOpen}
            engine={mapEngine}
            onDestinationSelected={handleSelectDestination}
            onStatusChange={setMapStatus}
            selectedDestinationId={selectedDestinationId}
            userLocation={userLocation}
          />
          {selectedDestination ? (
            <ExploreMapSelectionCard
              destination={selectedDestination}
              directionsHref={buildDirectionsUrl(selectedDestination.geoPoint)}
              onOpenDetail={
                onOpenDestination ? () => openDestination(selectedDestination) : undefined
              }
            />
          ) : null}
          {isMapDebugEnabled && mapStatus === 'ready' ? (
            <pre data-testid="explore-map-debug" hidden>
              {JSON.stringify(mapDiagnostics ?? { diagnosticsUnavailable: true, mapStatus })}
            </pre>
          ) : null}
        </section>
      </div>
    </main>
  );
}
