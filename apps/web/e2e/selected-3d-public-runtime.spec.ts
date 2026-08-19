import { expect, test } from '@playwright/test';

test('public API destination runtime receives explicit demo local anchors', async ({ page }) => {
  const manifest = {
    ambientTrackId: null,
    audioTracks: [],
    defaultSceneId: 'son-trang-gate',
    destination: {
      categoryId: null,
      categoryLabel: 'Di sản',
      coverImageUrl: null,
      coverMediaId: null,
      defaultSceneId: 'son-trang-gate',
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
    nodes: [
      {
        altitude: 12,
        ambientOverrideTrackId: null,
        destinationId: 'destination-01',
        id: 'son-trang-gate',
        initialFov: 90,
        initialHeading: 0,
        initialPitch: 0,
        lat: 18.3421,
        lng: 105.9032,
        name: 'Cổng Sơn Trang',
        narrationTrackIds: { en: null, vi: null },
        panoramaAssetId: 'asset-01',
        panoramaAssetStatus: 'ready',
        panoramaManifestUrl: '/demo/360/son-trang-gate/manifest.json',
        panoramaPreviewUrl: '/demo/360/son-trang-gate/preview.webp',
        sortOrder: 0,
        status: 'published',
        transcriptIds: { en: null, vi: null },
      },
    ],
    panoramaNodes: [],
    links: [],
    hotspots: [],
    transcripts: [],
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
  await expect(page.getByRole('button', { name: 'Khám phá 360°' })).toHaveCount(0);
  await expect(viewpoints.getByRole('button', { name: 'Mở 360° cho Cổng' })).toBeVisible();
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
    await expect(page.getByRole('button', { name: 'Khám phá 360°' })).toHaveCount(0);
    await expect(viewpoints.getByRole('button', { name: `Mở 360° cho ${name}` })).toHaveCount(0);
  }

  await viewpoints.getByRole('button', { name: 'Cổng', exact: true }).click();
  await expect(viewpoints.getByRole('button', { name: 'Cổng', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await viewpoints.getByRole('button', { name: 'Mở 360° cho Cổng' }).click();
  await expect(page).toHaveURL(/mode=panorama&location=son-trang-gate&scene=son-trang-gate/);
  await expect(page.getByRole('heading', { name: 'Cổng Sơn Trang' })).toBeVisible();
});
