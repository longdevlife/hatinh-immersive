import type { CameraTarget, Map3DEnginePort, ModelPlacement } from '../domain/map3d-engine.port';

export type FakeMap3DCall =
  | { type: 'mount'; container: HTMLElement }
  | { type: 'flyTo'; target: CameraTarget }
  | { type: 'addModel'; model: ModelPlacement }
  | { type: 'destroy' };

export class FakeMap3DEngine implements Map3DEnginePort {
  readonly calls: FakeMap3DCall[] = [];

  async mount(container: HTMLElement) {
    if (readFakeFailure() === 'map3d') {
      throw new Error('E2E_MAP3D_FAILURE');
    }

    this.calls.push({ type: 'mount', container });
  }

  async flyTo(target: CameraTarget) {
    this.calls.push({ type: 'flyTo', target });
  }

  async addModel(model: ModelPlacement) {
    this.calls.push({ type: 'addModel', model });
  }

  destroy() {
    this.calls.push({ type: 'destroy' });
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
