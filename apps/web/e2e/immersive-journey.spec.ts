import { expect, test } from '@playwright/test';

test('explores overview to 360, follows a scene, and restores it after refresh', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Bắt đầu khám phá' }).click();

  await expect(page).toHaveURL(/\/explore\/son-trang-co-dam\?mode=overview3d$/);
  await expect(page.getByRole('heading', { name: 'Sơn Trang Cổ Đạm' }).first()).toBeVisible();
  await expect(page.locator('[data-renderer-status="ready"]').first()).toBeVisible();

  await page.getByRole('button', { name: 'Khám phá 360°' }).first().click();
  await expect(page).toHaveURL(
    /\/explore\/son-trang-co-dam\?mode=panorama&scene=scene-01&h=0&p=0&fov=90$/,
  );
  await expect(page.getByRole('heading', { name: 'Lối đi di sản 1' })).toBeVisible();

  await page.getByRole('button', { name: 'Đi tiếp' }).click();
  await expect(page).toHaveURL(
    /\/explore\/son-trang-co-dam\?mode=panorama&scene=scene-02&h=31&p=-2&fov=88$/,
  );
  await expect(page.getByRole('heading', { name: 'Lối đi di sản 2' })).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(
    /\/explore\/son-trang-co-dam\?mode=panorama&scene=scene-02&h=31&p=-2&fov=88$/,
  );
  await expect(page.getByRole('heading', { name: 'Lối đi di sản 2' })).toBeVisible();
});
