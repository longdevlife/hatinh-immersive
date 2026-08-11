import type { DestinationPreviewVm } from '../../../shared/contracts';

import type { DestinationCapabilities } from './destination-detail.types';

export interface DestinationCapabilityConfig {
  selected3DSlugs: ReadonlySet<string>;
}

/**
 * Selected 3D is intentionally opt-in. Coordinates alone are not enough to
 * promise a useful selected-3D experience to visitors.
 */
export const DEFAULT_DESTINATION_CAPABILITY_CONFIG: DestinationCapabilityConfig = {
  selected3DSlugs: new Set<string>(),
};

export function getDestinationCapabilities(
  destination: DestinationPreviewVm,
  config: DestinationCapabilityConfig = DEFAULT_DESTINATION_CAPABILITY_CONFIG,
): DestinationCapabilities {
  return {
    hasPanorama: destination.defaultSceneId !== null,
    hasSelected3D: config.selected3DSlugs.has(destination.slug),
  };
}
