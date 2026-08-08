import { expect, test } from '@playwright/test';

test('keeps the default fake minimap ready and collapsible', async ({ page }) => {
  await page.goto('/explore/son-trang-co-dam?mode=panorama&scene=scene-01&h=0&p=0&fov=90');

  const minimap = page.getByRole('application', { name: 'Bản đồ tuyến tham quan' });
  await expect(minimap).toBeVisible();
  await expect(minimap).toHaveAttribute('data-minimap-status', 'ready');

  await page.getByRole('button', { name: 'Thu gọn bản đồ' }).click();
  await expect(page.getByRole('button', { name: 'Mở rộng bản đồ' })).toBeVisible();
  await page.getByRole('button', { name: 'Mở rộng bản đồ' }).click();
  await expect(page.getByRole('button', { name: 'Thu gọn bản đồ' })).toBeVisible();
});
