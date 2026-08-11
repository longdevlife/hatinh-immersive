import type { DestinationPreviewVm } from '../../../shared/contracts';

export interface DestinationCapabilities {
  hasPanorama: boolean;
  hasSelected3D: boolean;
}

export interface DestinationDetailViewModel {
  id: string;
  slug: string;
  name: string;
  summary: string;
  categoryLabel: string | null;
  coverImageUrl: string | null;
  locationLabel: string | null;
  hasMapLocation: boolean;
  capabilities: DestinationCapabilities;
}

export interface DestinationExperienceProps {
  destination: DestinationDetailViewModel;
  onBackToExplore(): void;
  onOpenMap(): void;
  onEnterPanorama?(): void;
  onEnterSelected3D?(): void;
}

export function toDestinationDetailViewModel(
  destination: DestinationPreviewVm,
  capabilities: DestinationCapabilities,
): DestinationDetailViewModel {
  return {
    id: destination.id,
    slug: destination.slug,
    name: destination.name,
    summary: destination.summary,
    categoryLabel: destination.categoryLabel,
    coverImageUrl: destination.coverImageUrl,
    locationLabel: destination.geoPoint ? 'Hà Tĩnh' : null,
    hasMapLocation: destination.geoPoint !== null,
    capabilities,
  };
}
