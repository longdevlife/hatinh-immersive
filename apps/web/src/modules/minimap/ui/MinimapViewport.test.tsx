import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FakeMinimapEngine } from '../adapters/fake-minimap.adapter';
import type { MinimapProps } from '../../../shared/contracts';

import { MinimapViewport } from './MinimapViewport';

const props: MinimapProps = {
  collapsed: false,
  currentSceneId: 'scene-01',
  heading: 12,
  links: [],
  nodes: [
    {
      heading: 12,
      id: 'scene-01',
      isCurrent: true,
      isVisited: true,
      lat: 18.342,
      lng: 105.9,
      name: 'Cổng di sản',
    },
  ],
  onNodeSelect: () => undefined,
  onToggle: () => undefined,
};

describe('MinimapViewport', () => {
  it('mounts the engine and forwards node selection and collapse actions', async () => {
    const engine = new FakeMinimapEngine();
    const onNodeSelect = vi.fn();
    const onToggle = vi.fn();

    render(
      <MinimapViewport
        {...props}
        engine={engine}
        onNodeSelect={onNodeSelect}
        onToggle={onToggle}
      />,
    );

    await waitFor(() => expect(engine.calls).toHaveLength(2));
    expect(screen.getByRole('application', { name: 'Bản đồ tuyến tham quan' })).toBeInTheDocument();

    engine.emitNodeSelected('scene-02');
    expect(onNodeSelect).toHaveBeenCalledWith('scene-02');

    fireEvent.click(screen.getByRole('button', { name: 'Thu gọn bản đồ' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('keeps an accessible fallback boundary when MapLibre cannot initialize', async () => {
    const engine = new FakeMinimapEngine();
    engine.mount = async () => {
      throw new Error('map unavailable');
    };

    render(<MinimapViewport {...props} engine={engine} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Không thể tải bản đồ tuyến tham quan',
    );
  });
});
