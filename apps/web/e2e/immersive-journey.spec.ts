import { expect, test } from '@playwright/test';

test('explores overview to 360, follows a scene, and restores it after refresh', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Mở bản đồ khám phá' }).click();

  await expect(page).toHaveURL(/\/explore$/);
  await expect(page.locator('#explore-title')).toBeVisible();

  await page.goto('/explore/bien-thien-cam?mode=overview3d');
  await expect(page.getByRole('heading', { name: 'Biển Thiên Cầm' }).first()).toBeVisible();
  await expect(page.locator('[data-renderer-status="ready"]').first()).toBeVisible();

  await page.getByRole('button', { name: 'Khám phá 360°' }).first().click();
  await expect(page).toHaveURL(
    /\/explore\/bien-thien-cam\/immersive\?mode=panorama&location=thien-cam-beach&scene=thien-cam-boardwalk&h=0&p=0&fov=90$/,
  );
  await expect(page.getByRole('heading', { name: 'Lối dạo Thiên Cầm' })).toBeVisible();

  await page
    .getByRole('navigation', { name: 'Danh sách cảnh quan' })
    .getByRole('button')
    .nth(1)
    .click();
  await expect(page).toHaveURL(
    /\/explore\/bien-thien-cam\/immersive\?mode=panorama&location=thien-cam-beach&scene=thien-cam-shore&h=118&p=0&fov=88$/,
  );
  await expect(page.getByRole('heading', { name: 'Bờ biển Thiên Cầm' })).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(
    /\/explore\/bien-thien-cam\/immersive\?mode=panorama&location=thien-cam-beach&scene=thien-cam-shore&h=118&p=0&fov=88$/,
  );
  await expect(page.getByRole('heading', { name: 'Bờ biển Thiên Cầm' })).toBeVisible();
});
