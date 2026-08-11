import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import * as immersiveApi from '../../../shared/api/immersive';
import { DEMO_DESTINATIONS } from '../../immersive-navigation/fake-mode/demo-catalog';
import { DestinationDetailRoute } from './DestinationDetailRoute';

const destinations = DEMO_DESTINATIONS.map(({ preview }) => preview);

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

function renderRoute(initialEntry: string, routeDestinations = destinations) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            path="/explore/:destinationSlug"
            element={<DestinationDetailRoute destinations={routeDestinations} />}
          />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DestinationDetailRoute', () => {
  it('renders a destination detail product page without mounting an immersive renderer', () => {
    renderRoute('/explore/bien-thien-cam');

    expect(screen.getByRole('heading', { name: 'Biển Thiên Cầm' })).toBeInTheDocument();
    expect(screen.queryByRole('application')).not.toBeInTheDocument();
    expect(screen.queryByTestId('map3d-renderer')).not.toBeInTheDocument();
    expect(screen.queryByTestId('panorama-renderer')).not.toBeInTheDocument();
  });

  it('navigates to the selected destination on the map', () => {
    renderRoute('/explore/bien-thien-cam');

    fireEvent.click(screen.getByRole('button', { name: 'Xem trên bản đồ' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/explore?destination=bien-thien-cam');
  });

  it('enters the explicit immersive route only from the panorama CTA', () => {
    renderRoute('/explore/bien-thien-cam');

    fireEvent.click(screen.getByRole('button', { name: 'Khám phá 360°' }));

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/explore/bien-thien-cam/immersive?mode=panorama&location=thien-cam-beach&scene=thien-cam-boardwalk',
    );
  });

  it('returns to the Explore discovery route', () => {
    renderRoute('/explore/bien-thien-cam');

    fireEvent.click(screen.getByRole('button', { name: 'Quay lại khám phá' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/explore');
  });

  it('hides panorama CTA for a destination without a default scene', () => {
    const noPanorama = destinations.map((destination) =>
      destination.slug === 'bien-thien-cam'
        ? { ...destination, defaultSceneId: null }
        : destination,
    );

    renderRoute('/explore/bien-thien-cam', noPanorama);

    expect(screen.queryByRole('button', { name: 'Khám phá 360°' })).not.toBeInTheDocument();
  });

  it('renders a not-found state for an unknown destination slug', () => {
    renderRoute('/explore/does-not-exist');

    expect(screen.getByRole('alert')).toHaveTextContent('Không tìm thấy điểm đến này.');
  });

  it('separates remote loading and error states from not-found', async () => {
    vi.spyOn(immersiveApi, 'useImmersiveDestinations').mockReturnValue({
      data: [],
      isError: true,
      isPending: false,
    } as unknown as ReturnType<typeof immersiveApi.useImmersiveDestinations>);

    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/explore/bien-thien-cam']}>
          <Routes>
            <Route path="/explore/:destinationSlug" element={<DestinationDetailRoute />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Không thể tải thông tin điểm đến. Vui lòng thử lại sau.',
      ),
    );
  });
});
