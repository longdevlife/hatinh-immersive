import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Map3DLocation, ModelPlacement } from '../domain/map3d-engine.port';
import {
  GoogleMaps3DEngine,
  type GoogleMaps3DWindow,
  type Maps3DLibrary,
  type GoogleMap3DElementOptions,
  type GoogleMarker3DInteractiveElementOptions,
  type GoogleModel3DElementOptions,
  type GooglePopoverElementOptions,
} from './google-maps3d.adapter';

class FakeMap3DElement extends HTMLElement {
  readonly options: GoogleMap3DElementOptions;
  readonly flights: unknown[] = [];

  constructor(options: GoogleMap3DElementOptions) {
    super();
    this.options = options;
    queueMicrotask(() => {
      const event = new Event('gmp-steadychange');
      Object.defineProperty(event, 'isSteady', { value: true });
      this.dispatchEvent(event);
    });
  }

  flyCameraTo(options: unknown) {
    this.flights.push(options);
  }

  stopCameraAnimation() {
    return undefined;
  }
}

class FakeModel3DElement extends HTMLElement {
  readonly options: GoogleModel3DElementOptions;

  constructor(options: GoogleModel3DElementOptions) {
    super();
    this.options = options;
  }
}

class FakeMarker3DInteractiveElement extends HTMLElement {
  readonly options: GoogleMarker3DInteractiveElementOptions;

  constructor(options: GoogleMarker3DInteractiveElementOptions) {
    super();
    this.options = options;
  }
}

class FakePopoverElement extends HTMLElement {
  readonly options: GooglePopoverElementOptions;

  constructor(options: GooglePopoverElementOptions = {}) {
    super();
    this.options = options;
  }
}

class FailingMap3DElement extends HTMLElement {
  constructor() {
    super();
    queueMicrotask(() => this.dispatchEvent(new Event('gmp-error')));
  }

  flyCameraTo() {
    return undefined;
  }

  stopCameraAnimation() {
    return undefined;
  }
}

customElements.define('gmp-map-3d', FakeMap3DElement);
customElements.define('gmp-model-3d', FakeModel3DElement);
customElements.define('gmp-marker-3d-interactive', FakeMarker3DInteractiveElement);
customElements.define('gmp-popover', FakePopoverElement);
customElements.define('gmp-map-3d-error', FailingMap3DElement);

const library = {
  Map3DElement: FakeMap3DElement,
  Model3DElement: FakeModel3DElement,
  Marker3DInteractiveElement: FakeMarker3DInteractiveElement,
  PopoverElement: FakePopoverElement,
} as unknown as Maps3DLibrary;

const model: ModelPlacement = {
  id: 'windmill',
  url: 'https://cdn.example.test/windmill.glb',
  lat: 18.3552,
  lng: 105.8877,
  altitude: 450,
  heading: 12,
  scale: 0.8,
};

afterEach(() => {
  vi.useRealTimers();
});

describe('GoogleMaps3DEngine', () => {
  it('waits for the async loader callback before importing the maps3d library', async () => {
    const importLibrary = vi.fn(async () => library);
    const windowRef: GoogleMaps3DWindow = {};
    const engine = new GoogleMaps3DEngine({
      apiKey: 'test-key',
      documentRef: document,
      windowRef,
    });
    const container = document.createElement('div');
    const mount = engine.mount(container);
    void mount.catch(() => undefined);

    await vi.waitFor(() => {
      expect(document.querySelector('script[data-hatinh-google-maps="3d"]')).not.toBeNull();
    });

    const script = document.querySelector<HTMLScriptElement>(
      'script[data-hatinh-google-maps="3d"]',
    )!;
    const callbackPath = new URL(script.src).searchParams.get('callback');
    const callbackName = callbackPath?.split('.').at(-1);

    expect(callbackPath).toMatch(/^google\.maps\.__hatinhGoogleMapsReady\d+$/);
    expect(callbackName).toBeTruthy();
    expect(new URL(script.src).searchParams.get('libraries')).toBe('maps3d');
    script.dispatchEvent(new Event('load'));
    await Promise.resolve();
    expect(importLibrary).not.toHaveBeenCalled();

    windowRef.google!.maps!.importLibrary = importLibrary;
    const callback = (windowRef.google!.maps as Record<string, unknown>)[callbackName!];
    expect(callback).toEqual(expect.any(Function));
    (callback as () => void)();

    await expect(mount).resolves.toBeUndefined();
    expect(importLibrary).toHaveBeenCalledWith('maps3d');
    engine.destroy();
  });

  it('mounts interactive destination markers and emits the selected location id', async () => {
    const engine = new GoogleMaps3DEngine({ loadLibrary: vi.fn(async () => library) });
    const container = document.createElement('div');
    const onLocationSelected = vi.fn();
    const locations: Map3DLocation[] = [
      {
        id: 'destination-a',
        label: 'Điểm A',
        position: { lat: 18.3421, lng: 105.9032, altitude: 0 },
        cameraPreset: {
          center: { lat: 18.3421, lng: 105.9032, altitude: 180 },
          heading: 32,
          tilt: 58,
          range: 1250,
        },
      },
      {
        id: 'destination-b',
        label: 'Điểm B',
        position: { lat: 18.401, lng: 105.91, altitude: 0 },
        cameraPreset: {
          center: { lat: 18.401, lng: 105.91, altitude: 180 },
          heading: 32,
          tilt: 58,
          range: 1250,
        },
      },
    ];

    await engine.mount(container);
    const unsubscribe = engine.subscribeLocationSelected(onLocationSelected);
    await engine.setLocations(locations);

    const map = container.firstElementChild as FakeMap3DElement;
    const markers = [
      ...map.querySelectorAll('[data-location-id]'),
    ] as FakeMarker3DInteractiveElement[];

    expect(markers).toHaveLength(2);
    expect(markers[1]?.options).toMatchObject({
      altitudeMode: 'CLAMP_TO_GROUND',
      position: { lat: 18.401, lng: 105.91 },
    });
    const popover = markers[1]?.options.gmpPopoverTargetElement;
    expect(popover).toBeInstanceOf(FakePopoverElement);
    expect((popover as FakePopoverElement).options).toEqual({ open: true });

    markers[1]?.dispatchEvent(new Event('gmp-click'));
    expect(onLocationSelected).toHaveBeenCalledWith('destination-b');

    unsubscribe();
    markers[0]?.dispatchEvent(new Event('gmp-click'));
    expect(onLocationSelected).toHaveBeenCalledTimes(1);

    await engine.setLocations([locations[0]!]);
    expect(map.querySelectorAll('[data-location-id]')).toHaveLength(1);
    expect(map.querySelectorAll('gmp-popover')).toHaveLength(1);
    engine.destroy();
    expect(map.querySelectorAll('gmp-popover')).toHaveLength(0);
  });

  it('lazily creates the map, flies the camera, mounts models, and cleans up', async () => {
    const loadLibrary = vi.fn(async () => library);
    const engine = new GoogleMaps3DEngine({
      apiKey: 'test-key',
      documentRef: document,
      loadLibrary,
      initialTarget: {
        lat: 18.3552,
        lng: 105.8877,
        altitude: 420,
        heading: 32,
        tilt: 48,
        range: 1800,
      },
    });
    const container = document.createElement('div');

    expect(loadLibrary).not.toHaveBeenCalled();

    await engine.mount(container);
    await engine.flyTo({
      center: { lat: 18.3552, lng: 105.8877, altitude: 420 },
      heading: 32,
      tilt: 48,
      range: 1800,
    });
    await engine.addModel(model);

    expect(loadLibrary).toHaveBeenCalledTimes(1);
    const map = container.firstElementChild as FakeMap3DElement;
    const mountedModel = map.firstElementChild as FakeModel3DElement;

    expect(map.options).toMatchObject({
      center: { lat: 18.3552, lng: 105.8877, altitude: 420 },
      heading: 32,
      tilt: 48,
      range: 1800,
      defaultUIHidden: true,
      mode: 'SATELLITE',
    });
    expect(map).toHaveStyle({ display: 'block', height: '100%', width: '100%' });
    expect(map.flights).toEqual([
      {
        endCamera: {
          center: { lat: 18.3552, lng: 105.8877, altitude: 420 },
          heading: 32,
          tilt: 48,
          range: 1800,
        },
      },
    ]);
    expect(mountedModel.options).toMatchObject({
      src: model.url,
      position: { lat: model.lat, lng: model.lng, altitude: model.altitude },
      orientation: { heading: model.heading },
      scale: model.scale,
    });

    engine.destroy();

    expect(container).toBeEmptyDOMElement();
  });

  it('waits for steady state before mount resolves and reports map errors', async () => {
    const engine = new GoogleMaps3DEngine({ loadLibrary: vi.fn(async () => library) });
    const container = document.createElement('div');

    const mount = engine.mount(container);
    await expect(mount).resolves.toBeUndefined();

    const failingEngine = new GoogleMaps3DEngine({
      loadLibrary: vi.fn(async () => ({
        ...library,
        Map3DElement: FailingMap3DElement,
      })),
    });
    const failingContainer = document.createElement('div');

    await expect(failingEngine.mount(failingContainer)).rejects.toThrow('GOOGLE_MAPS_3D_ERROR');
    expect(failingContainer).toBeEmptyDOMElement();
  });

  it('subscribes to readiness before connecting the map element', async () => {
    const engine = new GoogleMaps3DEngine({
      loadLibrary: vi.fn(async () => library),
      readinessTimeoutMs: 20,
    });
    const container = document.createElement('div');
    const replaceChildren = container.replaceChildren.bind(container);
    container.replaceChildren = (...nodes: Node[]) => {
      replaceChildren(...nodes);
      const event = new Event('gmp-steadychange');
      Object.defineProperty(event, 'isSteady', { value: true });
      nodes[0]?.dispatchEvent(event);
    };

    await expect(engine.mount(container)).resolves.toBeUndefined();
    engine.destroy();
  });

  it('times out readiness, cleans the failed map, and mounts a clean retry', async () => {
    vi.useFakeTimers();
    const maps: Array<HTMLElement & { removedEventTypes: string[] }> = [];
    let mountAttempt = 0;

    class RetryableMap3DElement extends HTMLElement {
      readonly removedEventTypes: string[] = [];

      constructor(_options: GoogleMap3DElementOptions) {
        super();
        maps.push(this);
        mountAttempt += 1;
        if (mountAttempt === 2) {
          queueMicrotask(() => {
            const event = new Event('gmp-steadychange');
            Object.defineProperty(event, 'isSteady', { value: true });
            this.dispatchEvent(event);
          });
        }
      }

      flyCameraTo(_options: unknown) {
        return undefined;
      }

      stopCameraAnimation() {
        return undefined;
      }

      override removeEventListener(
        type: string,
        callback: EventListenerOrEventListenerObject,
        options?: boolean | EventListenerOptions,
      ) {
        this.removedEventTypes.push(type);
        super.removeEventListener(type, callback, options);
      }
    }
    customElements.define('gmp-map-3d-retryable', RetryableMap3DElement);

    const engine = new GoogleMaps3DEngine({
      loadLibrary: vi.fn(async () => ({
        ...library,
        Map3DElement: RetryableMap3DElement,
      })),
      readinessTimeoutMs: 8_000,
    });
    const container = document.createElement('div');
    const firstMount = engine.mount(container);
    void firstMount.catch(() => undefined);

    await vi.advanceTimersByTimeAsync(8_000);

    await expect(firstMount).rejects.toThrow('GOOGLE_MAPS_3D_READY_TIMEOUT');
    expect(container).toBeEmptyDOMElement();
    expect(maps[0]?.removedEventTypes).toEqual(
      expect.arrayContaining(['gmp-error', 'gmp-steadychange']),
    );

    await expect(engine.mount(container)).resolves.toBeUndefined();
    await engine.setLocations([
      {
        id: 'destination-a',
        label: 'Điểm A',
        position: { lat: 18.3421, lng: 105.9032 },
        cameraPreset: {
          center: { lat: 18.3421, lng: 105.9032 },
          heading: 32,
          tilt: 58,
          range: 1_250,
        },
      },
    ]);

    expect(maps).toHaveLength(2);
    expect(container.querySelectorAll('[data-location-id="destination-a"]')).toHaveLength(1);
    expect(container.querySelectorAll('gmp-popover')).toHaveLength(1);
    engine.destroy();
  });
});
