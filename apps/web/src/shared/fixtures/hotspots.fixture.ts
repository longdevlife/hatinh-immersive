import type { HotspotVm } from '../contracts';

export const hotspotsFixture = [
  { id: 'hotspot-story', type: 'information', yaw: 32, pitch: -4, label: 'Câu chuyện địa danh' },
  { id: 'hotspot-gallery', type: 'media', yaw: 114, pitch: 2, label: 'Bộ sưu tập hình ảnh' },
  { id: 'hotspot-narration', type: 'audio', yaw: 198, pitch: -6, label: 'Nghe thuyết minh' },
  { id: 'hotspot-ritual', type: 'information', yaw: 255, pitch: 1, label: 'Nghi lễ và ký ức' },
  { id: 'hotspot-reference', type: 'external', yaw: 318, pitch: 3, label: 'Tìm hiểu thêm' },
] satisfies HotspotVm[];
