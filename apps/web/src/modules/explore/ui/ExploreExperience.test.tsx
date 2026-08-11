import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { DEMO_DESTINATIONS } from '../../immersive-navigation/fake-mode/demo-catalog';
import { FakeExploreMapEngine } from '../../explore-map';

import { ExploreExperience } from './ExploreExperience';

const destinations = DEMO_DESTINATIONS.map(({ preview }) => preview);

function renderExplore(mapEngine = new FakeExploreMapEngine()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ExploreExperience destinations={destinations} mapEngine={mapEngine} />
    </QueryClientProvider>,
  );
}

describe('ExploreExperience', () => {
  it('uses one selection state for destination cards and the selected preview', () => {
    renderExplore();

    fireEvent.click(screen.getByRole('button', { name: 'Chọn điểm đến Khu lưu niệm Nguyễn Du' }));

    expect(screen.getByTestId('destination-card-nguyen-du-memorial')).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(screen.getByText('Đang chọn: Khu lưu niệm Nguyễn Du')).toBeInTheDocument();
  });

  it('applies query filtering to the same destination set shown in the panel', () => {
    renderExplore();

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Thiên Cầm' } });

    expect(screen.getByText('Biển Thiên Cầm')).toBeInTheDocument();
    expect(screen.queryByText('Khu lưu niệm Nguyễn Du')).not.toBeInTheDocument();
  });

  it('opens the map surface through the mobile map callback', async () => {
    const mapEngine = new FakeExploreMapEngine();
    renderExplore(mapEngine);

    fireEvent.click(screen.getByRole('button', { name: 'Xem bản đồ' }));

    expect(screen.getByTestId('explore-map')).toHaveAttribute('data-map-open', 'true');
    await waitFor(() => expect(mapEngine.calls.some((call) => call.type === 'mount')).toBe(true));
  });

  it('synchronizes a map destination click back to the selected card', async () => {
    const mapEngine = new FakeExploreMapEngine();
    renderExplore(mapEngine);
    await waitFor(() => expect(mapEngine.calls.some((call) => call.type === 'mount')).toBe(true));

    act(() => mapEngine.emitDestinationSelected('nguyen-du-memorial'));

    expect(screen.getByTestId('destination-card-nguyen-du-memorial')).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  it('flies the map to the destination selected from the panel', async () => {
    const mapEngine = new FakeExploreMapEngine();
    renderExplore(mapEngine);
    await waitFor(() => expect(mapEngine.calls.some((call) => call.type === 'mount')).toBe(true));

    fireEvent.click(screen.getByRole('button', { name: 'Chọn điểm đến Khu lưu niệm Nguyễn Du' }));

    await waitFor(() =>
      expect(mapEngine.calls).toContainEqual({
        target: { latitude: 18.6647657, longitude: 105.7667208, zoom: 13 },
        type: 'flyTo',
      }),
    );
  });
});
