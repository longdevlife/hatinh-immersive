import { expect, test, type Page } from '@playwright/test';

interface MockDestination {
  categoryLabel: string;
  coverImageUrl: null;
  defaultSceneId: string | null;
  geoPoint: { latitude: number; longitude: number };
  id: string;
  name: string;
  slug: string;
  summary: string;
}

const destination: MockDestination = {
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

const genericFallbackDestination = {
  ...destination,
  defaultSceneId: 'son-trang-gate',
  id: 'destination-04',
  name: 'Điểm đến dự phòng',
  slug: 'generic-fallback',
};

interface MockManifest {
  ambientTrackId: string | null;
  audioTracks: Array<Record<string, unknown>>;
  defaultSceneId: string | null;
  destination: MockDestination & {
    categoryId: null;
    coverMediaId: null;
    description: string;
    status: string;
  };
  nodes: Array<Record<string, unknown>>;
  links: Array<Record<string, unknown>>;
  hotspots: Array<Record<string, unknown>>;
  transcripts: Array<Record<string, unknown>>;
}

const manifest: MockManifest = {
  ambientTrackId: null,
  audioTracks: [],
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
      ambientOverrideTrackId: null,
      destinationId: destination.id,
      id: 'scene-01',
      initialFov: 90,
      initialHeading: 0,
      initialPitch: 0,
      lat: destination.geoPoint.latitude,
      lng: destination.geoPoint.longitude,
      name: 'Cổng vào',
      narrationTrackIds: { en: null, vi: null },
      panoramaAssetId: 'asset-01',
      panoramaAssetStatus: 'ready',
      panoramaManifestUrl: 'https://media.example.vn/scene-01/manifest.json',
      panoramaPreviewUrl: 'https://media.example.vn/scene-01/preview.webp',
      sortOrder: 0,
      status: 'published',
      transcriptIds: { en: null, vi: null },
    },
  ],
  links: [],
  hotspots: [],
  transcripts: [],
};

async function mockSelected3DJourney(
  page: Page,
  destinations: MockDestination[] = [destination],
  responseManifest: MockManifest = manifest,
) {
  await page.route('**/api/v1/destinations?*', async (route) => {
    await route.fulfill({
      body: JSON.stringify(destinations),
      contentType: 'application/json',
      status: 200,
    });
  });
  await page.route('**/api/v1/destinations/*/immersive-manifest*', async (route) => {
    await route.fulfill({
      body: JSON.stringify(responseManifest),
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

test('redirects a disabled nested overview link before creating a renderer', async ({ page }) => {
  await mockSelected3DJourney(page, [destination, disabledDestination, unavailableDestination]);
  await page.goto('/explore/khu-luu-niem-nguyen-du/immersive?mode=overview3d');

  await expect(page).toHaveURL('/explore/khu-luu-niem-nguyen-du');
  await expect(page.getByRole('heading', { name: 'Khu lưu niệm Nguyễn Du' })).toBeVisible();
  await expect(page.getByRole('application')).toHaveCount(0);
});

test('redirects a bare selected-3D route with no mode before creating a renderer', async ({
  page,
}) => {
  await mockSelected3DJourney(page);
  await page.goto('/explore/son-trang-co-dam/immersive');

  await expect(page).toHaveURL('/explore/son-trang-co-dam');
  await expect(page.getByRole('heading', { name: 'Sơn Trang Cổ Đạm' })).toBeVisible();
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
  const genericFallbackManifest = {
    ...manifest,
    destination: {
      ...manifest.destination,
      ...genericFallbackDestination,
    },
    nodes: manifest.nodes.map((node) => ({
      ...node,
      destinationId: genericFallbackDestination.id,
      lat: genericFallbackDestination.geoPoint.latitude,
      lng: genericFallbackDestination.geoPoint.longitude,
    })),
  };
  const selected3DFallbackManifest = {
    ...genericFallbackManifest,
    defaultSceneId: 'son-trang-gate',
    destination: { ...genericFallbackManifest.destination, defaultSceneId: 'son-trang-gate' },
    nodes: genericFallbackManifest.nodes.map((node) => ({
      ...node,
      id: 'son-trang-gate',
      panoramaManifestUrl: 'https://media.example.vn/son-trang-gate/manifest.json',
      panoramaPreviewUrl: 'https://media.example.vn/son-trang-gate/preview.webp',
    })),
  };
  await mockSelected3DJourney(page, [genericFallbackDestination], selected3DFallbackManifest);
  await page.goto('/explore/generic-fallback?mode=overview3d&e2eFailure=map3d');

  await expect(page.locator('.immersive-renderer-state[role="alert"]')).toContainText(
    'Không thể mở không gian 3D',
  );
  await page.getByRole('button', { name: 'Mở trải nghiệm 360°' }).click();

  await expect(page).toHaveURL(/mode=panorama&.*scene=son-trang-gate/);
  await expect(page.getByRole('heading', { name: 'Cổng vào' })).toBeVisible();
});

test('returns to destination detail when selected 3D fails without panorama capability', async ({
  page,
}) => {
  const noPanoramaDestination = { ...destination, defaultSceneId: null };
  const noPanoramaManifest = {
    ...manifest,
    defaultSceneId: null,
    destination: { ...manifest.destination, defaultSceneId: null },
    nodes: [],
    links: [],
    hotspots: [],
  };

  await mockSelected3DJourney(page, [noPanoramaDestination], noPanoramaManifest);
  await page.goto('/explore/son-trang-co-dam?mode=overview3d&e2eFailure=map3d');

  await expect(page.locator('.immersive-renderer-state[role="alert"]')).toContainText(
    'Không thể mở không gian 3D',
  );
  await expect(page.getByRole('button', { name: 'Mở trải nghiệm 360°' })).toHaveCount(0);
  await page
    .locator('.immersive-renderer-state[role="alert"]')
    .getByRole('button', { name: 'Quay lại Sơn Trang Cổ Đạm' })
    .click();

  await expect(page).toHaveURL('/explore/son-trang-co-dam');
  await expect(page.getByRole('main', { name: 'Trải nghiệm Sơn Trang Cổ Đạm' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Khám phá 360°' })).toHaveCount(0);
});
