import { expect, test } from '@playwright/test';

test('keeps one panorama viewport while following a linked scene', async ({ page }) => {
  await page.goto('/explore/son-trang-co-dam?mode=overview3d');
  await expect(page.locator('[data-renderer-status="ready"]')).toBeVisible();

  await page.getByRole('button', { name: 'Khám phá 360°' }).first().click();
  await expect(page.getByRole('heading', { name: 'Lối đi di sản 1' })).toBeVisible();
  await expect(page.getByRole('application', { name: 'Không gian toàn cảnh 360 độ' })).toHaveCount(
    1,
  );

  await page.getByRole('button', { name: 'Đi tiếp' }).click();
  await expect(page.getByRole('heading', { name: 'Lối đi di sản 2' })).toBeVisible();
  await expect(page.getByRole('application', { name: 'Không gian toàn cảnh 360 độ' })).toHaveCount(
    1,
  );
  await expect(page.locator('[data-renderer-status="ready"]')).toHaveCount(1);
});
