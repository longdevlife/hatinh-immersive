import type {
  DestinationCapabilities,
  DestinationMediaVm,
  DestinationPreviewVm,
} from '../../../shared/contracts';

export type { DestinationCapabilities } from '../../../shared/contracts';

export interface DestinationDetailViewModel {
  id: string;
  slug: string;
  name: string;
  summary: string;
  categoryLabel: string | null;
  coverImageUrl: string | null;
  media?: DestinationMediaVm;
  locationLabel: string | null;
  hasMapLocation: boolean;
  capabilities: DestinationCapabilities;
}

export interface DestinationDetailFactVm {
  id: string;
  label: string;
  value: string;
}

export interface DestinationDetailSectionVm {
  id: string;
  title: string;
  body: string;
}

export interface DestinationDetailPresentationVm {
  id: string;
  slug: string;
  name: string;
  summary: string;
  categoryLabel?: string | null;
  locationLabel?: string | null;
  media: DestinationMediaVm;
  facts: readonly DestinationDetailFactVm[];
  sections: readonly DestinationDetailSectionVm[];
  capabilities: DestinationCapabilities;
}

export interface DestinationExperienceProps {
  destination: DestinationDetailPresentationVm;
  onBackToExplore(): void;
  onOpenMap?: (() => void) | undefined;
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
    media: destination.media ?? { hero: null, gallery: [] },
    locationLabel: destination.geoPoint ? 'Hà Tĩnh' : null,
    hasMapLocation: destination.geoPoint !== null,
    capabilities,
  };
}

export function toDestinationDetailPresentationVm(
  destination: DestinationPreviewVm,
  capabilities: DestinationCapabilities,
): DestinationDetailPresentationVm {
  const media = destination.media ?? { hero: null, gallery: [] };
  const facts: DestinationDetailFactVm[] = [];

  if (destination.categoryLabel) {
    facts.push({ id: 'category', label: 'Chủ đề', value: destination.categoryLabel });
  }

  if (destination.geoPoint) {
    facts.push({ id: 'location', label: 'Khu vực', value: 'Hà Tĩnh' });
  }

  return {
    id: destination.id,
    slug: destination.slug,
    name: destination.name,
    summary: destination.summary,
    categoryLabel: destination.categoryLabel,
    locationLabel: destination.geoPoint ? 'Hà Tĩnh' : null,
    media,
    facts,
    sections: [
      {
        id: 'overview',
        title: 'Một điểm đến để đi chậm lại',
        body: destination.summary,
      },
    ],
    capabilities,
  };
}
