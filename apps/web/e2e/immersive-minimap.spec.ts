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
  const osmAttempts: string[] = [];
  const requestedUrls: string[] = [];

  page.on('request', (request) => requestedUrls.push(request.url()));
  await page.route('https://tile.openstreetmap.org/**', async (route) => {
    osmAttempts.push(route.request().url());
    await route.abort();
  });
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
  const map = minimap.getByRole('group', { name: 'Các điểm của tuyến tham quan' });
  await expect(minimap).toBeVisible();
  await expect(minimap).toHaveAttribute('data-minimap-status', 'ready');
  await expect(map).toHaveAttribute('data-minimap-route-branches', 'scene-01->scene-02');
  await expect.poll(() => styleRequests).toBeGreaterThan(0);
  await expect.poll(() => tileRequests).toBeGreaterThan(0);
  expect(requestedUrls).toEqual(
    expect.arrayContaining([expect.stringContaining('/test/tiles/17/104092/58740.png')]),
  );

  await page.getByRole('button', { name: 'Thu gọn bản đồ' }).click();
  await expect(page.getByRole('button', { name: 'Mở rộng bản đồ' })).toBeVisible();
  await page.getByRole('button', { name: 'Mở rộng bản đồ' }).click();
  await expect(page.getByRole('button', { name: 'Thu gọn bản đồ' })).toBeVisible();

  await expect(map).toHaveAttribute('data-minimap-interaction-ready', 'true');
  const nodePoints = await map.getAttribute('data-minimap-node-points');
  expect(nodePoints).not.toBeNull();
  const sceneTwoPoint = JSON.parse(nodePoints ?? '{}')['scene-02'] as { x: number; y: number };
  expect(sceneTwoPoint).toEqual({ x: expect.any(Number), y: expect.any(Number) });

  const mapBounds = await map.boundingBox();
  expect(mapBounds).not.toBeNull();
  if (!mapBounds) {
    throw new Error('MINIMAP_CONTAINER_MISSING');
  }
  await page.mouse.click(mapBounds.x + sceneTwoPoint.x, mapBounds.y + sceneTwoPoint.y);
  await expect(page.getByRole('heading', { name: 'Lối đi di sản 2' })).toBeVisible();
  expect(osmAttempts).toEqual([]);
});
