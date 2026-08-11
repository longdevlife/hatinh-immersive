import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import * as immersiveApi from '../../../shared/api/immersive';
import { destinationFixture } from '../../../shared/fixtures';
import { DEMO_DESTINATIONS } from '../../immersive-navigation/fake-mode/demo-catalog';
import { DestinationDetailRoute } from './DestinationDetailRoute';
import type { DestinationCapabilityConfig } from '../model/destination-capabilities';

const destinations = DEMO_DESTINATIONS.map(({ preview }) => preview);

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

function renderRoute(
  initialEntry: string,
  routeDestinations = destinations,
  routeProps?: { capabilityConfig?: DestinationCapabilityConfig },
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            path="/explore/:destinationSlug"
            element={<DestinationDetailRoute destinations={routeDestinations} {...routeProps} />}
          />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DestinationDetailRoute', () => {
  it('renders the focused Sơn Trang experience from the destination route', () => {
    renderRoute('/explore/son-trang-co-dam', [destinationFixture, ...destinations]);

    expect(screen.getByRole('main', { name: 'Trải nghiệm Sơn Trang Cổ Đạm' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bốn lớp trải nghiệm' })).toBeInTheDocument();
    expect(screen.getByText('Văn hóa & di sản')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Khám phá 360°' })).toBeInTheDocument();
  });

  it('enters the Sơn Trang panorama route from the focused CTA', () => {
    renderRoute('/explore/son-trang-co-dam', [destinationFixture, ...destinations]);

    fireEvent.click(screen.getByRole('button', { name: 'Khám phá 360°' }));

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/explore/son-trang-co-dam/immersive?mode=panorama&location=destination-son-trang-co-dam&scene=scene-01',
    );
  });

  it('returns to Explore from the focused Sơn Trang back action', () => {
    renderRoute('/explore/son-trang-co-dam', [destinationFixture, ...destinations]);

    fireEvent.click(screen.getByRole('button', { name: /Khám phá Hà Tĩnh/ }));

    expect(screen.getByTestId('location')).toHaveTextContent('/explore');
  });

  it('opens the focused Sơn Trang location on the map', () => {
    renderRoute('/explore/son-trang-co-dam', [destinationFixture, ...destinations]);

    fireEvent.click(screen.getByRole('button', { name: 'Xem trên bản đồ' }));

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/explore?destination=son-trang-co-dam',
    );
  });

  it('enters selected 3D from the focused Sơn Trang CTA when explicitly enabled', () => {
    renderRoute('/explore/son-trang-co-dam', [destinationFixture, ...destinations], {
      capabilityConfig: { selected3DSlugs: new Set(['son-trang-co-dam']) },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Xem 3D' }));

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/explore/son-trang-co-dam/immersive?mode=overview3d&location=destination-son-trang-co-dam',
    );
  });

  it('does not render a selected 3D CTA in the default detail capability set', () => {
    renderRoute('/explore/son-trang-co-dam', [destinationFixture, ...destinations]);

    expect(screen.queryByRole('button', { name: 'Xem 3D' })).not.toBeInTheDocument();
  });

  it('does not render a selected 3D CTA when the configured provider is unavailable', () => {
    renderRoute('/explore/son-trang-co-dam', [destinationFixture, ...destinations], {
      capabilityConfig: {
        selected3DAvailabilityBySlug: { 'son-trang-co-dam': 'unavailable' },
      },
    });

    expect(screen.queryByRole('button', { name: 'Xem 3D' })).not.toBeInTheDocument();
    expect(screen.getByText('Mô hình 3D khu vực này đang được cập nhật')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Khám phá 360°' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xem trên bản đồ' })).toBeInTheDocument();
  });

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
