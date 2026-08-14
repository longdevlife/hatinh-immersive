import type { DestinationPreviewVm } from '../../../shared/contracts';

import type { SonTrangExperienceMedia, SonTrangExperienceVm } from './son-trang.types';

const SON_TRANG_SLUG = 'son-trang-co-dam';

const SON_TRANG_PILLARS = [
  'Văn hóa & di sản',
  'Nông nghiệp & sinh thái',
  'Giáo dục trải nghiệm',
  'Tâm linh & đời sống tinh thần',
] as const;

const SON_TRANG_ZONES = ['Tâm linh', 'Văn hóa', 'Sinh thái', 'Giải trí'] as const;

export function toSonTrangExperienceVm(
  destination: DestinationPreviewVm,
  media?: SonTrangExperienceMedia,
): SonTrangExperienceVm | null {
  if (destination.slug !== SON_TRANG_SLUG) {
    return null;
  }

  return {
    destination,
    hero: media?.hero ?? destination.media?.hero ?? null,
    pillars: SON_TRANG_PILLARS,
    gallery: destination.media?.gallery ?? [],
    zones: SON_TRANG_ZONES.map((name) => ({
      id: `son-trang-zone-${name}`,
      name,
      summary: '',
      media: media?.zoneMedia[name] ?? null,
      immersiveSceneId: null,
    })),
  };
}
