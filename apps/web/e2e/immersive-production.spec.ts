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

const destinationB = {
  categoryLabel: 'Thiên nhiên',
  coverImageUrl: null,
  defaultSceneId: 'scene-b',
  geoPoint: { latitude: 18.268, longitude: 106.105 },
  cameraPreset: cameraPreset(18.268, 106.105, 32),
  id: 'destination-b',
  name: 'Biển Thiên Cầm',
  slug: 'bien-thien-cam',
  summary: 'Không gian biển phía đông Hà Tĩnh.',
};

const manifestB = {
  ...manifest,
  defaultSceneId: destinationB.defaultSceneId,
  destination: {
    ...manifest.destination,
    ...destinationB,
    description: destinationB.summary,
  },
  nodes: [
    {
      ...manifest.nodes[0],
      destinationId: destinationB.id,
      id: destinationB.defaultSceneId,
      lat: destinationB.geoPoint.latitude,
      lng: destinationB.geoPoint.longitude,
      name: 'Toàn cảnh Thiên Cầm',
    },
  ],
  links: [],
};

const destinationC = {
  categoryLabel: 'Văn hóa',
  coverImageUrl: null,
  defaultSceneId: 'scene-c',
  geoPoint: { latitude: 18.5, longitude: 106 },
  cameraPreset: cameraPreset(18.5, 106, 180),
  id: 'destination-c',
  name: 'Thành cổ Hà Tĩnh',
  slug: 'thanh-co-ha-tinh',
  summary: 'Một lớp ký ức đô thị của Hà Tĩnh.',
};

const manifestC = {
  ...manifestB,
  defaultSceneId: destinationC.defaultSceneId,
  destination: {
    ...manifestB.destination,
    ...destinationC,
    description: destinationC.summary,
  },
  nodes: [
    {
      ...manifestB.nodes[0],
      destinationId: destinationC.id,
      id: destinationC.defaultSceneId,
      lat: destinationC.geoPoint.latitude,
      lng: destinationC.geoPoint.longitude,
      name: 'Toàn cảnh Thành cổ',
    },
  ],
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

  await page
    .getByRole('navigation', { name: 'Danh sách cảnh quan' })
    .getByRole('button')
    .nth(1)
    .click();
  await expect(page.getByRole('heading', { name: 'Sân trung tâm' })).toBeVisible();
});

test('keeps one 3D world while selecting a destination and round-tripping through 360', async ({
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
        destinationB,
        destinationC,
      ]),
      status: 200,
    });
  });
  await page.route('**/api/v1/destinations/son-trang-co-dam/immersive-manifest*', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(manifest) });
  });
  await page.route('**/api/v1/destinations/bien-thien-cam/immersive-manifest*', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(manifestB) });
  });
  await page.route('**/api/v1/destinations/thanh-co-ha-tinh/immersive-manifest*', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(manifestC) });
  });

  await page.goto('/explore/son-trang-co-dam?mode=overview3d');
  const renderer = page.getByRole('application', { name: 'Không gian bản đồ 3D' });
  await expect(renderer).toBeVisible();
  await renderer.evaluate((element) => {
    element.setAttribute('data-e2e-renderer-instance', 'initial');
  });
  const initialMountCount = await renderer.getAttribute('data-e2e-map3d-mount-count');
  expect(Number(initialMountCount)).toBeGreaterThan(0);

  await page.getByRole('button', { name: 'Tìm kiếm địa điểm' }).click();
  await page.getByRole('searchbox', { name: 'Tìm kiếm địa điểm' }).fill('Thiên Cầm');
  await page.getByRole('option', { name: destinationB.name }).click();

  await expect(page.getByRole('heading', { name: destinationB.name })).toBeVisible();
  await expect(renderer).toHaveAttribute('data-e2e-renderer-instance', 'initial');
  await expect(renderer).toHaveAttribute('data-e2e-map3d-mount-count', initialMountCount!);
  await expect(renderer).toHaveAttribute('data-e2e-map3d-destroy-count', '0');
  await expect(renderer).toHaveAttribute('data-e2e-map3d-last-lat', '18.268');
  await expect(renderer).toHaveAttribute('data-e2e-map3d-last-lng', '106.105');
  await expect(page).toHaveURL(
    /\/explore\/son-trang-co-dam\?mode=overview3d&location=destination-b$/,
  );

  await page.getByRole('button', { name: 'Tìm kiếm địa điểm' }).click();
  await page.getByRole('searchbox', { name: 'Tìm kiếm địa điểm' }).fill('Thành cổ');
  await page.getByRole('option', { name: destinationC.name }).click();

  await expect(page.getByRole('heading', { name: destinationC.name })).toBeVisible();
  await expect(renderer).toHaveAttribute('data-e2e-map3d-mount-count', initialMountCount!);
  await expect(renderer).toHaveAttribute('data-e2e-map3d-destroy-count', '0');
  await expect(renderer).toHaveAttribute('data-e2e-map3d-last-lat', '18.5');
  await expect(renderer).toHaveAttribute('data-e2e-map3d-last-lng', '106');

  await page.getByRole('button', { name: 'Khám phá 360°' }).click();
  await expect(page).toHaveURL(
    /\/explore\/thanh-co-ha-tinh\?mode=panorama&location=destination-c&scene=scene-c&h=0&p=0&fov=90$/,
  );
  await expect(page.getByRole('heading', { name: 'Toàn cảnh Thành cổ' })).toBeVisible();

  await page.getByRole('button', { name: 'Quay lại không gian 3D' }).click();
  await expect(page).toHaveURL(
    /\/explore\/thanh-co-ha-tinh\?mode=overview3d&location=destination-c$/,
  );
  await expect(page.getByRole('heading', { name: destinationC.name })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: destinationC.name })).toBeVisible();
  await expect(page).toHaveURL(
    /\/explore\/thanh-co-ha-tinh\?mode=overview3d&location=destination-c$/,
  );
});
