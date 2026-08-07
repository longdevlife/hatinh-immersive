import { describe, expect, it, vi } from 'vitest';

import type { ModelPlacement } from '../domain/map3d-engine.port';
import {
  GoogleMaps3DEngine,
  type Maps3DLibrary,
  type GoogleMap3DElementOptions,
  type GoogleModel3DElementOptions,
} from './google-maps3d.adapter';

class FakeMap3DElement extends HTMLElement {
  readonly options: GoogleMap3DElementOptions;
  readonly flights: unknown[] = [];

  constructor(options: GoogleMap3DElementOptions) {
    super();
    this.options = options;
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

customElements.define('gmp-map-3d', FakeMap3DElement);
customElements.define('gmp-model-3d', FakeModel3DElement);

const library = {
  Map3DElement: FakeMap3DElement,
  Model3DElement: FakeModel3DElement,
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
});
