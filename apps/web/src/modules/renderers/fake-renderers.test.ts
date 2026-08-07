import { FakeMap3DEngine } from '../map3d/adapters/fake-map3d.adapter';
import type { CameraTarget, ModelPlacement } from '../map3d/domain/map3d-engine.port';
import { FakePanoramaEngine } from '../panorama/adapters/fake-panorama.adapter';
import type { PanoramaNode, PanoramaView } from '../panorama/domain/panorama-engine.port';

describe('fake renderer adapters', () => {
  it('records the Map3D lifecycle without loading a vendor SDK', async () => {
    const engine = new FakeMap3DEngine();
    const container = document.createElement('div');
    const target: CameraTarget = { lat: 18.342, lng: 105.9, range: 900 };
    const model: ModelPlacement = { id: 'temple', url: '/temple.glb', lat: 18.342, lng: 105.9 };

    await engine.mount(container);
    await engine.flyTo(target);
    await engine.addModel(model);
    engine.destroy();

    expect(engine.calls).toEqual([
      { type: 'mount', container },
      { type: 'flyTo', target },
      { type: 'addModel', model },
      { type: 'destroy' },
    ]);
  });

  it('publishes panorama view changes and releases listeners on destroy', async () => {
    const engine = new FakePanoramaEngine();
    const container = document.createElement('div');
    const node: PanoramaNode = {
      id: 'scene-01',
      panoramaUrl: '/panorama/scene-01/manifest.json',
      previewUrl: '/panorama/scene-01/preview.webp',
      lat: 18.342,
      lng: 105.9,
      initialView: { heading: 10, pitch: -2, fov: 88 },
    };
    const view: PanoramaView = { heading: 42, pitch: 1, fov: 82 };
    const received: PanoramaView[] = [];

    await engine.mount(container);
    const unsubscribe = engine.subscribeViewChanged((nextView) => received.push(nextView));
    await engine.loadNode(node);
    engine.setView(view);
    engine.emitViewChanged(view);
    unsubscribe();
    engine.emitViewChanged({ ...view, heading: 55 });
    engine.destroy();

    expect(received).toEqual([view]);
    expect(engine.loadedNode).toEqual(node);
    expect(engine.destroyed).toBe(true);
  });
});
