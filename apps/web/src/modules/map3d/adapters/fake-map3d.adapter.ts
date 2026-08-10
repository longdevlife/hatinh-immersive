import type {
  LocationCameraPreset,
  Map3DEnginePort,
  Map3DLocation,
  ModelPlacement,
} from '../domain/map3d-engine.port';

export type FakeMap3DCall =
  | { type: 'mount'; container: HTMLElement }
  | { type: 'setLocations'; locations: Map3DLocation[] }
  | { type: 'flyTo'; preset: LocationCameraPreset }
  | { type: 'addModel'; model: ModelPlacement }
  | { type: 'destroy' };

export class FakeMap3DEngine implements Map3DEnginePort {
  readonly calls: FakeMap3DCall[] = [];
  private readonly locationListeners = new Set<(locationId: string) => void>();
  private traceElement: HTMLElement | null = null;

  async mount(container: HTMLElement) {
    this.traceElement = container.parentElement ?? container;
    if (readFakeFailure() === 'map3d') {
      throw new Error('E2E_MAP3D_FAILURE');
    }

    this.calls.push({ type: 'mount', container });
    this.traceElement.dataset.e2eMap3dMountCount = String(
      Number(this.traceElement.dataset.e2eMap3dMountCount ?? '0') + 1,
    );
    this.traceElement.dataset.e2eMap3dDestroyCount = '0';
  }

  async flyTo(preset: LocationCameraPreset) {
    this.calls.push({ type: 'flyTo', preset });
    if (this.traceElement) {
      this.traceElement.dataset.e2eMap3dLastLat = String(preset.center.lat);
      this.traceElement.dataset.e2eMap3dLastLng = String(preset.center.lng);
    }
  }

  async setLocations(locations: Map3DLocation[]) {
    this.calls.push({ type: 'setLocations', locations });
  }

  subscribeLocationSelected(listener: (locationId: string) => void) {
    this.locationListeners.add(listener);
    return () => {
      this.locationListeners.delete(listener);
    };
  }

  emitLocationSelected(locationId: string) {
    for (const listener of this.locationListeners) {
      listener(locationId);
    }
  }

  async addModel(model: ModelPlacement) {
    this.calls.push({ type: 'addModel', model });
  }

  destroy() {
    this.calls.push({ type: 'destroy' });
    if (this.traceElement) {
      this.traceElement.dataset.e2eMap3dDestroyCount = String(
        Number(this.traceElement.dataset.e2eMap3dDestroyCount ?? '0') + 1,
      );
    }
    this.traceElement = null;
  }
}

function readFakeFailure(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const queryFailure = new URLSearchParams(window.location.search).get('e2eFailure');
  if (queryFailure) {
    return queryFailure;
  }

  try {
    return window.sessionStorage.getItem('hatinh-e2e-failure');
  } catch {
    return null;
  }
}
