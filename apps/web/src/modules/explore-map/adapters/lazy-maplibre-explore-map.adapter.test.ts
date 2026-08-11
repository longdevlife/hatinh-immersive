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
      destroyed = false;

      constructor() {
        MockMapLibreExploreMapEngine.latest = this;
      }

      async mount(): Promise<void> {}

      setState(state: unknown): void {
        this.state = state;
      }

      async flyTo(target: unknown): Promise<void> {
        this.target = target;
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
    const state = { destinations: [], selectedDestinationId: null };
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

    engine.destroy();
    expect(MockMapLibreExploreMapEngine.latest?.destroyed).toBe(true);
  });
});
