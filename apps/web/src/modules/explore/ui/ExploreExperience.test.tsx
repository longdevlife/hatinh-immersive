import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { DEMO_DESTINATIONS } from '../../immersive-navigation/fake-mode/demo-catalog';

import { ExploreExperience } from './ExploreExperience';

const destinations = DEMO_DESTINATIONS.map(({ preview }) => preview);

function renderExplore() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ExploreExperience destinations={destinations} />
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

  it('opens the map placeholder through the mobile map callback', () => {
    renderExplore();

    fireEvent.click(screen.getByRole('button', { name: 'Xem bản đồ' }));

    expect(screen.getByTestId('explore-map-placeholder')).toHaveAttribute('data-map-open', 'true');
  });
});
