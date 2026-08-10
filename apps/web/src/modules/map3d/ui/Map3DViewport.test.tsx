import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FakeMap3DEngine } from '../adapters/fake-map3d.adapter';
import type {
  LocationCameraPreset,
  Map3DEnginePort,
  Map3DLocation,
} from '../domain/map3d-engine.port';
import { Map3DViewport } from './Map3DViewport';

const cameraPreset = {
  center: { lat: 18.3552, lng: 105.8877, altitude: 420 },
  heading: 32,
  tilt: 48,
  range: 1800,
};

const model = {
  id: 'son-trang-landmark',
  url: 'https://cdn.example.test/son-trang.glb',
  lat: cameraPreset.center.lat,
  lng: cameraPreset.center.lng,
  altitude: 450,
  heading: 12,
  scale: 0.8,
};

const location = {
  id: 'son-trang-co-dam',
  label: 'Sơn Trang Cổ Đạm',
  position: { lat: 18.3421, lng: 105.9032 },
  cameraPreset,
};

class PendingLocationsFakeMap3DEngine extends FakeMap3DEngine {
  private resolveLocationsStarted!: () => void;
  private resolveLocationsReleased!: () => void;
  readonly locationsStarted = new Promise<void>((resolve) => {
    this.resolveLocationsStarted = resolve;
  });
  readonly locationsReleased = new Promise<void>((resolve) => {
    this.resolveLocationsReleased = resolve;
  });
  flightAt: number | null = null;

  override async setLocations(locations: Map3DLocation[]) {
    await super.setLocations(locations);
    this.resolveLocationsStarted();
    await this.locationsReleased;
  }

  override async flyTo(preset: LocationCameraPreset) {
    this.flightAt = Date.now();
    await super.flyTo(preset);
  }

  releaseLocations() {
    this.resolveLocationsReleased();
  }
}

afterEach(() => {
  vi.useRealTimers();
});

describe('Map3DViewport', () => {
  it('mounts, flies to the destination, adds its model, and destroys the engine', async () => {
    const engine = new FakeMap3DEngine();
    const statuses: string[] = [];
    const { unmount } = render(
      <Map3DViewport
        engine={engine}
        cameraPreset={cameraPreset}
        model={model}
        onStatusChange={(status) => statuses.push(status)}
      />,
    );

    await waitFor(() => {
      expect(engine.calls).toHaveLength(3);
    });

    expect(engine.calls).toEqual([
      { type: 'mount', container: expect.any(HTMLElement) },
      { type: 'flyTo', preset: cameraPreset },
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

  it('reports a failed mount and retries with one fresh lifecycle', async () => {
    let attempts = 0;
    const engine = {
      mount: vi.fn(async () => {
        attempts += 1;
        if (attempts === 1) {
          throw new Error('GOOGLE_MAPS_3D_READY_TIMEOUT');
        }
      }),
      setLocations: vi.fn(async () => undefined),
      subscribeLocationSelected: vi.fn(() => () => undefined),
      flyTo: vi.fn(async () => undefined),
      addModel: vi.fn(async () => undefined),
      destroy: vi.fn(),
    } satisfies Map3DEnginePort;

    function RetryHarness() {
      const [retryKey, setRetryKey] = useState(0);
      return (
        <Map3DViewport
          key={retryKey}
          engine={engine}
          fallback={<button onClick={() => setRetryKey((value) => value + 1)}>Thử lại</button>}
        />
      );
    }

    render(<RetryHarness />);

    fireEvent.click(await screen.findByRole('button', { name: 'Thử lại' }));

    await waitFor(() => {
      expect(screen.getByRole('application')).toHaveAttribute('data-renderer-status', 'ready');
    });
    expect(engine.mount).toHaveBeenCalledTimes(2);
    expect(engine.destroy).toHaveBeenCalledTimes(1);
  });

  it('keeps one mounted map element while the selected location changes', async () => {
    const engine = new FakeMap3DEngine();
    const onLocationSelected = vi.fn();
    const firstPreset = { ...cameraPreset, center: { lat: 18.3421, lng: 105.9032 } };
    const secondPreset = { ...cameraPreset, center: { lat: 18.401, lng: 105.91 } };
    const { rerender, unmount } = render(
      <Map3DViewport
        engine={engine}
        onLocationSelected={onLocationSelected}
        cameraPreset={firstPreset}
      />,
    );

    await waitFor(() => {
      expect(engine.calls.filter((call) => call.type === 'mount')).toHaveLength(1);
    });

    rerender(
      <Map3DViewport
        engine={engine}
        onLocationSelected={onLocationSelected}
        cameraPreset={secondPreset}
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

  it('flies within 100ms of a selection while locations are pending and mounts once', async () => {
    vi.useFakeTimers();
    const engine = new PendingLocationsFakeMap3DEngine();

    function SelectionHarness() {
      const [selectedPreset, setSelectedPreset] = useState<typeof cameraPreset>();

      return (
        <Map3DViewport
          engine={engine}
          locations={[location]}
          onLocationSelected={() => setSelectedPreset(cameraPreset)}
          {...(selectedPreset ? { cameraPreset: selectedPreset } : {})}
        />
      );
    }

    render(<SelectionHarness />);

    await engine.locationsStarted;
    const selectedAt = Date.now();
    act(() => engine.emitLocationSelected(location.id));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(engine.flightAt).not.toBeNull();
    expect(engine.flightAt! - selectedAt).toBeLessThanOrEqual(100);
    expect(engine.calls.filter((call) => call.type === 'mount')).toHaveLength(1);

    engine.releaseLocations();
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
    const { rerender } = render(
      <Map3DViewport engine={oldEngine} cameraPreset={cameraPreset} model={model} />,
    );

    await waitFor(() => {
      expect(oldEngine.flyTo).toHaveBeenCalledTimes(1);
    });

    rerender(<Map3DViewport engine={newEngine} cameraPreset={cameraPreset} model={model} />);
    resolveFlyTo();

    await waitFor(() => {
      expect(newEngine.calls).toHaveLength(3);
    });

    expect(oldEngine.addModel).not.toHaveBeenCalled();
  });
});
