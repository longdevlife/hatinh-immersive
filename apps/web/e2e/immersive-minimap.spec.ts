import { expect, test } from '@playwright/test';

const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAATSURBVDhPYxgFo2AUjAIwYGAAAAQQAAGnRHxjAAAAAElFTkSuQmCC',
  'base64',
);

test('runs the real MapLibre minimap against only locally fulfilled Ha Tinh tiles', async ({
  page,
}) => {
  let styleRequests = 0;
  let tileRequests = 0;
  const requestedUrls: string[] = [];

  page.on('request', (request) => requestedUrls.push(request.url()));
  await page.route('**/test/minimap-style.json', async (route) => {
    styleRequests += 1;
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        version: 8,
        sources: {
          local: {
            type: 'raster',
            tiles: ['/test/tiles/{z}/{x}/{y}.png'],
            tileSize: 256,
          },
        },
        layers: [{ id: 'local', type: 'raster', source: 'local' }],
      }),
    });
  });
  await page.route(/\/test\/tiles\/\d+\/\d+\/\d+\.png$/, async (route) => {
    tileRequests += 1;
    await route.fulfill({ body: TRANSPARENT_PNG, contentType: 'image/png' });
  });

  await page.goto('/explore/son-trang-co-dam?mode=panorama&scene=scene-01&h=0&p=0&fov=90');

  const minimap = page.getByRole('application', { name: 'Bản đồ tuyến tham quan' });
  await expect(minimap).toBeVisible();
  await expect(minimap).toHaveAttribute('data-minimap-status', 'ready');
  await expect.poll(() => styleRequests).toBeGreaterThan(0);
  await expect.poll(() => tileRequests).toBeGreaterThan(0);
  expect(requestedUrls).toEqual(
    expect.arrayContaining([expect.stringContaining('/test/tiles/17/104092/58740.png')]),
  );

  await page.getByRole('button', { name: 'Thu gọn bản đồ' }).click();
  await expect(page.getByRole('button', { name: 'Mở rộng bản đồ' })).toBeVisible();
  await page.getByRole('button', { name: 'Mở rộng bản đồ' }).click();
  await expect(page.getByRole('button', { name: 'Thu gọn bản đồ' })).toBeVisible();

  const markerBounds = await page.locator('.minimap-heading-marker').boundingBox();
  expect(markerBounds).not.toBeNull();
  if (!markerBounds) {
    throw new Error('MINIMAP_MARKER_MISSING');
  }
  await page.mouse.click(
    markerBounds.x + markerBounds.width / 2 + 26,
    markerBounds.y + markerBounds.height / 2 - 31,
  );
  await expect(page.getByRole('heading', { name: 'Lối đi di sản 2' })).toBeVisible();
  expect(requestedUrls.filter((url) => url.includes('tile.openstreetmap.org'))).toEqual([]);
});
