import type { PanoramaManifest } from '@hatinh/immersive-contracts';

import type { PanoramaNode } from '../../../shared/contracts';

export type PanoramaRuntimeMediaPolicy = 'public' | 'demo';

export const MIN_PUBLIC_PANORAMA_WIDTH = 4096;

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
