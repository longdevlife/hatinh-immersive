import type { DestinationPreviewVm } from '../../../shared/contracts';
import type { Map3DLocation } from '../../map3d';
import { getDemoDestinationMedia } from './demo-media';
import {
  buildDemoManifest,
  getDemoSceneDefinitions,
  type DemoSceneDefinition,
  type DemoTourBuildMode,
} from './demo-tour-catalog';
import type { ImmersiveManifestVm } from '../api/immersive-manifest.mapper';

interface DemoDestinationDefinition {
  location: Map3DLocation;
  preview: DestinationPreviewVm;
  scenes: readonly DemoSceneDefinition[];
}

function createDefinition({
  id,
  slug,
  name,
  summary,
  categoryLabel,
  position,
  cameraPreset,
  scenes,
}: {
  id: string;
  slug: string;
  name: string;
  summary: string;
  categoryLabel: string;
  position: Map3DLocation['position'];
  cameraPreset: Map3DLocation['cameraPreset'];
  scenes: readonly DemoSceneDefinition[];
}): DemoDestinationDefinition {
  const defaultSceneId = scenes[0]?.id ?? null;
  const location: Map3DLocation = { id, label: name, position, cameraPreset };
  const media = getDemoDestinationMedia(slug);

  return {
    location,
    preview: {
      id,
      slug,
      name,
      summary,
      coverImageUrl: media?.hero?.src ?? null,
      ...(media ? { media } : {}),
      categoryLabel,
      defaultSceneId,
      geoPoint: { latitude: position.lat, longitude: position.lng },
      cameraPreset,
    },
    scenes,
  };
}

export const DEMO_DESTINATIONS = [
  createDefinition({
    id: 'son-trang-co-dam',
    slug: 'son-trang-co-dam',
    name: 'Sơn Trang Cổ Đạm',
    summary: 'Một hành trình immersive qua văn hóa, thiên nhiên và những lớp ký ức địa phương.',
    categoryLabel: 'Di sản & văn hóa',
    position: { lat: 18.3421, lng: 105.9032 },
    cameraPreset: {
      center: { lat: 18.3421, lng: 105.9032, altitude: 420 },
      heading: 32,
      tilt: 48,
      range: 1_800,
    },
    scenes: getDemoSceneDefinitions('son-trang-co-dam'),
  }),
  createDefinition({
    id: 'thien-cam-beach',
    slug: 'bien-thien-cam',
    name: 'Biển Thiên Cầm',
    summary: 'Dải bờ biển Hà Tĩnh với hành trình 360° từ lối dạo ra sát mép nước.',
    categoryLabel: 'Biển & thiên nhiên',
    position: { lat: 18.2771383, lng: 106.098072 },
    cameraPreset: {
      center: { lat: 18.2771383, lng: 106.098072, altitude: 180 },
      heading: 32,
      tilt: 58,
      range: 1_250,
    },
    scenes: getDemoSceneDefinitions('bien-thien-cam'),
  }),
  createDefinition({
    id: 'nguyen-du-memorial',
    slug: 'khu-luu-niem-nguyen-du',
    name: 'Khu lưu niệm Nguyễn Du',
    summary: 'Không gian tưởng niệm Đại thi hào Nguyễn Du tại Nghi Xuân, Hà Tĩnh.',
    categoryLabel: 'Di sản & văn hóa',
    position: { lat: 18.6647657, lng: 105.7667208 },
    cameraPreset: {
      center: { lat: 18.6647657, lng: 105.7667208, altitude: 145 },
      heading: 118,
      tilt: 57,
      range: 900,
    },
    scenes: getDemoSceneDefinitions('khu-luu-niem-nguyen-du'),
  }),
  createDefinition({
    id: 'dong-loc-junction',
    slug: 'nga-ba-dong-loc',
    name: 'Ngã ba Đồng Lộc',
    summary: 'Điểm đến lịch sử gắn với ký ức thanh niên xung phong tại Hà Tĩnh.',
    categoryLabel: 'Lịch sử',
    position: { lat: 18.4022035, lng: 105.7395203 },
    cameraPreset: {
      center: { lat: 18.4022035, lng: 105.7395203, altitude: 160 },
      heading: 205,
      tilt: 58,
      range: 1_050,
    },
    scenes: getDemoSceneDefinitions('nga-ba-dong-loc'),
  }),
] as const satisfies readonly DemoDestinationDefinition[];

export function getDemoManifest(
  slug: string,
  mode: DemoTourBuildMode = 'public',
): ImmersiveManifestVm {
  const manifest = manifests.get(slug);
  if (!manifest) {
    throw new Error(`DEMO_DESTINATION_NOT_FOUND:${slug}`);
  }
  return buildDemoManifest(manifest.preview, mode);
}

const manifests = new Map(
  DEMO_DESTINATIONS.map((definition) => [definition.preview.slug, definition]),
);
