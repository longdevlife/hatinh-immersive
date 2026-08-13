import { expect, test } from '@playwright/test';

test('public API destination runtime receives explicit demo local anchors', async ({ page }) => {
  const manifest = {
    defaultSceneId: null,
    destination: {
      categoryId: null,
      categoryLabel: 'Di sản',
      coverImageUrl: null,
      coverMediaId: null,
      defaultSceneId: null,
      description: 'Một hành trình di sản.',
      geoPoint: { latitude: 18.3421, longitude: 105.9032 },
      cameraPreset: {
        center: { lat: 18.3421, lng: 105.9032, altitude: 420 },
        heading: 32,
        tilt: 48,
        range: 1_800,
      },
      id: 'destination-01',
      name: 'Sơn Trang Cổ Đạm',
      slug: 'son-trang-co-dam',
      status: 'published',
      summary: 'Hành trình di sản ở Hà Tĩnh.',
    },
    nodes: [],
    panoramaNodes: [],
    links: [],
    hotspots: [],
  };

  await page.route('**/api/v1/destinations/son-trang-co-dam/immersive-manifest*', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(manifest) });
  });

  await page.goto('/explore/son-trang-co-dam/immersive?mode=overview3d');

  const renderer = page.getByRole('application', { name: 'Không gian bản đồ 3D' });
  await expect(renderer).toHaveAttribute('data-renderer-status', 'ready');
  const viewpoints = page.getByRole('navigation', { name: 'Các góc nhìn 3D' });
  await expect(viewpoints.getByRole('button', { name: 'Cổng', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(viewpoints.getByRole('button', { name: 'Văn hóa', exact: true })).toBeVisible();
  await expect(viewpoints.getByRole('button', { name: 'Sinh thái', exact: true })).toBeVisible();
  await expect(viewpoints.getByRole('button', { name: 'Tâm linh', exact: true })).toBeVisible();
  await expect(renderer).toHaveAttribute('data-e2e-map3d-mount-count', '1');

  for (const [name, location, lat, lng] of [
    ['Văn hóa', 'son-trang-culture', '18.34232', '105.90348'],
    ['Sinh thái', 'son-trang-ecology', '18.34192', '105.90372'],
    ['Tâm linh', 'son-trang-spiritual', '18.34246', '105.90296'],
  ] as const) {
    await viewpoints.getByRole('button', { name, exact: true }).click();
    await expect(viewpoints.getByRole('button', { name, exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page).toHaveURL(new RegExp(`location=${location}`));
    await expect(renderer).toHaveAttribute('data-e2e-map3d-last-lat', lat);
    await expect(renderer).toHaveAttribute('data-e2e-map3d-last-lng', lng);
  }

  await expect(renderer).toHaveAttribute('data-e2e-map3d-mount-count', '1');
  await expect(renderer).toHaveAttribute('data-e2e-map3d-destroy-count', '0');
});
