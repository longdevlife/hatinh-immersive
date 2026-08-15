import { describe, expect, it, vi } from 'vitest';

import type {
  ExploreMapCameraTarget,
  ExploreMapDestination,
  ExploreMapStyle,
  ExploreMapViewportState,
} from '../model/explore-map.types';

import { FakeExploreMapEngine } from './fake-explore-map.adapter';

const destinations: ExploreMapDestination[] = [
  {
    categoryLabel: 'Di sản',
    featured: true,
    id: 'thien-cam',
    label: 'Biển Thiên Cầm',
    latitude: 18.2942,
    longitude: 106.4217,
  },
];

const state: ExploreMapViewportState = {
  destinations,
  selectedDestinationId: 'thien-cam',
};

const target: ExploreMapCameraTarget = {
  latitude: 18.2942,
  longitude: 106.4217,
  zoom: 12,
};

describe('FakeExploreMapEngine', () => {
  it('stores the latest destination viewport state without sharing the input array', () => {
    const engine = new FakeExploreMapEngine();

    engine.setState(state);
    destinations.push({
      categoryLabel: null,
      featured: false,
      id: 'nguyen-du',
      label: 'Khu lưu niệm Nguyễn Du',
      latitude: 18.4328,
      longitude: 105.5871,
    });

    expect(engine.state).toEqual({
      destinations: [state.destinations[0]],
      selectedDestinationId: 'thien-cam',
    });
  });

  it('preserves the provider-neutral user location state', () => {
    const engine = new FakeExploreMapEngine();

    engine.setState({
      ...state,
      userLocation: { latitude: 18.35, longitude: 105.91 },
    });

    expect(engine.state.userLocation).toEqual({ latitude: 18.35, longitude: 105.91 });
  });

  it('notifies subscribed listeners and stops after unsubscribe', () => {
    const engine = new FakeExploreMapEngine();
    const firstListener = vi.fn();
    const secondListener = vi.fn();

    const unsubscribe = engine.subscribeDestinationSelected(firstListener);
    engine.subscribeDestinationSelected(secondListener);
    engine.emitDestinationSelected('thien-cam');
    unsubscribe();
    engine.emitDestinationSelected('nguyen-du');

    expect(firstListener).toHaveBeenCalledTimes(1);
    expect(firstListener).toHaveBeenCalledWith('thien-cam');
    expect(secondListener).toHaveBeenCalledTimes(2);
    expect(secondListener).toHaveBeenLastCalledWith('nguyen-du');
  });

  it('records flyTo targets deterministically', async () => {
    const engine = new FakeExploreMapEngine();

    await engine.flyTo(target);

    expect(engine.lastFlyToTarget).toEqual(target);
    expect(engine.calls).toContainEqual({ target, type: 'flyTo' });
  });

  it('records overview camera requests deterministically', async () => {
    const engine = new FakeExploreMapEngine();

    await engine.fitOverview();

    expect(engine.calls).toContainEqual({ type: 'fitOverview' });
  });

  it('records a style change without remounting', async () => {
    const engine = new FakeExploreMapEngine();
    const style: ExploreMapStyle = { version: 8, name: 'alternate' };

    await engine.changeStyle(style);

    expect(engine.calls).toContainEqual({ style, type: 'changeStyle' });
  });

  it('can be destroyed repeatedly without throwing or retaining listeners', () => {
    const engine = new FakeExploreMapEngine();
    engine.subscribeDestinationSelected(() => undefined);

    expect(() => {
      engine.destroy();
      engine.destroy();
    }).not.toThrow();
    expect(engine.listeners.size).toBe(0);
  });
});
