import type { Map3DEnginePort } from '../domain/map3d-engine.port';

import type { GoogleMaps3DAdapterOptions } from './google-maps3d.adapter';

export async function createLazyGoogleMaps3DEngine(
  options: GoogleMaps3DAdapterOptions = {},
): Promise<Map3DEnginePort> {
  const { GoogleMaps3DEngine } = await import('./google-maps3d.adapter');
  return new GoogleMaps3DEngine(options);
}
