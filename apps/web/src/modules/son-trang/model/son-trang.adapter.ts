import type { DestinationPreviewVm } from '../../../shared/contracts';
import { DEMO_SON_TRANG_ZONE_MEDIA } from '../../media';

import type { SonTrangExperienceVm } from './son-trang.types';

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
): SonTrangExperienceVm | null {
  if (destination.slug !== SON_TRANG_SLUG) {
    return null;
  }

  return {
    destination,
    pillars: SON_TRANG_PILLARS,
    zones: SON_TRANG_ZONES.map((name) => ({
      id: `son-trang-zone-${name}`,
      name,
      summary: '',
      coverImageUrl: destination.media ? (DEMO_SON_TRANG_ZONE_MEDIA[name]?.src ?? null) : null,
      immersiveSceneId: null,
    })),
  };
}
