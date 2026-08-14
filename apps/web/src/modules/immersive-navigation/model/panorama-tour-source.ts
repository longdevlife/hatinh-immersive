import type { ImmersiveManifestVm } from '../api/immersive-manifest.mapper';
import {
  createDemoPanoramaTourManifest,
  type DemoPanoramaMediaMode,
} from '../fake-mode/panorama-tour-demo';
import type { DestinationPreviewVm } from '../../../shared/contracts';

export type PanoramaTourSource = 'demo' | 'none';
export type PanoramaTourMediaMode = DemoPanoramaMediaMode;

interface PanoramaTourSourceEnvironment {
  VITE_IMMERSIVE_PANORAMA_TOUR_SOURCE?: string;
  VITE_IMMERSIVE_PANORAMA_TOUR_MEDIA?: string;
}

export function resolvePanoramaTourSource(environment: unknown): PanoramaTourSource {
  const source = (environment as PanoramaTourSourceEnvironment).VITE_IMMERSIVE_PANORAMA_TOUR_SOURCE;

  return source === 'demo' ? 'demo' : 'none';
}

export function resolvePanoramaTourMediaMode(environment: unknown): PanoramaTourMediaMode {
  return (environment as PanoramaTourSourceEnvironment).VITE_IMMERSIVE_PANORAMA_TOUR_MEDIA ===
    'synthetic'
    ? 'synthetic'
    : 'public';
}

/**
 * Demo scene graph composition is opt-in. It is never used as a fallback for
 * an API manifest. Public demo media is explicitly marked low-resolution and
 * demo-only; synthetic quality is available only to deterministic tests.
 */
export function composePanoramaTourManifest(
  manifest: ImmersiveManifestVm,
  source: PanoramaTourSource,
  mediaMode: PanoramaTourMediaMode = 'public',
): ImmersiveManifestVm {
  if (source !== 'demo' || manifest.destination.slug !== 'son-trang-co-dam') {
    return manifest;
  }

  return createDemoPanoramaTourManifest(manifest, mediaMode);
}

/**
 * The public demo source may also need to reconcile a catalog preview with
 * the explicit demo manifest entry scene. This never changes the API source
 * when the source is `none`.
 */
export function composePanoramaTourDestination(
  destination: DestinationPreviewVm,
  source: PanoramaTourSource,
): DestinationPreviewVm {
  if (source !== 'demo' || destination.slug !== 'son-trang-co-dam') {
    return destination;
  }

  return {
    ...destination,
    defaultSceneId: 'son-trang-gate',
  };
}
