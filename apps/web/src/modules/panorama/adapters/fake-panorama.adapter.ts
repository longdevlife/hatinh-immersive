import type { HotspotVm } from '../../../shared/contracts';
import type {
  PanoramaEnginePort,
  PanoramaNode,
  PanoramaView,
} from '../domain/panorama-engine.port';

export type FakePanoramaCall =
  | { type: 'mount'; container: HTMLElement }
  | { type: 'loadNode'; node: PanoramaNode }
  | { type: 'setView'; view: PanoramaView }
  | { type: 'setHotspots'; hotspots: HotspotVm[] }
  | { type: 'destroy' };

export class FakePanoramaEngine implements PanoramaEnginePort {
  readonly calls: FakePanoramaCall[] = [];
  readonly listeners = new Set<(view: PanoramaView) => void>();
  private readonly hotspotListeners = new Set<(hotspotId: string) => void>();
  private container: HTMLElement | null = null;
  loadedNode: PanoramaNode | null = null;
  currentView: PanoramaView | null = null;
  destroyed = false;

  async mount(container: HTMLElement) {
    this.container = container;
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

  setHotspots(hotspots: HotspotVm[]) {
    const snapshot = hotspots.map((hotspot) => ({ ...hotspot }));
    this.calls.push({ type: 'setHotspots', hotspots: snapshot });
    this.renderHotspots(snapshot);
  }

  subscribeViewChanged(listener: (view: PanoramaView) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeHotspotSelected(listener: (hotspotId: string) => void) {
    this.hotspotListeners.add(listener);
    return () => this.hotspotListeners.delete(listener);
  }

  emitViewChanged(view: PanoramaView) {
    for (const listener of this.listeners) {
      listener(view);
    }
  }

  destroy() {
    this.destroyed = true;
    this.listeners.clear();
    this.hotspotListeners.clear();
    this.removeHotspots();
    this.container = null;
    this.calls.push({ type: 'destroy' });
  }

  private renderHotspots(hotspots: HotspotVm[]) {
    const container = this.container;
    if (!container) {
      return;
    }

    this.removeHotspots();
    for (const hotspot of hotspots) {
      const button = document.createElement('button');
      const label = hotspot.label ?? 'Mở điểm khám phá';
      button.type = 'button';
      button.className = `panorama-hotspot-marker panorama-hotspot-marker--${hotspot.type}`;
      button.dataset.fakePanoramaHotspot = hotspot.id;
      button.setAttribute('aria-label', label);
      button.setAttribute('aria-haspopup', 'dialog');
      button.textContent = label;
      button.addEventListener('click', () => {
        button.focus({ preventScroll: true });
        for (const listener of this.hotspotListeners) {
          listener(hotspot.id);
        }
      });
      container.append(button);
    }
  }

  private removeHotspots() {
    this.container
      ?.querySelectorAll<HTMLElement>('[data-fake-panorama-hotspot]')
      .forEach((marker) => marker.remove());
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
