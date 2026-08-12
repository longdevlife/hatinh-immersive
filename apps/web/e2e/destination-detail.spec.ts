import { expect, test } from '@playwright/test';

test('selects a destination, opens its detail decision layer, and enters 360 explicitly', async ({
  page,
}) => {
  await page.goto('/explore');
  await expect(page.locator('#explore-title')).toBeVisible();

  await page.getByRole('button', { name: 'Chọn điểm đến Biển Thiên Cầm' }).click();
  await page.getByRole('button', { name: 'Xem chi tiết' }).click();

  await expect(page).toHaveURL(/\/explore\/bien-thien-cam\?returnTo=/);
  await expect(page.getByRole('main', { name: 'Thông tin điểm đến' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Biển Thiên Cầm' })).toBeVisible();
  await expect(page.locator('[data-renderer-status]')).toHaveCount(0);

  await page.getByRole('button', { name: 'Khám phá 360°' }).click();

  await expect(page).toHaveURL(
    /\/explore\/bien-thien-cam\/immersive\?mode=panorama&location=thien-cam-beach&scene=thien-cam-boardwalk/,
  );
  await expect(page.getByRole('heading', { name: 'Lối dạo Thiên Cầm' })).toBeVisible();
});

test('returns to Explore with the selected destination from detail', async ({ page }) => {
  await page.goto('/explore/bien-thien-cam');

  await page.getByRole('button', { name: 'Xem trên bản đồ' }).click();

  await expect(page).toHaveURL('/explore?destination=bien-thien-cam');
  await expect(page.getByTestId('destination-card-thien-cam-beach')).toHaveAttribute(
    'aria-current',
    'true',
  );
});

test('redirects legacy immersive deep links to the explicit nested route', async ({ page }) => {
  await page.goto('/explore/bien-thien-cam?mode=overview3d&location=thien-cam-beach');

  await expect(page).toHaveURL(
    '/explore/bien-thien-cam/immersive?mode=overview3d&location=thien-cam-beach',
  );
  await expect(page.locator('[data-renderer-status]').first()).toBeVisible();
});
