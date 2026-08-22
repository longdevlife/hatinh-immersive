import type { ImmersiveManifestVm } from '../api/immersive-manifest.mapper';
import {
  createDemoPanoramaTourManifest,
  type DemoPanoramaMediaMode,
} from '../fake-mode/panorama-tour-demo';
import {
  getDemoSceneDefinitions,
  getPublicDemoDestinationPreview,
} from '../fake-mode/demo-tour-catalog';
import type { DestinationPreviewVm } from '../../../shared/contracts';

export type PanoramaTourSource = 'demo' | 'none';
export type PanoramaTourMediaMode = DemoPanoramaMediaMode;

interface PanoramaTourSourceEnvironment {
  VITE_IMMERSIVE_PANORAMA_TOUR_SOURCE?: string;
  VITE_IMMERSIVE_PANORAMA_TOUR_MEDIA?: string;
  VITE_IMMERSIVE_PANORAMA_TOUR_TEST_MODE?: string;
}

export function resolvePanoramaTourSource(environment: unknown): PanoramaTourSource {
  const source = (environment as PanoramaTourSourceEnvironment).VITE_IMMERSIVE_PANORAMA_TOUR_SOURCE;

  return source === 'demo' ? 'demo' : 'none';
}

export function resolvePanoramaTourMediaMode(environment: unknown): PanoramaTourMediaMode {
  const modes = environment as PanoramaTourSourceEnvironment;

  return modes.VITE_IMMERSIVE_PANORAMA_TOUR_MEDIA === 'synthetic' &&
    modes.VITE_IMMERSIVE_PANORAMA_TOUR_TEST_MODE === 'true'
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
  if (source !== 'demo' || !isDemoTourDestination(manifest.destination.slug)) {
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
  mediaMode: PanoramaTourMediaMode = 'public',
): DestinationPreviewVm {
  if (source !== 'demo' || !isDemoTourDestination(destination.slug)) {
    return destination;
  }

  if (destination.slug === 'son-trang-co-dam' && mediaMode === 'public') {
    return getPublicDemoDestinationPreview(destination);
  }

  return {
    ...destination,
    defaultSceneId: getDemoSceneDefinitions(destination.slug)[0]?.id ?? destination.defaultSceneId,
  };
}

function isDemoTourDestination(slug: string): boolean {
  return getDemoSceneDefinitions(slug).length > 1;
}
