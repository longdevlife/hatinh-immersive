import { useImmersiveDestinations } from '../../../shared/api/immersive';
import type { DestinationPreviewVm } from '../../../shared/contracts';

export interface ExploreExperienceProps {
  destinations?: readonly DestinationPreviewVm[];
}

export function ExploreExperience({ destinations: destinationsOverride }: ExploreExperienceProps) {
  const destinationsQuery = useImmersiveDestinations('vi', destinationsOverride === undefined);
  const destinations = destinationsOverride ?? destinationsQuery.data;

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
          ) : destinations.length > 0 ? (
            <ul>
              {destinations.map((destination) => (
                <li key={destination.id}>
                  <strong>{destination.name}</strong>
                  <span>{destination.categoryLabel ?? 'Điểm đến'}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p role="status">Chưa có điểm đến để hiển thị.</p>
          )}
        </section>

        <section
          className="explore-experience__map-placeholder"
          aria-label="Bản đồ khám phá"
          data-testid="explore-map-placeholder"
        >
          <span>Bản đồ khám phá sẽ xuất hiện ở đây.</span>
          <small>MapLibre Explore Map sẽ được tích hợp ở PR2.</small>
        </section>
      </div>
    </main>
  );
}
