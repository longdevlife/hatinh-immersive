import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { MinimapProps } from '../../../shared/contracts';
import { FakeMinimapEngine } from '../adapters/fake-minimap.adapter';

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

function CollapsibleHarness({ engine }: { engine: FakeMinimapEngine }) {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <MinimapViewport
      {...props}
      collapsed={collapsed}
      engine={engine}
      onToggle={() => setCollapsed((value) => !value)}
    />
  );
}

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

    await waitFor(() =>
      expect(engine.calls.some((call) => call.type === 'mount')).toBe(true),
    );
    expect(
      screen.getByRole('application', { name: 'Bản đồ tuyến tham quan' }),
    ).toBeInTheDocument();

    engine.emitNodeSelected('scene-02');
    expect(onNodeSelect).toHaveBeenCalledWith('scene-02');

    fireEvent.click(screen.getByRole('button', { name: 'Thu gọn bản đồ' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('mounts only after expansion and remounts after collapse', async () => {
    const engine = new FakeMinimapEngine();

    render(<CollapsibleHarness engine={engine} />);

    expect(screen.getByRole('button', { name: 'Mở rộng bản đồ' })).toBeInTheDocument();
    expect(engine.calls.filter((call) => call.type === 'mount')).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Mở rộng bản đồ' }));
    await waitFor(() =>
      expect(engine.calls.filter((call) => call.type === 'mount')).toHaveLength(1),
    );
    expect(
      screen.getByRole('group', { name: 'Các điểm của tuyến tham quan' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Thu gọn bản đồ' }));
    await waitFor(() =>
      expect(engine.calls.some((call) => call.type === 'destroy')).toBe(true),
    );
    expect(
      screen.queryByRole('group', { name: 'Các điểm của tuyến tham quan' }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mở rộng bản đồ' }));
    await waitFor(() =>
      expect(engine.calls.filter((call) => call.type === 'mount')).toHaveLength(2),
    );
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

  it('supports a full-screen overview variant without a collapse control', async () => {
    const engine = new FakeMinimapEngine();

    render(
      <MinimapViewport {...props} engine={engine} showToggle={false} variant="overview" />,
    );

    await waitFor(() =>
      expect(engine.calls.some((call) => call.type === 'mount')).toBe(true),
    );
    expect(screen.getByRole('application', { name: 'Bản đồ Hà Tĩnh' })).toHaveClass(
      'minimap-viewport--overview',
    );
    expect(screen.queryByRole('button', { name: 'Thu gọn bản đồ' })).not.toBeInTheDocument();
  });
});
