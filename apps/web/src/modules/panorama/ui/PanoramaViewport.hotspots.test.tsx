import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { HotspotVm, PanoramaNode } from '../../../shared/contracts';
import { FakePanoramaEngine } from '../adapters/fake-panorama.adapter';
import { PanoramaViewport } from './PanoramaViewport';

const node: PanoramaNode = {
  id: 'scene-01',
  panoramaUrl: '/panorama/scene-01/manifest.json',
  previewUrl: '/panorama/scene-01/preview.webp',
  lat: 18.342,
  lng: 105.9,
  initialView: { heading: 10, pitch: -2, fov: 88 },
};

const hotspot: HotspotVm = {
  id: 'hotspot-story',
  sceneId: node.id,
  type: 'information',
  yaw: 32,
  pitch: -4,
  label: 'Câu chuyện địa danh',
  content: 'Nội dung câu chuyện',
};

describe('PanoramaViewport hotspot synchronization', () => {
  it('does not reinstall semantically unchanged hotspots on a React rerender', async () => {
    const engine = new FakePanoramaEngine();
    const setHotspots = vi.spyOn(engine, 'setHotspots');
    const { rerender } = render(
      <PanoramaViewport engine={engine} node={node} hotspots={[hotspot]} />,
    );

    await waitFor(() => expect(setHotspots).toHaveBeenCalledTimes(1));

    rerender(
      <PanoramaViewport
        engine={engine}
        node={node}
        hotspots={[{ ...hotspot }]}
      />,
    );

    await waitFor(() => expect(setHotspots).toHaveBeenCalledTimes(1));
  });
});
