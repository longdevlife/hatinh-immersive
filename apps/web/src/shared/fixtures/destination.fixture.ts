import type { DestinationPreviewVm } from '../contracts';

export const destinationFixture = {
  id: 'destination-son-trang-co-dam',
  slug: 'son-trang-co-dam',
  name: 'Sơn Trang Cổ Đạm',
  summary: 'Một hành trình immersive qua văn hóa, thiên nhiên và những lớp ký ức địa phương.',
  coverImageUrl: 'https://cdn.example.vn/hatinh/son-trang/cover.webp',
  categoryLabel: 'Di sản & văn hóa',
  defaultSceneId: 'scene-01',
  geoPoint: { latitude: 18.3421, longitude: 105.9032 },
} satisfies DestinationPreviewVm;
