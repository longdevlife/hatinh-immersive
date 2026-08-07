import type { MinimapEnginePort, MinimapState } from '../domain/minimap-engine.port';

export type FakeMinimapCall =
  | { type: 'mount'; container: HTMLElement }
  | { type: 'setState'; state: MinimapState }
  | { type: 'destroy' };

export class FakeMinimapEngine implements MinimapEnginePort {
  readonly calls: FakeMinimapCall[] = [];
  readonly listeners = new Set<(sceneId: string) => void>();

  async mount(container: HTMLElement) {
    this.calls.push({ container, type: 'mount' });
  }

  setState(state: MinimapState) {
    this.calls.push({ state, type: 'setState' });
  }

  subscribeNodeSelected(listener: (sceneId: string) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emitNodeSelected(sceneId: string) {
    for (const listener of this.listeners) {
      listener(sceneId);
    }
  }

  destroy() {
    this.listeners.clear();
    this.calls.push({ type: 'destroy' });
  }
}
