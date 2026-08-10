import type {
  PanoramaEnginePort,
  PanoramaNode,
  PanoramaView,
} from '../domain/panorama-engine.port';

export type FakePanoramaCall =
  | { type: 'mount'; container: HTMLElement }
  | { type: 'loadNode'; node: PanoramaNode }
  | { type: 'setView'; view: PanoramaView }
  | { type: 'setHotspots'; hotspots: any[] }
  | { type: 'destroy' };

export class FakePanoramaEngine implements PanoramaEnginePort {
  readonly calls: FakePanoramaCall[] = [];
  readonly listeners = new Set<(view: PanoramaView) => void>();
  loadedNode: PanoramaNode | null = null;
  currentView: PanoramaView | null = null;
  hotspots: any[] = [];
  container: HTMLElement | null = null;
  destroyed = false;
  hotspotClickListener: ((id: string) => void) | null = null;

  async mount(container: HTMLElement) {
    this.container = container;
    this.calls.push({ type: 'mount', container });
    this.renderHotspots();
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

  setHotspots(hotspots: any[], onClick?: (id: string) => void) {
    this.hotspots = hotspots;
    this.hotspotClickListener = onClick ?? null;
    this.calls.push({ type: 'setHotspots', hotspots });
    this.renderHotspots();
  }

  private renderHotspots() {
    if (!this.container) return;

    // Cleanup old hotspots layer
    const oldLayer = this.container.querySelector('.hotspot-layer');
    if (oldLayer) {
      oldLayer.remove();
    }

    const layer = document.createElement('div');
    layer.className = 'hotspot-layer';
    layer.setAttribute('aria-label', 'Điểm khám phá trong cảnh');

    this.hotspots.forEach((hotspot, index) => {
      const btn = document.createElement('button');
      btn.className = `hotspot-marker hotspot-marker--${hotspot.type}`;
      btn.type = 'button';
      btn.setAttribute('aria-haspopup', 'dialog');
      btn.setAttribute('aria-label', hotspot.label ?? 'Mở điểm khám phá');
      btn.style.left = `${12 + ((hotspot.yaw % 360) / 360) * 76}%`;
      btn.style.top = `${42 + hotspot.pitch * 2 + (index % 2) * 7}%`;

      const icon = document.createElement('span');
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = '+';

      const label = document.createElement('span');
      label.className = 'hotspot-marker__label';
      label.textContent = hotspot.label;

      btn.appendChild(icon);
      btn.appendChild(label);

      btn.addEventListener('click', () => {
        if (this.hotspotClickListener) {
          this.hotspotClickListener(hotspot.id);
        }
      });

      layer.appendChild(btn);
    });

    this.container.appendChild(layer);
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
