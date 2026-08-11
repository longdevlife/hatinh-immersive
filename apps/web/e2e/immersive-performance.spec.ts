import { expect, test } from '@playwright/test';

const heavyRendererRequest = /(?:maplibre-gl|@photo-sphere-viewer|maps\.googleapis\.com)/i;
const rendererModuleRequest = /\/src\/modules\/(?:map3d|panorama|minimap)\//i;

test('keeps the public shell light and records a first-contentful-paint metric', async ({
  page,
}) => {
  const requests: string[] = [];
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
  page.on('request', (request) => requests.push(request.url()));

  await page.goto('/');
  await page.getByRole('button', { name: 'Bắt đầu khám phá' }).click();
  await expect(page).toHaveURL(/\/explore$/);
  await expect(page.locator('#explore-title')).toBeVisible();

  const discoveryRendererRequests = requests.filter((url) => rendererModuleRequest.test(url));
  expect(discoveryRendererRequests).toEqual([]);

  await page.goto('/explore/bien-thien-cam?mode=overview3d');
  await expect(page.locator('[data-renderer-status="ready"]')).toHaveCount(1);

  expect(requests.filter((url) => rendererModuleRequest.test(url)).length).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Khám phá 360°' }).first().click();
  await expect(page.getByRole('heading', { name: 'Lối dạo Thiên Cầm' })).toBeVisible();
  await expect(page.locator('[data-renderer-status="ready"]')).toHaveCount(1);
});
