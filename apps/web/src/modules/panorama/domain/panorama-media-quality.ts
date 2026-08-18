import type { PanoramaManifest } from '@hatinh/immersive-contracts';

import type { PanoramaNode } from '../../../shared/contracts';

export type PanoramaRuntimeMediaPolicy = 'public' | 'demo';

export const MIN_PUBLIC_PANORAMA_WIDTH = 4096;

const PANORAMA_RUNTIME_MEDIA_UNAVAILABLE_PREFIXES = [
  'PANORAMA_PUBLIC_DEMO_MEDIA_FORBIDDEN:',
  'PANORAMA_PUBLIC_MEDIA_NOT_READY:',
  'PANORAMA_PUBLIC_RESOLUTION_TOO_LOW:',
] as const;

/**
 * Runtime media policy failures are an expected content state for a public
 * tour. They must not be presented as a broken panorama renderer.
 */
export function isPanoramaRuntimeMediaUnavailableError(error: unknown): boolean {
  return (
    error instanceof Error &&
    PANORAMA_RUNTIME_MEDIA_UNAVAILABLE_PREFIXES.some((prefix) => error.message.startsWith(prefix))
  );
}

export function assertPanoramaRuntimeMediaAllowed(
  node: PanoramaNode,
  manifest: PanoramaManifest,
  policy: PanoramaRuntimeMediaPolicy,
): void {
  if (policy === 'demo') {
    return;
  }

  if (node.mediaRights === 'demo-only') {
    throw new Error(`PANORAMA_PUBLIC_DEMO_MEDIA_FORBIDDEN:${node.id}`);
  }

  if (node.mediaQuality !== undefined && node.mediaQuality !== 'ready') {
    throw new Error(`PANORAMA_PUBLIC_MEDIA_NOT_READY:${node.id}:${node.mediaQuality}`);
  }

  const maxWidth = manifest.levels.at(-1)?.width ?? 0;
  if (maxWidth < MIN_PUBLIC_PANORAMA_WIDTH) {
    throw new Error(
      `PANORAMA_PUBLIC_RESOLUTION_TOO_LOW:${node.id}:${maxWidth}:${MIN_PUBLIC_PANORAMA_WIDTH}`,
    );
  }
}
