import type { DestinationPreviewVm } from '../../../shared/contracts';
import type { MediaAsset } from '../../media';
import type { SonTrangZoneName } from '../../media';

export interface SonTrangZoneVm {
  id: string;
  name: string;
  summary: string;
  media: MediaAsset | null;
  immersiveSceneId?: string | null;
}

export interface SonTrangExperienceMedia {
  hero: MediaAsset | null;
  zoneMedia: Readonly<Record<SonTrangZoneName, MediaAsset>>;
}

export interface SonTrangExperienceVm {
  destination: DestinationPreviewVm;
  hero: MediaAsset | null;
  pillars: readonly string[];
  zones: readonly SonTrangZoneVm[];
  gallery: readonly MediaAsset[];
}
