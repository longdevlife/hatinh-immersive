import { expect, test } from '@playwright/test';

const cameraPreset = (lat: number, lng: number, heading = 0) => ({
  center: { lat, lng, altitude: 150 },
  heading,
  tilt: 55,
  range: 1_000,
});

const manifest = (locale: string) => ({
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
    name: locale === 'en' ? 'Son Trang Heritage' : 'Sơn Trang Cổ Đạm',
    slug: 'son-trang-co-dam',
    status: 'published',
    summary: locale === 'en' ? 'A heritage journey in Ha Tinh.' : 'Hành trình di sản ở Hà Tĩnh.',
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
      name: locale === 'en' ? 'Entrance' : 'Cổng vào',
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
      name: locale === 'en' ? 'Central courtyard' : 'Sân trung tâm',
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
  hotspots: [
    {
      id: 'hotspot-story',
      payload: { label: 'Câu chuyện địa danh', text: 'Nội dung giới thiệu địa danh.' },
      pitch: -4,
      sceneId: 'scene-01',
      status: 'published',
      type: 'information',
      yaw: 32,
    },
  ],
});

test('wires unified scene, fullscreen, share, and hotspot controls', async ({ page }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.route(
    /\/api\/v1\/destinations\/[^/?]+\/immersive-manifest(?:\?.*)?$/,
    async (route) => {
      const requestUrl = new URL(route.request().url());

      const locale = requestUrl.searchParams.get('locale') ?? 'vi';
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(manifest(locale)),
        status: 200,
      });
    },
  );
  await page.route(/\/api\/v1\/destinations(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([
        {
          categoryLabel: 'Biển đảo',
          coverImageUrl: null,
          defaultSceneId: null,
          geoPoint: { latitude: 18.2231, longitude: 106.3321 },
          cameraPreset: cameraPreset(18.2231, 106.3321, 70),
          id: 'destination-02',
          name: 'Đảo Sơn Dương',
          slug: 'dao-son-duong',
          summary: 'Một điểm đến ven biển.',
        },
        {
          categoryLabel: 'Di sản & văn hóa',
          coverImageUrl: null,
          defaultSceneId: 'nguyen-du-courtyard',
          geoPoint: { latitude: 18.6647657, longitude: 105.7667208 },
          cameraPreset: cameraPreset(18.6647657, 105.7667208, 118),
          id: 'nguyen-du-memorial',
          name: 'Khu lưu niệm Nguyễn Du',
          slug: 'khu-luu-niem-nguyen-du',
          summary: 'Không gian tưởng niệm và văn hóa Nguyễn Du.',
        },
      ]),
      status: 200,
    });
  });

  await page.goto('/explore/son-trang-co-dam?mode=panorama&scene=scene-01&h=0&p=0&fov=90');
  await expect(page.getByRole('region', { name: 'Các công cụ tiện ích' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mở tìm kiếm' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Đổi ngôn ngữ/ })).toHaveCount(0);

  await page.getByRole('button', { name: 'Câu chuyện địa danh' }).click();
  await expect(page.getByRole('dialog')).toContainText('Câu chuyện địa danh');
  await page.getByRole('button', { name: 'Đóng chi tiết điểm khám phá' }).click();

  await page
    .getByRole('navigation', { name: 'Hành trình 360 Sơn Trang Cổ Đạm' })
    .getByRole('button')
    .nth(1)
    .click();
  await expect(page).toHaveURL(/scene=(?:thien-cam-shore|scene-02)/);

  await page.getByRole('button', { name: 'Toàn màn hình' }).click();
  await expect(page.getByRole('button', { name: 'Thoát toàn màn hình' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Chia sẻ cảnh này' }).click();
});
