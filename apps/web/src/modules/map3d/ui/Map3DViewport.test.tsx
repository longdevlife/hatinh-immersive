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
      setLocations: async () => undefined,
      subscribeLocationSelected: () => () => undefined,
      flyTo: async () => undefined,
      addModel: async () => undefined,
      destroy: () => undefined,
    };

    render(<Map3DViewport engine={engine} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể mở không gian 3D');
  });

  it('keeps one mounted map element while the selected location changes', async () => {
    const engine = new FakeMap3DEngine();
    const onLocationSelected = vi.fn();
    const firstTarget = { ...target, lat: 18.3421, lng: 105.9032 };
    const secondTarget = { ...target, lat: 18.401, lng: 105.91 };
    const { rerender, unmount } = render(
      <Map3DViewport
        engine={engine}
        onLocationSelected={onLocationSelected}
        target={firstTarget}
      />,
    );

    await waitFor(() => {
      expect(engine.calls.filter((call) => call.type === 'mount')).toHaveLength(1);
    });

    rerender(
      <Map3DViewport
        engine={engine}
        onLocationSelected={onLocationSelected}
        target={secondTarget}
      />,
    );

    await waitFor(() => {
      expect(engine.calls.filter((call) => call.type === 'flyTo')).toHaveLength(2);
    });

    expect(engine.calls.filter((call) => call.type === 'mount')).toHaveLength(1);
    expect(engine.calls.filter((call) => call.type === 'destroy')).toHaveLength(0);

    engine.emitLocationSelected('destination-b');
    expect(onLocationSelected).toHaveBeenCalledWith('destination-b');

    unmount();
    expect(engine.calls.filter((call) => call.type === 'destroy')).toHaveLength(1);
  });

  it('does not continue stale camera work after the viewport is replaced', async () => {
    let resolveFlyTo!: () => void;
    const flyTo = new Promise<void>((resolve) => {
      resolveFlyTo = resolve;
    });
    const oldEngine = {
      addModel: vi.fn(async () => undefined),
      destroy: vi.fn(),
      flyTo: vi.fn(async () => flyTo),
      mount: vi.fn(async () => undefined),
      setLocations: vi.fn(async () => undefined),
      subscribeLocationSelected: vi.fn(() => () => undefined),
    } satisfies Map3DEnginePort;
    const newEngine = new FakeMap3DEngine();
    const { rerender } = render(<Map3DViewport engine={oldEngine} target={target} model={model} />);

    await waitFor(() => {
      expect(oldEngine.flyTo).toHaveBeenCalledTimes(1);
    });

    rerender(<Map3DViewport engine={newEngine} target={target} model={model} />);
    resolveFlyTo();

    await waitFor(() => {
      expect(newEngine.calls).toHaveLength(3);
    });

    expect(oldEngine.addModel).not.toHaveBeenCalled();
  });
});
