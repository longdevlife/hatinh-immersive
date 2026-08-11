import { expect, test } from '@playwright/test';

test('opens the fake minimap on first entry and remembers its session state', async ({ page }) => {
  await page.goto('/explore/son-trang-co-dam?mode=panorama&scene=scene-01&h=0&p=0&fov=90');

  const minimap = page.getByRole('application', { name: 'Bản đồ tuyến tham quan' });
  await expect(minimap).toBeVisible();
  await expect(minimap).toHaveAttribute('data-minimap-status', 'ready');
  await expect(page.getByRole('button', { name: 'Thu gọn bản đồ' })).toBeVisible();

  await page.getByRole('button', { name: 'Thu gọn bản đồ' }).click();
  await expect(minimap).toHaveAttribute('data-minimap-status', 'idle');
  await expect(page.getByRole('button', { name: 'Mở rộng bản đồ' })).toBeVisible();

  await page.reload();
  await expect(minimap).toHaveAttribute('data-minimap-status', 'idle');
  await expect(page.getByRole('button', { name: 'Mở rộng bản đồ' })).toBeVisible();

  await page.getByRole('button', { name: 'Mở rộng bản đồ' }).click();
  await expect(minimap).toHaveAttribute('data-minimap-status', 'ready');
  await expect(page.getByRole('button', { name: 'Thu gọn bản đồ' })).toBeVisible();

  await page.reload();
  await expect(minimap).toHaveAttribute('data-minimap-status', 'ready');
  await expect(page.getByRole('button', { name: 'Thu gọn bản đồ' })).toBeVisible();
});
