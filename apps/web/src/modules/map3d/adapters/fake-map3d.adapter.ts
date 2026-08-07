import type { CameraTarget, Map3DEnginePort, ModelPlacement } from '../domain/map3d-engine.port';

export type FakeMap3DCall =
  | { type: 'mount'; container: HTMLElement }
  | { type: 'flyTo'; target: CameraTarget }
  | { type: 'addModel'; model: ModelPlacement }
  | { type: 'destroy' };

export class FakeMap3DEngine implements Map3DEnginePort {
  readonly calls: FakeMap3DCall[] = [];

  async mount(container: HTMLElement) {
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
