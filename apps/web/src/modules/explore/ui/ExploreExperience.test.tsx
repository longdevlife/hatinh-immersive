import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as immersiveApi from '../../../shared/api/immersive';
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
    expect(screen.getByText('Đang chọn: Khu lưu niệm Nguyễn Du')).toBeInTheDocument();
  });

  it('starts with the Hà Tĩnh overview and does not fly to the first destination', async () => {
    const mapEngine = new FakeExploreMapEngine();
    renderExplore(mapEngine);

    await waitFor(() => expect(mapEngine.calls.some((call) => call.type === 'mount')).toBe(true));

    expect(screen.getByRole('application', { name: 'Bản đồ khám phá Hà Tĩnh' })).toHaveAttribute(
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
});
