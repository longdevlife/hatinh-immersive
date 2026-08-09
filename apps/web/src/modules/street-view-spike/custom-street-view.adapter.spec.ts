import { describe, expect, it, vi } from 'vitest';

import { CustomStreetViewSpikeEngine } from './custom-street-view.adapter';

describe('CustomStreetViewSpikeEngine', () => {
  it('implements the panorama port with disposable injected loading', async () => {
    const resolvePanorama = vi.fn(async () => ({ panoramaId: 'google-pano-01' }));
    const engine = new CustomStreetViewSpikeEngine({ resolvePanorama });
    const node = {
      id: 'scene-01',
      panoramaUrl: 'https://maps.example/pano-01',
      previewUrl: null,
      lat: 18.3421,
      lng: 105.9032,
      initialView: { heading: 10, pitch: 2, fov: 90 },
    };
    const container = document.createElement('div');
    const changedNodes: string[] = [];
    const changedViews: unknown[] = [];

    await engine.mount(container);
    const unsubscribeNode = engine.subscribeNodeChanged((nodeId) => changedNodes.push(nodeId));
    const unsubscribeView = engine.subscribeViewChanged((view) => changedViews.push(view));
    await engine.loadNode(node);
    engine.setView({ heading: 42, pitch: -3, fov: 82 });

    expect(resolvePanorama).toHaveBeenCalledWith(node);
    expect(changedNodes).toEqual(['scene-01']);
    expect(changedViews).toEqual([{ heading: 42, pitch: -3, fov: 82 }]);

    unsubscribeNode();
    unsubscribeView();
    engine.destroy();
    await expect(engine.loadNode(node)).rejects.toThrow('CUSTOM_STREET_VIEW_SPIKE_NOT_MOUNTED');
  });
});
