import { expect, test, type Page } from '@playwright/test';

const heavyRendererRequest = /(?:maplibre-gl|@photo-sphere-viewer|maps\.googleapis\.com)/i;
const rendererAssetUrlMarker =
  /(?:\/src\/modules\/(?:map3d|panorama)\/|\/src\/modules\/explore-map\/adapters\/maplibre-explore-map\.|@photo-sphere-viewer|(?:^|[/_.-])(?:maplibre-gl|google-maps3d|photo-sphere-viewer)(?:[/_.?=-]|$))/i;
const rendererAssetSourceMarker =
  /(?:maplibre-gl|maplibre-gl-worker(?:-dev)?\.mjs|@photo-sphere-viewer|photo-sphere-viewer|maps\.googleapis\.com|google\.maps|gmp-map-3d)/i;
const immersiveRouteAssetMarker =
  /(?:\/src\/modules\/immersive-navigation\/|\/assets\/immersive-navigation[-_.])/i;

function trackRendererAssets(page: Page) {
  const loadedRendererAssets: string[] = [];
  const inspections: Promise<void>[] = [];

  page.on('response', (response) => {
    const request = response.request();
    if (!['script', 'stylesheet'].includes(request.resourceType())) {
      return;
    }

    inspections.push(
      (async () => {
        const url = response.url();
        if (rendererAssetUrlMarker.test(url)) {
          loadedRendererAssets.push(url);
          return;
        }

        try {
          const source = (await response.body()).toString('utf8');
          if (rendererAssetSourceMarker.test(source)) {
            loadedRendererAssets.push(url);
          }
        } catch {
          // A failed/aborted response cannot have loaded renderer code.
        }
      })(),
    );
  });

  return {
    loadedRendererAssets,
    async settle() {
      await Promise.all(inspections);
    },
  };
}

function trackExternalRequests(page: Page) {
  const externalRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      !['127.0.0.1', 'localhost'].includes(url.hostname)
    ) {
      externalRequests.push(request.url());
    }
  });
  return externalRequests;
}

test('keeps the public shell light and records a first-contentful-paint metric', async ({
  page,
}) => {
  const requests: string[] = [];
  const externalRequests = trackExternalRequests(page);
  await page.addInitScript(() => {
    (window as Window & { __hatinhVitals?: { fcp: number | null } }).__hatinhVitals = {
      fcp: null,
    };
    try {
      new PerformanceObserver((list) => {
        const fcp = list.getEntries().find((entry) => entry.name === 'first-contentful-paint');
        if (fcp) {
          (window as Window & { __hatinhVitals?: { fcp: number | null } }).__hatinhVitals = {
            fcp: fcp.startTime,
          };
        }
      }).observe({ type: 'paint', buffered: true });
    } catch {
      // The browser may not expose Paint Timing; the navigation timing assertion remains useful.
    }
  });
  page.on('request', (request) => requests.push(request.url()));

  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Bắt đầu khám phá' })).toBeVisible();
  await page.waitForLoadState('networkidle');

  expect(requests.filter((url) => heavyRendererRequest.test(url))).toEqual([]);
  expect(externalRequests).toEqual([]);
  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const vitals = (window as Window & { __hatinhVitals?: { fcp: number | null } }).__hatinhVitals;
    return {
      domContentLoaded: navigation?.domContentLoadedEventEnd ?? 0,
      fcp:
        vitals?.fcp ?? performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null,
    };
  });

  expect(metrics.domContentLoaded).toBeGreaterThan(0);
  expect(metrics.fcp).not.toBeNull();
  expect(metrics.fcp ?? Number.POSITIVE_INFINITY).toBeLessThan(5000);
});

test('loads renderer code only after entering the immersive journey', async ({ page }) => {
  const requests: string[] = [];
  const rendererAssets = trackRendererAssets(page);
  const externalRequests = trackExternalRequests(page);
  page.on('request', (request) => requests.push(request.url()));

  await page.goto('/');
  await page.getByRole('button', { name: 'Bắt đầu khám phá' }).click();
  await expect(page).toHaveURL(/\/explore$/);
  await expect(page.locator('#explore-title')).toBeVisible();

  const discoveryRendererRequests = requests.filter((url) => rendererAssetUrlMarker.test(url));
  expect(discoveryRendererRequests).toEqual([]);
  await rendererAssets.settle();
  expect(rendererAssets.loadedRendererAssets).toEqual([]);

  await page.goto('/explore/bien-thien-cam?mode=overview3d');
  await expect(page.locator('[data-renderer-status="ready"]')).toHaveCount(1);

  expect(requests.filter((url) => immersiveRouteAssetMarker.test(url)).length).toBeGreaterThan(0);
  await rendererAssets.settle();
  expect(rendererAssets.loadedRendererAssets.length).toBeGreaterThan(0);
  expect(externalRequests).toEqual([]);
  await page.getByRole('button', { name: 'Khám phá 360°' }).first().click();
  await expect(page.getByRole('heading', { name: 'Lối dạo Thiên Cầm' })).toBeVisible();
  await expect(page.locator('[data-renderer-status="ready"]')).toHaveCount(1);
});

test('does not load renderer assets before the Explore map is activated', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const rendererAssets = trackRendererAssets(page);
  const externalRequests = trackExternalRequests(page);

  await page.goto('/explore');
  await expect(page.locator('#explore-title')).toBeVisible();
  await expect(page.locator('[data-testid="explore-map"]')).toHaveAttribute(
    'data-map-open',
    'false',
  );
  await page.waitForLoadState('networkidle');
  await rendererAssets.settle();

  expect(rendererAssets.loadedRendererAssets).toEqual([]);
  expect(externalRequests).toEqual([]);
});
