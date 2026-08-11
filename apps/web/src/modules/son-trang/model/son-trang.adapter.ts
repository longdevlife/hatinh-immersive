import type { DestinationPreviewVm } from '../../../shared/contracts';

import type { SonTrangExperienceVm } from './son-trang.types';

const SON_TRANG_SLUG = 'son-trang-co-dam';

const SON_TRANG_PILLARS = [
  'Văn hóa & di sản',
  'Nông nghiệp & sinh thái',
  'Giáo dục trải nghiệm',
  'Tâm linh & đời sống tinh thần',
] as const;

export function toSonTrangExperienceVm(
  destination: DestinationPreviewVm,
): SonTrangExperienceVm | null {
  if (destination.slug !== SON_TRANG_SLUG) {
    return null;
  }

  return {
    destination,
    pillars: SON_TRANG_PILLARS,
    zones: [
      {
        id: destination.id,
        name: destination.name,
        summary: destination.summary,
        coverImageUrl: destination.coverImageUrl,
        immersiveSceneId: destination.defaultSceneId,
      },
    ],
  };
}
