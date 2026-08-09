import { expect, test, type Page, type Route } from '@playwright/test';

const manifestUrl = '**/api/v1/destinations/son-trang-co-dam/immersive-manifest*';
const firstSceneHeading = /^(?:Lối đi di sản 1|Cổng vào)$/;

const apiManifest = {
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

async function mockManifest(page: Page) {
  await page.route(manifestUrl, async (route: Route) => {
    await route.fulfill({
      body: JSON.stringify(apiManifest),
      contentType: 'application/json',
      status: 200,
    });
  });
}

test('keeps a usable fallback when the manifest request fails', async ({ page }) => {
  await page.route(manifestUrl, async (route) => {
    await route.fulfill({
      body: JSON.stringify({ title: 'manifest unavailable' }),
      contentType: 'application/problem+json',
      status: 503,
    });
  });

  await page.goto('/explore/son-trang-co-dam?e2eFailure=manifest');

  await expect(page.getByRole('alert')).toContainText('Không thể tải dữ liệu hành trình');
});

test('keeps a fallback action when the 3D renderer fails', async ({ page }) => {
  await mockManifest(page);
  await page.goto('/explore/son-trang-co-dam?mode=overview3d&e2eFailure=map3d');

  await expect(page.locator('.immersive-renderer-state[role="alert"]')).toContainText(
    'Không thể mở không gian 3D',
  );
  const retry = page.getByRole('button', { name: 'Thử lại' });
  await expect(retry).toBeVisible();

  await retry.click();

  await expect(page.locator('.immersive-renderer-state[role="alert"]')).toContainText(
    'Không thể mở không gian 3D',
  );
  await expect(retry).toBeVisible();
});

test('keeps the current panorama usable when its tile manifest fails', async ({ page }) => {
  await mockManifest(page);
  await page.goto('/explore/son-trang-co-dam?mode=panorama&scene=scene-01&e2eFailure=tile');

  await expect(page.getByRole('heading', { name: firstSceneHeading })).toBeVisible();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Không thể tải ảnh toàn cảnh' }),
  ).toBeVisible();
});

test('restores the previous scene after a next-scene load failure', async ({ page }) => {
  await mockManifest(page);
  await page.goto('/explore/son-trang-co-dam?mode=panorama&scene=scene-01&e2eFailure=next-scene');
  await expect(page.getByRole('heading', { name: firstSceneHeading })).toBeVisible();

  await page.getByRole('button', { name: 'Đi tiếp' }).click();

  await expect(page).toHaveURL(/scene=scene-01/);
  await expect(page.getByRole('heading', { name: firstSceneHeading })).toBeVisible();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Không thể tải ảnh toàn cảnh' }),
  ).toHaveCount(0);
});

test('surfaces constrained network quality without disrupting the journey', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { effectiveType: '2g', addEventListener() {}, removeEventListener() {} },
    });
  });
  await mockManifest(page);
  await page.goto('/explore/son-trang-co-dam?mode=overview3d');

  await expect(page.getByText('Kết nối yếu')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sơn Trang Cổ Đạm' }).first()).toBeVisible();
});

test('preserves the current scene when the browser goes offline', async ({ page }) => {
  await mockManifest(page);
  await page.goto('/explore/son-trang-co-dam?mode=panorama&scene=scene-01');
  await expect(page.getByRole('heading', { name: firstSceneHeading })).toBeVisible();

  await page.context().setOffline(true);

  await expect(page.getByText('Ngoại tuyến')).toBeVisible();
  await expect(page.getByRole('heading', { name: firstSceneHeading })).toBeVisible();
});
