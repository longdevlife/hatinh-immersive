import type { DestinationPreviewVm, ImmersiveMode } from '../../../shared/contracts';
import type { ExploreReturnContext } from '../../../shared/navigation/explore-context';

export function createExploreMapHref(
  destinationSlug: string,
  returnContext?: ExploreReturnContext,
): string {
  const params = new URLSearchParams();
  if (returnContext?.query?.trim()) {
    params.set('q', returnContext.query.trim());
  }
  if (returnContext?.category?.trim()) {
    params.set('category', returnContext.category.trim());
  }
  params.set('destination', destinationSlug);
  params.set('view', 'map');
  return `/explore?${params.toString()}`;
}

export function createDestinationImmersiveHref(
  destination: DestinationPreviewVm,
  mode: ImmersiveMode,
  options: { returnTo?: string } = {},
): string {
  const params = new URLSearchParams({ mode, location: destination.id });
  if (mode === 'panorama' && destination.defaultSceneId) {
    params.set('scene', destination.defaultSceneId);
  }
  if (options.returnTo) {
    params.set('returnTo', options.returnTo);
  }

  return `/explore/${encodeURIComponent(destination.slug)}/immersive?${params.toString()}`;
}
