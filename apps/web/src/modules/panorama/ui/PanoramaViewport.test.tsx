import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FakePanoramaEngine } from '../adapters/fake-panorama.adapter';
import type { PanoramaEnginePort } from '../domain/panorama-engine.port';
import { PanoramaViewport } from './PanoramaViewport';

const node = {
  id: 'scene-01',
  panoramaUrl: '/panorama/scene-01/manifest.json',
  previewUrl: '/panorama/scene-01/preview.webp',
  lat: 18.342,
  lng: 105.9,
  initialView: { heading: 10, pitch: -2, fov: 88 },
};

describe('PanoramaViewport', () => {
  it('mounts, loads a node, and destroys the panorama engine', async () => {
    const engine = new FakePanoramaEngine();
    const statuses: string[] = [];
    const { unmount } = render(
      <PanoramaViewport
        engine={engine}
        node={node}
        onStatusChange={(status) => statuses.push(status)}
      />,
    );

    await waitFor(() => {
      expect(engine.calls).toHaveLength(2);
    });

    expect(engine.calls).toEqual([
      { type: 'mount', container: expect.any(HTMLElement) },
      { type: 'loadNode', node },
    ]);
    expect(
      screen.getByRole('application', { name: 'Không gian toàn cảnh 360 độ' }),
    ).toBeInTheDocument();
    expect(statuses).toEqual(['loading', 'ready']);

    unmount();

    expect(engine.calls.at(-1)).toEqual({ type: 'destroy' });
  });

  it('renders a fallback when the panorama node fails to load', async () => {
    const engine: PanoramaEnginePort = {
      mount: async () => undefined,
      loadNode: async () => {
        throw new Error('tile failed');
      },
      setView: () => undefined,
      subscribeViewChanged: () => () => undefined,
      destroy: () => undefined,
    };

    render(<PanoramaViewport engine={engine} node={node} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Không thể tải không gian toàn cảnh',
    );
  });

  it('forwards camera changes from the engine to the composition layer', async () => {
    const engine = new FakePanoramaEngine();
    const onViewChange = vi.fn();

    render(<PanoramaViewport engine={engine} node={node} onViewChange={onViewChange} />);

    await waitFor(() => {
      expect(engine.calls).toHaveLength(2);
    });

    const nextView = { heading: 120, pitch: -4, fov: 76 };
    engine.emitViewChanged(nextView);

    expect(onViewChange).toHaveBeenCalledWith(nextView);
  });

  it('applies a deep-linked initial view after the scene is loaded', async () => {
    const engine = new FakePanoramaEngine();
    const initialView = { heading: 180, pitch: -8, fov: 72 };

    render(<PanoramaViewport engine={engine} node={node} initialView={initialView} />);

    await waitFor(() => {
      expect(engine.calls).toHaveLength(3);
    });

    expect(engine.calls.at(-1)).toEqual({ type: 'setView', view: initialView });
  });
});
