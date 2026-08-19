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

const acceptedPanoramaPackageManifest = {
  version: 1,
  type: 'equirectangular-tiles',
  preview: 'preview.webp',
  tileUrlTemplate: 'tiles/{level}/{col}-{row}.webp',
  levels: [
    { width: 1024, cols: 2, rows: 1 },
    { width: 2048, cols: 4, rows: 2 },
    { width: 4096, cols: 8, rows: 4 },
  ],
};

const acceptedPublicManifest = {
  ...lowResolutionPublicManifest,
  defaultSceneId: 'son-trang-accepted',
  nodes: [
    {
      ...lowResolutionPublicManifest.nodes[0],
      id: 'son-trang-accepted',
      name: 'Cảnh quan 4096 Chuẩn',
      panoramaAssetId: 'asset-son-trang-accepted',
      panoramaAssetStatus: 'ready',
      panoramaManifestUrl:
        'https://media.example.test/processed/panorama/asset-accepted/manifest.json',
      panoramaPreviewUrl:
        'https://media.example.test/processed/panorama/asset-accepted/preview.webp',
    },
  ],
};

const dummyWebp1x1 = Buffer.from(
  'UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=',
  'base64',
);

test('renders accepted production-shaped panorama package through real PSV on desktop and mobile', async ({
  page,
}) => {
  await page.route('**/api/v1/destinations/son-trang-co-dam/immersive-manifest*', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(acceptedPublicManifest),
      status: 200,
    });
  });

  await page.route(
    'https://media.example.test/processed/panorama/asset-accepted/manifest.json',
    async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(acceptedPanoramaPackageManifest),
        status: 200,
      });
    },
  );

  await page.route(
    'https://media.example.test/processed/panorama/asset-accepted/preview.webp',
    async (route) => {
      await route.fulfill({
        contentType: 'image/webp',
        body: dummyWebp1x1,
        status: 200,
      });
    },
  );

  await page.route(
    'https://media.example.test/processed/panorama/asset-accepted/tiles/**',
    async (route) => {
      await route.fulfill({
        contentType: 'image/webp',
        body: dummyWebp1x1,
        status: 200,
      });
    },
  );

  // 1. Desktop smoke test (1440x900)
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(
    '/explore/son-trang-co-dam/immersive?mode=panorama&location=son-trang-co-dam&scene=son-trang-accepted&h=0&p=0&fov=88',
  );

  await expect(page.getByRole('heading', { name: 'Cảnh quan 4096 Chuẩn' })).toBeVisible();
  await expect(
    page.getByRole('application', { name: 'Không gian toàn cảnh 360 độ' }),
  ).toBeVisible();
  await expect(page.locator('[data-renderer-status="ready"]')).toBeVisible();
  const mediaDockDesktop = page.getByRole('region', { name: 'Media dock trải nghiệm' });
  await expect(mediaDockDesktop).toBeVisible();
  await expect(page.getByText('360° đang được cập nhật')).toHaveCount(0);

  // 2. Mobile smoke test (390x844)
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { name: 'Cảnh quan 4096 Chuẩn' })).toBeVisible();
  await expect(
    page.getByRole('application', { name: 'Không gian toàn cảnh 360 độ' }),
  ).toBeVisible();
  await expect(page.locator('[data-renderer-status="ready"]')).toBeVisible();
  const mediaDockMobile = page.getByRole('region', { name: 'Media dock trải nghiệm' });
  await expect(mediaDockMobile).toBeVisible();
});

test('fails closed when panorama derivatives are missing or inconsistent', async ({ page }) => {
  const brokenDerivativeManifest = {
    ...acceptedPublicManifest,
    defaultSceneId: 'son-trang-broken-derivatives',
    nodes: [
      {
        ...acceptedPublicManifest.nodes[0],
        id: 'son-trang-broken-derivatives',
        name: 'Cảnh quan lỗi file phái sinh',
        panoramaManifestUrl:
          'https://media.example.test/processed/panorama/asset-broken/manifest.json',
      },
    ],
  };

  await page.route('**/api/v1/destinations/son-trang-co-dam/immersive-manifest*', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(brokenDerivativeManifest),
      status: 200,
    });
  });

  // Manifest request returns 404 or corrupted payload
  await page.route(
    'https://media.example.test/processed/panorama/asset-broken/manifest.json',
    async (route) => {
      await route.fulfill({
        status: 404,
        body: 'Not Found',
      });
    },
  );

  await page.goto(
    '/explore/son-trang-co-dam/immersive?mode=panorama&location=son-trang-co-dam&scene=son-trang-broken-derivatives&h=0&p=0&fov=88',
  );

  // Must fail-closed gracefully (showing update/fallback state or error boundary, not crashing blank)
  await expect(page.getByRole('button', { name: 'Quay lại Sơn Trang Cổ Đạm' })).toBeVisible();
  await expect(page.locator('[data-renderer-status="ready"]')).toHaveCount(0);
});
