import { expect, test } from '@playwright/test';

const cameraPreset = (lat: number, lng: number, heading = 0) => ({
  center: { lat, lng, altitude: 150 },
  heading,
  tilt: 55,
  range: 1_000,
});

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
    cameraPreset: cameraPreset(18.3421, 105.9032, 24),
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

test('connects Sơn Trang detail to linked panorama scene and returns to the destination', async ({
  page,
}) => {
  await page.route(/\/api\/v1\/destinations(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([
        {
          categoryLabel: manifest.destination.categoryLabel,
          coverImageUrl: manifest.destination.coverImageUrl,
          defaultSceneId: manifest.destination.defaultSceneId,
          geoPoint: manifest.destination.geoPoint,
          id: manifest.destination.id,
          name: manifest.destination.name,
          slug: manifest.destination.slug,
          summary: manifest.destination.summary,
        },
      ]),
      status: 200,
    });
  });
  await page.route('**/api/v1/destinations/son-trang-co-dam/immersive-manifest*', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(manifest),
      status: 200,
    });
  });

  await page.goto('/explore');
  await page.getByRole('button', { name: `Chọn điểm đến ${manifest.destination.name}` }).click();
  await page.getByRole('button', { name: 'Xem chi tiết' }).click();

  await expect(page).toHaveURL(
    '/explore/son-trang-co-dam?returnTo=%2Fexplore%3Fdestination%3Dson-trang-co-dam',
  );
  const sonTrangDetail = page.getByRole('main', { name: 'Trải nghiệm Sơn Trang Cổ Đạm' });
  await expect(sonTrangDetail).toBeVisible();
  await expect(
    sonTrangDetail.getByRole('heading', { name: manifest.destination.name }).first(),
  ).toBeVisible();
  await expect(page.locator('[data-renderer-status]')).toHaveCount(0);

  await page.getByRole('button', { name: 'Khám phá 360°' }).click();

  await expect(page).toHaveURL(
    /\/explore\/son-trang-co-dam\/immersive\?mode=panorama&location=destination-01&scene=scene-01/,
  );
  await expect(page.getByRole('heading', { name: 'Cổng vào' })).toBeVisible();

  const sceneBrowser = page.getByRole('navigation', { name: 'Danh sách cảnh quan' });
  await expect(sceneBrowser.getByRole('button', { name: 'Cổng vào' })).toHaveAttribute(
    'aria-current',
    'step',
  );
  await sceneBrowser.getByRole('button', { name: 'Sân trung tâm' }).click();
  await expect(page.getByRole('heading', { name: 'Sân trung tâm' })).toBeVisible();
  await expect(page).toHaveURL(/scene=scene-02/);

  const returnLabel = `Quay lại ${manifest.destination.name}`;
  await page.getByRole('button', { name: returnLabel }).click();

  await expect(page).toHaveURL('/explore/son-trang-co-dam');
  await expect(page.getByRole('main', { name: 'Trải nghiệm Sơn Trang Cổ Đạm' })).toBeVisible();
  await expect(
    sonTrangDetail.getByRole('heading', { name: manifest.destination.name }).first(),
  ).toBeVisible();
  await expect(page.locator('[data-renderer-status]')).toHaveCount(0);
  await expect(page.locator('[data-testid="immersive-renderer-slot"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="immersive-renderer-slot"]')).toHaveCount(0);
});

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

  await page
    .getByRole('navigation', { name: 'Danh sách cảnh quan' })
    .getByRole('button')
    .nth(1)
    .click();
  await expect(page.getByRole('heading', { name: 'Sân trung tâm' })).toBeVisible();
});

test('keeps selected 3D scoped to its destination before round-tripping through 360', async ({
  page,
}) => {
  await page.route(/\/api\/v1\/destinations(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([
        {
          categoryLabel: manifest.destination.categoryLabel,
          coverImageUrl: manifest.destination.coverImageUrl,
          defaultSceneId: manifest.destination.defaultSceneId,
          geoPoint: manifest.destination.geoPoint,
          id: manifest.destination.id,
          name: manifest.destination.name,
          slug: manifest.destination.slug,
          summary: manifest.destination.summary,
        },
      ]),
      status: 200,
    });
  });
  await page.route('**/api/v1/destinations/son-trang-co-dam/immersive-manifest*', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(manifest) });
  });

  await page.goto('/explore/son-trang-co-dam?mode=overview3d');
  const renderer = page.getByRole('application', { name: 'Không gian bản đồ 3D' });
  await expect(renderer).toBeVisible();
  await renderer.evaluate((element) => {
    element.setAttribute('data-e2e-renderer-instance', 'initial');
  });
  const initialMountCount = await renderer.getAttribute('data-e2e-map3d-mount-count');
  expect(Number(initialMountCount)).toBeGreaterThan(0);

  await expect(page.getByRole('button', { name: 'Tìm kiếm địa điểm' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: manifest.destination.name })).toBeVisible();
  await expect(renderer).toHaveAttribute('data-e2e-map3d-mount-count', initialMountCount!);
  await expect(renderer).toHaveAttribute('data-e2e-map3d-destroy-count', '0');

  await page.getByRole('button', { name: 'Khám phá 360°' }).click();
  await expect(page).toHaveURL(
    /\/explore\/son-trang-co-dam\/immersive\?mode=panorama&location=son-trang-gate&scene=scene-01&h=0&p=0&fov=90$/,
  );
  await expect(page.getByRole('heading', { name: 'Cổng vào' })).toBeVisible();

  await page.getByRole('button', { name: `Quay lại ${manifest.destination.name}` }).click();
  await expect(page).toHaveURL(/\/explore\/son-trang-co-dam$/);
  await expect(page.getByRole('main', { name: 'Trải nghiệm Sơn Trang Cổ Đạm' })).toBeVisible();
  await expect(page.getByRole('heading', { name: manifest.destination.name })).toBeVisible();
  await expect(page.locator('[data-testid="immersive-renderer-slot"]')).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole('main', { name: 'Trải nghiệm Sơn Trang Cổ Đạm' })).toBeVisible();
  await expect(page.getByRole('heading', { name: manifest.destination.name })).toBeVisible();
  await expect(page).toHaveURL(/\/explore\/son-trang-co-dam$/);
});
