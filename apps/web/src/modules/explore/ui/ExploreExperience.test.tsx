import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as immersiveApi from '../../../shared/api/immersive';
import { DEMO_DESTINATIONS } from '../../immersive-navigation/fake-mode/demo-catalog';
import { FakeExploreMapEngine } from '../../explore-map';

import { ExploreExperience } from './ExploreExperience';

const destinations = DEMO_DESTINATIONS.map(({ preview }) => preview);

function renderExplore(
  mapEngine = new FakeExploreMapEngine(),
  props: Partial<ComponentProps<typeof ExploreExperience>> = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ExploreExperience destinations={destinations} mapEngine={mapEngine} {...props} />
    </QueryClientProvider>,
  );
}

function renderRemoteExplore(mapEngine = new FakeExploreMapEngine()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ExploreExperience mapEngine={mapEngine} />
    </QueryClientProvider>,
  );
}

describe('ExploreExperience', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('keeps mobile in destination-list mode until opening, then supports close and reopen', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: true,
        media: '(max-width: 768px)',
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      }),
    );
    const mapEngine = new FakeExploreMapEngine();
    renderExplore(mapEngine);

    expect(screen.getByTestId('explore-map')).toHaveAttribute(
      'data-explore-mode',
      'destination-list',
    );
    expect(mapEngine.calls.filter((call) => call.type === 'mount')).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Xem bản đồ' }));
    await waitFor(() =>
      expect(mapEngine.calls.filter((call) => call.type === 'mount')).toHaveLength(1),
    );
    expect(screen.getByTestId('explore-map')).toHaveAttribute('data-explore-mode', 'map');
    expect(screen.getByRole('button', { name: 'Quay lại danh sách' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Quay lại danh sách' }));
    await waitFor(() =>
      expect(mapEngine.calls.filter((call) => call.type === 'destroy')).toHaveLength(1),
    );
    expect(screen.getByTestId('explore-map')).toHaveAttribute(
      'data-explore-mode',
      'destination-list',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Xem bản đồ' }));
    await waitFor(() =>
      expect(mapEngine.calls.filter((call) => call.type === 'mount')).toHaveLength(2),
    );
  });

  it('uses one selection state for destination cards and the selected preview', () => {
    renderExplore();

    fireEvent.click(screen.getByRole('button', { name: 'Chọn điểm đến Khu lưu niệm Nguyễn Du' }));

    expect(screen.getByTestId('destination-card-nguyen-du-memorial')).toHaveAttribute(
      'aria-current',
      'true',
    );
    const selectionCard = screen.getByRole('complementary', {
      name: 'Điểm đến đang chọn: Khu lưu niệm Nguyễn Du',
    });
    expect(
      within(selectionCard).getByRole('heading', { name: 'Khu lưu niệm Nguyễn Du' }),
    ).toBeInTheDocument();
    expect(within(selectionCard).getByText('Điểm đến đang chọn')).toBeInTheDocument();
  });

  it('opens the selected destination through the detail callback', () => {
    const onOpenDestination = vi.fn();
    renderExplore(new FakeExploreMapEngine(), { onOpenDestination });

    fireEvent.click(screen.getByRole('button', { name: 'Chọn điểm đến Khu lưu niệm Nguyễn Du' }));
    fireEvent.click(
      within(screen.getByTestId('explore-map')).getByRole('button', { name: 'Xem chi tiết' }),
    );

    expect(onOpenDestination).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'khu-luu-niem-nguyen-du' }),
      '/explore?destination=khu-luu-niem-nguyen-du&view=map',
    );
  });

  it('passes the discovery query, category, and selection into the detail return context', () => {
    const onOpenDestination = vi.fn();
    renderExplore(new FakeExploreMapEngine(), { onOpenDestination });

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Nguyễn' } });
    fireEvent.click(
      within(screen.getByRole('region', { name: 'Danh sách điểm đến' })).getByRole('button', {
        name: 'Di sản & văn hóa',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Chọn điểm đến Khu lưu niệm Nguyễn Du' }));
    fireEvent.click(
      within(screen.getByTestId('explore-map')).getByRole('button', { name: 'Xem chi tiết' }),
    );

    const [, returnHref] = onOpenDestination.mock.calls.at(-1) ?? [];
    expect(returnHref).toBe(
      '/explore?q=Nguy%E1%BB%85n&category=Di+s%E1%BA%A3n+%26+v%C4%83n+h%C3%B3a&destination=khu-luu-niem-nguyen-du&view=map',
    );
  });

  it('restores a destination selected by the detail map return query', async () => {
    const mapEngine = new FakeExploreMapEngine();
    renderExplore(mapEngine, { initialDestinationSlug: 'bien-thien-cam' });

    await waitFor(() =>
      expect(screen.getByTestId('destination-card-thien-cam-beach')).toHaveAttribute(
        'aria-current',
        'true',
      ),
    );
  });

  it('starts with the Hà Tĩnh overview and does not fly to the first destination', async () => {
    const mapEngine = new FakeExploreMapEngine();
    renderExplore(mapEngine);

    await waitFor(() => expect(mapEngine.calls.some((call) => call.type === 'mount')).toBe(true));

    expect(screen.getByRole('region', { name: 'Bản đồ khám phá Hà Tĩnh' })).toHaveAttribute(
      'data-selected-destination-id',
      '',
    );
    expect(mapEngine.calls.filter((call) => call.type === 'flyTo')).toHaveLength(0);
  });

  it('keeps panorama capability separate from featured map semantics', async () => {
    const mapEngine = new FakeExploreMapEngine();
    renderExplore(mapEngine);

    await waitFor(() =>
      expect(mapEngine.calls.some((call) => call.type === 'setState')).toBe(true),
    );

    const latestState = [...mapEngine.calls].reverse().find((call) => call.type === 'setState');
    expect(latestState?.type === 'setState' ? latestState.state.destinations : []).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'thien-cam-beach', featured: false }),
        expect.objectContaining({ id: 'nguyen-du-memorial', featured: false }),
      ]),
    );
  });

  it('shows a distinct empty state when the ready catalog has no destinations', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ExploreExperience destinations={[]} mapEngine={new FakeExploreMapEngine()} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Hiện chưa có điểm đến để khám phá.')).toBeInTheDocument();
    expect(screen.queryByText('Không tìm thấy điểm đến nào phù hợp.')).not.toBeInTheDocument();
  });

  it('shows a query error instead of the catalog empty state', () => {
    vi.spyOn(immersiveApi, 'useImmersiveDestinations').mockReturnValue({
      data: [],
      isError: true,
      isLoading: false,
    } as unknown as ReturnType<typeof immersiveApi.useImmersiveDestinations>);

    renderRemoteExplore();

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Không thể tải danh sách điểm đến. Vui lòng thử lại sau.',
    );
    expect(screen.queryByText('Không tìm thấy điểm đến nào phù hợp.')).not.toBeInTheDocument();
  });

  it('shows loading separately before the remote catalog is ready', () => {
    vi.spyOn(immersiveApi, 'useImmersiveDestinations').mockReturnValue({
      data: [],
      isError: false,
      isLoading: true,
    } as unknown as ReturnType<typeof immersiveApi.useImmersiveDestinations>);

    renderRemoteExplore();

    expect(screen.getByText('Đang tải điểm đến…')).toBeInTheDocument();
    expect(screen.queryByText('Hiện chưa có điểm đến để khám phá.')).not.toBeInTheDocument();
  });

  it('applies query filtering to the same destination set shown in the panel', () => {
    renderExplore();

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Thiên Cầm' } });

    expect(screen.getByText('Biển Thiên Cầm')).toBeInTheDocument();
    expect(screen.queryByText('Khu lưu niệm Nguyễn Du')).not.toBeInTheDocument();
  });

  it('clears the URL selection when a query filters the selected destination out', () => {
    const onDiscoveryStateChange = vi.fn();
    renderExplore(new FakeExploreMapEngine(), { onDiscoveryStateChange });

    fireEvent.click(screen.getByRole('button', { name: 'Chọn điểm đến Biển Thiên Cầm' }));
    onDiscoveryStateChange.mockClear();

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Nguyễn Du' } });

    expect(onDiscoveryStateChange).toHaveBeenLastCalledWith({
      query: 'Nguyễn Du',
      category: '',
      destinationSlug: null,
      view: 'map',
    });
  });

  it('opens the map surface through the mobile map callback', async () => {
    const mapEngine = new FakeExploreMapEngine();
    renderExplore(mapEngine);

    fireEvent.click(screen.getByRole('button', { name: 'Xem bản đồ' }));

    expect(screen.getByTestId('explore-map')).toHaveAttribute('data-map-open', 'true');
    await waitFor(() => expect(mapEngine.calls.some((call) => call.type === 'mount')).toBe(true));
  });

  it('keeps the selected destination detail action through the mobile list-map round trip', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: true,
        media: '(max-width: 768px)',
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      }),
    );
    const mapEngine = new FakeExploreMapEngine();
    const onOpenDestination = vi.fn();
    renderExplore(mapEngine, { onOpenDestination });

    fireEvent.click(screen.getByRole('button', { name: 'Chọn điểm đến Khu lưu niệm Nguyễn Du' }));

    const destinationList = screen.getByRole('region', { name: 'Danh sách điểm đến' });
    expect(within(destinationList).getByRole('button', { name: 'Xem chi tiết' })).toBeVisible();
    fireEvent.click(within(destinationList).getByRole('button', { name: 'Xem chi tiết' }));
    expect(onOpenDestination).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'nguyen-du-memorial' }),
      '/explore?destination=khu-luu-niem-nguyen-du&view=cards',
    );

    fireEvent.click(within(destinationList).getByRole('button', { name: 'Xem bản đồ' }));
    await waitFor(() => expect(mapEngine.calls.some((call) => call.type === 'mount')).toBe(true));
    expect(screen.getByRole('region', { name: 'Bản đồ khám phá Hà Tĩnh' })).toHaveAttribute(
      'data-selected-destination-id',
      'nguyen-du-memorial',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Quay lại danh sách' }));
    expect(screen.getByTestId('destination-card-nguyen-du-memorial')).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(within(destinationList).getByRole('button', { name: 'Xem chi tiết' })).toBeVisible();

    fireEvent.click(within(destinationList).getByRole('button', { name: 'Xem bản đồ' }));
    await waitFor(() =>
      expect(mapEngine.calls.filter((call) => call.type === 'mount')).toHaveLength(2),
    );
    expect(screen.getByRole('region', { name: 'Bản đồ khám phá Hà Tĩnh' })).toHaveAttribute(
      'data-selected-destination-id',
      'nguyen-du-memorial',
    );
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

  it('requests an overview when filtering out the selected destination', async () => {
    const mapEngine = Object.assign(new FakeExploreMapEngine(), {
      fitOverview: vi.fn(async () => undefined),
    });
    renderExplore(mapEngine);

    fireEvent.click(screen.getByRole('button', { name: 'Chọn điểm đến Biển Thiên Cầm' }));
    await waitFor(() =>
      expect(mapEngine.calls).toContainEqual({
        target: { latitude: 18.2771383, longitude: 106.098072, zoom: 13 },
        type: 'flyTo',
      }),
    );
    mapEngine.fitOverview.mockClear();

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Nguyễn Du' } });

    await waitFor(() =>
      expect(screen.queryByTestId('destination-card-thien-cam-beach')).not.toBeInTheDocument(),
    );
    expect(mapEngine.fitOverview).toHaveBeenCalledTimes(1);
  });

  it('does not auto-select the first destination when a category removes the current selection', async () => {
    const onDiscoveryStateChange = vi.fn();
    renderExplore(new FakeExploreMapEngine(), { onDiscoveryStateChange });

    fireEvent.click(screen.getByRole('button', { name: 'Chọn điểm đến Biển Thiên Cầm' }));
    fireEvent.click(
      within(screen.getByRole('region', { name: 'Danh sách điểm đến' })).getByRole('button', {
        name: 'Lịch sử',
      }),
    );

    expect(screen.queryByRole('heading', { name: 'Biển Thiên Cầm' })).not.toBeInTheDocument();
    expect(screen.getByTestId('destination-card-dong-loc-junction')).not.toHaveAttribute(
      'aria-current',
    );
    expect(onDiscoveryStateChange).toHaveBeenLastCalledWith({
      category: 'Lịch sử',
      destinationSlug: null,
      query: '',
      view: 'map',
    });
  });

  it('passes the chosen map style to the mounted engine without losing selection', async () => {
    const mapEngine = new FakeExploreMapEngine();
    renderExplore(mapEngine, {
      mapStyles: [
        { id: 'default', label: 'Mặc định', style: { version: 8, name: 'default' } },
        { id: 'relief', label: 'Địa hình', style: { version: 8, name: 'relief' } },
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Chọn điểm đến Khu lưu niệm Nguyễn Du' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Kiểu bản đồ' }), {
      target: { value: 'relief' },
    });

    await waitFor(() =>
      expect(mapEngine.calls).toContainEqual({
        style: { name: 'relief', version: 8 },
        type: 'changeStyle',
      }),
    );
    const latestState = [...mapEngine.calls].reverse().find((call) => call.type === 'setState');
    expect(latestState?.type === 'setState' ? latestState.state.selectedDestinationId : null).toBe(
      'nguyen-du-memorial',
    );
  });

  it('keeps the map usable and distinguishes denied browser location', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) =>
          error({ code: 1 } as GeolocationPositionError),
      },
    });
    const mapEngine = new FakeExploreMapEngine();
    renderExplore(mapEngine);

    fireEvent.click(await screen.findByRole('button', { name: 'Tìm vị trí của tôi' }));

    expect(await screen.findByTestId('explore-map-location-status')).toHaveTextContent(
      'Quyền vị trí đang tắt',
    );
    expect(screen.getByRole('region', { name: 'Bản đồ khám phá Hà Tĩnh' })).toBeInTheDocument();
  });

  it('clears a previously shown location when a later locate request fails', async () => {
    let requestCount = 0;
    const getCurrentPosition = vi.fn((success: PositionCallback, error: PositionErrorCallback) => {
      requestCount += 1;
      if (requestCount === 1) {
        success({
          coords: { latitude: 18.3421, longitude: 105.9032 },
        } as GeolocationPosition);
        return;
      }

      error({ code: 1 } as GeolocationPositionError);
    });
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition,
      },
    });
    const mapEngine = new FakeExploreMapEngine();
    renderExplore(mapEngine);

    const locateButton = await screen.findByRole('button', { name: 'Tìm vị trí của tôi' });
    fireEvent.click(locateButton);
    await waitFor(() => expect(getCurrentPosition).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(mapEngine.state.userLocation).toEqual({
        latitude: 18.3421,
        longitude: 105.9032,
      }),
    );

    fireEvent.click(locateButton);
    await waitFor(() => expect(getCurrentPosition).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.getByTestId('explore-map-location-status')).toHaveTextContent(
        'Quyền vị trí đang tắt',
      ),
    );
    await waitFor(() => expect(mapEngine.state.userLocation).toBeNull());
  });

  it('synchronizes fullscreen state from fullscreenchange and does not use a blind toggle', async () => {
    const requestFullscreen = vi.fn(async () => undefined);
    const exitFullscreen = vi.fn(async () => undefined);
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreen,
    });
    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      value: exitFullscreen,
    });
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      writable: true,
      value: null,
    });
    renderExplore(new FakeExploreMapEngine());

    fireEvent.click(await screen.findByRole('button', { name: 'Toàn màn hình' }));
    expect(requestFullscreen).toHaveBeenCalledTimes(1);

    const mapShell = screen.getByTestId('explore-map');
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: mapShell });
    fireEvent(document, new Event('fullscreenchange'));
    expect(screen.getByRole('button', { name: 'Thoát toàn màn hình' })).toBeInTheDocument();

    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null });
    fireEvent(document, new Event('fullscreenchange'));
    expect(screen.getByRole('button', { name: 'Toàn màn hình' })).toBeInTheDocument();
  });
});
