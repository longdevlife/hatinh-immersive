import { useEffect, useMemo, useState } from 'react';

import { useImmersiveDestinations } from '../../../shared/api/immersive';
import type { DestinationPreviewVm } from '../../../shared/contracts';
import { DestinationPanel, filterDestinations } from '../../destination-catalog';
import {
  FakeExploreMapEngine,
  ExploreMapViewport,
  MapLibreExploreMapEngine,
  type ExploreMapDestination,
  type ExploreMapEnginePort,
} from '../../explore-map';
import { DEFAULT_HA_TINH_MINIMAP_STYLE } from '../../minimap/config/minimap-style';

export interface ExploreExperienceProps {
  destinations?: readonly DestinationPreviewVm[];
  mapEngine?: ExploreMapEnginePort;
}

function toExploreMapDestination(destination: DestinationPreviewVm): ExploreMapDestination | null {
  if (!destination.geoPoint) {
    return null;
  }

  return {
    categoryLabel: destination.categoryLabel,
    featured: destination.defaultSceneId !== null,
    id: destination.id,
    label: destination.name,
    latitude: destination.geoPoint.latitude,
    longitude: destination.geoPoint.longitude,
  };
}

function createDefaultExploreMapEngine(): ExploreMapEnginePort {
  if (import.meta.env.VITE_IMMERSIVE_RENDERER_MODE === 'fake') {
    return new FakeExploreMapEngine();
  }

  const styleUrl =
    import.meta.env.VITE_EXPLORE_MAP_STYLE_URL?.trim() ||
    import.meta.env.VITE_MINIMAP_STYLE_URL?.trim();
  const allowDemoFallback =
    import.meta.env.DEV || import.meta.env.VITE_IMMERSIVE_DATA_MODE === 'fake';

  return new MapLibreExploreMapEngine({
    ...(styleUrl
      ? { style: styleUrl }
      : allowDemoFallback
        ? { style: DEFAULT_HA_TINH_MINIMAP_STYLE }
        : {}),
  });
}

export function ExploreExperience({
  destinations: destinationsOverride,
  mapEngine: mapEngineOverride,
}: ExploreExperienceProps) {
  const destinationsQuery = useImmersiveDestinations('vi', destinationsOverride === undefined);
  const destinations = destinationsOverride ?? destinationsQuery.data;
  const mapEngine = useMemo(
    () => mapEngineOverride ?? createDefaultExploreMapEngine(),
    [mapEngineOverride],
  );
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [isMobileMapOpen, setIsMobileMapOpen] = useState(false);
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

      return filteredDestinations[0]?.id ?? null;
    });
  }, [filteredDestinations]);

  function handleSelectDestination(destinationId: string) {
    if (filteredDestinations.some((destination) => destination.id === destinationId)) {
      setSelectedDestinationId(destinationId);
    }
  }

  return (
    <main className="explore-experience" aria-labelledby="explore-title">
      <header className="explore-experience__header">
        <p className="eyebrow">Hà Tĩnh / Explore</p>
        <h1 id="explore-title">Khám phá Hà Tĩnh</h1>
        <p>Chọn một điểm đến để bắt đầu hành trình của bạn.</p>
      </header>

      <div className="explore-experience__layout">
        <section className="explore-experience__destinations" aria-label="Danh sách điểm đến">
          {destinationsQuery.isLoading && destinationsOverride === undefined ? (
            <p role="status">Đang tải điểm đến…</p>
          ) : (
            <DestinationPanel
              destinations={filteredDestinations}
              selectedDestinationId={selectedDestinationId}
              query={query}
              category={category}
              onQueryChange={setQuery}
              onCategoryChange={setCategory}
              onSelectDestination={handleSelectDestination}
              onOpenMap={() => setIsMobileMapOpen(true)}
            />
          )}
        </section>

        <section
          className="explore-experience__map"
          data-map-open={isMobileMapOpen}
          data-testid="explore-map"
        >
          <ExploreMapViewport
            destinations={mapDestinations}
            engine={mapEngine}
            onDestinationSelected={handleSelectDestination}
            selectedDestinationId={selectedDestinationId}
          />
          {selectedDestination ? (
            <p aria-live="polite" className="explore-experience__selection">
              Đang chọn: {selectedDestination.name}
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
