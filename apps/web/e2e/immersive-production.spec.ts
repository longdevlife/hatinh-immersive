import { expect, test, type Page } from '@playwright/test';

function createSilentWav(durationMs = 10_000): Buffer {
  const sampleRate = 8_000;
  const channelCount = 1;
  const bytesPerSample = 2;
  const sampleCount = Math.ceil((sampleRate * durationMs) / 1_000);
  const dataLength = sampleCount * channelCount * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataLength);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channelCount, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channelCount * bytesPerSample, 28);
  buffer.writeUInt16LE(channelCount * bytesPerSample, 32);
  buffer.writeUInt16LE(bytesPerSample * 8, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataLength, 40);

  return buffer;
}

async function routeProductionAudioFixture(page: Page) {
  const wav = createSilentWav();
  await page.route('**/test-media/production-audio/*.wav', async (route) => {
    await route.fulfill({
      body: wav,
      contentType: 'audio/wav',
      headers: { 'cache-control': 'no-store' },
      status: 200,
    });
  });
}

const cameraPreset = (lat: number, lng: number, heading = 0) => ({
  center: { lat, lng, altitude: 150 },
  heading,
  tilt: 55,
  range: 1_000,
});

const manifest = {
  ambientTrackId: null,
  audioTracks: [],
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
      ambientOverrideTrackId: null,
      destinationId: 'destination-01',
      id: 'scene-01',
      initialFov: 90,
      initialHeading: 0,
      initialPitch: 0,
      lat: 18.3421,
      lng: 105.9032,
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
    {
      altitude: 12,
      ambientOverrideTrackId: null,
      destinationId: 'destination-01',
      id: 'scene-02',
      initialFov: 90,
      initialHeading: 30,
      initialPitch: 2,
      lat: 18.3424,
      lng: 105.9034,
      name: 'Sân trung tâm',
      narrationTrackIds: { en: null, vi: null },
      panoramaAssetId: 'asset-02',
      panoramaAssetStatus: 'ready',
      panoramaManifestUrl: 'https://media.example.vn/scene-02/manifest.json',
      panoramaPreviewUrl: 'https://media.example.vn/scene-02/preview.webp',
      sortOrder: 1,
      status: 'published',
      transcriptIds: { en: null, vi: null },
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
  transcripts: [],
};

const localizedManifest = (locale: 'vi' | 'en') => ({
  ...manifest,
  destination: {
    ...manifest.destination,
    name: locale === 'en' ? 'Son Trang Heritage' : 'Sơn Trang Cổ Đạm',
    summary: locale === 'en' ? 'A heritage journey in Ha Tinh.' : 'Hành trình di sản ở Hà Tĩnh.',
  },
  nodes: manifest.nodes.map((node, index) => ({
    ...node,
    name:
      locale === 'en'
        ? index === 0
          ? 'Entrance'
          : 'Central courtyard'
        : index === 0
          ? 'Cổng vào'
          : 'Sân trung tâm',
  })),
});

const productionAudioManifest = {
  ...manifest,
  ambientTrackId: 'ambient-production',
  audioTracks: [
    {
      durationMs: 10_000,
      id: 'ambient-production',
      label: 'Âm thanh không gian Sơn Trang',
      locale: null,
      readiness: 'ready',
      rights: 'customer-owned',
      src: '/test-media/production-audio/ambient.wav',
      type: 'ambient',
      version: 'test-v1',
      voiceId: null,
    },
    {
      durationMs: 10_000,
      id: 'narration-production-vi',
      label: 'Thuyết minh Cổng vào',
      locale: 'vi',
      readiness: 'ready',
      rights: 'customer-owned',
      src: '/test-media/production-audio/narration-vi.wav',
      type: 'narration',
      version: 'test-v1',
      voiceId: 'test-approved-voice',
    },
  ],
  nodes: manifest.nodes.map((node, index) =>
    index === 0
      ? {
          ...node,
          narrationTrackIds: { en: null, vi: 'narration-production-vi' },
          transcriptIds: { en: 'transcript-production-en', vi: 'transcript-production-vi' },
        }
      : node,
  ),
  transcripts: [
    {
      id: 'transcript-production-vi',
      locale: 'vi',
      rights: 'customer-owned',
      segments: [
        {
          endMs: 1_000,
          id: 'transcript-production-vi-1',
          startMs: 0,
          text: 'Cổng vào mở đầu hành trình Sơn Trang.',
        },
      ],
      timingMode: 'timed',
      title: 'Cổng vào',
    },
    {
      id: 'transcript-production-en',
      locale: 'en',
      rights: 'customer-owned',
      segments: [
        {
          endMs: null,
          id: 'transcript-production-en-1',
          startMs: null,
          text: 'The entrance begins the Son Trang journey.',
        },
      ],
      timingMode: 'plain',
      title: 'Entrance',
    },
  ],
};

const failedNarrationManifest = {
  ...productionAudioManifest,
  audioTracks: productionAudioManifest.audioTracks.map((track) =>
    track.id === 'narration-production-vi'
      ? { ...track, src: '/test-media/production-audio/missing-narration.mp3' }
      : track,
  ),
};

const localizedProductionAudioManifest = (locale: 'vi' | 'en') => ({
  ...productionAudioManifest,
  destination: {
    ...productionAudioManifest.destination,
    name: locale === 'en' ? 'Son Trang Heritage' : 'Sơn Trang Cổ Đạm',
  },
  nodes: productionAudioManifest.nodes.map((node, index) => ({
    ...node,
    name:
      locale === 'en'
        ? index === 0
          ? 'Entrance'
          : 'Central courtyard'
        : index === 0
          ? 'Cổng vào'
          : 'Sân trung tâm',
  })),
});

const cultureDeepLinkManifest = {
  ...manifest,
  defaultSceneId: 'son-trang-culture',
  destination: {
    ...manifest.destination,
    defaultSceneId: 'son-trang-culture',
  },
  nodes: [
    {
      ...manifest.nodes[0],
      id: 'son-trang-culture',
      name: 'Không gian Văn hóa',
      panoramaManifestUrl: '/demo/360/son-trang-tour/son-trang-culture/manifest.json',
      panoramaPreviewUrl: '/demo/360/son-trang-tour/son-trang-culture/preview.webp',
    },
  ],
  links: [],
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
    '/explore/son-trang-co-dam?returnTo=%2Fexplore%3Fdestination%3Dson-trang-co-dam%26view%3Dmap',
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

  const mediaDock = page.getByRole('region', { name: 'Media dock trải nghiệm' });
  await expect(mediaDock).toBeVisible();
  await expect(mediaDock.locator('.immersive-media-dock__mobile-toggle')).toBeHidden();
  await expect(mediaDock.getByRole('button', { name: 'Bắt đầu tự động tham quan' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tự động tham quan', exact: true })).toHaveCount(0);

  const sceneBrowser = page.getByRole('navigation', { name: /Hành trình 360|Danh sách cảnh quan/ });
  await expect(sceneBrowser.getByRole('button', { name: 'Cổng vào' })).toHaveAttribute(
    'aria-current',
    'step',
  );
  await sceneBrowser.getByRole('button', { name: 'Sân trung tâm' }).click();
  await expect(page.getByRole('heading', { name: 'Sân trung tâm' })).toBeVisible();
  await expect(page).toHaveURL(/scene=scene-02/);

  await page.getByRole('button', { name: 'Quay lại Sơn Trang Cổ Đạm' }).click();

  await expect(page).toHaveURL(
    '/explore/son-trang-co-dam?returnTo=%2Fexplore%3Fdestination%3Dson-trang-co-dam%26view%3Dmap',
  );
  await expect(page.getByRole('main', { name: 'Trải nghiệm Sơn Trang Cổ Đạm' })).toBeVisible();
  await expect(
    sonTrangDetail.getByRole('heading', { name: manifest.destination.name }).first(),
  ).toBeVisible();
  await expect(page.locator('[data-renderer-status]')).toHaveCount(0);
  await expect(page.locator('[data-testid="immersive-renderer-slot"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="immersive-renderer-slot"]')).toHaveCount(0);
});

test('loads the public selected-3D journey through the manifest REST path', async ({ page }) => {
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

  await expect(page.getByRole('navigation', { name: 'Các góc nhìn 3D' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Khám phá 360°' })).toHaveCount(0);
});

test('switches locale in the unified API panorama presentation', async ({ page }) => {
  const manifestRequests: string[] = [];

  await page.route('**/api/v1/destinations/son-trang-co-dam/immersive-manifest*', async (route) => {
    const requestUrl = new URL(route.request().url());
    const locale = requestUrl.searchParams.get('locale') === 'en' ? 'en' : 'vi';
    manifestRequests.push(requestUrl.toString());
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(localizedManifest(locale)),
      status: 200,
    });
  });

  await page.goto(
    '/explore/son-trang-co-dam/immersive?mode=panorama&location=destination-01&scene=scene-01&h=0&p=0&fov=90',
  );

  await expect(page.getByRole('heading', { name: 'Cổng vào' })).toBeVisible();
  const localeButton = page.getByRole('button', { name: 'Đổi ngôn ngữ sang Tiếng Anh' });
  await expect(localeButton).toHaveText('VI');

  const englishManifestRequest = page.waitForRequest(
    (request) =>
      request.url().includes('/immersive-manifest') &&
      new URL(request.url()).searchParams.get('locale') === 'en',
  );
  await localeButton.click();
  await englishManifestRequest;

  await expect(page.getByRole('heading', { name: 'Entrance' })).toBeVisible();
  const vietnameseLocaleButton = page.getByRole('button', {
    name: 'Đổi ngôn ngữ sang Tiếng Việt',
  });
  await expect(vietnameseLocaleButton).toHaveText('EN');

  await vietnameseLocaleButton.click();

  await expect(page.getByRole('heading', { name: 'Cổng vào' })).toBeVisible();
  expect(manifestRequests.some((url) => new URL(url).searchParams.get('locale') === 'en')).toBe(
    true,
  );
  expect(manifestRequests.some((url) => new URL(url).searchParams.get('locale') === 'vi')).toBe(
    true,
  );
});

test('plays production-shaped file-backed ambient and narration through the Media Dock', async ({
  page,
}) => {
  await routeProductionAudioFixture(page);
  await page.route('**/api/v1/destinations/son-trang-co-dam/immersive-manifest*', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(productionAudioManifest),
      status: 200,
    });
  });

  await page.goto(
    '/explore/son-trang-co-dam/immersive?mode=panorama&location=destination-01&scene=scene-01&h=0&p=0&fov=90',
  );

  const mediaDock = page.getByRole('region', { name: 'Media dock trải nghiệm' });
  await expect(mediaDock.getByRole('button', { name: 'Nghe câu chuyện' })).toBeVisible();
  await mediaDock.getByRole('button', { name: 'Nghe câu chuyện' }).click();

  await expect(mediaDock.getByRole('button', { name: 'Tạm dừng câu chuyện' })).toBeVisible();
  await expect(mediaDock.getByRole('button', { name: 'Bật phụ đề' })).toBeVisible();
});

test('keeps panorama navigation usable when production narration fails to load', async ({
  page,
}) => {
  await routeProductionAudioFixture(page);
  await page.route('**/test-media/production-audio/missing-narration.mp3', async (route) => {
    await route.fulfill({ body: 'missing test audio', contentType: 'text/plain', status: 404 });
  });
  await page.route('**/api/v1/destinations/son-trang-co-dam/immersive-manifest*', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(failedNarrationManifest),
      status: 200,
    });
  });

  await page.goto(
    '/explore/son-trang-co-dam/immersive?mode=panorama&location=destination-01&scene=scene-01&h=0&p=0&fov=90',
  );

  const mediaDock = page.getByRole('region', { name: 'Media dock trải nghiệm' });
  const failedAudioResponse = page.waitForResponse((response) =>
    response.url().includes('missing-narration.mp3'),
  );
  await mediaDock.getByRole('button', { name: 'Nghe câu chuyện' }).click();
  expect((await failedAudioResponse).status()).toBe(404);
  await expect(mediaDock.getByRole('button', { name: 'Nghe câu chuyện' })).toBeVisible();

  const sceneBrowser = page.getByRole('navigation', { name: /Hành trình 360|Danh sách cảnh quan/ });
  await sceneBrowser.getByRole('button', { name: 'Sân trung tâm' }).click();
  await expect(page.getByRole('heading', { name: 'Sân trung tâm' })).toBeVisible();
  await expect(page).toHaveURL(/scene=scene-02/);
  await expect(
    page.getByRole('application', { name: 'Không gian toàn cảnh 360 độ' }),
  ).toHaveAttribute('data-e2e-panorama-destroy-count', '0');
});

test('does not fall back to Vietnamese narration when English has transcript only', async ({
  page,
}) => {
  const narrationRequests: string[] = [];
  await routeProductionAudioFixture(page);
  page.on('request', (request) => {
    if (request.url().includes('narration-vi.wav')) {
      narrationRequests.push(request.url());
    }
  });
  await page.route('**/api/v1/destinations/son-trang-co-dam/immersive-manifest*', async (route) => {
    const requestUrl = new URL(route.request().url());
    const locale = requestUrl.searchParams.get('locale') === 'en' ? 'en' : 'vi';
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(localizedProductionAudioManifest(locale)),
      status: 200,
    });
  });

  await page.goto(
    '/explore/son-trang-co-dam/immersive?mode=panorama&location=destination-01&scene=scene-01&h=0&p=0&fov=90',
  );

  const mediaDock = page.getByRole('region', { name: 'Media dock trải nghiệm' });
  await expect(mediaDock.getByRole('button', { name: 'Nghe câu chuyện' })).toBeVisible();
  await page.getByRole('button', { name: 'Đổi ngôn ngữ sang Tiếng Anh' }).click();

  await expect(page.getByRole('heading', { name: 'Entrance' })).toBeVisible();
  await expect(mediaDock.getByRole('button', { name: 'Nghe câu chuyện' })).toHaveCount(0);
  await expect(mediaDock.getByRole('button', { name: 'Mở bản chép lời' })).toBeVisible();
  expect(narrationRequests).toEqual([]);
});

test('keeps a valid Sơn Trang culture deep link aligned across URL, renderer, and rail', async ({
  page,
}) => {
  await page.route('**/api/v1/destinations/son-trang-co-dam/immersive-manifest*', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(cultureDeepLinkManifest),
      status: 200,
    });
  });

  await page.goto(
    '/explore/son-trang-co-dam/immersive?mode=panorama&location=son-trang-co-dam&scene=son-trang-culture&h=228.165&p=-39.233&fov=88.801',
  );

  await expect(page).toHaveURL(/scene=son-trang-culture/);
  await expect(page.getByRole('heading', { name: 'Không gian Văn hóa' })).toBeVisible();
  const rail = page.getByRole('navigation', { name: /Hành trình 360/i });
  await expect(rail.getByRole('button', { name: 'Không gian Văn hóa' })).toHaveAttribute(
    'aria-current',
    'step',
  );
});

test('keeps selected 3D scoped to its destination without a generic 360 handoff', async ({
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

  await expect(page.getByRole('navigation', { name: 'Các góc nhìn 3D' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Khám phá 360°' })).toHaveCount(0);
});

const destinationAManifest = {
  ambientTrackId: 'ambient-dest-a',
  audioTracks: [
    {
      durationMs: 10_000,
      id: 'ambient-dest-a',
      label: 'Âm thanh Sơn Trang',
      locale: null,
      readiness: 'ready',
      rights: 'customer-owned',
      src: '/test-media/production-audio/ambient-son-trang.wav',
      type: 'ambient',
      version: 'test-v1',
      voiceId: null,
    },
    {
      durationMs: 10_000,
      id: 'narration-dest-a-vi',
      label: 'Thuyết minh Cổng Sơn Trang',
      locale: 'vi',
      readiness: 'ready',
      rights: 'customer-owned',
      src: '/test-media/production-audio/narration-son-trang-vi.wav',
      type: 'narration',
      version: 'test-v1',
      voiceId: 'test-voice-a',
    },
  ],
  defaultSceneId: 'scene-son-trang-01',
  destination: {
    categoryId: null,
    categoryLabel: 'Di sản',
    coverImageUrl: null,
    coverMediaId: null,
    defaultSceneId: 'scene-son-trang-01',
    description: 'Một hành trình di sản Sơn Trang.',
    geoPoint: { latitude: 18.3421, longitude: 105.9032 },
    cameraPreset: cameraPreset(18.3421, 105.9032, 24),
    id: 'destination-01',
    name: 'Sơn Trang Cổ Đạm',
    slug: 'son-trang-co-dam',
    status: 'published',
    summary: 'Hành trình di sản Sơn Trang Cổ Đạm.',
  },
  nodes: [
    {
      altitude: 12,
      ambientOverrideTrackId: null,
      destinationId: 'destination-01',
      id: 'scene-son-trang-01',
      initialFov: 90,
      initialHeading: 0,
      initialPitch: 0,
      lat: 18.3421,
      lng: 105.9032,
      name: 'Cổng Sơn Trang',
      narrationTrackIds: { en: null, vi: 'narration-dest-a-vi' },
      panoramaAssetId: 'asset-son-trang-01',
      panoramaAssetStatus: 'ready',
      panoramaManifestUrl: 'https://media.example.vn/scene-son-trang-01/manifest.json',
      panoramaPreviewUrl: 'https://media.example.vn/scene-son-trang-01/preview.webp',
      sortOrder: 0,
      status: 'published',
      transcriptIds: { en: null, vi: 'transcript-dest-a-vi' },
    },
  ],
  links: [],
  hotspots: [],
  transcripts: [
    {
      id: 'transcript-dest-a-vi',
      locale: 'vi',
      rights: 'customer-owned',
      segments: [
        {
          endMs: 1_000,
          id: 'transcript-dest-a-vi-1',
          startMs: 0,
          text: 'Cổng vào mở đầu hành trình Sơn Trang.',
        },
      ],
      timingMode: 'timed',
      title: 'Cổng Sơn Trang',
    },
  ],
};

const destinationBManifest = {
  ambientTrackId: 'ambient-dest-b',
  audioTracks: [
    {
      durationMs: 10_000,
      id: 'ambient-dest-b',
      label: 'Âm thanh Thiên Cầm',
      locale: null,
      readiness: 'ready',
      rights: 'customer-owned',
      src: '/test-media/production-audio/ambient-thien-cam.wav',
      type: 'ambient',
      version: 'test-v1',
      voiceId: null,
    },
    {
      durationMs: 10_000,
      id: 'narration-dest-b-vi',
      label: 'Thuyết minh Biển Thiên Cầm',
      locale: 'vi',
      readiness: 'ready',
      rights: 'customer-owned',
      src: '/test-media/production-audio/narration-thien-cam-vi.wav',
      type: 'narration',
      version: 'test-v1',
      voiceId: 'test-voice-b',
    },
  ],
  defaultSceneId: 'scene-thien-cam-01',
  destination: {
    categoryId: null,
    categoryLabel: 'Biển & Đảo',
    coverImageUrl: null,
    coverMediaId: null,
    defaultSceneId: 'scene-thien-cam-01',
    description: 'Bờ biển Thiên Cầm tuyệt đẹp.',
    geoPoint: { latitude: 18.2711, longitude: 106.0152 },
    cameraPreset: cameraPreset(18.2711, 106.0152, 90),
    id: 'destination-02',
    name: 'Biển Thiên Cầm',
    slug: 'bien-thien-cam',
    status: 'published',
    summary: 'Bãi biển Thiên Cầm Hà Tĩnh.',
  },
  nodes: [
    {
      altitude: 8,
      ambientOverrideTrackId: null,
      destinationId: 'destination-02',
      id: 'scene-thien-cam-01',
      initialFov: 90,
      initialHeading: 0,
      initialPitch: 0,
      lat: 18.2711,
      lng: 106.0152,
      name: 'Bãi biển Thiên Cầm',
      narrationTrackIds: { en: null, vi: 'narration-dest-b-vi' },
      panoramaAssetId: 'asset-thien-cam-01',
      panoramaAssetStatus: 'ready',
      panoramaManifestUrl: 'https://media.example.vn/scene-thien-cam-01/manifest.json',
      panoramaPreviewUrl: 'https://media.example.vn/scene-thien-cam-01/preview.webp',
      sortOrder: 0,
      status: 'published',
      transcriptIds: { en: null, vi: 'transcript-dest-b-vi' },
    },
  ],
  links: [],
  hotspots: [],
  transcripts: [
    {
      id: 'transcript-dest-b-vi',
      locale: 'vi',
      rights: 'customer-owned',
      segments: [
        {
          endMs: 1_000,
          id: 'transcript-dest-b-vi-1',
          startMs: 0,
          text: 'Biển Thiên Cầm trong xanh bờ cát mịn.',
        },
      ],
      timingMode: 'timed',
      title: 'Bãi biển Thiên Cầm',
    },
  ],
};

function assertReferentialClosure(manifest: typeof destinationAManifest) {
  const audioTrackIds = new Set(manifest.audioTracks.map((track) => track.id));
  const transcriptIds = new Set(manifest.transcripts.map((transcript) => transcript.id));
  const sceneIds = new Set(manifest.nodes.map((node) => node.id));

  if (manifest.ambientTrackId) {
    expect(audioTrackIds.has(manifest.ambientTrackId)).toBe(true);
  }
  if (manifest.defaultSceneId) {
    expect(sceneIds.has(manifest.defaultSceneId)).toBe(true);
  }

  for (const node of manifest.nodes) {
    if (node.ambientOverrideTrackId) {
      expect(audioTrackIds.has(node.ambientOverrideTrackId)).toBe(true);
    }
    if (node.narrationTrackIds.vi) {
      expect(audioTrackIds.has(node.narrationTrackIds.vi)).toBe(true);
    }
    if (node.narrationTrackIds.en) {
      expect(audioTrackIds.has(node.narrationTrackIds.en)).toBe(true);
    }
    if (node.transcriptIds.vi) {
      expect(transcriptIds.has(node.transcriptIds.vi)).toBe(true);
    }
    if (node.transcriptIds.en) {
      expect(transcriptIds.has(node.transcriptIds.en)).toBe(true);
    }
  }
}

test('isolates production audio across multiple distinct destinations', async ({ page }) => {
  // 1. Explicitly assert referential closure for both manifests
  assertReferentialClosure(destinationAManifest);
  assertReferentialClosure(destinationBManifest);

  const requestedAudios: string[] = [];
  await routeProductionAudioFixture(page);
  page.on('request', (request) => {
    if (request.url().includes('/test-media/production-audio/')) {
      requestedAudios.push(request.url());
    }
  });

  // Install deterministic test-only Audio fake compatible with BrowserAudioAdapter
  await page.addInitScript(() => {
    const probes: Array<{
      src: string;
      element: any;
      paused: boolean;
      playCount: number;
      pauseCount: number;
      triggerEnded: () => void;
      triggerError: () => void;
    }> = [];
    (window as any).__testAudioProbes = probes;

    class DeterministicFakeAudio extends EventTarget {
      src: string;
      preload = 'auto';
      loop = false;
      volume = 1;
      currentTime = 0;
      duration = 10;
      paused = true;
      playCount = 0;
      pauseCount = 0;

      constructor(src?: string) {
        super();
        this.src = src || '';
        const self = this;
        const probe = {
          src: this.src,
          element: this,
          get paused() {
            return self.paused;
          },
          get playCount() {
            return self.playCount;
          },
          get pauseCount() {
            return self.pauseCount;
          },
          triggerEnded() {
            self.dispatchEvent(new Event('ended'));
          },
          triggerError() {
            self.dispatchEvent(new Event('error'));
          },
        };
        probes.push(probe);

        if (this.src) {
          fetch(this.src).catch(() => {});
        }
      }

      play() {
        this.paused = false;
        this.playCount++;
        setTimeout(() => {
          this.dispatchEvent(new Event('loadedmetadata'));
          this.dispatchEvent(new Event('timeupdate'));
        }, 0);
        return Promise.resolve();
      }

      pause() {
        this.paused = true;
        this.pauseCount++;
        this.dispatchEvent(new Event('timeupdate'));
      }
    }

    (window as any).Audio = DeterministicFakeAudio;
  });

  await page.route(/\/api\/v1\/destinations(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([destinationAManifest.destination, destinationBManifest.destination]),
      status: 200,
    });
  });

  await page.route('**/api/v1/destinations/son-trang-co-dam/immersive-manifest*', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(destinationAManifest),
      status: 200,
    });
  });

  await page.route('**/api/v1/destinations/bien-thien-cam/immersive-manifest*', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(destinationBManifest),
      status: 200,
    });
  });

  // 2. Initial entry via in-app Explore flow to Destination A (Son Trang)
  await page.goto('/explore');
  await page.getByRole('button', { name: 'Chọn điểm đến Sơn Trang Cổ Đạm' }).click();
  await page.getByRole('button', { name: 'Xem chi tiết' }).click();
  await expect(page).toHaveURL(/\/explore\/son-trang-co-dam/);
  await page.getByRole('button', { name: 'Khám phá 360°' }).click();
  await expect(page).toHaveURL(/\/explore\/son-trang-co-dam\/immersive/);

  const mediaDockA = page.getByRole('region', { name: 'Media dock trải nghiệm' });
  await expect(mediaDockA).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cổng Sơn Trang' })).toBeVisible();

  // Play narration in Destination A
  const playButtonA = mediaDockA.getByRole('button', { name: 'Nghe câu chuyện' });
  await expect(playButtonA).toBeVisible();
  await playButtonA.click();

  await expect(mediaDockA.getByRole('button', { name: 'Tạm dừng câu chuyện' })).toBeVisible();
  const captionsToggleA = mediaDockA.getByRole('button', { name: 'Bật phụ đề' });
  await expect(captionsToggleA).toBeVisible();
  await captionsToggleA.click();

  // Prove Destination A uses narration A and transcript A
  await expect(page.getByText('Cổng vào mở đầu hành trình Sơn Trang.')).toBeVisible();
  expect(requestedAudios.some((url) => url.includes('narration-son-trang-vi.wav'))).toBe(true);
  expect(requestedAudios.some((url) => url.includes('narration-thien-cam-vi.wav'))).toBe(false);

  // Verify retained probe for Destination A exists and is playing in JS memory
  const probeAStateBefore = await page.evaluate(() => {
    const probe = (window as any).__testAudioProbes.find((p: any) =>
      p.src.includes('narration-son-trang-vi.wav'),
    );
    return probe ? { src: probe.src, paused: probe.paused, playCount: probe.playCount } : null;
  });
  expect(probeAStateBefore).not.toBeNull();
  expect(probeAStateBefore?.paused).toBe(false);

  // 3. Move from Destination A to Destination B via real in-app navigation (same SPA/JS context)
  await page.getByRole('button', { name: 'Quay lại Sơn Trang Cổ Đạm' }).click();
  await expect(page).toHaveURL(/\/explore\/son-trang-co-dam/);

  await page.getByRole('button', { name: 'Xem trên bản đồ' }).click();
  await expect(page).toHaveURL(/\/explore/);

  await page.getByRole('button', { name: 'Chọn điểm đến Biển Thiên Cầm' }).click();
  await page.getByRole('button', { name: 'Xem chi tiết' }).click();
  await expect(page).toHaveURL(/\/explore\/bien-thien-cam/);

  await page.getByRole('button', { name: 'Khám phá 360°' }).click();
  await expect(page).toHaveURL(/\/explore\/bien-thien-cam\/immersive/);

  const mediaDockB = page.getByRole('region', { name: 'Media dock trải nghiệm' });
  await expect(mediaDockB).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Bãi biển Thiên Cầm' })).toBeVisible();

  // Prove Destination A audio was stopped/paused upon switching destinations in the same JS context
  const probeAStateAfterSwitch = await page.evaluate(() => {
    const probe = (window as any).__testAudioProbes.find((p: any) =>
      p.src.includes('narration-son-trang-vi.wav'),
    );
    return probe ? { paused: probe.paused, pauseCount: probe.pauseCount } : null;
  });
  expect(probeAStateAfterSwitch?.paused).toBe(true);

  // Prove Destination A's narration and captions are NOT active in Destination B
  await expect(page.getByText('Cổng vào mở đầu hành trình Sơn Trang.')).toHaveCount(0);
  const playButtonB = mediaDockB.getByRole('button', { name: 'Nghe câu chuyện' });
  await expect(playButtonB).toBeVisible();

  // Play narration in Destination B
  await playButtonB.click();
  await expect(mediaDockB.getByRole('button', { name: 'Tạm dừng câu chuyện' })).toBeVisible();
  const captionsToggleB = mediaDockB.getByRole('button', { name: 'Bật phụ đề' });
  await expect(captionsToggleB).toBeVisible();
  await captionsToggleB.click();

  // Prove Destination B uses narration B and transcript B
  await expect(page.getByText('Biển Thiên Cầm trong xanh bờ cát mịn.')).toBeVisible();
  expect(requestedAudios.some((url) => url.includes('narration-thien-cam-vi.wav'))).toBe(true);

  // 4. Stale callback test: invoke actual retained A onended/onerror from the retained fake audio element
  await page.evaluate(() => {
    const probeA = (window as any).__testAudioProbes.find((p: any) =>
      p.src.includes('narration-son-trang-vi.wav'),
    );
    if (!probeA) {
      throw new Error('Retained Audio probe for Destination A was lost in SPA memory');
    }
    probeA.triggerEnded();
    probeA.triggerError();
  });

  // Assert B narration remains playing/current, B captions remain unchanged, and no A capability becomes active
  await expect(page.getByText('Biển Thiên Cầm trong xanh bờ cát mịn.')).toBeVisible();
  await expect(page.getByText('Cổng vào mở đầu hành trình Sơn Trang.')).toHaveCount(0);
  await expect(mediaDockB.getByRole('button', { name: 'Tạm dừng câu chuyện' })).toBeVisible();

  // 5. Assert Media Dock remains destination-neutral (semantic controls, no hardcoded destination labels in dock)
  await expect(mediaDockB).toHaveAttribute('data-mode', 'free-explore');
  await expect(mediaDockB.locator('.immersive-media-dock__story')).toBeVisible();
  await expect(mediaDockB.getByRole('slider', { name: 'Tiến độ câu chuyện' })).toBeVisible();
  await expect(mediaDockB.getByRole('button', { name: 'Mở bản chép lời' })).toBeVisible();
});
