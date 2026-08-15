import { describe, expect, it, vi } from 'vitest';

import {
  isFullscreenSupported,
  requestBrowserLocation,
  toggleFullscreen,
} from './explore-map-browser';

describe('Explore Map browser capabilities', () => {
  it('resolves a browser location when the provider succeeds', async () => {
    const geolocation = {
      getCurrentPosition: vi.fn((success: PositionCallback) => {
        success({
          coords: { latitude: 18.3421, longitude: 105.9032 },
        } as GeolocationPosition);
      }),
    };

    await expect(requestBrowserLocation(geolocation)).resolves.toEqual({
      location: { latitude: 18.3421, longitude: 105.9032 },
      status: 'available',
    });
  });

  it('distinguishes permission denial from provider unavailability', async () => {
    const denied = {
      getCurrentPosition: vi.fn((_: PositionCallback, error: PositionErrorCallback) => {
        error({ code: 1 } as GeolocationPositionError);
      }),
    };
    const unavailable = {
      getCurrentPosition: vi.fn((_: PositionCallback, error: PositionErrorCallback) => {
        error({ code: 2 } as GeolocationPositionError);
      }),
    };

    await expect(requestBrowserLocation(denied)).resolves.toEqual({ status: 'denied' });
    await expect(requestBrowserLocation(unavailable)).resolves.toEqual({ status: 'unavailable' });
  });

  it('reports an unsupported geolocation provider as unavailable', async () => {
    await expect(requestBrowserLocation(undefined)).resolves.toEqual({ status: 'unavailable' });
  });

  it('recovers when the browser geolocation provider throws synchronously', async () => {
    const geolocation = {
      getCurrentPosition: vi.fn(() => {
        throw new Error('GEOLOCATION_PROVIDER_FAILURE');
      }),
    };

    await expect(requestBrowserLocation(geolocation)).resolves.toEqual({ status: 'unavailable' });
  });

  it('uses the browser fullscreen capability rather than a local flag', async () => {
    const requestFullscreen = vi.fn(async () => undefined);
    const exitFullscreen = vi.fn(async () => undefined);
    const element = { requestFullscreen };
    const documentLike: {
      exitFullscreen: typeof exitFullscreen;
      fullscreenElement: Element | null;
    } = { exitFullscreen, fullscreenElement: null };

    expect(isFullscreenSupported(element, documentLike)).toBe(true);
    await toggleFullscreen(element, documentLike);
    expect(requestFullscreen).toHaveBeenCalledTimes(1);

    documentLike.fullscreenElement = element as unknown as Element;
    await toggleFullscreen(element, documentLike);
    expect(exitFullscreen).toHaveBeenCalledTimes(1);
  });

  it('hides fullscreen behavior when either browser method is unavailable', async () => {
    const element = {};
    const documentLike = { fullscreenElement: null };

    expect(isFullscreenSupported(element, documentLike)).toBe(false);
    await expect(toggleFullscreen(element, documentLike)).resolves.toBeUndefined();
  });

  it('hides fullscreen when the browser or permissions policy disables it', () => {
    const element = { requestFullscreen: vi.fn(async () => undefined) };
    const documentLike = {
      exitFullscreen: vi.fn(async () => undefined),
      fullscreenEnabled: false,
      fullscreenElement: null,
    };

    expect(isFullscreenSupported(element, documentLike)).toBe(false);
  });
});
