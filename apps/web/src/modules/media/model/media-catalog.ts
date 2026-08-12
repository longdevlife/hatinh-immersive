import type { DestinationMediaVm, MediaAsset, MediaSourceMetadata } from './media.types';

export type SonTrangZoneName = 'Tâm linh' | 'Văn hóa' | 'Sinh thái' | 'Giải trí';

type DemoAssetInput = {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
};

function createDemoAsset({ id, src, alt, width, height }: DemoAssetInput): MediaAsset {
  return {
    id,
    kind: 'image',
    src,
    alt,
    width,
    height,
    attribution: null,
    rightsStatus: 'demo-only',
    variants: [{ src, width }],
  };
}

function createLicensedAsset(input: DemoAssetInput, source: MediaSourceMetadata): MediaAsset {
  return {
    ...createDemoAsset(input),
    attribution: source.attributionText,
    rightsStatus: 'licensed',
    source,
  };
}

const COMMONS = 'https://commons.wikimedia.org/wiki/File:';

function commonsSource(
  fileName: string,
  author: string,
  license: MediaSourceMetadata['license'],
  nativeWidth: number,
  nativeHeight: number,
): MediaSourceMetadata {
  const attributionText =
    license === 'public-domain'
      ? `Nguồn lưu trữ: ${author}, public domain theo trang Wikimedia Commons. Đã chuyển đổi sang WebP và tối ưu kích thước.`
      : `© ${author}, ${license}, via Wikimedia Commons. Đã chuyển đổi sang WebP và tối ưu kích thước.`;

  return {
    sourcePageUrl: `${COMMONS}${fileName}`,
    author,
    license,
    attributionText,
    modifiedFromSource: true,
    nativeWidth,
    nativeHeight,
  };
}

const sonTrangHero = createDemoAsset({
  id: 'son-trang-hero',
  src: '/demo/media/son-trang/hero.webp',
  alt: 'Hình minh họa demo về không gian Sơn Trang Cổ Đạm giữa vườn cây và kiến trúc truyền thống',
  width: 1774,
  height: 887,
});

export const DEMO_SON_TRANG_ZONE_MEDIA: Readonly<Record<SonTrangZoneName, MediaAsset>> = {
  'Tâm linh': createDemoAsset({
    id: 'son-trang-zone-spiritual',
    src: '/demo/media/son-trang/spiritual.webp',
    alt: 'Hình minh họa demo cho không gian Tâm linh tại Sơn Trang Cổ Đạm',
    width: 1774,
    height: 887,
  }),
  'Văn hóa': createDemoAsset({
    id: 'son-trang-zone-culture',
    src: '/demo/media/son-trang/culture.webp',
    alt: 'Hình minh họa demo cho không gian Văn hóa tại Sơn Trang Cổ Đạm',
    width: 1774,
    height: 887,
  }),
  'Sinh thái': createDemoAsset({
    id: 'son-trang-zone-ecology',
    src: '/demo/media/son-trang/ecology.webp',
    alt: 'Hình minh họa demo cho không gian Sinh thái tại Sơn Trang Cổ Đạm',
    width: 1774,
    height: 887,
  }),
  'Giải trí': createDemoAsset({
    id: 'son-trang-zone-recreation',
    src: '/demo/media/son-trang/recreation.webp',
    alt: 'Hình minh họa demo cho không gian Giải trí tại Sơn Trang Cổ Đạm',
    width: 1774,
    height: 887,
  }),
};

const sonTrangGallery = [
  createDemoAsset({
    id: 'son-trang-gallery-courtyard',
    src: '/demo/media/son-trang/gallery-courtyard.webp',
    alt: 'Hình minh họa demo về sân trong Sơn Trang Cổ Đạm',
    width: 1774,
    height: 887,
  }),
  createDemoAsset({
    id: 'son-trang-gallery-gate',
    src: '/demo/media/son-trang/gallery-gate.webp',
    alt: 'Hình minh họa demo về cổng và lối vào một khu vườn văn hóa Việt',
    width: 1536,
    height: 1024,
  }),
  createDemoAsset({
    id: 'son-trang-gallery-garden-path',
    src: '/demo/media/son-trang/gallery-garden-path.webp',
    alt: 'Hình minh họa demo về lối đi trong khu vườn văn hóa',
    width: 1536,
    height: 1024,
  }),
  createDemoAsset({
    id: 'son-trang-gallery-timber-detail',
    src: '/demo/media/son-trang/gallery-timber-detail.webp',
    alt: 'Hình minh họa demo về chi tiết kết cấu gỗ truyền thống',
    width: 1536,
    height: 1024,
  }),
  createDemoAsset({
    id: 'son-trang-gallery-craft-pavilion',
    src: '/demo/media/son-trang/gallery-craft-pavilion.webp',
    alt: 'Hình minh họa demo về bàn vật liệu thủ công trong một chòi vườn',
    width: 1536,
    height: 1024,
  }),
  createDemoAsset({
    id: 'son-trang-gallery-pond',
    src: '/demo/media/son-trang/gallery-pond.webp',
    alt: 'Hình minh họa demo về mặt nước và chòi vườn giữa không gian xanh',
    width: 1536,
    height: 1024,
  }),
  createDemoAsset({
    id: 'son-trang-gallery-after-rain',
    src: '/demo/media/son-trang/gallery-after-rain.webp',
    alt: 'Hình minh họa demo về sân vườn sau cơn mưa',
    width: 1536,
    height: 1024,
  }),
  createDemoAsset({
    id: 'son-trang-gallery-blue-hour',
    src: '/demo/media/son-trang/gallery-blue-hour.webp',
    alt: 'Hình minh họa demo về lối vườn lúc chạng vạng',
    width: 1536,
    height: 1024,
  }),
];

const thienCamHero = createLicensedAsset(
  {
    id: 'thien-cam-hero-real',
    src: '/demo/media/thien-cam/hero-real.webp',
    alt: 'Bãi biển Thiên Cầm trong buổi sớm',
    width: 1774,
    height: 998,
  },
  commonsSource('Thiencambeach.jpg', 'Khoitran1957', 'CC-BY-SA-4.0', 2816, 1584),
);

const dongLocHero = createLicensedAsset(
  {
    id: 'dong-loc-hero-real',
    src: '/demo/media/dong-loc/hero-real.webp',
    alt: 'Khu mộ 10 nữ thanh niên xung phong tại Ngã ba Đồng Lộc',
    width: 1774,
    height: 760,
  },
  commonsSource('Nga_Ba_Dong_Loc.jpg', 'Khoitran1957', 'CC-BY-SA-4.0', 3456, 1482),
);

export const DEMO_DESTINATION_MEDIA: Readonly<Record<string, DestinationMediaVm>> = {
  'son-trang-co-dam': {
    hero: sonTrangHero,
    gallery: sonTrangGallery,
  },
  'bien-thien-cam': {
    hero: thienCamHero,
    gallery: [
      createLicensedAsset(
        {
          id: 'thien-cam-gallery-thiencam4-real',
          src: '/demo/media/thien-cam/gallery-thiencam4-real.webp',
          alt: 'Bãi biển Thiên Cầm',
          width: 1600,
          height: 1200,
        },
        commonsSource('Thiencam4.jpg', 'P~viwiki', 'CC-BY-SA-3.0', 2560, 1920),
      ),
      createLicensedAsset(
        {
          id: 'thien-cam-gallery-gocbaibien-real',
          src: '/demo/media/thien-cam/gallery-gocbaibien-real.webp',
          alt: 'Một góc cuối bãi biển Thiên Cầm',
          width: 1774,
          height: 998,
        },
        commonsSource('Gocbaibien.jpg', 'Khoitran1957', 'CC-BY-SA-4.0', 2816, 1584),
      ),
      createDemoAsset({
        id: 'thien-cam-gallery-shore',
        src: '/demo/media/thien-cam/gallery-shore.webp',
        alt: 'Hình minh họa demo về bãi biển Thiên Cầm nhìn ra vịnh',
        width: 1774,
        height: 887,
      }),
      createDemoAsset({
        id: 'thien-cam-gallery-boardwalk',
        src: '/demo/media/thien-cam/gallery-boardwalk.webp',
        alt: 'Hình minh họa demo về lối dạo ven biển Thiên Cầm',
        width: 1774,
        height: 887,
      }),
      createDemoAsset({
        id: 'thien-cam-gallery-blue-hour',
        src: '/demo/media/thien-cam/gallery-blue-hour.webp',
        alt: 'Hình minh họa demo về Thiên Cầm lúc hoàng hôn',
        width: 1774,
        height: 887,
      }),
    ],
  },
  'khu-luu-niem-nguyen-du': {
    hero: createDemoAsset({
      id: 'nguyen-du-hero',
      src: '/demo/media/nguyen-du/hero.webp',
      alt: 'Hình minh họa demo về khu vườn tưởng niệm Nguyễn Du',
      width: 1672,
      height: 941,
    }),
    gallery: [
      createLicensedAsset(
        {
          id: 'nguyen-du-gallery-archival-church',
          src: '/demo/media/nguyen-du/gallery-archival-church.webp',
          alt: 'Ảnh lưu trữ nhà thờ cụ Nguyễn Du',
          width: 1774,
          height: 1069,
        },
        commonsSource(
          'Nhà_thờ_cụ_Nguyễn_Du.jpg',
          'Lê Thước; Phan Sĩ Bàng',
          'public-domain',
          3824,
          2304,
        ),
      ),
      createLicensedAsset(
        {
          id: 'nguyen-du-gallery-archival-tomb',
          src: '/demo/media/nguyen-du/gallery-archival-tomb.webp',
          alt: 'Ảnh lưu trữ mộ Nguyễn Du và học sinh trường Vinh',
          width: 1200,
          height: 1954,
        },
        commonsSource(
          'Tomb_of_Nguyễn_Du_and_students_from_Vinh_Middle_School.jpg',
          'Lê Thước; Phan Sĩ Bàng',
          'public-domain',
          2304,
          3751,
        ),
      ),
      createLicensedAsset(
        {
          id: 'nguyen-du-gallery-statue-real',
          src: '/demo/media/nguyen-du/gallery-statue-real.webp',
          alt: 'Tượng Đại thi hào Nguyễn Du',
          width: 960,
          height: 719,
        },
        commonsSource('Tượng_Đại_thi_hào_Nguyễn_Du.jpg', 'Long Phan ZZZ', 'CC-BY-SA-4.0', 960, 719),
      ),
      createDemoAsset({
        id: 'nguyen-du-gallery-garden',
        src: '/demo/media/nguyen-du/gallery-garden.webp',
        alt: 'Hình minh họa demo về khuôn viên xanh tại khu lưu niệm Nguyễn Du',
        width: 1536,
        height: 1024,
      }),
      createDemoAsset({
        id: 'nguyen-du-gallery-timber-house',
        src: '/demo/media/nguyen-du/gallery-timber-house.webp',
        alt: 'Hình minh họa demo về chi tiết nhà gỗ truyền thống tại khu lưu niệm Nguyễn Du',
        width: 1536,
        height: 1024,
      }),
      createDemoAsset({
        id: 'nguyen-du-gallery-reading-garden',
        src: '/demo/media/nguyen-du/gallery-reading-garden.webp',
        alt: 'Hình minh họa demo về không gian vườn đọc và tĩnh lặng tại khu lưu niệm Nguyễn Du',
        width: 1536,
        height: 1024,
      }),
    ],
  },
  'nga-ba-dong-loc': {
    hero: dongLocHero,
    gallery: [
      createLicensedAsset(
        {
          id: 'dong-loc-gallery-monument-real',
          src: '/demo/media/dong-loc/gallery-monument-real.webp',
          alt: 'Tượng đài tại khu tưởng niệm Ngã ba Đồng Lộc',
          width: 1774,
          height: 761,
        },
        commonsSource('Tượng_đài.jpg', 'Khoitran1957', 'CC-BY-SA-4.0', 3456, 1483),
      ),
      createLicensedAsset(
        {
          id: 'dong-loc-gallery-incense-real',
          src: '/demo/media/dong-loc/gallery-incense-real.webp',
          alt: 'Thắp hương tưởng niệm tại Ngã ba Đồng Lộc',
          width: 1536,
          height: 1152,
        },
        commonsSource(
          'Lighting_incense_at_the_Dong_Loc_Junction_memorial.jpg',
          'Newone',
          'CC-BY-SA-3.0',
          1632,
          1224,
        ),
      ),
      createDemoAsset({
        id: 'dong-loc-gallery-monument',
        src: '/demo/media/dong-loc/gallery-monument.webp',
        alt: 'Hình minh họa demo về không gian công trình tưởng niệm Đồng Lộc',
        width: 1536,
        height: 1024,
      }),
      createDemoAsset({
        id: 'dong-loc-gallery-path',
        src: '/demo/media/dong-loc/gallery-path.webp',
        alt: 'Hình minh họa demo về lối đi trong khu tưởng niệm Đồng Lộc',
        width: 1535,
        height: 1024,
      }),
      createDemoAsset({
        id: 'dong-loc-gallery-garden',
        src: '/demo/media/dong-loc/gallery-garden.webp',
        alt: 'Hình minh họa demo về vườn cây trong không gian tưởng niệm Đồng Lộc',
        width: 1536,
        height: 1024,
      }),
    ],
  },
};

export function getDemoDestinationMedia(slug: string): DestinationMediaVm | undefined {
  return DEMO_DESTINATION_MEDIA[slug];
}
