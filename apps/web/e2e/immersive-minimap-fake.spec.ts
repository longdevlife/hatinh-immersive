import { expect, test } from '@playwright/test';

test('keeps the fake minimap collapsed by default and remembers its session state', async ({
  page,
}) => {
  await page.goto('/explore/son-trang-co-dam?mode=panorama&scene=scene-01&h=0&p=0&fov=90');

  const minimap = page.getByRole('application', { name: 'Bản đồ tuyến tham quan' });
  await expect(minimap).toHaveClass(/minimap-viewport--collapsed/);
  await expect(minimap).toHaveAttribute('data-minimap-status', 'idle');
  await expect(page.getByRole('button', { name: 'Mở bản đồ thu nhỏ' })).toBeVisible();

  await page.getByRole('button', { name: 'Mở bản đồ thu nhỏ' }).click();
  await expect(minimap).toBeVisible();
  await expect(minimap).toHaveAttribute('data-minimap-status', 'ready');
  await expect(page.getByRole('button', { name: 'Đóng bản đồ thu nhỏ' })).toBeVisible();

  await page.reload();
  await expect(minimap).toBeVisible();
  await expect(minimap).toHaveAttribute('data-minimap-status', 'ready');
  await expect(page.getByRole('button', { name: 'Đóng bản đồ thu nhỏ' })).toBeVisible();

  await page.getByRole('button', { name: 'Đóng bản đồ thu nhỏ' }).click();
  await expect(minimap).toHaveAttribute('data-minimap-status', 'idle');
  await expect(page.getByRole('button', { name: 'Mở bản đồ thu nhỏ' })).toBeVisible();

  await page.reload();
  await expect(minimap).toHaveClass(/minimap-viewport--collapsed/);
  await expect(minimap).toHaveAttribute('data-minimap-status', 'idle');
  await expect(page.getByRole('button', { name: 'Mở bản đồ thu nhỏ' })).toBeVisible();
});
