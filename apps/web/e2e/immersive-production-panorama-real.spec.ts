import { expect, test } from '@playwright/test';

const lowResolutionPublicManifest = {
  ambientTrackId: null,
  audioTracks: [],
  defaultSceneId: 'son-trang-culture',
  destination: {
    categoryId: null,
    categoryLabel: 'Di sản & văn hóa',
    coverImageUrl: null,
    coverMediaId: null,
    defaultSceneId: 'son-trang-culture',
    description: 'Một hành trình di sản.',
    geoPoint: { latitude: 18.3421, longitude: 105.9032 },
    cameraPreset: {
      center: { lat: 18.3421, lng: 105.9032, altitude: 145 },
      heading: 32,
      tilt: 58,
      range: 520,
    },
    id: 'son-trang-co-dam',
    name: 'Sơn Trang Cổ Đạm',
    slug: 'son-trang-co-dam',
    status: 'published',
    summary: 'Hành trình di sản ở Hà Tĩnh.',
  },
  nodes: [
    {
      altitude: 12,
      ambientOverrideTrackId: null,
      destinationId: 'son-trang-co-dam',
      id: 'son-trang-culture',
      initialFov: 88,
      initialHeading: 32,
      initialPitch: 0,
      lat: 18.3421,
      lng: 105.9032,
      name: 'Không gian Văn hóa',
      narrationTrackIds: { en: null, vi: null },
      panoramaAssetId: 'asset-son-trang-culture',
      panoramaAssetStatus: 'ready',
      panoramaManifestUrl: '/demo/360/son-trang-tour/son-trang-culture/manifest.json',
      panoramaPreviewUrl: '/demo/360/son-trang-tour/son-trang-culture/preview.webp',
      sortOrder: 0,
      status: 'published',
      transcriptIds: { en: null, vi: null },
    },
  ],
  links: [],
  hotspots: [],
  transcripts: [],
};

test('rejects a low-resolution public panorama before real PSV renders it', async ({ page }) => {
  let manifestRequestCount = 0;
  await page.route('**/api/v1/destinations/son-trang-co-dam/immersive-manifest*', async (route) => {
    manifestRequestCount += 1;
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(lowResolutionPublicManifest),
      status: 200,
    });
  });

  await page.goto(
    '/explore/son-trang-co-dam/immersive?mode=panorama&location=son-trang-co-dam&scene=son-trang-culture&h=228.165&p=-39.233&fov=88.801',
  );

  await expect(page.getByRole('heading', { name: '360° đang được cập nhật' })).toBeVisible();
  await expect(page.getByText('Hình ảnh độ phân giải cao đang được chuẩn bị.')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Media dock trải nghiệm' })).toHaveCount(0);
  await expect(
    page.getByRole('navigation', { name: 'Hành trình 360 Sơn Trang Cổ Đạm' }),
  ).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Bản đồ tuyến tham quan' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Quay lại Sơn Trang Cổ Đạm' })).toBeVisible();
  await expect(page.locator('[data-renderer-status]')).toHaveCount(0);
  expect(manifestRequestCount).toBeGreaterThan(0);
});
