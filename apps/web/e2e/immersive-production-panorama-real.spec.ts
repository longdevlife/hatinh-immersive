import { expect, test } from '@playwright/test';

const lowResolutionPublicManifest = {
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
      destinationId: 'son-trang-co-dam',
      id: 'son-trang-culture',
      initialFov: 88,
      initialHeading: 32,
      initialPitch: 0,
      lat: 18.3421,
      lng: 105.9032,
      name: 'Không gian Văn hóa',
      panoramaAssetId: 'asset-son-trang-culture',
      panoramaAssetStatus: 'ready',
      panoramaManifestUrl: '/demo/360/son-trang-tour/son-trang-culture/manifest.json',
      panoramaPreviewUrl: '/demo/360/son-trang-tour/son-trang-culture/preview.webp',
      sortOrder: 0,
      status: 'published',
    },
  ],
  links: [],
  hotspots: [],
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

  const viewport = page.getByRole('application', { name: 'Không gian toàn cảnh 360 độ' });
  await expect(page.getByRole('region', { name: 'Media dock trải nghiệm' })).toBeVisible();
  await expect(viewport).toHaveAttribute('data-renderer-status', 'error');
  await expect(
    page.getByRole('region', { name: 'Các công cụ tiện ích' }).getByRole('alert'),
  ).toContainText('Không thể tải dữ liệu cảnh 360°');
  await expect(page.getByRole('heading', { name: 'Không gian Văn hóa' })).toBeVisible();
  await expect(page).toHaveURL(/scene=son-trang-culture/);
  await expect(
    page.getByRole('navigation', { name: 'Hành trình 360 Sơn Trang Cổ Đạm' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Quay lại thế giới 3D' })).toBeVisible();
  expect(manifestRequestCount).toBeGreaterThan(0);

  await expect(page.locator('[data-e2e-panorama-mount-count]')).toHaveAttribute(
    'data-e2e-panorama-mount-count',
    '1',
  );
  await expect(page.locator('[data-e2e-panorama-destroy-count]')).toHaveAttribute(
    'data-e2e-panorama-destroy-count',
    '0',
  );
});
