import { expect, test, type Page } from '@playwright/test';

const sonTrangManifest = {
  defaultSceneId: 'son-trang-gate',
  destination: {
    categoryId: null,
    categoryLabel: 'Di sản & văn hóa',
    coverImageUrl: null,
    coverMediaId: null,
    defaultSceneId: 'son-trang-gate',
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
      destinationId: 'son-trang-co-dam',
      id: 'son-trang-gate',
      initialFov: 88,
      initialHeading: 32,
      initialPitch: 0,
      lat: 18.3421,
      lng: 105.9032,
      name: 'Cổng Sơn Trang',
      panoramaAssetId: 'asset-son-trang-gate',
      panoramaAssetStatus: 'ready',
      panoramaManifestUrl: '/demo/360/son-trang-gate/manifest.json',
      panoramaPreviewUrl: '/demo/360/son-trang-gate/preview.webp',
      sortOrder: 0,
      status: 'published',
    },
  ],
  links: [],
  hotspots: [],
};

const missingMediaManifest = {
  ...sonTrangManifest,
  destination: {
    ...sonTrangManifest.destination,
    id: 'bien-thien-cam',
    name: 'Biển Thiên Cầm',
    slug: 'bien-thien-cam',
    defaultSceneId: 'thien-cam-gate',
  },
  defaultSceneId: 'thien-cam-gate',
  nodes: [
    {
      ...sonTrangManifest.nodes[0],
      destinationId: 'bien-thien-cam',
      id: 'thien-cam-gate',
      name: 'Lối dạo Thiên Cầm',
      panoramaManifestUrl: '/demo/360/thien-cam-gate/manifest.json',
    },
    {
      ...sonTrangManifest.nodes[0],
      destinationId: 'bien-thien-cam',
      id: 'thien-cam-missing',
      name: 'Cảnh chưa có media',
      panoramaAssetId: null,
      panoramaAssetStatus: null,
      panoramaManifestUrl: '/demo/360/thien-cam-missing/manifest.json',
      sortOrder: 1,
    },
  ],
  links: [
    {
      bidirectional: true,
      fromSceneId: 'thien-cam-gate',
      id: 'thien-cam-gate:missing',
      pitch: 0,
      sortOrder: 0,
      toSceneId: 'thien-cam-missing',
      yaw: 90,
    },
  ],
};

const SON_TRANG_TOUR_SCENE_IDS = [
  'son-trang-gate',
  'son-trang-entrance-path',
  'son-trang-courtyard',
  'son-trang-culture',
  'son-trang-ecology-path',
  'son-trang-ecology',
  'son-trang-spiritual-path',
  'son-trang-spiritual',
] as const;

async function mockManifest(page: Page) {
  await page.route('**/api/v1/destinations/son-trang-co-dam/immersive-manifest*', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(sonTrangManifest),
      status: 200,
    });
  });
}

test('walks the explicit Sơn Trang graph with one persistent viewer', async ({ page }) => {
  await mockManifest(page);

  for (const sceneId of SON_TRANG_TOUR_SCENE_IDS) {
    const manifestResponse = await page.request.get(
      `/demo/360/son-trang-tour/${sceneId}/manifest.json`,
    );
    expect(manifestResponse.ok()).toBe(true);
    const panoramaManifest = (await manifestResponse.json()) as {
      tileUrlTemplate: string;
      levels: Array<{ cols: number; rows: number }>;
    };

    for (const [levelIndex, level] of panoramaManifest.levels.entries()) {
      for (let row = 0; row < level.rows; row += 1) {
        for (let column = 0; column < level.cols; column += 1) {
          const tilePath = panoramaManifest.tileUrlTemplate
            .replace('{level}', String(levelIndex))
            .replace('{col}', String(column))
            .replace('{row}', String(row));
          const tileResponse = await page.request.get(
            `/demo/360/son-trang-tour/${sceneId}/${tilePath}`,
          );
          expect(tileResponse.ok()).toBe(true);
        }
      }
    }
  }

  await page.goto('/explore/son-trang-co-dam/immersive?mode=panorama&scene=son-trang-gate');

  const viewport = page.getByRole('application', { name: 'Không gian toàn cảnh 360 độ' });
  await expect(viewport).toHaveAttribute('data-renderer-status', 'ready');
  await expect(viewport).toHaveAttribute('data-e2e-panorama-mount-count', '1');
  await expect(viewport).toHaveAttribute('data-e2e-panorama-destroy-count', '0');

  const rail = page.getByRole('navigation', { name: 'Hành trình 360 Sơn Trang' });
  await expect(rail.getByRole('button')).toHaveCount(8);
  await expect(rail.getByRole('button', { name: 'Cổng Sơn Trang' })).toHaveAttribute(
    'aria-current',
    'step',
  );
  await expect(page).toHaveURL(/scene=son-trang-gate/);

  await page.getByRole('button', { name: 'Đi tới Lối vào Sơn Trang' }).click();
  await expect(page).toHaveURL(/scene=son-trang-entrance-path/);
  await expect(page.getByRole('heading', { name: 'Lối vào Sơn Trang' })).toBeVisible();

  await rail.getByRole('button', { name: 'Không gian Văn hóa' }).click();
  await expect(page).toHaveURL(/scene=son-trang-culture/);
  await expect(page.getByRole('heading', { name: 'Không gian Văn hóa' })).toBeVisible();

  await rail.getByRole('button', { name: 'Không gian Sinh thái' }).click();
  await expect(page).toHaveURL(/scene=son-trang-ecology/);
  await expect(page.getByRole('heading', { name: 'Không gian Sinh thái' })).toBeVisible();

  await rail.getByRole('button', { name: 'Không gian Tâm linh' }).click();
  await expect(page).toHaveURL(/scene=son-trang-spiritual/);
  await expect(page.getByRole('heading', { name: 'Không gian Tâm linh' })).toBeVisible();
  await expect(viewport).toHaveAttribute('data-e2e-panorama-mount-count', '1');
  await expect(viewport).toHaveAttribute('data-e2e-panorama-destroy-count', '0');
});

test('canonicalizes a missing-media deep link to the available scene without trapping the visitor', async ({
  page,
}) => {
  await page.route('**/api/v1/destinations/bien-thien-cam/immersive-manifest*', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(missingMediaManifest),
      status: 200,
    });
  });

  await page.goto('/explore/bien-thien-cam/immersive?mode=panorama&scene=thien-cam-missing');

  await expect(page.getByRole('heading', { name: 'Lối dạo Thiên Cầm' })).toBeVisible();
  await expect(page).toHaveURL(/scene=thien-cam-gate/);
  await expect(
    page.getByRole('application', { name: 'Không gian toàn cảnh 360 độ' }),
  ).toHaveAttribute('data-renderer-status', 'ready');

  await page.goto('/explore/bien-thien-cam/immersive?mode=panorama&scene=unknown-scene');
  await expect(page.getByRole('heading', { name: 'Lối dạo Thiên Cầm' })).toBeVisible();
  await expect(page).toHaveURL(/scene=thien-cam-gate/);
});
