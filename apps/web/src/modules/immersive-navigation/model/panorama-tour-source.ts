import type { ImmersiveManifestVm } from '../api/immersive-manifest.mapper';
import { createDemoPanoramaTourManifest } from '../fake-mode/panorama-tour-demo';

export type PanoramaTourSource = 'demo' | 'none';

interface PanoramaTourSourceEnvironment {
  VITE_IMMERSIVE_PANORAMA_TOUR_SOURCE?: string;
}

export function resolvePanoramaTourSource(environment: unknown): PanoramaTourSource {
  const source = (environment as PanoramaTourSourceEnvironment).VITE_IMMERSIVE_PANORAMA_TOUR_SOURCE;

  return source === 'demo' ? 'demo' : 'none';
}

/**
 * Demo scene graph composition is opt-in. It is never used as a fallback for
 * an API manifest, and its media is explicitly marked demo-only.
 */
export function composePanoramaTourManifest(
  manifest: ImmersiveManifestVm,
  source: PanoramaTourSource,
): ImmersiveManifestVm {
  if (source !== 'demo' || manifest.destination.slug !== 'son-trang-co-dam') {
    return manifest;
  }

  return createDemoPanoramaTourManifest(manifest);
}
