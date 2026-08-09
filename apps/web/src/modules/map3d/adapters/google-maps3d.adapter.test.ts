import { describe, expect, it, vi } from 'vitest';

import type { Map3DLocation, ModelPlacement } from '../domain/map3d-engine.port';
import {
  GoogleMaps3DEngine,
  type GoogleMaps3DWindow,
  type Maps3DLibrary,
  type GoogleMap3DElementOptions,
  type GoogleMarker3DInteractiveElementOptions,
  type GoogleModel3DElementOptions,
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
customElements.define('gmp-map-3d-error', FailingMap3DElement);

const library = {
  Map3DElement: FakeMap3DElement,
  Model3DElement: FakeModel3DElement,
  Marker3DInteractiveElement: FakeMarker3DInteractiveElement,
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
    const callbackName = new URL(script.src).searchParams.get('callback');

    expect(callbackName).toBeTruthy();
    script.dispatchEvent(new Event('load'));
    await Promise.resolve();
    expect(importLibrary).not.toHaveBeenCalled();

    windowRef.google = { maps: { importLibrary } };
    (windowRef as unknown as Record<string, () => void>)[callbackName!]!();

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
        target: { lat: 18.3421, lng: 105.9032, altitude: 0 },
      },
      {
        id: 'destination-b',
        label: 'Điểm B',
        position: { lat: 18.401, lng: 105.91, altitude: 0 },
        target: { lat: 18.401, lng: 105.91, altitude: 0 },
      },
    ];

    await engine.mount(container);
    const unsubscribe = engine.subscribeLocationSelected(onLocationSelected);
    await engine.setLocations(locations);

    const map = container.firstElementChild as FakeMap3DElement;
    const markers = [...map.children] as FakeMarker3DInteractiveElement[];

    expect(markers).toHaveLength(2);
    expect(markers[1]?.options).toEqual({
      position: { lat: 18.401, lng: 105.91, altitude: 0 },
      label: 'Điểm B',
    });

    markers[1]?.dispatchEvent(new Event('gmp-click'));
    expect(onLocationSelected).toHaveBeenCalledWith('destination-b');

    unsubscribe();
    markers[0]?.dispatchEvent(new Event('gmp-click'));
    expect(onLocationSelected).toHaveBeenCalledTimes(1);

    await engine.setLocations([locations[0]!]);
    expect(map.children).toHaveLength(1);
    engine.destroy();
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
      lat: 18.3552,
      lng: 105.8877,
      altitude: 420,
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
      mode: 'SATELLITE',
    });
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
});
