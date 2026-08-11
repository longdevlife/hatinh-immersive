import { describe, expect, it, vi } from 'vitest';

import type { HotspotVm } from '../../../shared/contracts';
import { FakePanoramaEngine } from './fake-panorama.adapter';

const hotspot: HotspotVm = {
  id: 'hotspot-story',
  sceneId: 'scene-01',
  type: 'information',
  yaw: 32,
  pitch: -4,
  label: 'Câu chuyện địa danh',
};

describe('FakePanoramaEngine hotspots', () => {
  it('renders deterministic adapter-owned hotspot controls and emits the hotspot id', async () => {
    const container = document.createElement('div');
    const engine = new FakePanoramaEngine();
    const selected = vi.fn();

    await engine.mount(container);
    const unsubscribe = engine.subscribeHotspotSelected?.(selected);
    engine.setHotspots?.([hotspot]);

    const button = container.querySelector<HTMLButtonElement>('[data-fake-panorama-hotspot]');
    expect(button).not.toBeNull();
    expect(button).toHaveAttribute('aria-label', hotspot.label);
    expect(button).not.toHaveAttribute('style');

    button?.click();
    expect(selected).toHaveBeenCalledWith(hotspot.id);

    unsubscribe?.();
    button?.click();
    expect(selected).toHaveBeenCalledTimes(1);
  });
});
