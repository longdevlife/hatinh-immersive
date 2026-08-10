import type {
  PanoramaEnginePort,
  PanoramaNode,
  PanoramaView,
} from '../domain/panorama-engine.port';

export type FakePanoramaCall =
  | { type: 'mount'; container: HTMLElement }
  | { type: 'loadNode'; node: PanoramaNode }
  | { type: 'setView'; view: PanoramaView }
  | { type: 'destroy' };

export class FakePanoramaEngine implements PanoramaEnginePort {
  readonly calls: FakePanoramaCall[] = [];
  readonly listeners = new Set<(view: PanoramaView) => void>();
  loadedNode: PanoramaNode | null = null;
  currentView: PanoramaView | null = null;
  destroyed = false;

  async mount(container: HTMLElement) {
    this.calls.push({ type: 'mount', container });
  }

  async loadNode(node: PanoramaNode) {
    const failure = readFakeFailure();
    if (failure === 'tile' || (failure === 'next-scene' && node.id === 'scene-02')) {
      throw new Error('E2E_PANORAMA_LOAD_FAILURE');
    }

    this.loadedNode = node;
    this.currentView = node.initialView;
    this.calls.push({ type: 'loadNode', node });
  }

  setView(view: PanoramaView) {
    this.currentView = view;
    this.calls.push({ type: 'setView', view });
  }

  subscribeViewChanged(listener: (view: PanoramaView) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emitViewChanged(view: PanoramaView) {
    for (const listener of this.listeners) {
      listener(view);
    }
  }

  destroy() {
    this.destroyed = true;
    this.listeners.clear();
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
