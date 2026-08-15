import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.doUnmock('./maplibre-explore-map.adapter');
  vi.resetModules();
});

describe('LazyMapLibreExploreMapEngine', () => {
  it('does not evaluate the MapLibre adapter when the lazy proxy is created', async () => {
    vi.doMock('./maplibre-explore-map.adapter', () => {
      throw new Error('MAPLIBRE_ADAPTER_EAGERLY_LOADED');
    });

    const { LazyMapLibreExploreMapEngine } = await import('./lazy-maplibre-explore-map.adapter');

    expect(() => new LazyMapLibreExploreMapEngine({ style: { version: 8 } })).not.toThrow();
  });

  it('forwards state, selection, camera and cleanup after the adapter is loaded', async () => {
    class MockMapLibreExploreMapEngine {
      static latest: MockMapLibreExploreMapEngine | null = null;
      readonly listeners = new Set<(destinationId: string) => void>();
      state: unknown;
      target: unknown;
      style: unknown;
      destroyed = false;

      constructor(options?: { style?: unknown }) {
        MockMapLibreExploreMapEngine.latest = this;
        this.style = options?.style;
      }

      async mount(): Promise<void> {}

      setState(state: unknown): void {
        this.state = state;
      }

      async flyTo(target: unknown): Promise<void> {
        this.target = target;
      }

      async changeStyle(style: unknown): Promise<void> {
        if ((style as { name?: string }).name === 'broken') {
          throw new Error('STYLE_SWITCH_FAILED');
        }

        this.style = style;
      }

      subscribeDestinationSelected(listener: (destinationId: string) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
      }

      resize(): void {}

      destroy(): void {
        this.destroyed = true;
      }

      emitDestinationSelected(destinationId: string): void {
        for (const listener of this.listeners) {
          listener(destinationId);
        }
      }
    }

    vi.doMock('./maplibre-explore-map.adapter', () => ({
      MapLibreExploreMapEngine: MockMapLibreExploreMapEngine,
    }));
    const { LazyMapLibreExploreMapEngine } = await import('./lazy-maplibre-explore-map.adapter');
    const state = {
      destinations: [],
      selectedDestinationId: null,
      userLocation: { latitude: 18.35, longitude: 105.91 },
    };
    const target = { latitude: 18.3, longitude: 106.4, zoom: 13 };
    const engine = new LazyMapLibreExploreMapEngine({ style: { version: 8 } });
    const onDestinationSelected = vi.fn();

    engine.setState(state);
    engine.subscribeDestinationSelected(onDestinationSelected);
    await engine.mount(document.createElement('div'));
    await engine.flyTo(target);
    MockMapLibreExploreMapEngine.latest?.emitDestinationSelected('thien-cam');

    expect(MockMapLibreExploreMapEngine.latest?.state).toEqual(state);
    expect(MockMapLibreExploreMapEngine.latest?.target).toEqual(target);
    expect(onDestinationSelected).toHaveBeenCalledWith('thien-cam');

    await expect(engine.changeStyle({ name: 'broken', version: 8 })).rejects.toThrow(
      'STYLE_SWITCH_FAILED',
    );
    engine.destroy();
    await engine.mount(document.createElement('div'));
    expect(MockMapLibreExploreMapEngine.latest?.style).toEqual({ version: 8 });

    await engine.changeStyle({ name: 'alternate', version: 8 });
    engine.destroy();
    await engine.mount(document.createElement('div'));
    expect(MockMapLibreExploreMapEngine.latest?.style).toEqual({ name: 'alternate', version: 8 });

    engine.destroy();
    expect(MockMapLibreExploreMapEngine.latest?.destroyed).toBe(true);
  });

  it('does not let a stale mount consume camera state queued for a newer lifecycle', async () => {
    class DeferredMapLibreExploreMapEngine {
      static instances: DeferredMapLibreExploreMapEngine[] = [];
      readonly mountPromise: Promise<void>;
      readonly flyToCalls: unknown[] = [];
      private resolveMountPromise!: () => void;

      constructor() {
        this.mountPromise = new Promise<void>((resolve) => {
          this.resolveMountPromise = resolve;
        });
        DeferredMapLibreExploreMapEngine.instances.push(this);
      }

      async mount(): Promise<void> {
        await this.mountPromise;
      }

      resolveMount(): void {
        this.resolveMountPromise();
      }

      setState(): void {}

      async flyTo(target: unknown): Promise<void> {
        this.flyToCalls.push(target);
      }

      async fitOverview(): Promise<void> {}

      subscribeDestinationSelected(): () => void {
        return () => undefined;
      }

      resize(): void {}

      destroy(): void {}
    }

    vi.doMock('./maplibre-explore-map.adapter', () => ({
      MapLibreExploreMapEngine: DeferredMapLibreExploreMapEngine,
    }));
    const { LazyMapLibreExploreMapEngine } = await import('./lazy-maplibre-explore-map.adapter');
    const engine = new LazyMapLibreExploreMapEngine({ style: { version: 8 } });
    const firstMount = engine.mount(document.createElement('div'));

    await vi.waitFor(() => expect(DeferredMapLibreExploreMapEngine.instances).toHaveLength(1));
    const firstInnerEngine = DeferredMapLibreExploreMapEngine.instances[0]!;
    engine.destroy();

    const secondMount = engine.mount(document.createElement('div'));
    const target = { latitude: 18.3, longitude: 106.4, zoom: 13 };
    await engine.flyTo(target);

    await vi.waitFor(() => expect(DeferredMapLibreExploreMapEngine.instances).toHaveLength(2));
    const secondInnerEngine = DeferredMapLibreExploreMapEngine.instances[1]!;

    firstInnerEngine.resolveMount();
    await firstMount;
    expect(firstInnerEngine.flyToCalls).toEqual([]);
    expect(secondInnerEngine.flyToCalls).toEqual([]);

    secondInnerEngine.resolveMount();
    await secondMount;
    expect(secondInnerEngine.flyToCalls).toEqual([target]);
  });
});
