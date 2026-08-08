import { expect, test } from '@playwright/test';

const manifest = {
  defaultSceneId: 'scene-01',
  destination: {
    categoryId: null,
    categoryLabel: 'Di sản',
    coverImageUrl: null,
    coverMediaId: null,
    defaultSceneId: 'scene-01',
    description: 'Một hành trình di sản.',
    geoPoint: { latitude: 18.3421, longitude: 105.9032 },
    id: 'destination-01',
    name: 'Sơn Trang Cổ Đạm',
    slug: 'son-trang-co-dam',
    status: 'published',
    summary: 'Hành trình di sản ở Hà Tĩnh.',
  },
  nodes: [
    {
      altitude: 12,
      destinationId: 'destination-01',
      id: 'scene-01',
      initialFov: 90,
      initialHeading: 0,
      initialPitch: 0,
      lat: 18.3421,
      lng: 105.9032,
      name: 'Cổng vào',
      panoramaAssetId: 'asset-01',
      panoramaAssetStatus: 'ready',
      panoramaManifestUrl: 'https://media.example.vn/scene-01/manifest.json',
      panoramaPreviewUrl: 'https://media.example.vn/scene-01/preview.webp',
      sortOrder: 0,
      status: 'published',
    },
    {
      altitude: 12,
      destinationId: 'destination-01',
      id: 'scene-02',
      initialFov: 90,
      initialHeading: 30,
      initialPitch: 2,
      lat: 18.3424,
      lng: 105.9034,
      name: 'Sân trung tâm',
      panoramaAssetId: 'asset-02',
      panoramaAssetStatus: 'ready',
      panoramaManifestUrl: 'https://media.example.vn/scene-02/manifest.json',
      panoramaPreviewUrl: 'https://media.example.vn/scene-02/preview.webp',
      sortOrder: 1,
      status: 'published',
    },
  ],
  links: [
    {
      bidirectional: true,
      fromSceneId: 'scene-01',
      id: 'link-01-02',
      pitch: 0,
      sortOrder: 0,
      toSceneId: 'scene-02',
      yaw: 20,
    },
  ],
  hotspots: [],
};

test('loads the public journey through the manifest REST path', async ({ page }) => {
  let manifestRequestUrl = '';
  await page.route('**/api/v1/destinations/son-trang-co-dam/immersive-manifest*', async (route) => {
    manifestRequestUrl = route.request().url();
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(manifest),
      status: 200,
    });
  });

  await page.goto('/explore/son-trang-co-dam?mode=overview3d');
  await expect(page.getByRole('heading', { name: 'Sơn Trang Cổ Đạm' }).first()).toBeVisible();
  await expect(page.locator('[data-renderer-status="ready"]')).toBeVisible();
  expect(manifestRequestUrl).toContain('locale=vi');

  await page.getByRole('button', { name: 'Khám phá 360°' }).first().click();
  await expect(page.getByRole('heading', { name: 'Cổng vào' })).toBeVisible();

  await page.getByRole('button', { name: 'Đi tiếp' }).click();
  await expect(page.getByRole('heading', { name: 'Sân trung tâm' })).toBeVisible();
});
