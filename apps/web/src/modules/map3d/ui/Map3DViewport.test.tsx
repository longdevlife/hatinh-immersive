import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FakeMap3DEngine } from '../adapters/fake-map3d.adapter';
import type { Map3DEnginePort } from '../domain/map3d-engine.port';
import { Map3DViewport } from './Map3DViewport';

const target = {
  lat: 18.3552,
  lng: 105.8877,
  altitude: 420,
  heading: 32,
  tilt: 48,
  range: 1800,
};

const model = {
  id: 'son-trang-landmark',
  url: 'https://cdn.example.test/son-trang.glb',
  lat: target.lat,
  lng: target.lng,
  altitude: 450,
  heading: 12,
  scale: 0.8,
};

describe('Map3DViewport', () => {
  it('mounts, flies to the destination, adds its model, and destroys the engine', async () => {
    const engine = new FakeMap3DEngine();
    const statuses: string[] = [];
    const { unmount } = render(
      <Map3DViewport
        engine={engine}
        target={target}
        model={model}
        onStatusChange={(status) => statuses.push(status)}
      />,
    );

    await waitFor(() => {
      expect(engine.calls).toHaveLength(3);
    });

    expect(engine.calls).toEqual([
      { type: 'mount', container: expect.any(HTMLElement) },
      { type: 'flyTo', target },
      { type: 'addModel', model },
    ]);
    expect(screen.getByRole('application', { name: 'Không gian bản đồ 3D' })).toBeInTheDocument();
    expect(statuses).toEqual(['loading', 'ready']);

    unmount();

    expect(engine.calls.at(-1)).toEqual({ type: 'destroy' });
  });

  it('renders an accessible fallback when the engine cannot initialize', async () => {
    const engine: Map3DEnginePort = {
      mount: async () => {
        throw new Error('WebGL unavailable');
      },
      flyTo: async () => undefined,
      addModel: async () => undefined,
      destroy: () => undefined,
    };

    render(<Map3DViewport engine={engine} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể mở không gian 3D');
  });
});
