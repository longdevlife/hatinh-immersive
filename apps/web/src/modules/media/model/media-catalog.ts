import type { DestinationMediaVm, MediaAsset } from './media.types';

export type SonTrangZoneName = 'Tâm linh' | 'Văn hóa' | 'Sinh thái' | 'Giải trí';

function createDemoAsset(
  id: string,
  src: string,
  alt: string,
  width: number,
  height: number,
): MediaAsset {
  const optimizedSrc = src.replace(/\.png$/, '.webp');

  return {
    id,
    kind: 'image',
    src: optimizedSrc,
    alt,
    width,
    height,
    attribution: null,
    rightsStatus: 'demo-only',
    variants: [{ src: optimizedSrc, width }],
  };
}

const sonTrangHero = createDemoAsset(
  'son-trang-hero',
  '/demo/media/son-trang/hero.png',
  'Không gian Sơn Trang Cổ Đạm giữa vườn cây và kiến trúc truyền thống',
  1774,
  887,
);

export const DEMO_SON_TRANG_ZONE_MEDIA: Readonly<Record<SonTrangZoneName, MediaAsset>> = {
  'Tâm linh': createDemoAsset(
    'son-trang-zone-spiritual',
    '/demo/media/son-trang/spiritual.png',
    'Không gian Tâm linh tại Sơn Trang Cổ Đạm',
    1774,
    887,
  ),
  'Văn hóa': createDemoAsset(
    'son-trang-zone-culture',
    '/demo/media/son-trang/culture.png',
    'Không gian Văn hóa tại Sơn Trang Cổ Đạm',
    1774,
    887,
  ),
  'Sinh thái': createDemoAsset(
    'son-trang-zone-ecology',
    '/demo/media/son-trang/ecology.png',
    'Không gian Sinh thái tại Sơn Trang Cổ Đạm',
    1774,
    887,
  ),
  'Giải trí': createDemoAsset(
    'son-trang-zone-recreation',
    '/demo/media/son-trang/recreation.png',
    'Không gian Giải trí tại Sơn Trang Cổ Đạm',
    1774,
    887,
  ),
};

export const DEMO_DESTINATION_MEDIA: Readonly<Record<string, DestinationMediaVm>> = {
  'son-trang-co-dam': {
    hero: sonTrangHero,
    gallery: [
      DEMO_SON_TRANG_ZONE_MEDIA['Tâm linh'],
      DEMO_SON_TRANG_ZONE_MEDIA['Văn hóa'],
      DEMO_SON_TRANG_ZONE_MEDIA['Sinh thái'],
      DEMO_SON_TRANG_ZONE_MEDIA['Giải trí'],
      createDemoAsset(
        'son-trang-gallery-courtyard',
        '/demo/media/son-trang/gallery-courtyard.png',
        'Sân trong Sơn Trang Cổ Đạm',
        1774,
        887,
      ),
    ],
  },
  'bien-thien-cam': {
    hero: createDemoAsset(
      'thien-cam-hero',
      '/demo/media/thien-cam/hero.png',
      'Bờ biển Thiên Cầm trong nắng sớm',
      1774,
      887,
    ),
    gallery: [
      createDemoAsset(
        'thien-cam-gallery-shore',
        '/demo/media/thien-cam/gallery-shore.png',
        'Bãi biển Thiên Cầm nhìn ra vịnh',
        1774,
        887,
      ),
      createDemoAsset(
        'thien-cam-gallery-boardwalk',
        '/demo/media/thien-cam/gallery-boardwalk.png',
        'Lối dạo ven biển Thiên Cầm',
        1774,
        887,
      ),
      createDemoAsset(
        'thien-cam-gallery-blue-hour',
        '/demo/media/thien-cam/gallery-blue-hour.png',
        'Thiên Cầm lúc hoàng hôn',
        1774,
        887,
      ),
    ],
  },
  'khu-luu-niem-nguyen-du': {
    hero: createDemoAsset(
      'nguyen-du-hero',
      '/demo/media/nguyen-du/hero.png',
      'Khu vườn tưởng niệm Nguyễn Du',
      1672,
      941,
    ),
    gallery: [
      createDemoAsset(
        'nguyen-du-gallery-garden',
        '/demo/media/nguyen-du/gallery-garden.png',
        'Khuôn viên xanh tại khu lưu niệm Nguyễn Du',
        1536,
        1024,
      ),
      createDemoAsset(
        'nguyen-du-gallery-timber-house',
        '/demo/media/nguyen-du/gallery-timber-house.png',
        'Chi tiết nhà gỗ truyền thống tại khu lưu niệm Nguyễn Du',
        1536,
        1024,
      ),
      createDemoAsset(
        'nguyen-du-gallery-reading-garden',
        '/demo/media/nguyen-du/gallery-reading-garden.png',
        'Không gian vườn đọc và tĩnh lặng tại khu lưu niệm Nguyễn Du',
        1536,
        1024,
      ),
    ],
  },
  'nga-ba-dong-loc': {
    hero: createDemoAsset(
      'dong-loc-hero',
      '/demo/media/dong-loc/hero.png',
      'Không gian tưởng niệm Ngã ba Đồng Lộc',
      1774,
      887,
    ),
    gallery: [
      createDemoAsset(
        'dong-loc-gallery-monument',
        '/demo/media/dong-loc/gallery-monument.png',
        'Không gian công trình tưởng niệm Đồng Lộc',
        1536,
        1024,
      ),
      createDemoAsset(
        'dong-loc-gallery-path',
        '/demo/media/dong-loc/gallery-path.png',
        'Lối đi trong khu tưởng niệm Đồng Lộc',
        1535,
        1024,
      ),
      createDemoAsset(
        'dong-loc-gallery-garden',
        '/demo/media/dong-loc/gallery-garden.png',
        'Vườn cây trong không gian tưởng niệm Đồng Lộc',
        1536,
        1024,
      ),
    ],
  },
};

export function getDemoDestinationMedia(slug: string): DestinationMediaVm | undefined {
  return DEMO_DESTINATION_MEDIA[slug];
}
