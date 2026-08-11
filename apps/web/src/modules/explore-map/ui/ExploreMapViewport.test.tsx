import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { RendererStatus } from '../../../shared/contracts';
import type { ExploreMapDestination } from '../model/explore-map.types';
import { FakeExploreMapEngine } from '../adapters/fake-explore-map.adapter';

import { ExploreMapViewport } from './ExploreMapViewport';

const destinations: ExploreMapDestination[] = [
  {
    categoryLabel: 'Biển',
    featured: true,
    id: 'thien-cam',
    label: 'Biển Thiên Cầm',
    latitude: 18.2942,
    longitude: 106.4217,
  },
  {
    categoryLabel: 'Di sản',
    featured: false,
    id: 'nguyen-du',
    label: 'Khu lưu niệm Nguyễn Du',
    latitude: 18.4328,
    longitude: 105.5871,
  },
];

function renderViewport(
  engine: FakeExploreMapEngine,
  selectedDestinationId: string | null = 'thien-cam',
  onDestinationSelected = vi.fn(),
  onStatusChange?: (status: RendererStatus) => void,
) {
  return render(
    <ExploreMapViewport
      destinations={destinations}
      engine={engine}
      onDestinationSelected={onDestinationSelected}
      {...(onStatusChange ? { onStatusChange } : {})}
      selectedDestinationId={selectedDestinationId}
    />,
  );
}

describe('ExploreMapViewport', () => {
  it('mounts once while selection changes and forwards the selected camera target', async () => {
    const engine = new FakeExploreMapEngine();
    const view = renderViewport(engine);

    await waitFor(() =>
      expect(engine.calls.filter((call) => call.type === 'mount')).toHaveLength(1),
    );
    view.rerender(
      <ExploreMapViewport
        destinations={destinations}
        engine={engine}
        onDestinationSelected={vi.fn()}
        selectedDestinationId="nguyen-du"
      />,
    );

    await waitFor(() =>
      expect(engine.calls.filter((call) => call.type === 'mount')).toHaveLength(1),
    );
    expect(engine.calls.at(-1)).toEqual({
      target: { latitude: 18.4328, longitude: 105.5871, zoom: 13 },
      type: 'flyTo',
    });
    expect(screen.getByRole('application', { name: 'Bản đồ khám phá Hà Tĩnh' })).toHaveAttribute(
      'data-explore-map-status',
      'ready',
    );
  });

  it('forwards native map destination selection to the parent callback', async () => {
    const engine = new FakeExploreMapEngine();
    const onDestinationSelected = vi.fn();

    renderViewport(engine, 'thien-cam', onDestinationSelected);
    await waitFor(() => expect(engine.calls.some((call) => call.type === 'mount')).toBe(true));

    engine.emitDestinationSelected('nguyen-du');

    expect(onDestinationSelected).toHaveBeenCalledWith('nguyen-du');
  });

  it('reports a graceful error when the map engine cannot mount', async () => {
    const engine = new FakeExploreMapEngine();
    engine.mount = async () => {
      throw new Error('map unavailable');
    };
    const onStatusChange = vi.fn();

    renderViewport(engine, 'thien-cam', vi.fn(), onStatusChange);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Không thể tải bản đồ khám phá. Bạn vẫn có thể chọn điểm đến từ danh sách.',
    );
    expect(onStatusChange).toHaveBeenCalledWith('error');
  });
});
