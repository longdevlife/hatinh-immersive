import { inArray } from 'drizzle-orm';

import type { Db } from './db';
import { catalogDestinationTranslations, catalogDestinations } from './schema/catalog';
import { mediaAssets } from './schema/media';
import {
  virtualTourHotspots,
  virtualTourSceneLinks,
  virtualTourScenes,
} from './schema/virtual-tour';

export const DEMO_IMMERSIVE_ROUTE = {
  destinationId: '00000000-0000-4000-8000-000000000001',
  slug: 'son-trang-co-dam',
} as const;

const sceneNames = [
  'Cổng vào Sơn Trang',
  'Nhà trưng bày',
  'Sân trung tâm',
  'Vườn cây bản địa',
  'Bến nước cổ',
  'Đồi thông',
  'Đài quan sát',
  'Nhà cổ ven đồi',
  'Khu trải nghiệm',
  'Hồ sen',
  'Lối rừng',
  'Điểm kết nối toàn cảnh',
] as const;

export function buildDemoImmersiveRouteRecords(now = new Date()) {
  const timestamp = new Date(now);
  const sceneIds = sceneNames.map(
    (_, index) => `00000000-0000-4000-8200-${String(index + 1).padStart(12, '0')}`,
  );
  const media = sceneNames.map((_, index) => ({
    id: `00000000-0000-4000-8100-${String(index + 1).padStart(12, '0')}`,
    mediaKind: 'panorama' as const,
    originalFilename: 'manifest.json',
    contentType: 'application/json',
    sizeBytes: 1,
    storageKey: `processed/${DEMO_IMMERSIVE_ROUTE.slug}/scene-${String(index + 1).padStart(2, '0')}/manifest.json`,
    status: 'processing' as const,
    etag: `demo-panorama-${index + 1}`,
    failureCode: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    uploadedAt: null,
    readyAt: null,
  }));

  const scenes = sceneNames.map((name, index) => ({
    id: sceneIds[index]!,
    destinationId: DEMO_IMMERSIVE_ROUTE.destinationId,
    name,
    geoPoint: {
      latitude: 18.3421 + index * 0.00024,
      longitude: 105.9032 + (index % 4) * 0.00019,
    },
    altitude: 12 + (index % 3) * 4,
    panoramaAssetId: media[index]!.id,
    panoramaAssetStatus: 'processing' as const,
    initialHeading: (index * 31) % 360,
    initialPitch: 2 + (index % 3),
    initialFov: 88,
    status: 'published' as const,
    sortOrder: index,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));

  const linkPairs: ReadonlyArray<readonly [number, number]> = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 8],
    [8, 9],
    [9, 10],
    [10, 11],
    [2, 8],
    [5, 10],
  ];
  const links = linkPairs.map(([fromIndex, toIndex], index) => ({
    id: `00000000-0000-4000-8300-${String(index + 1).padStart(12, '0')}`,
    fromSceneId: sceneIds[fromIndex]!,
    toSceneId: sceneIds[toIndex]!,
    yaw: (index * 37) % 360,
    pitch: index % 2 === 0 ? 4 : -2,
    bidirectional: true,
    sortOrder: index,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));

  return {
    destination: {
      id: DEMO_IMMERSIVE_ROUTE.destinationId,
      slug: DEMO_IMMERSIVE_ROUTE.slug,
      status: 'published' as const,
      categoryId: null,
      geoPoint: { latitude: 18.3421, longitude: 105.9032 },
      defaultSceneId: sceneIds[0]!,
      coverMediaId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    translations: [
      {
        id: '00000000-0000-4000-8400-000000000001',
        destinationId: DEMO_IMMERSIVE_ROUTE.destinationId,
        locale: 'vi',
        name: 'Sơn Trang Cổ Đạm',
        summary: 'Hành trình di sản và thiên nhiên ở Hà Tĩnh.',
        description: 'Khám phá tuyến tham quan Sơn Trang Cổ Đạm qua bản đồ 3D và panorama 360.',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: '00000000-0000-4000-8400-000000000002',
        destinationId: DEMO_IMMERSIVE_ROUTE.destinationId,
        locale: 'en',
        name: 'Son Trang Co Dam',
        summary: 'A heritage and nature journey in Ha Tinh.',
        description:
          'Explore Son Trang Co Dam through a 3D map and a connected 360 panorama route.',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    mediaAssets: media,
    scenes,
    links,
    hotspots: [
      {
        id: '00000000-0000-4000-8500-000000000001',
        sceneId: sceneIds[0]!,
        type: 'information' as const,
        yaw: 32,
        pitch: -3,
        payload: { title: 'Câu chuyện Sơn Trang', body: 'Một điểm dừng mở đầu hành trình.' },
        status: 'published' as const,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: '00000000-0000-4000-8500-000000000002',
        sceneId: sceneIds[3]!,
        type: 'media' as const,
        yaw: 148,
        pitch: 2,
        payload: { title: 'Bộ sưu tập vườn cây', mediaKind: 'image' },
        status: 'published' as const,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: '00000000-0000-4000-8500-000000000003',
        sceneId: sceneIds[6]!,
        type: 'audio' as const,
        yaw: 244,
        pitch: 0,
        payload: { title: 'Thuyết minh đài quan sát', durationSeconds: 42 },
        status: 'published' as const,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
  };
}

export async function seedDemoImmersiveRoute(db: Db): Promise<void> {
  const route = buildDemoImmersiveRouteRecords();

  await db.transaction(async (transaction) => {
    await transaction
      .insert(catalogDestinations)
      .values(route.destination)
      .onConflictDoUpdate({
        target: catalogDestinations.id,
        set: {
          slug: route.destination.slug,
          status: route.destination.status,
          geoPoint: route.destination.geoPoint,
          defaultSceneId: route.destination.defaultSceneId,
          updatedAt: route.destination.updatedAt,
        },
      });

    await transaction.delete(catalogDestinationTranslations).where(
      inArray(
        catalogDestinationTranslations.id,
        route.translations.map((item) => item.id),
      ),
    );
    await transaction.insert(catalogDestinationTranslations).values(route.translations);

    for (const asset of route.mediaAssets) {
      await transaction
        .insert(mediaAssets)
        .values(asset)
        .onConflictDoUpdate({
          target: mediaAssets.id,
          set: {
            mediaKind: asset.mediaKind,
            originalFilename: asset.originalFilename,
            contentType: asset.contentType,
            sizeBytes: asset.sizeBytes,
            storageKey: asset.storageKey,
            status: asset.status,
            etag: asset.etag,
            failureCode: asset.failureCode,
            updatedAt: asset.updatedAt,
            uploadedAt: asset.uploadedAt,
            readyAt: asset.readyAt,
          },
        });
    }

    for (const scene of route.scenes) {
      await transaction
        .insert(virtualTourScenes)
        .values(scene)
        .onConflictDoUpdate({
          target: virtualTourScenes.id,
          set: {
            destinationId: scene.destinationId,
            name: scene.name,
            geoPoint: scene.geoPoint,
            altitude: scene.altitude,
            panoramaAssetId: scene.panoramaAssetId,
            panoramaAssetStatus: scene.panoramaAssetStatus,
            initialHeading: scene.initialHeading,
            initialPitch: scene.initialPitch,
            initialFov: scene.initialFov,
            status: scene.status,
            sortOrder: scene.sortOrder,
            updatedAt: scene.updatedAt,
          },
        });
    }

    await transaction.delete(virtualTourSceneLinks).where(
      inArray(
        virtualTourSceneLinks.id,
        route.links.map((link) => link.id),
      ),
    );
    for (const link of route.links) {
      await transaction
        .insert(virtualTourSceneLinks)
        .values(link)
        .onConflictDoUpdate({
          target: virtualTourSceneLinks.id,
          set: {
            fromSceneId: link.fromSceneId,
            toSceneId: link.toSceneId,
            yaw: link.yaw,
            pitch: link.pitch,
            bidirectional: link.bidirectional,
            sortOrder: link.sortOrder,
            updatedAt: link.updatedAt,
          },
        });
    }

    await transaction.delete(virtualTourHotspots).where(
      inArray(
        virtualTourHotspots.id,
        route.hotspots.map((hotspot) => hotspot.id),
      ),
    );
    for (const hotspot of route.hotspots) {
      await transaction
        .insert(virtualTourHotspots)
        .values(hotspot)
        .onConflictDoUpdate({
          target: virtualTourHotspots.id,
          set: {
            sceneId: hotspot.sceneId,
            type: hotspot.type,
            yaw: hotspot.yaw,
            pitch: hotspot.pitch,
            payload: hotspot.payload,
            status: hotspot.status,
            updatedAt: hotspot.updatedAt,
          },
        });
    }
  });
}
