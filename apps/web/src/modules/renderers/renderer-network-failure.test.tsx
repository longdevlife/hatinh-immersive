import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Map3DViewport } from '../map3d/ui/Map3DViewport';
import type { Map3DEnginePort } from '../map3d/domain/map3d-engine.port';
import { PanoramaViewport } from '../panorama/ui/PanoramaViewport';
import type { PanoramaEnginePort } from '../panorama/domain/panorama-engine.port';

const panoramaNode = {
  id: 'scene-01',
  panoramaUrl: '/panorama/scene-01/manifest.json',
  previewUrl: '/panorama/scene-01/preview.webp',
  lat: 18.342,
  lng: 105.9,
  initialView: { heading: 0, pitch: 0, fov: 90 },
};

describe('renderer network failure boundaries', () => {
  it('keeps a usable alert when Google 3D initialization fails', async () => {
    const engine: Map3DEnginePort = {
      mount: async () => {
        throw new Error('GOOGLE_MAPS_SCRIPT_LOAD_FAILED');
      },
      setLocations: async () => undefined,
      subscribeLocationSelected: () => () => undefined,
      flyTo: async () => undefined,
      addModel: async () => undefined,
      destroy: () => undefined,
    };

    render(<Map3DViewport engine={engine} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể mở không gian 3D');
  });

  it('keeps a usable alert when a panorama tile manifest fails', async () => {
    const engine: PanoramaEnginePort = {
      mount: async () => undefined,
      loadNode: async () => {
        throw new Error('PANORAMA_TILE_REQUEST_FAILED');
      },
      setView: () => undefined,
      subscribeViewChanged: () => () => undefined,
      destroy: () => undefined,
    };

    render(<PanoramaViewport engine={engine} node={panoramaNode} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Không thể tải không gian toàn cảnh',
    );
  });
});
