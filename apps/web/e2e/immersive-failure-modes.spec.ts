import { expect, test, type Page, type Route } from '@playwright/test';

const manifestUrl = '**/api/v1/destinations/*/immersive-manifest*';
const firstSceneHeading = /^(?:Lối đi di sản 1|Cổng vào|Cổng Sơn Trang Cổ Đạm|Lối dạo Thiên Cầm)$/;

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

const thienCamManifest = {
  ...apiManifest,
  defaultSceneId: 'thien-cam-boardwalk',
  destination: {
    ...apiManifest.destination,
    id: 'thien-cam-beach',
    name: 'Biển Thiên Cầm',
    slug: 'bien-thien-cam',
    summary: 'Dải bờ biển Hà Tĩnh với hành trình 360°.',
    geoPoint: { latitude: 18.2771383, longitude: 106.098072 },
  },
  nodes: [
    {
      ...apiManifest.nodes[0],
      id: 'thien-cam-boardwalk',
      destinationId: 'thien-cam-beach',
      name: 'Lối dạo Thiên Cầm',
    },
    {
      ...apiManifest.nodes[1],
      id: 'thien-cam-shore',
      destinationId: 'thien-cam-beach',
      name: 'Bờ biển Thiên Cầm',
    },
  ],
  links: [
    {
      ...apiManifest.links[0],
      fromSceneId: 'thien-cam-boardwalk',
      toSceneId: 'thien-cam-shore',
    },
  ],
};

async function mockManifest(page: Page) {
  await page.route(manifestUrl, async (route: Route) => {
    const requestUrl = new URL(route.request().url());
    const response = requestUrl.pathname.includes('/bien-thien-cam/')
      ? thienCamManifest
      : apiManifest;
    await route.fulfill({
      body: JSON.stringify(response),
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

  await page.goto('/explore/son-trang-co-dam/immersive?mode=panorama&e2eFailure=manifest');

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

  await page.evaluate(() => {
    window.sessionStorage.removeItem('hatinh-e2e-failure');
    window.history.replaceState(null, '', '/explore/son-trang-co-dam?mode=overview3d');
  });
  await retry.click();

  await expect(page.getByRole('application', { name: 'Không gian bản đồ 3D' })).toHaveAttribute(
    'data-renderer-status',
    'ready',
  );
  await expect(page.locator('.immersive-renderer-state[role="alert"]')).toHaveCount(0);
});

test('keeps the current panorama usable when its tile manifest fails', async ({ page }) => {
  await mockManifest(page);
  await page.goto(
    '/explore/bien-thien-cam/immersive?mode=panorama&scene=thien-cam-boardwalk&e2eFailure=tile',
  );

  await expect(page.getByRole('heading', { name: firstSceneHeading })).toBeVisible();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Không thể tải ảnh toàn cảnh' }),
  ).toBeVisible();
});

test('restores the previous scene after a next-scene load failure', async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('hatinh-e2e-failure', 'next-scene');
  });
  await mockManifest(page);
  await page.goto(
    '/explore/bien-thien-cam/immersive?mode=panorama&scene=thien-cam-boardwalk&e2eFailure=next-scene',
  );
  await expect(page.getByRole('heading', { name: firstSceneHeading })).toBeVisible();
  await expect(
    page.getByRole('application', { name: 'Không gian toàn cảnh 360 độ' }),
  ).toHaveAttribute('data-renderer-status', 'ready');

  await page
    .getByRole('navigation', { name: /Hành trình 360|Danh sách cảnh quan/ })
    .getByRole('button')
    .nth(1)
    .click();

  await expect(page).toHaveURL(/scene=(?:thien-cam-boardwalk|scene-01|scene-02)/);
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
  await page.goto('/explore/bien-thien-cam/immersive?mode=panorama&scene=thien-cam-boardwalk');
  await expect(page.getByRole('heading', { name: firstSceneHeading })).toBeVisible();
  const panorama = page.getByRole('application', { name: 'Không gian toàn cảnh 360 độ' });
  await expect(panorama).toHaveAttribute('data-renderer-status', 'ready');

  await page.context().setOffline(true);

  await expect(page.getByRole('heading', { name: firstSceneHeading })).toBeVisible();
  await expect(panorama).toHaveAttribute('data-renderer-status', 'ready');
});
