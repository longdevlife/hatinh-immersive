import type { DestinationPreviewVm } from '../../../shared/contracts';

export interface SonTrangZoneVm {
  id: string;
  name: string;
  summary: string;
  coverImageUrl: string | null;
  immersiveSceneId?: string | null;
}

export interface SonTrangExperienceVm {
  destination: DestinationPreviewVm;
  pillars: readonly string[];
  zones: readonly SonTrangZoneVm[];
}
