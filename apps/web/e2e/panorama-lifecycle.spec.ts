import { expect, test } from '@playwright/test';

test('keeps one panorama viewport while following a linked scene', async ({ page }) => {
  await page.goto('/explore/bien-thien-cam?mode=overview3d');
  await expect(page.locator('[data-renderer-status="ready"]')).toBeVisible();

  await page.getByRole('button', { name: 'Khám phá 360°' }).first().click();
  await expect(page.getByRole('heading', { name: 'Lối dạo Thiên Cầm' })).toBeVisible();
  await expect(page.getByRole('application', { name: 'Không gian toàn cảnh 360 độ' })).toHaveCount(
    1,
  );

  await page.evaluate(() => performance.mark('scene-nav-start'));
  await page
    .getByRole('navigation', { name: 'Danh sách cảnh quan' })
    .getByRole('button')
    .nth(1)
    .click();
  await expect(page.getByRole('heading', { name: 'Bờ biển Thiên Cầm' })).toBeVisible();
  await expect(page.getByRole('application', { name: 'Không gian toàn cảnh 360 độ' })).toHaveCount(
    1,
  );
  await expect(page.locator('[data-renderer-status="ready"]')).toHaveCount(1);

  const duration = await page.evaluate(
    () => performance.now() - performance.getEntriesByName('scene-nav-start').at(-1)!.startTime,
  );
  expect(duration).toBeLessThanOrEqual(300);
});
