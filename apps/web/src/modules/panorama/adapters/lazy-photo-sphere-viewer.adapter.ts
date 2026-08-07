import type { PanoramaEnginePort } from '../domain/panorama-engine.port';

import type { PhotoSphereViewerAdapterOptions } from './photo-sphere-viewer.adapter';

export async function createLazyPhotoSphereViewerEngine(
  options: PhotoSphereViewerAdapterOptions = {},
): Promise<PanoramaEnginePort> {
  const { PhotoSphereViewerEngine } = await import('./photo-sphere-viewer.adapter');
  return new PhotoSphereViewerEngine(options);
}
