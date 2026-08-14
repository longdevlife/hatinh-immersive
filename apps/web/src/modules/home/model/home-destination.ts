import type { DestinationPreviewVm, MediaAsset } from '../../../shared/contracts';
import { createDestinationDetailHref } from '../../../shared/navigation/explore-context';

export interface HomeDestinationVm {
  id: string;
  slug: string;
  name: string;
  summary: string;
  categoryLabel: string | null;
  hero: MediaAsset;
  cardImage: MediaAsset;
  detailHref: string;
  isFocus: boolean;
}

export function createHomeDestinationVm(
  destination: DestinationPreviewVm,
): HomeDestinationVm | null {
  const hero = destination.media?.hero;
  if (!hero) {
    return null;
  }

  const cardImage = destination.media?.gallery[0] ?? hero;

  return {
    id: destination.id,
    slug: destination.slug,
    name: destination.name,
    summary: destination.summary,
    categoryLabel: destination.categoryLabel,
    hero,
    cardImage,
    detailHref: createDestinationDetailHref(destination.slug),
    isFocus: destination.slug === 'son-trang-co-dam',
  };
}

export function createHomeDestinationVms(
  destinations: readonly DestinationPreviewVm[],
): HomeDestinationVm[] {
  return destinations.flatMap((destination) => {
    const viewModel = createHomeDestinationVm(destination);
    return viewModel ? [viewModel] : [];
  });
}
