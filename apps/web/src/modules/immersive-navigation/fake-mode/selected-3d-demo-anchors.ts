import type { Selected3DAnchor } from '../../map3d';

const SON_TRANG_DESTINATION_ID = 'son-trang-co-dam';

export const SON_TRANG_SELECTED_3D_ANCHORS = [
  {
    id: 'son-trang-gate',
    destinationId: SON_TRANG_DESTINATION_ID,
    label: 'Cổng Sơn Trang',
    shortLabel: 'Cổng',
    position: { lat: 18.3421, lng: 105.9032 },
    cameraPreset: {
      center: { lat: 18.3421, lng: 105.9032, altitude: 145 },
      heading: 32,
      tilt: 58,
      range: 520,
    },
    panoramaSceneId: 'son-trang-gate',
    verification: 'demo-unverified',
  },
  {
    id: 'son-trang-culture',
    destinationId: SON_TRANG_DESTINATION_ID,
    label: 'Không gian Văn hóa',
    shortLabel: 'Văn hóa',
    position: { lat: 18.34232, lng: 105.90348 },
    cameraPreset: {
      center: { lat: 18.34232, lng: 105.90348, altitude: 128 },
      heading: 118,
      tilt: 62,
      range: 390,
    },
    panoramaSceneId: null,
    verification: 'demo-unverified',
  },
  {
    id: 'son-trang-ecology',
    destinationId: SON_TRANG_DESTINATION_ID,
    label: 'Không gian Sinh thái',
    shortLabel: 'Sinh thái',
    position: { lat: 18.34192, lng: 105.90372 },
    cameraPreset: {
      center: { lat: 18.34192, lng: 105.90372, altitude: 132 },
      heading: 214,
      tilt: 60,
      range: 430,
    },
    panoramaSceneId: null,
    verification: 'demo-unverified',
  },
  {
    id: 'son-trang-spiritual',
    destinationId: SON_TRANG_DESTINATION_ID,
    label: 'Không gian Tâm linh',
    shortLabel: 'Tâm linh',
    position: { lat: 18.34246, lng: 105.90296 },
    cameraPreset: {
      center: { lat: 18.34246, lng: 105.90296, altitude: 138 },
      heading: 302,
      tilt: 59,
      range: 410,
    },
    panoramaSceneId: null,
    verification: 'demo-unverified',
  },
] as const satisfies readonly Selected3DAnchor[];

export function getDemoSelected3DAnchors(destinationSlug: string): readonly Selected3DAnchor[] {
  return destinationSlug === 'son-trang-co-dam' ? SON_TRANG_SELECTED_3D_ANCHORS : [];
}
