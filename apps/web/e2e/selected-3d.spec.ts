import { expect, test, type Page } from '@playwright/test';

const destination = {
  categoryLabel: 'Di sản',
  coverImageUrl: null,
  defaultSceneId: 'scene-01',
  geoPoint: { latitude: 18.3421, longitude: 105.9032 },
  id: 'destination-01',
  name: 'Sơn Trang Cổ Đạm',
  slug: 'son-trang-co-dam',
  summary: 'Hành trình di sản ở Hà Tĩnh.',
};

const disabledDestination = {
  ...destination,
  id: 'destination-02',
  name: 'Khu lưu niệm Nguyễn Du',
  slug: 'khu-luu-niem-nguyen-du',
};

const unavailableDestination = {
  ...destination,
  id: 'destination-03',
  name: 'Biển Thiên Cầm',
  slug: 'bien-thien-cam',
};

const manifest = {
  defaultSceneId: 'scene-01',
  destination: {
    ...destination,
    categoryId: null,
    coverMediaId: null,
    description: destination.summary,
    status: 'published',
  },
  nodes: [
    {
      altitude: 12,
      destinationId: destination.id,
      id: 'scene-01',
      initialFov: 90,
      initialHeading: 0,
      initialPitch: 0,
      lat: destination.geoPoint.latitude,
      lng: destination.geoPoint.longitude,
      name: 'Cổng vào',
      panoramaAssetId: 'asset-01',
      panoramaAssetStatus: 'ready',
      panoramaManifestUrl: 'https://media.example.vn/scene-01/manifest.json',
      panoramaPreviewUrl: 'https://media.example.vn/scene-01/preview.webp',
      sortOrder: 0,
      status: 'published',
    },
  ],
  links: [],
  hotspots: [],
};

async function mockSelected3DJourney(page: Page, destinations = [destination]) {
  await page.route('**/api/v1/destinations?*', async (route) => {
    await route.fulfill({
      body: JSON.stringify(destinations),
      contentType: 'application/json',
      status: 200,
    });
  });
  await page.route('**/api/v1/destinations/son-trang-co-dam/immersive-manifest*', async (route) => {
    await route.fulfill({
      body: JSON.stringify(manifest),
      contentType: 'application/json',
      status: 200,
    });
  });
}

test('redirects a disabled direct overview link to detail before creating a renderer', async ({
  page,
}) => {
  await mockSelected3DJourney(page, [destination, disabledDestination, unavailableDestination]);
  await page.goto('/explore/khu-luu-niem-nguyen-du?mode=overview3d');

  await expect(page).toHaveURL('/explore/khu-luu-niem-nguyen-du');
  await expect(page.getByRole('heading', { name: 'Khu lưu niệm Nguyễn Du' })).toBeVisible();
  await expect(page.getByRole('application')).toHaveCount(0);
});

test('redirects an unavailable direct overview link while keeping detail fallbacks available', async ({
  page,
}) => {
  await mockSelected3DJourney(page, [destination, disabledDestination, unavailableDestination]);
  await page.goto('/explore/bien-thien-cam?mode=overview3d');

  await expect(page).toHaveURL('/explore/bien-thien-cam');
  await expect(page.getByRole('heading', { name: 'Biển Thiên Cầm' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Xem 3D' })).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('Mô hình 3D khu vực này đang được cập nhật');
  await expect(page.getByRole('button', { name: 'Khám phá 360°' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Xem trên bản đồ' })).toBeVisible();
  await expect(page.getByRole('application')).toHaveCount(0);
});

test('enters enabled selected 3D with the deterministic fake renderer', async ({ page }) => {
  const externalGoogleRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('maps.googleapis.com')) {
      externalGoogleRequests.push(request.url());
    }
  });
  await mockSelected3DJourney(page);
  await page.goto('/explore/son-trang-co-dam');

  await page.getByRole('button', { name: 'Xem 3D' }).click();

  await expect(page).toHaveURL(/mode=overview3d/);
  await expect(page.getByRole('application', { name: 'Không gian bản đồ 3D' })).toHaveAttribute(
    'data-renderer-status',
    'ready',
  );
  expect(externalGoogleRequests).toEqual([]);
});

test('falls back to the destination 360 journey when selected 3D provider initialization fails', async ({
  page,
}) => {
  await mockSelected3DJourney(page);
  await page.goto('/explore/son-trang-co-dam?mode=overview3d&e2eFailure=map3d');

  await expect(page.locator('.immersive-renderer-state[role="alert"]')).toContainText(
    'Không thể mở không gian 3D',
  );
  await page.getByRole('button', { name: 'Mở trải nghiệm 360°' }).click();

  await expect(page).toHaveURL(/mode=panorama&.*scene=scene-01/);
  await expect(page.getByRole('heading', { name: 'Cổng vào' })).toBeVisible();
});
