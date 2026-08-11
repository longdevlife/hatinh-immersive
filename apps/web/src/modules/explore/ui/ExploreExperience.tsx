import { useEffect, useMemo, useState } from 'react';

import { useImmersiveDestinations } from '../../../shared/api/immersive';
import type { DestinationPreviewVm } from '../../../shared/contracts';
import { DestinationPanel, filterDestinations } from '../../destination-catalog';

export interface ExploreExperienceProps {
  destinations?: readonly DestinationPreviewVm[];
}

export function ExploreExperience({ destinations: destinationsOverride }: ExploreExperienceProps) {
  const destinationsQuery = useImmersiveDestinations('vi', destinationsOverride === undefined);
  const destinations = destinationsOverride ?? destinationsQuery.data;
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [isMobileMapOpen, setIsMobileMapOpen] = useState(false);
  const filteredDestinations = useMemo(
    () => filterDestinations(destinations, { query, category }),
    [category, destinations, query],
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
          className="explore-experience__map-placeholder"
          aria-label="Bản đồ khám phá"
          data-map-open={isMobileMapOpen}
          data-testid="explore-map-placeholder"
        >
          <span>Bản đồ khám phá sẽ xuất hiện ở đây.</span>
          <small>MapLibre Explore Map sẽ được tích hợp ở PR2.</small>
          {selectedDestination ? (
            <p aria-live="polite">Đang chọn: {selectedDestination.name}</p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
