import type {
  DestinationCapabilities,
  DestinationPreviewVm,
  Selected3DAvailability,
} from '../../../shared/contracts';

export interface DestinationCapabilityConfig {
  selected3DAvailabilityBySlug?: Readonly<Record<string, Selected3DAvailability>>;
  /** @deprecated Use selected3DAvailabilityBySlug for explicit capability semantics. */
  selected3DSlugs?: ReadonlySet<string>;
}

/**
 * Selected 3D is intentionally opt-in. Coordinates alone are not enough to
 * promise a useful selected-3D experience to visitors.
 */
export const DEFAULT_DESTINATION_CAPABILITY_CONFIG: DestinationCapabilityConfig = {
  selected3DAvailabilityBySlug: {},
};

interface DestinationCapabilityEnvironment {
  VITE_IMMERSIVE_SELECTED_3D_CAPABILITIES?: string;
}

const SELECTED_3D_AVAILABILITIES = new Set<Selected3DAvailability>([
  'available',
  'unavailable',
  'disabled',
]);

export function resolveDestinationCapabilityConfig(
  environment: unknown,
): DestinationCapabilityConfig {
  const rawCapabilities = (environment as DestinationCapabilityEnvironment)
    .VITE_IMMERSIVE_SELECTED_3D_CAPABILITIES;
  const selected3DAvailabilityBySlug: Record<string, Selected3DAvailability> = {};

  for (const entry of rawCapabilities?.split(',') ?? []) {
    const [slug, availability] = entry.trim().split('=');
    if (
      slug &&
      availability &&
      SELECTED_3D_AVAILABILITIES.has(availability as Selected3DAvailability)
    ) {
      selected3DAvailabilityBySlug[slug] = availability as Selected3DAvailability;
    }
  }

  return { selected3DAvailabilityBySlug };
}

export function getDestinationCapabilities(
  destination: DestinationPreviewVm,
  config: DestinationCapabilityConfig = DEFAULT_DESTINATION_CAPABILITY_CONFIG,
): DestinationCapabilities {
  const configuredAvailability = config.selected3DAvailabilityBySlug?.[destination.slug];
  const selected3DAvailability =
    configuredAvailability ??
    (config.selected3DSlugs?.has(destination.slug) ? 'available' : 'disabled');

  return {
    hasPanorama: destination.defaultSceneId !== null,
    hasSelected3D: selected3DAvailability === 'available',
    selected3DAvailability,
  };
}
