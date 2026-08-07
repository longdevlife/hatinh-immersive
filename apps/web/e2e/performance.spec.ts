import { expect, test } from '@playwright/test';

const heavyRendererRequest = /(?:maplibre-gl|@photo-sphere-viewer|maps\.googleapis\.com)/i;

test('keeps heavy renderer downloads out of the public landing shell', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));

  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Bắt đầu khám phá' })).toBeVisible();
  await page.waitForLoadState('networkidle');

  expect(requests.filter((url) => heavyRendererRequest.test(url))).toEqual([]);
});

test('keeps exactly one active heavy renderer during the 3D to 360 handoff', async ({ page }) => {
  await page.goto('/explore/son-trang-co-dam?mode=overview3d');
  await expect(page.locator('[data-renderer-status="ready"]')).toHaveCount(1);

  await page.getByRole('button', { name: 'Khám phá 360°' }).first().click();
  await expect(page.getByRole('heading', { name: 'Lối đi di sản 1' })).toBeVisible();
  await expect(page.locator('[data-renderer-status="ready"]')).toHaveCount(1);
});
