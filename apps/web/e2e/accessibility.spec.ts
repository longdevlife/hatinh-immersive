import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function expectAxeClean(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

test('public landing page passes the axe smoke check', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Di sản mở ra/ })).toBeVisible();

  await expectAxeClean(page);
});

test('immersive controls remain accessible after closing the information drawer', async ({
  page,
}) => {
  await page.goto('/explore/son-trang-co-dam?mode=overview3d');
  await expect(page.locator('[data-renderer-status="ready"]')).toBeVisible();

  await page.getByRole('button', { name: 'Đóng thông tin' }).click();
  await expect(page.getByRole('button', { name: 'Thông tin' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );

  await expectAxeClean(page);
});
