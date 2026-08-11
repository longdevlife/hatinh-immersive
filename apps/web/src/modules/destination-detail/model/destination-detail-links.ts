import type { DestinationPreviewVm, ImmersiveMode } from '../../../shared/contracts';

export function createExploreMapHref(destinationSlug: string): string {
  const params = new URLSearchParams({ destination: destinationSlug });
  return `/explore?${params.toString()}`;
}

export function createDestinationImmersiveHref(
  destination: DestinationPreviewVm,
  mode: ImmersiveMode,
): string {
  const params = new URLSearchParams({ mode, location: destination.id });
  if (mode === 'panorama' && destination.defaultSceneId) {
    params.set('scene', destination.defaultSceneId);
  }

  return `/explore/${encodeURIComponent(destination.slug)}/immersive?${params.toString()}`;
}
