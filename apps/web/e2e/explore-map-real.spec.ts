import { expect, test } from '@playwright/test';

const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAATSURBVDhPYxgFo2AUjAIwYGAAAAQQAAGnRHxjAAAAAElFTkSuQmCC',
  'base64',
);

test('runs the real Explore MapLibre engine against locally fulfilled style and tiles', async ({
  page,
}) => {
  let styleRequests = 0;
  let tileRequests = 0;
  const osmAttempts: string[] = [];
  const requestedUrls: string[] = [];

  page.on('request', (request) => requestedUrls.push(request.url()));
  await page.route('https://tile.openstreetmap.org/**', async (route) => {
    osmAttempts.push(route.request().url());
    await route.abort();
  });
  await page.route('**/test/explore-map-style.json', async (route) => {
    styleRequests += 1;
    await route.fulfill({
      body: JSON.stringify({
        layers: [{ id: 'local', source: 'local', type: 'raster' }],
        sources: {
          local: {
            tileSize: 256,
            tiles: ['/test/explore-tiles/{z}/{x}/{y}.png'],
            type: 'raster',
          },
        },
        version: 8,
      }),
      contentType: 'application/json',
    });
  });
  await page.route(/\/test\/explore-tiles\/\d+\/\d+\/\d+\.png$/, async (route) => {
    tileRequests += 1;
    await route.fulfill({ body: TRANSPARENT_PNG, contentType: 'image/png' });
  });

  await page.goto('/explore');

  const map = page.getByRole('region', { name: 'Bản đồ khám phá Hà Tĩnh' });
  await expect(page.locator('#explore-title')).toBeVisible();
  await expect(map).toHaveAttribute('data-explore-map-status', 'ready');
  await expect(map.locator('canvas.maplibregl-canvas')).toHaveCount(1);
  await expect.poll(() => styleRequests).toBeGreaterThan(0);
  await expect.poll(() => tileRequests).toBeGreaterThan(0);
  await expect(map).toHaveAttribute('data-selected-destination-id', '');

  await page.getByRole('button', { name: 'Chọn điểm đến Khu lưu niệm Nguyễn Du' }).click();
  await expect(map).toHaveAttribute('data-selected-destination-id', 'nguyen-du-memorial');
  expect(requestedUrls).toEqual(
    expect.arrayContaining([expect.stringContaining('/test/explore-tiles/')]),
  );
  expect(osmAttempts).toEqual([]);
});
